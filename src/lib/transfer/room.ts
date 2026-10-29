import { defaultIceServers } from "@/lib/multiplayer";
import type { SignalKind } from "@/lib/multiplayer";
import { apiPath } from "./api-path";
import { decodeSealToken, importSealKey, pack, sealHint, unpack, wipe } from "./cipher";
import { safeName } from "./format";
import { makePreview, type PreviewKind } from "./preview";
import { Sha256 } from "./sha256";

const DIRECT_CHUNK = 60 * 1024;
const RELAY_CHUNK = 32 * 1024;
const RELAY_LANES = 4;
const FAST_POLL = 400;
const IDLE_POLL = 2000;
const MAX_FILE = 8 * 1024 * 1024 * 1024;
const RELAY_MAX = 100 * 1024 * 1024;
const STALL_MS = 8_000;

export type SlipPeer = {
  id: string;
  name: string;
  connectionState: RTCPeerConnectionState;
  channelOpen: boolean;
  candidateType: string | null;
  rttMs?: number;
};

export type TransferStatus = "pending" | "active" | "done" | "rejected" | "cancelled" | "failed";

export type TransferView = {
  key: number;
  peerId: string;
  name: string;
  size: number;
  mime: string;
  direction: "in" | "out";
  status: TransferStatus;
  bytes: number;
  startedAt: number | null;
  blobUrl?: string;
  savedToDisk: boolean;
  bridged?: boolean;
  digest?: string;
  intact?: boolean;
  preview?: string;
  previewKind?: PreviewKind;
  liveUrl?: string;
  liveText?: string;
  paused?: boolean;
  shredded?: boolean;
};

export type NoteView = {
  id: number;
  peerId: string;
  peerName: string;
  text: string;
  direction: "in" | "out";
  at: number;
};

export type AskView = {
  id: number;
  peerId: string;
  peerName: string;
  at: number;
};

type Xfer = TransferView & {
  file?: File;
  parts?: Uint8Array[];
  sink?: FileSystemWritableFileStream;
  writeChain?: Promise<void>;
  abort?: AbortController;
  announced?: boolean;
  pumping?: boolean;
  via?: "relay";
  hash?: Sha256;
  expected?: string;
  preparing?: boolean;
  resume?: () => void;
  liveTicks?: number;
  held?: Map<number, Uint8Array>;
  chunkChain?: Promise<void>;
};

type Slot = {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  startedAt: number;
  recovery: number;
  releaseGate: () => void;
  descGate: Promise<void>;
  info: SlipPeer;
};

type Control =
  | { t: "file"; key: number; name: string; size: number; mime: string; preview?: string; previewKind?: PreviewKind }
  | { t: "accept"; key: number }
  | { t: "reject"; key: number }
  | { t: "cancel"; key: number }
  | { t: "done"; key: number; sha?: string }
  | { t: "chunk"; key: number; b64: string; at: number }
  | { t: "text"; text: string }
  | { t: "want" }
  | { t: "ping"; n: number }
  | { t: "pong"; n: number };

type Sealed = { t: "box"; iv: string; c: string };

type Held = { from: string; slot?: Slot; sealed: Sealed };

export class SlipRoom {
  room: string;
  readonly selfId: string;
  name: string;
  private readonly peers = new Map<string, Slot>();
  private readonly xfers = new Map<string, Xfer>();
  private readonly notes: NoteView[] = [];
  private readonly asks: AskView[] = [];
  private noteSeq = 0;
  private askSeq = 0;
  private seq = 0;
  private cursor = 0;
  private readonly seen = new Set<number>();
  private readonly signalChain = new Map<string, Promise<void>>();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private stallTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private online = false;
  private pin = "";
  private sealToken = "";
  private aes: CryptoKey | null = null;
  private held: Held[] = [];
  private shredAfter = true;
  hint = "";

  constructor(
    opts: {
      room: string;
      selfId: string;
      name: string;
      pin?: string;
      seal?: string;
    },
    private readonly listeners: {
      onPeers: (peers: SlipPeer[]) => void;
      onTransfers: (items: TransferView[]) => void;
      onNotes: (notes: NoteView[]) => void;
      onAsks: (asks: AskView[]) => void;
      onSignaling: (online: boolean) => void;
      onPinRequired: () => void;
      onLocked: (locked: boolean) => void;
      onSeal: (hint: string) => void;
    },
  ) {
    this.room = opts.room;
    this.selfId = opts.selfId;
    this.name = opts.name;
    this.pin = opts.pin ?? "";
    this.sealToken = opts.seal ?? "";
  }

  setName(name: string) {
    this.name = name.slice(0, 24);
  }

  setPin(pin: string) {
    this.pin = /^[0-9]{4}$/.test(pin) ? pin : "";
  }

  async useSeal(token: string) {
    const raw = decodeSealToken(token.trim());
    if (!raw) return false;
    this.aes = await importSealKey(raw);
    this.hint = await sealHint(raw);
    this.listeners.onSeal(this.hint);
    const held = this.held.splice(0);
    for (const item of held) {
      const msg = await this.unbox(item.sealed);
      if (!msg) continue;
      if (item.slot) this.onControl(item.slot, msg);
      else this.onRelay(item.from, msg);
    }
    for (const xfer of this.xfers.values()) {
      if (xfer.direction === "out" && xfer.status === "pending" && !xfer.announced && !xfer.preparing) {
        await this.offer(xfer);
      }
    }
    return true;
  }

  setShred(on: boolean) {
    this.shredAfter = on;
  }

  shred(peerId: string, key: number) {
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || xfer.status === "active") return;
    this.dropSecret(xfer);
    xfer.shredded = true;
    this.emitNow();
  }

  async lock(pin: string) {
    const next = /^[0-9]{4}$/.test(pin) ? pin : "";
    this.pin = next;
    try {
      const res = await fetch(apiPath("/api/rtc"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "lock", room: this.room, peer: this.selfId, pin: next }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async join() {
    if (this.sealToken) await this.useSeal(this.sealToken);
    try {
      await this.pollOnce();
    } catch {
      /* retry on the loop */
    }
    if (this.closed) return;
    this.schedule(this.nextDelay());
    this.stallTimer = setInterval(() => this.watchdog(), 2000);
  }

  close() {
    this.closed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.emitTimer) clearTimeout(this.emitTimer);
    if (this.stallTimer) clearInterval(this.stallTimer);
    for (const xfer of this.xfers.values()) {
      xfer.abort?.abort();
      xfer.resume?.();
      this.release(xfer);
    }
    for (const slot of this.peers.values()) slot.pc.close();
    this.peers.clear();
    void fetch(apiPath("/api/rtc"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "leave", room: this.room, peer: this.selfId, pin: this.pin || undefined }),
      keepalive: true,
    }).catch(() => {});
  }

  sendFiles(peerId: string, files: File[]) {
    for (const file of files) {
      if (file.size > MAX_FILE) continue;
      const key = this.nextKey(peerId);
      const xfer: Xfer = {
        key,
        peerId,
        name: safeName(file.name),
        size: file.size,
        mime: file.type || "application/octet-stream",
        direction: "out",
        status: "pending",
        bytes: 0,
        startedAt: null,
        savedToDisk: false,
        file,
        preparing: true,
      };
      if (file.type.startsWith("image/") || file.type.startsWith("audio/") || file.type.startsWith("video/")) {
        xfer.liveUrl = URL.createObjectURL(file);
      }
      this.xfers.set(this.xid(peerId, key), xfer);
      void this.prepare(xfer);
    }
    this.emitNow();
  }

  sendToAll(files: File[]) {
    const ids = [...this.peers.keys()];
    for (const id of ids) this.sendFiles(id, files);
    return ids.length;
  }

  retry(peerId: string, key: number) {
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || xfer.direction !== "out" || !xfer.file) return false;
    if (xfer.status !== "failed" && xfer.status !== "cancelled") return false;
    const file = xfer.file;
    xfer.file = undefined;
    this.dismiss(peerId, key);
    this.sendFiles(peerId, [file]);
    return true;
  }

  ask(peerId: string) {
    const slot = this.peers.get(peerId);
    if (!slot) return false;
    void this.sendControl(peerId, { t: "want" });
    return true;
  }

  dismissAsk(id: number) {
    const next = this.asks.filter((ask) => ask.id !== id);
    if (next.length === this.asks.length) return;
    this.asks.splice(0, this.asks.length, ...next);
    this.listeners.onAsks([...this.asks]);
  }

  clearAsks(peerId: string) {
    const next = this.asks.filter((ask) => ask.peerId !== peerId);
    if (next.length === this.asks.length) return;
    this.asks.splice(0, this.asks.length, ...next);
    this.listeners.onAsks([...this.asks]);
  }

  sendText(peerId: string, text: string) {
    const slot = this.peers.get(peerId);
    const clean = text.trim().slice(0, 4000);
    if (!clean || !this.aes) return false;
    void this.sendControl(peerId, { t: "text", text: clean });
    this.pushNote(peerId, slot?.info.name || "Someone", clean, "out");
    return Boolean(slot);
  }

  accept(peerId: string, key: number, sink?: FileSystemWritableFileStream) {
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || xfer.direction !== "in" || xfer.status !== "pending") return;
    const direct = this.peers.get(peerId)?.dc?.readyState === "open" && xfer.via !== "relay";
    if (!direct && xfer.via !== "relay") {
      xfer.status = "failed";
      this.emitNow();
      return;
    }
    xfer.status = "active";
    xfer.startedAt = Date.now();
    xfer.sink = sink;
    xfer.savedToDisk = Boolean(sink);
    if (!sink) xfer.parts = [];
    xfer.hash = new Sha256();
    this.sendControl(peerId, { t: "accept", key });
    this.emitNow();
  }

  reject(peerId: string, key: number) {
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || xfer.status !== "pending") return;
    xfer.status = "rejected";
    this.sendControl(peerId, { t: "reject", key });
    this.emitNow();
  }

  cancel(peerId: string, key: number) {
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || xfer.status === "done" || xfer.status === "cancelled") return;
    xfer.status = "cancelled";
    xfer.paused = false;
    xfer.resume?.();
    xfer.abort?.abort();
    void xfer.sink?.abort().catch(() => {});
    this.sendControl(peerId, { t: "cancel", key });
    this.emitNow();
  }

  dismiss(peerId: string, key: number) {
    const id = this.xid(peerId, key);
    const xfer = this.xfers.get(id);
    if (!xfer || xfer.status === "active" || xfer.status === "pending") return;
    if (xfer.blobUrl) URL.revokeObjectURL(xfer.blobUrl);
    if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
    this.xfers.delete(id);
    this.emitNow();
  }

  pause(peerId: string, key: number) {
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || xfer.direction !== "out" || xfer.status !== "active") return;
    xfer.paused = true;
    this.emitNow();
  }

  resume(peerId: string, key: number) {
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || !xfer.paused) return;
    xfer.paused = false;
    xfer.resume?.();
    xfer.resume = undefined;
    this.emitNow();
  }

  clearFinished() {
    for (const [id, xfer] of this.xfers) {
      if (xfer.status === "active" || xfer.status === "pending") continue;
      this.release(xfer);
      this.xfers.delete(id);
    }
    this.emitNow();
  }

  private release(xfer: Xfer) {
    if (xfer.blobUrl) URL.revokeObjectURL(xfer.blobUrl);
    if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
    void xfer.sink?.abort().catch(() => {});
  }

  private async prepare(xfer: Xfer) {
    const file = xfer.file;
    const made = file ? await makePreview(file) : null;
    if (this.closed || xfer.status === "cancelled") return;
    if (made) {
      xfer.preview = made.preview;
      xfer.previewKind = made.kind;
    }
    xfer.preparing = false;
    await this.offer(xfer);
    this.emitNow();
  }

  private async offer(xfer: Xfer) {
    if (!this.aes || xfer.announced || xfer.preparing || xfer.status === "cancelled") return;
    const open = this.peers.get(xfer.peerId)?.dc?.readyState === "open";
    if (open) this.announce(xfer.peerId, xfer);
    else if (xfer.size <= RELAY_MAX) await this.relayAnnounce(xfer);
  }

  private async hold(xfer: Xfer) {
    while (xfer.paused) {
      if (xfer.abort?.signal.aborted || xfer.status === "cancelled") return;
      await new Promise<void>((resolve) => {
        xfer.resume = resolve;
      });
    }
  }

  private nextKey(peerId: string) {
    this.seq += 1;
    const base = this.selfId > peerId ? 0 : 0x80000000;
    return (base + this.seq) >>> 0;
  }

  private xid(peerId: string, key: number) {
    return `${peerId}:${key}`;
  }

  private announce(peerId: string, xfer: Xfer) {
    const slot = this.peers.get(peerId);
    if (!this.aes || !slot?.dc || slot.dc.readyState !== "open" || xfer.announced || xfer.preparing) return;
    xfer.announced = true;
    void this.sendControl(peerId, this.fileMsg(xfer));
  }

  private fileMsg(xfer: Xfer): Control {
    const preview = xfer.preview && xfer.previewKind && !xfer.preview.startsWith("blob:") ? xfer.preview.slice(0, 36_000) : undefined;
    return {
      t: "file",
      key: xfer.key,
      name: xfer.name,
      size: xfer.size,
      mime: xfer.mime,
      ...(preview && xfer.previewKind ? { preview, previewKind: xfer.previewKind } : {}),
    };
  }

  private attachPreview(xfer: Xfer, msg: { preview?: string; previewKind?: PreviewKind }) {
    if (msg.previewKind !== "image" && msg.previewKind !== "text") return;
    if (typeof msg.preview !== "string" || msg.preview.length > 36_000 || msg.preview.startsWith("blob:")) return;
    xfer.preview = msg.preview;
    xfer.previewKind = msg.previewKind;
  }

  private bumpLive(xfer: Xfer, payload: Uint8Array) {
    const textLike = xfer.previewKind === "text" || xfer.mime.startsWith("text/") || /\.(txt|md|json|csv|log|svg)$/i.test(xfer.name);
    if (textLike && (xfer.liveText?.length ?? 0) < 2400) {
      xfer.liveText = ((xfer.liveText ?? "") + new TextDecoder().decode(payload)).slice(0, 2400);
    }
    if (!xfer.mime.startsWith("image/") || xfer.mime.includes("svg") || !xfer.parts || xfer.bytes > 2_000_000) return;
    xfer.liveTicks = (xfer.liveTicks ?? 0) + 1;
    if (xfer.liveTicks % 4 !== 0 && xfer.bytes < xfer.size) return;
    if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
    xfer.liveUrl = URL.createObjectURL(new Blob(xfer.parts as BlobPart[], { type: xfer.mime }));
  }

  private async sendControl(peerId: string, msg: Control) {
    if (!this.aes) return;
    const wire = await this.wrap(msg);
    const xfer = "key" in msg ? this.xfers.get(this.xid(peerId, msg.key)) : undefined;
    const dc = this.peers.get(peerId)?.dc;
    if (dc?.readyState === "open" && xfer?.via !== "relay") {
      dc.send(JSON.stringify(wire));
      return;
    }
    void this.postMail(peerId, msg);
  }

  private async wrap(msg: Control): Promise<Sealed> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.aes!, new TextEncoder().encode(JSON.stringify(msg))),
    );
    return { t: "box", iv: bytesToB64(iv), c: bytesToB64(ct) };
  }

  private async unbox(sealed: Sealed): Promise<Control | null> {
    if (!this.aes) return null;
    try {
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBytes(sealed.iv) },
        this.aes,
        b64ToBytes(sealed.c),
      );
      const msg = JSON.parse(new TextDecoder().decode(plain)) as Control;
      return msg && typeof msg === "object" && "t" in msg ? msg : null;
    } catch {
      this.listeners.onSeal("");
      return null;
    }
  }

  private dropSecret(xfer: Xfer) {
    if (xfer.held) {
      for (const part of xfer.held.values()) wipe(part);
      xfer.held = undefined;
    }
    if (xfer.parts) {
      for (const part of xfer.parts) wipe(part);
      xfer.parts = undefined;
    }
    xfer.file = undefined;
    if (xfer.blobUrl) URL.revokeObjectURL(xfer.blobUrl);
    xfer.blobUrl = undefined;
    if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
    xfer.liveUrl = undefined;
    xfer.preview = undefined;
    xfer.liveText = undefined;
  }

  private pushNote(peerId: string, peerName: string, text: string, direction: "in" | "out") {
    this.noteSeq += 1;
    this.notes.unshift({ id: this.noteSeq, peerId, peerName, text, direction, at: Date.now() });
    if (this.notes.length > 40) this.notes.pop();
    this.listeners.onNotes([...this.notes]);
  }

  private pushAsk(peerId: string, peerName: string) {
    this.askSeq += 1;
    this.asks.unshift({ id: this.askSeq, peerId, peerName: peerName || "Device", at: Date.now() });
    if (this.asks.length > 12) this.asks.pop();
    this.listeners.onAsks([...this.asks]);
  }

  private views(): TransferView[] {
    return [...this.xfers.values()]
      .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0) || b.key - a.key)
      .map((xfer) => ({
        key: xfer.key,
        peerId: xfer.peerId,
        name: xfer.name,
        size: xfer.size,
        mime: xfer.mime,
        direction: xfer.direction,
        status: xfer.status,
        bytes: xfer.bytes,
        startedAt: xfer.startedAt,
        blobUrl: xfer.blobUrl,
        savedToDisk: xfer.savedToDisk,
        bridged: xfer.via === "relay",
        digest: xfer.digest,
        intact: xfer.intact,
        preview: xfer.preview,
        previewKind: xfer.previewKind,
        liveUrl: xfer.liveUrl,
        liveText: xfer.liveText,
        paused: xfer.paused,
        shredded: xfer.shredded,
      }));
  }

  private emitNow() {
    if (this.emitTimer) {
      clearTimeout(this.emitTimer);
      this.emitTimer = null;
    }
    if (!this.closed) this.listeners.onTransfers(this.views());
  }

  private emitSoon() {
    if (this.emitTimer || this.closed) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.listeners.onTransfers(this.views());
    }, 100);
  }

  private schedule(delay: number) {
    if (this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.poll(), delay);
  }

  private nextDelay() {
    for (const xfer of this.xfers.values()) {
      if (xfer.via === "relay" && (xfer.status === "pending" || xfer.status === "active")) return 140;
    }
    return this.connecting() ? FAST_POLL : IDLE_POLL;
  }

  private connecting() {
    for (const slot of this.peers.values()) {
      if (!slot.info.channelOpen) return true;
    }
    return false;
  }

  private async poll() {
    if (this.closed) return;
    try {
      await this.pollOnce();
    } catch {
      if (this.online) {
        this.online = false;
        this.listeners.onSignaling(false);
      }
    }
    this.schedule(this.nextDelay());
  }

  private async pollOnce() {
    const params = new URLSearchParams({
      room: this.room,
      peer: this.selfId,
      name: this.name,
      since: String(this.cursor),
    });
    if (this.pin) params.set("pin", this.pin);
    const res = await fetch(apiPath(`/api/rtc?${params}`));
    if (this.closed) return;
    if (res.status === 403) {
      this.listeners.onPinRequired();
      return;
    }
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as {
      peers: { id: string; name: string }[];
      signals: { id: number; from: string; kind: SignalKind; payload: unknown }[];
      locked?: boolean;
    };
    if (!this.online) {
      this.online = true;
      this.listeners.onSignaling(true);
    }
    this.listeners.onLocked(Boolean(body.locked));
    const roster = new Set(body.peers.map((p) => p.id));
    this.reconcile(body.peers);
    for (const sig of body.signals) {
      this.cursor = Math.max(this.cursor, sig.id);
      if (this.seen.has(sig.id)) continue;
      this.seen.add(sig.id);
      await this.onSignal(sig.from, sig.kind, sig.payload, roster);
      if (this.closed) return;
    }
    try {
      await this.pollMail();
    } catch {
      /* the bridge poll retries on the next tick */
    }
  }

  private reconcile(peers: { id: string; name: string }[]) {
    const alive = new Set(peers.map((p) => p.id));
    for (const peer of peers) {
      if (peer.id === this.selfId) continue;
      const existing = this.peers.get(peer.id);
      if (existing) existing.info.name = peer.name;
      else this.connect(peer.id, peer.name, this.selfId > peer.id);
    }
    for (const [id, slot] of this.peers) {
      if (!alive.has(id)) {
        slot.pc.close();
        this.peers.delete(id);
        this.failPeer(id);
      }
    }
    this.emitPeers();
  }

  private emitPeers() {
    this.listeners.onPeers([...this.peers.values()].map((s) => ({ ...s.info })));
  }

  private connect(peerId: string, name: string, initiator: boolean) {
    if (this.closed) return;
    let releaseGate = () => {};
    const descGate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const pc = new RTCPeerConnection({
      iceCandidatePoolSize: 4,
      bundlePolicy: "max-bundle",
      iceServers: [
        ...defaultIceServers(),
        {
          urls: [
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
          ],
        },
      ],
    });
    const slot: Slot = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      startedAt: Date.now(),
      recovery: 0,
      releaseGate,
      descGate,
      info: {
        id: peerId,
        name: name || "Device",
        connectionState: pc.connectionState,
        channelOpen: false,
        candidateType: null,
      },
    };
    this.peers.set(peerId, slot);
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const init = event.candidate.toJSON();
      void descGate.then(() => this.postSignal(peerId, "ice", init));
    };
    pc.onconnectionstatechange = () => {
      slot.info.connectionState = pc.connectionState;
      if (pc.connectionState === "connected") {
        slot.startedAt = Date.now();
        void this.readPath(slot);
      }
      this.emitPeers();
    };
    pc.onnegotiationneeded = async () => {
      try {
        slot.makingOffer = true;
        await pc.setLocalDescription();
        await waitGather(pc, 1500);
        if (pc.localDescription) await this.postSignal(peerId, "offer", pc.localDescription.toJSON());
      } catch {
        /* the stall watchdog rebuilds a wedged dialer */
      } finally {
        slot.makingOffer = false;
        slot.releaseGate();
      }
    };
    pc.ondatachannel = (event) => this.wire(slot, event.channel);
    if (initiator) {
      this.wire(slot, pc.createDataChannel("files", { ordered: true }));
    }
  }

  private pingAll() {
    const now = Math.round(performance.now());
    for (const slot of this.peers.values()) {
      if (slot.dc?.readyState !== "open") continue;
      slot.dc.send(JSON.stringify({ t: "ping", n: now } satisfies Control));
    }
  }

  private watchdog() {
    if (this.closed) return;
    const now = Date.now();
    this.pingAll();
    for (const [peerId, slot] of this.peers) {
      if (slot.info.channelOpen) continue;
      if (now - slot.startedAt < STALL_MS) continue;
      if (this.selfId <= peerId) continue;
      if (slot.recovery >= 3) continue;
      slot.recovery += 1;
      const name = slot.info.name;
      const attempts = slot.recovery;
      slot.releaseGate();
      slot.pc.close();
      this.peers.delete(peerId);
      this.connect(peerId, name, true);
      const fresh = this.peers.get(peerId);
      if (fresh) fresh.recovery = attempts;
    }
    for (const xfer of this.xfers.values()) {
      if (xfer.direction === "out" && xfer.status === "pending" && !xfer.announced && !xfer.preparing && xfer.size <= RELAY_MAX) {
        void this.relayAnnounce(xfer);
      }
    }
  }

  private wire(slot: Slot, dc: RTCDataChannel) {
    slot.dc = dc;
    dc.binaryType = "arraybuffer";
    dc.bufferedAmountLowThreshold = 768 * 1024;
    dc.onopen = () => {
      slot.info.channelOpen = true;
      slot.info.connectionState = slot.pc.connectionState;
      for (const xfer of this.xfers.values()) {
        if (xfer.peerId === slot.info.id && xfer.direction === "out" && !xfer.announced && !xfer.preparing) {
          this.announce(slot.info.id, xfer);
        }
      }
      this.emitPeers();
    };
    dc.onclose = () => {
      slot.info.channelOpen = false;
      for (const xfer of this.xfers.values()) {
        if (
          xfer.peerId === slot.info.id &&
          xfer.direction === "out" &&
          xfer.status === "pending" &&
          !xfer.announced &&
          !xfer.preparing &&
          xfer.size <= RELAY_MAX
        ) {
          void this.relayAnnounce(xfer);
        }
      }
      this.failPeer(slot.info.id);
      this.emitPeers();
    };
    dc.onmessage = (event) => this.onFrame(slot, event.data);
  }

  private async readPath(slot: Slot) {
    try {
      const stats = await slot.pc.getStats();
      let localId: string | undefined;
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && (report as RTCIceCandidatePairStats).nominated) {
          localId = (report as RTCIceCandidatePairStats).localCandidateId;
        }
      });
      if (!localId) return;
      const local = stats.get(localId) as { candidateType?: string } | undefined;
      slot.info.candidateType = local?.candidateType ?? null;
      this.emitPeers();
    } catch {
      /* diagnostics only */
    }
  }

  private async onSignal(from: string, kind: SignalKind, payload: unknown, roster: Set<string>) {
    let slot = this.peers.get(from);
    if (!slot) {
      if (!roster.has(from)) return;
      this.connect(from, "", false);
      slot = this.peers.get(from);
      if (!slot) return;
    }
    const polite = this.selfId < from;
    const data = unwrap(payload);
    try {
      if (kind === "offer" || kind === "answer") {
        const description = data as RTCSessionDescriptionInit;
        const collision = kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
        slot.ignoreOffer = !polite && collision;
        if (slot.ignoreOffer) return;
        await slot.pc.setRemoteDescription(description);
        await this.flushIce(slot);
        if (kind === "offer") {
          await slot.pc.setLocalDescription();
          await waitGather(slot.pc, 1500);
          if (slot.pc.localDescription) {
            await this.postSignal(from, "answer", slot.pc.localDescription.toJSON());
          }
          slot.releaseGate();
        }
      } else if (kind === "ice") {
        const candidate = data as RTCIceCandidateInit;
        if (!slot.pc.remoteDescription) {
          slot.pendingCandidates.push(candidate);
          return;
        }
        await slot.pc.addIceCandidate(candidate);
      }
    } catch {
      /* the next offer cycle repairs a bad description */
    }
  }

  private async flushIce(slot: Slot) {
    while (slot.pendingCandidates.length) {
      const candidate = slot.pendingCandidates.shift();
      if (!candidate) break;
      try {
        await slot.pc.addIceCandidate(candidate);
      } catch {
        /* ignore late candidates */
      }
    }
  }

  private postSignal(to: string, kind: SignalKind, payload: unknown) {
    const prev = this.signalChain.get(to) ?? Promise.resolve();
    const next = prev.then(async () => {
      if (this.closed) return;
      await fetch(apiPath("/api/rtc"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "signal",
          room: this.room,
          from: this.selfId,
          to,
          kind,
          pin: this.pin || undefined,
          payload,
        }),
      });
    });
    this.signalChain.set(
      to,
      next.catch(() => {}),
    );
    return next;
  }

  private onFrame(slot: Slot, data: unknown) {
    if (typeof data === "string") {
      let msg: Control | Sealed;
      try {
        msg = JSON.parse(data) as Control | Sealed;
      } catch {
        return;
      }
      if (msg.t === "box") {
        void this.takeBox(slot.info.id, msg, slot);
        return;
      }
      this.onControl(slot, msg);
      return;
    }
    if (data instanceof ArrayBuffer) void this.onChunk(slot.info.id, data);
  }

  private async takeBox(from: string, sealed: Sealed, slot?: Slot) {
    if (!this.aes) {
      this.held.push({ from, slot, sealed });
      return;
    }
    const msg = await this.unbox(sealed);
    if (!msg) return;
    if (slot) this.onControl(slot, msg);
    else this.onRelay(from, msg);
  }

  private onControl(slot: Slot, msg: Control) {
    const peerId = slot.info.id;
    if (msg.t === "text") {
      this.pushNote(peerId, slot.info.name, String(msg.text ?? "").slice(0, 4000), "in");
      return;
    }
    if (msg.t === "want") {
      this.pushAsk(peerId, slot.info.name);
      return;
    }
    if (msg.t === "ping") {
      if (slot.dc?.readyState === "open") {
        slot.dc.send(JSON.stringify({ t: "pong", n: msg.n } satisfies Control));
      }
      return;
    }
    if (msg.t === "pong") {
      if (typeof msg.n === "number") {
        slot.info.rttMs = Math.max(0, Math.round(performance.now() - msg.n));
        this.emitPeers();
      }
      return;
    }
    if (msg.t === "file") {
      if (!Number.isFinite(msg.size) || msg.size < 0 || msg.size > MAX_FILE) return;
      const xfer: Xfer = {
        key: msg.key >>> 0,
        peerId,
        name: safeName(String(msg.name ?? "file")).slice(0, 240),
        size: msg.size,
        mime: String(msg.mime ?? "application/octet-stream").slice(0, 120),
        direction: "in",
        status: "pending",
        bytes: 0,
        startedAt: null,
        savedToDisk: false,
      };
      this.attachPreview(xfer, msg);
      this.xfers.set(this.xid(peerId, xfer.key), xfer);
      this.emitNow();
      return;
    }
    const xfer = this.xfers.get(this.xid(peerId, msg.key >>> 0));
    if (!xfer) return;
    if (msg.t === "accept" && xfer.direction === "out" && xfer.status === "pending") {
      xfer.status = "active";
      xfer.startedAt = Date.now();
      this.emitNow();
      if (xfer.via === "relay") void this.relayPump(xfer);
      else void this.pump(xfer, slot);
      return;
    }
    if (msg.t === "reject" && xfer.direction === "out") {
      xfer.status = "rejected";
      this.emitNow();
      return;
    }
    if (msg.t === "cancel") {
      xfer.status = "cancelled";
      xfer.paused = false;
      xfer.resume?.();
      xfer.abort?.abort();
      void xfer.sink?.abort().catch(() => {});
      this.emitNow();
      return;
    }
    if (msg.t === "done" && xfer.direction === "in") {
      if (typeof msg.sha === "string" && /^[a-f0-9]{64}$/.test(msg.sha)) xfer.expected = msg.sha;
      void this.finish(xfer);
    }
  }

  private async onChunk(peerId: string, buf: ArrayBuffer) {
    if (!this.aes || buf.byteLength < 8) return;
    const view = new DataView(buf);
    const key = view.getUint32(0);
    const sealed = new Uint8Array(buf, 8);
    const payload = await unpack(this.aes, sealed);
    if (!payload) return;
    const xfer = this.xfers.get(this.xid(peerId, key));
    if (!xfer || xfer.direction !== "in" || xfer.status !== "active") {
      wipe(payload);
      return;
    }
    xfer.hash?.update(payload);
    xfer.bytes += payload.byteLength;
    if (xfer.sink) {
      const chunk = payload.slice();
      wipe(payload);
      xfer.writeChain = (xfer.writeChain ?? Promise.resolve()).then(async () => {
        await xfer.sink!.write(chunk);
        wipe(chunk);
      });
    } else {
      xfer.parts?.push(payload);
      this.bumpLive(xfer, payload);
    }
    this.emitSoon();
  }

  private async pump(xfer: Xfer, slot: Slot) {
    const dc = slot.dc;
    const file = xfer.file;
    if (!dc || !file || xfer.pumping) return;
    xfer.pumping = true;
    const abort = new AbortController();
    xfer.abort = abort;
    xfer.hash = new Sha256();
    try {
      if (file.size === 0) {
        this.seal(xfer);
        void this.sendControl(xfer.peerId, this.doneMsg(xfer));
        xfer.bytes = 0;
        xfer.status = "done";
        this.dropSecret(xfer);
        xfer.shredded = true;
        this.emitNow();
        return;
      }
      const reader = file.stream().getReader();
      let offset = 0;
      while (!abort.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        let start = 0;
        while (start < value.length) {
          if (abort.signal.aborted || dc.readyState !== "open") return;
          const end = Math.min(start + DIRECT_CHUNK, value.length);
          const piece = value.subarray(start, end);
          await waitForRoom(dc, abort.signal);
          if (abort.signal.aborted || dc.readyState !== "open") return;
          await this.hold(xfer);
          if (abort.signal.aborted || xfer.status === "cancelled" || dc.readyState !== "open") return;
          xfer.hash?.update(piece);
          const sealed = await pack(this.aes!, piece);
          wipe(piece);
          dc.send(encodeChunk(xfer.key, offset, sealed));
          offset += piece.byteLength;
          start = end;
          xfer.bytes = offset;
          this.emitSoon();
        }
      }
      if (abort.signal.aborted || xfer.status === "cancelled") return;
      this.seal(xfer);
      void this.sendControl(xfer.peerId, this.doneMsg(xfer));
      xfer.status = "done";
      xfer.bytes = xfer.size;
      this.dropSecret(xfer);
      xfer.shredded = true;
      this.emitNow();
    } catch {
      if (xfer.status === "active") {
        xfer.status = "failed";
        this.emitNow();
      }
    }
  }

  private async finish(xfer: Xfer) {
    if (xfer.status === "done" || xfer.status === "cancelled") return;
    try {
      if (xfer.sink) {
        await xfer.writeChain;
        await xfer.sink.close();
        xfer.savedToDisk = true;
      } else {
        const blob = new Blob((xfer.parts ?? []) as BlobPart[], { type: xfer.mime });
        if (xfer.parts) for (const part of xfer.parts) wipe(part);
        xfer.blobUrl = URL.createObjectURL(blob);
        xfer.parts = undefined;
        triggerDownload(xfer.blobUrl, xfer.name);
      }
      xfer.bytes = xfer.size;
      xfer.status = "done";
      const local = xfer.hash?.hex();
      if (local) xfer.digest = local;
      if (xfer.expected && local) xfer.intact = xfer.expected === local;
      if (xfer.blobUrl && xfer.liveUrl?.startsWith("blob:") && xfer.liveUrl !== xfer.blobUrl) {
        URL.revokeObjectURL(xfer.liveUrl);
        xfer.liveUrl = undefined;
      }
      if (xfer.sink && this.shredAfter) {
        this.dropSecret(xfer);
        xfer.shredded = true;
        xfer.savedToDisk = true;
      }
    } catch {
      xfer.status = "failed";
    }
    this.emitNow();
  }

  private seal(xfer: Xfer) {
    const sha = xfer.hash?.hex();
    if (!sha) return;
    xfer.digest = sha;
    xfer.intact = true;
  }

  private doneMsg(xfer: Xfer): Control {
    return { t: "done", key: xfer.key, sha: xfer.digest };
  }

  private failPeer(peerId: string) {
    let changed = false;
    for (const xfer of this.xfers.values()) {
      if (xfer.via === "relay") continue;
      if (xfer.peerId === peerId && xfer.status === "active") {
        xfer.status = "failed";
        xfer.paused = false;
        xfer.resume?.();
        xfer.abort?.abort();
        changed = true;
      }
    }
    if (changed) this.emitNow();
  }

  private async relayAnnounce(xfer: Xfer) {
    if (!this.aes || xfer.announced || xfer.size > RELAY_MAX) return;
    xfer.via = "relay";
    xfer.announced = true;
    const ok = await this.postMail(xfer.peerId, this.fileMsg(xfer));
    if (!ok && xfer.status === "pending") {
      xfer.status = "failed";
      this.emitNow();
    }
  }

  private async relayPump(xfer: Xfer) {
    const file = xfer.file;
    if (!file || xfer.pumping) return;
    xfer.pumping = true;
    const abort = new AbortController();
    xfer.abort = abort;
    xfer.hash = new Sha256();
    try {
      if (file.size === 0) {
        this.seal(xfer);
        await this.postMail(xfer.peerId, this.doneMsg(xfer));
        xfer.status = "done";
        this.dropSecret(xfer);
        xfer.shredded = true;
        this.emitNow();
        return;
      }
      const reader = file.stream().getReader();
      const queue: { at: number; b64: string; len: number }[] = [];
      const waiters: (() => void)[] = [];
      let readDone = false;
      let failed = false;
      const wake = () => {
        const next = waiters.shift();
        next?.();
      };
      const pushJob = async (job: { at: number; b64: string; len: number }) => {
        while (queue.length >= RELAY_LANES * 2 && !failed && !abort.signal.aborted) {
          await new Promise<void>((resolve) => waiters.push(resolve));
        }
        if (failed || abort.signal.aborted) return;
        queue.push(job);
        wake();
      };
      const pullJob = async () => {
        while (!queue.length && !readDone && !failed && !abort.signal.aborted) {
          await new Promise<void>((resolve) => waiters.push(resolve));
        }
        const job = queue.shift() ?? null;
        if (job) wake();
        return job;
      };
      const lane = async () => {
        for (;;) {
          const job = await pullJob();
          if (!job || failed) return;
          await this.hold(xfer);
          if (abort.signal.aborted || xfer.status === "cancelled") return;
          const ok = await this.postMail(xfer.peerId, { t: "chunk", key: xfer.key, at: job.at, b64: job.b64 });
          if (!ok) {
            failed = true;
            abort.abort();
            while (waiters.length) waiters.shift()?.();
            return;
          }
          xfer.bytes += job.len;
          this.emitSoon();
          wake();
        }
      };
      const lanes = Array.from({ length: RELAY_LANES }, () => lane());
      let offset = 0;
      while (!abort.signal.aborted && !failed) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        let start = 0;
        while (start < value.length && !failed && !abort.signal.aborted) {
          const end = Math.min(start + RELAY_CHUNK, value.length);
          const piece = value.subarray(start, end);
          const at = offset;
          const len = piece.byteLength;
          xfer.hash?.update(piece);
          const sealed = await pack(this.aes!, piece);
          wipe(piece);
          await pushJob({ at, b64: bytesToB64(sealed), len });
          offset += len;
          start = end;
        }
      }
      readDone = true;
      while (waiters.length) waiters.shift()?.();
      await Promise.all(lanes);
      if (failed) throw new Error("bridge");
      if (abort.signal.aborted || xfer.status === "cancelled") return;
      this.seal(xfer);
      await this.postMail(xfer.peerId, this.doneMsg(xfer));
      xfer.status = "done";
      xfer.bytes = xfer.size;
      this.dropSecret(xfer);
      xfer.shredded = true;
      this.emitNow();
    } catch {
      if (xfer.status === "active") {
        xfer.status = "failed";
        this.emitNow();
      }
    }
  }

  private async pollMail() {
    const res = await fetch(apiPath(`/api/slip?room=${this.room}&peer=${this.selfId}${this.pin ? `&pin=${this.pin}` : ""}`));
    if (res.status === 403) {
      this.listeners.onPinRequired();
      return;
    }
    if (!res.ok || this.closed) return;
    const body = (await res.json()) as { messages?: { from: string; payload: unknown }[] };
    for (const message of body.messages ?? []) {
      const payload = unwrap(message.payload) as Control | Sealed;
      if (!payload || typeof payload !== "object" || !("t" in payload)) continue;
      if (payload.t === "box") {
        void this.takeBox(message.from, payload);
        continue;
      }
      this.onRelay(message.from, payload);
    }
  }

  private async postMail(to: string, payload: Control) {
    if (!this.aes) return false;
    try {
      const wire = await this.wrap(payload);
      const res = await fetch(apiPath("/api/slip"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "send",
          room: this.room,
          from: this.selfId,
          to,
          pin: this.pin || undefined,
          payload: wire,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async takeRelayChunk(xfer: Xfer, b64: string, at: number) {
    if (!this.aes) return;
    const sealed = b64ToBytes(b64);
    const payload = await unpack(this.aes, sealed);
    wipe(sealed);
    if (!payload || xfer.status !== "active") {
      if (payload) wipe(payload);
      return;
    }
    if (at < xfer.bytes || xfer.held?.has(at)) {
      wipe(payload);
      return;
    }
    if (at !== xfer.bytes) {
      xfer.held ??= new Map();
      xfer.held.set(at, payload);
      return;
    }
    this.applyRelayPiece(xfer, payload);
    while (xfer.held?.has(xfer.bytes)) {
      const next = xfer.held.get(xfer.bytes)!;
      xfer.held.delete(xfer.bytes);
      this.applyRelayPiece(xfer, next);
    }
    this.emitSoon();
  }

  private applyRelayPiece(xfer: Xfer, payload: Uint8Array) {
    xfer.hash?.update(payload);
    xfer.bytes += payload.byteLength;
    if (xfer.sink) {
      const chunk = payload.slice();
      wipe(payload);
      xfer.writeChain = (xfer.writeChain ?? Promise.resolve()).then(async () => {
        await xfer.sink!.write(chunk);
        wipe(chunk);
      });
    } else {
      xfer.parts?.push(payload);
      this.bumpLive(xfer, payload);
    }
  }

  private onRelay(from: string, msg: Control) {
    if (!this.peers.has(from)) this.connect(from, "", this.selfId > from);
    const slot = this.peers.get(from);
    if (!slot) return;
    if (msg.t === "text") {
      this.pushNote(from, slot.info.name, String(msg.text ?? "").slice(0, 4000), "in");
      return;
    }
    if (msg.t === "file") {
      if (!Number.isFinite(msg.size) || msg.size < 0 || msg.size > RELAY_MAX) return;
      const key = msg.key >>> 0;
      if (this.xfers.has(this.xid(from, key))) return;
      this.xfers.set(this.xid(from, key), {
        key,
        peerId: from,
        name: safeName(String(msg.name ?? "file")).slice(0, 240),
        size: msg.size,
        mime: String(msg.mime ?? "application/octet-stream").slice(0, 120),
        direction: "in",
        status: "pending",
        bytes: 0,
        startedAt: null,
        savedToDisk: false,
        via: "relay",
      });
      const created = this.xfers.get(this.xid(from, key));
      if (created) this.attachPreview(created, msg);
      this.emitNow();
      return;
    }
    if (msg.t === "chunk") {
      if (typeof msg.b64 !== "string" || !this.aes) return;
      const xfer = this.xfers.get(this.xid(from, msg.key >>> 0));
      if (!xfer || xfer.direction !== "in" || xfer.status !== "active") return;
      const at = typeof msg.at === "number" && Number.isFinite(msg.at) ? msg.at >>> 0 : xfer.bytes;
      xfer.chunkChain = (xfer.chunkChain ?? Promise.resolve()).then(() => this.takeRelayChunk(xfer, msg.b64, at));
      return;
    }
    if (msg.t === "done") {
      const xfer = this.xfers.get(this.xid(from, msg.key >>> 0));
      if (xfer?.direction === "in") {
        xfer.chunkChain = (xfer.chunkChain ?? Promise.resolve()).then(async () => {
          if (typeof msg.sha === "string" && /^[a-f0-9]{64}$/.test(msg.sha)) xfer.expected = msg.sha;
          await this.finish(xfer);
        });
        return;
      }
    }
    this.onControl(slot, msg);
  }
}

function unwrap(payload: unknown): unknown {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return payload;
    }
  }
  return payload;
}

function waitGather(pc: RTCPeerConnection, ms: number) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      if (pc.iceGatheringState !== "complete") return;
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", done);
      resolve();
    };
    const timer = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", done);
      resolve();
    }, ms);
    pc.addEventListener("icegatheringstatechange", done);
  });
}

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
  }
  return btoa(bin);
}

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function encodeChunk(key: number, offset: number, data: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(8 + data.byteLength);
  const view = new DataView(buf);
  view.setUint32(0, key);
  view.setUint32(4, offset);
  new Uint8Array(buf, 8).set(data);
  return buf;
}

function waitForRoom(dc: RTCDataChannel, signal: AbortSignal) {
  if (signal.aborted || dc.bufferedAmount < 2_097_152) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      dc.onbufferedamountlow = null;
      signal.removeEventListener("abort", done);
      resolve();
    };
    signal.addEventListener("abort", done);
    dc.onbufferedamountlow = done;
  });
}

function triggerDownload(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  const slash = name.lastIndexOf("/");
  link.download = slash >= 0 ? name.slice(slash + 1) : name;
  link.click();
}
