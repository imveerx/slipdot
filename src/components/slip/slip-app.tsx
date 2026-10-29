import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  Copy,
  Camera,
  FolderPlus,
  FolderUp,
  Link2,
  Lock,
  Mic,
  Moon,
  Pause,
  Play,
  ScanLine,
  Send,
  ShieldCheck,
  Sun,
  Upload,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { SlipRoom, type AskView, type NoteView, type SlipPeer, type TransferView } from "@/lib/transfer/room";
import { drawSlipQr } from "@/lib/transfer/mark-qr";
import { filesFromDataTransfer } from "@/lib/transfer/drop";
import { mintSealToken, sealFromLink } from "@/lib/transfer/cipher";
import { randomDeviceName, storedDeviceName } from "@/lib/transfer/names";
import {
  baseName,
  formatBytes,
  formatEta,
  formatRate,
  makeCode,
  parseRoom,
  pathLabel,
} from "@/lib/transfer/format";

type Props = {
  room?: string;
  pin?: string;
  onRoom: (room: string | undefined, pin?: string) => void;
};

export function SlipApp({ room, pin, onRoom }: Props) {
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [seal, setSeal] = useState<string | undefined>();

  useEffect(() => {
    setName(storedDeviceName());
    setReady(true);
  }, []);

  function remember(next: string) {
    const clean = next.trim().slice(0, 24) || randomDeviceName();
    setName(clean);
    localStorage.setItem("slip-name", clean);
    return clean;
  }

  function host() {
    remember(name);
    setNotice(null);
    const code = makeCode();
    const token = mintSealToken();
    sessionStorage.setItem(`slip-seal:${code}`, token);
    setSeal(token);
    onRoom(code);
  }

  function join(raw: string) {
    const code = parseRoom(raw);
    if (!code) {
      setNotice("Enter a 4–8 character room code, or a Slip link.");
      return;
    }
    remember(name);
    setNotice(null);
    setScanning(false);
    let nextPin: string | undefined;
    const token = sealFromLink(raw);
    if (token) sessionStorage.setItem(`slip-seal:${code}`, token);
    try {
      const fromLink = new URL(raw.trim()).searchParams.get("pin") ?? "";
      if (/^[0-9]{4}$/.test(fromLink)) nextPin = fromLink;
    } catch {
      /* a bare code has no pin */
    }
    onRoom(code, nextPin);
  }

  useEffect(() => {
    if (!room) {
      setSeal(undefined);
      return;
    }
    const fromHash = sealFromLink(window.location.href);
    const fromSession = sessionStorage.getItem(`slip-seal:${room}`) ?? "";
    const token = fromHash || (fromSession && sealFromLink(`http://local/#k=${fromSession}`) ? fromSession : "");
    if (!token) {
      setSeal(undefined);
      return;
    }
    sessionStorage.setItem(`slip-seal:${room}`, token);
    setSeal(token);
    const url = new URL(window.location.href);
    if (url.hash !== `#k=${token}`) {
      url.hash = `k=${token}`;
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [room]);

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        {room ? (
          <Room
            code={room}
            pin={pin}
            seal={seal}
            name={name}
            ready={ready}
            onName={(value) => {
              setName(value.slice(0, 24));
            }}
            onLeave={() => onRoom(undefined)}
            onPin={(next) => onRoom(room, next)}
            onSeal={(token) => {
              sessionStorage.setItem(`slip-seal:${room}`, token);
              setSeal(token);
              const url = new URL(window.location.href);
              url.hash = `k=${token}`;
              window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
            }}
          />
        ) : (
          <Lobby
            name={name}
            ready={ready}
            draft={draft}
            notice={notice}
            onName={setName}
            onDraft={setDraft}
            onHost={host}
            onJoin={() => join(draft)}
            onScan={() => {
              setNotice(null);
              setScanning(true);
            }}
          />
        )}
      </div>
      {scanning ? (
        <Scanner
          onClose={() => setScanning(false)}
          onCode={(raw) => join(raw)}
        />
      ) : null}
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-3xl leading-none font-medium tracking-tight">Slip</span>
      <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
    </div>
  );
}

function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const on = document.documentElement.dataset.theme === "light";
    setLight(on);
  }, []);
  function apply(next: boolean) {
    setLight(next);
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem("slip-theme", next ? "light" : "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#e7e1d4" : "#0e1411");
  }
  return (
    <button
      type="button"
      className="btn btn-ghost size-12 shrink-0 px-0"
      aria-label={light ? "Use dark mode" : "Use light mode"}
      onClick={() => apply(!light)}
    >
      {light ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </button>
  );
}

function Lobby({
  name,
  ready,
  draft,
  notice,
  onName,
  onDraft,
  onHost,
  onJoin,
  onScan,
}: {
  name: string;
  ready: boolean;
  draft: string;
  notice: string | null;
  onName: (value: string) => void;
  onDraft: (value: string) => void;
  onHost: () => void;
  onJoin: () => void;
  onScan: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <div className="flex items-center justify-between gap-4">
        <Wordmark />
        <ThemeToggle />
      </div>
      <h1 className="font-display mt-10 text-5xl leading-none font-medium sm:text-6xl">Hand it across.</h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        Host a room, or join with a code or a scan. The file is never stored. Same Wi-Fi is faster. Any network still works.
      </p>
      <section className="sheet mt-8 p-5 sm:p-6">
        <label className="block text-sm font-medium" htmlFor="device-name">
          Your name
        </label>
        <input
          id="device-name"
          className="field mt-2"
          value={name}
          maxLength={24}
          placeholder="Name"
          onChange={(event) => onName(event.target.value)}
        />
        <button type="button" className="btn btn-primary mt-4 w-full" disabled={!ready} onClick={onHost}>
          Host a room
        </button>
        <div className="my-5 flex items-center gap-3 text-sm text-muted">
          <span className="h-px flex-1 bg-line" />
          or join
          <span className="h-px flex-1 bg-line" />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onJoin();
          }}
          className="space-y-3"
        >
          <label className="sr-only" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            className="field text-center font-display text-xl tracking-widest uppercase"
            value={draft}
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="CODE"
            onChange={(event) => onDraft(event.target.value.toUpperCase())}
          />
          <button type="submit" className="btn btn-ghost w-full" disabled={!ready || draft.trim().length < 4}>
            Join with code
          </button>
        </form>
        <button type="button" className="btn btn-ghost mt-3 w-full" onClick={onScan}>
          <ScanLine className="size-5" />
          Scan a QR
        </button>
        {notice ? (
          <p className="mt-4 text-sm text-muted" role="status">
            {notice}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">You approve every file that comes in.</p>
        )}
      </section>
    </div>
  );
}

function Room({
  code,
  pin,
  seal,
  name,
  ready,
  onName,
  onLeave,
  onPin,
  onSeal,
}: {
  code: string;
  pin?: string;
  seal?: string;
  name: string;
  ready: boolean;
  onName: (value: string) => void;
  onLeave: () => void;
  onPin: (pin?: string) => void;
  onSeal: (token: string) => void;
}) {
  const roomRef = useRef<SlipRoom | null>(null);
  const [peers, setPeers] = useState<SlipPeer[]>([]);
  const [transfers, setTransfers] = useState<TransferView[]>([]);
  const [notes, setNotes] = useState<NoteView[]>([]);
  const [asks, setAsks] = useState<AskView[]>([]);
  const [online, setOnline] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | "note" | "key" | null>(null);
  const [hint, setHint] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [shredAfter, setShredAfter] = useState(true);
  const [forgetAfter, setForgetAfter] = useState<0 | 60 | 300>(0);
  const [chime, setChime] = useState(false);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [hoverPeer, setHoverPeer] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [everyone, setEveryone] = useState(false);
  const [skipDupes, setSkipDupes] = useState(false);
  const [shrinkPhotos, setShrinkPhotos] = useState(false);
  const [stayFor, setStayFor] = useState<0 | 15 | 60>(0);
  const [autoAccept, setAutoAccept] = useState(false);
  const [notify, setNotify] = useState(false);
  const [pinNeeded, setPinNeeded] = useState(false);
  const [roomLocked, setRoomLocked] = useState(Boolean(pin));
  const [pinDraft, setPinDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const queuedFiles = useRef<File[]>([]);
  const forcedPeer = useRef<string | null>(null);
  const seenIncoming = useRef(new Set<string>());
  const accepting = useRef(new Set<string>());
  const dragDepth = useRef(0);
  const photoRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const folderHandle = useRef<FileSystemDirectoryHandle | null>(null);
  const forgetTimers = useRef(new Map<string, number>());
  const chimeReady = useRef(false);
  const peerCount = useRef(0);
  const heard = useRef(new Set<string>());

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", code);
    if (pin) url.searchParams.set("pin", pin);
    else url.searchParams.delete("pin");
    url.hash = seal ? `k=${seal}` : "";
    setHref(url.toString());
  }, [code, pin, seal]);

  useEffect(() => {
    let slip: SlipRoom | null = null;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const id = makeCode(8);
      const saved = (localStorage.getItem("slip-name") || name || randomDeviceName()).slice(0, 24);
      const token = sessionStorage.getItem(`slip-seal:${code}`) || seal || "";
      setPeers([]);
      setTransfers([]);
      setNotes([]);
      setAsks([]);
      setOnline(false);
      setSelected(null);
      slip = new SlipRoom(
        { room: code, selfId: id, name: saved, pin, seal: token },
        {
          onPeers: setPeers,
          onTransfers: setTransfers,
          onNotes: setNotes,
          onAsks: setAsks,
          onSignaling: setOnline,
          onPinRequired: () => setPinNeeded(true),
          onLocked: (locked) => {
            setRoomLocked(locked);
            setPinNeeded(false);
          },
          onSeal: (next) => setHint(next),
        },
      );
      roomRef.current = slip;
      void slip.join();
    }, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      slip?.close();
      if (slip && roomRef.current === slip) roomRef.current = null;
    };
    // The room id is the session. Renames go through setName.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!ready) return;
    const clean = name.trim().slice(0, 24) || randomDeviceName();
    localStorage.setItem("slip-name", clean);
    roomRef.current?.setName(clean);
  }, [name, ready]);

  useEffect(() => {
    roomRef.current?.setPin(pin ?? "");
    if (seal) void roomRef.current?.useSeal(seal);
  }, [pin, seal]);

  useEffect(() => {
    roomRef.current?.setShred(shredAfter);
  }, [shredAfter]);

  const openedAt = useRef(Date.now());
  const closeRef = useRef<() => void>(() => {});
  const [closing, setClosing] = useState<ClosingSlip | null>(null);

  function beginLeave() {
    setClosing(
      (current) =>
        current ??
        buildClosingSlip({
          code,
          openedAt: openedAt.current,
          peers,
          transfers,
          notes: notes.length,
        }),
    );
  }
  closeRef.current = beginLeave;

  useEffect(() => {
    if (!stayFor) return;
    const timer = window.setTimeout(() => closeRef.current(), stayFor * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [stayFor]);

  useEffect(() => {
    setChime(localStorage.getItem("slip-chime") === "on");
  }, []);

  useEffect(() => {
    if (!chimeReady.current) {
      chimeReady.current = true;
      peerCount.current = peers.length;
      for (const item of transfers) {
        if (item.status === "done") heard.current.add(`${item.direction}:${item.peerId}:${item.key}`);
      }
      return;
    }
    const joined = peers.length > peerCount.current;
    peerCount.current = peers.length;
    let finished = false;
    for (const item of transfers) {
      if (item.status !== "done") continue;
      const id = `${item.direction}:${item.peerId}:${item.key}`;
      if (heard.current.has(id)) continue;
      heard.current.add(id);
      finished = true;
    }
    if (chime && (joined || finished)) playChime();
  }, [chime, peers.length, transfers]);

  useEffect(() => {
    const timers = forgetTimers.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!forgetAfter) {
      for (const timer of forgetTimers.current.values()) window.clearTimeout(timer);
      forgetTimers.current.clear();
      return;
    }
    for (const item of transfers) {
      if (item.direction !== "in" || item.status !== "done" || item.shredded) continue;
      const id = `${item.peerId}:${item.key}`;
      if (forgetTimers.current.has(id)) continue;
      const timer = window.setTimeout(() => {
        forgetTimers.current.delete(id);
        roomRef.current?.shred(item.peerId, item.key);
      }, forgetAfter * 1000);
      forgetTimers.current.set(id, timer);
    }
  }, [forgetAfter, transfers]);

  useEffect(() => {
    if (selected && peers.some((peer) => peer.id === selected)) return;
    const next = peers.find((peer) => peer.channelOpen) ?? peers[0];
    setSelected(next?.id ?? null);
  }, [peers, selected]);

  const busy = transfers.some((item) => item.status === "active");
  useEffect(() => {
    if (!busy || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancel = false;
    void navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (cancel) void sentinel.release();
        else lock = sentinel;
      })
      .catch(() => {});
    return () => {
      cancel = true;
      void lock?.release();
    };
  }, [busy]);

  function targetPeer() {
    if (selected && peers.some((peer) => peer.id === selected)) return selected;
    return peers.find((peer) => peer.channelOpen)?.id ?? null;
  }

  function sendFiles(list: File[]) {
    const forced = forcedPeer.current;
    forcedPeer.current = null;
    if (!list.length) return;
    void deliver(list, forced);
  }

  async function deliver(list: File[], forced: string | null) {
    const notes: string[] = [];
    let next = list;
    if (skipDupes) {
      const kept = next.filter(
        (file) =>
          !transfers.some(
            (item) =>
              item.direction === "out" &&
              item.name === file.name &&
              item.size === file.size &&
              (item.status === "pending" || item.status === "active" || item.status === "done"),
          ),
      );
      const dropped = next.length - kept.length;
      if (dropped) notes.push(dropped === 1 ? "Skipped 1 already sent." : `Skipped ${dropped} already sent.`);
      next = kept;
    }
    if (!next.length) {
      setNotice(notes.join(" ") || "Nothing to send.");
      return;
    }
    if (shrinkPhotos) {
      const shrunk = await Promise.all(next.map(shrinkImage));
      const saved = next.reduce((sum, file, index) => sum + Math.max(0, file.size - shrunk[index].size), 0);
      if (saved > 4096) notes.push(`Photos reduced by ${formatBytes(saved)}.`);
      next = shrunk;
    }
    next = [...next].sort((a, b) => a.size - b.size);
    if (forced) {
      roomRef.current?.clearAsks(forced);
      roomRef.current?.sendFiles(forced, next);
      setNotice(notes.join(" ") || null);
      return;
    }
    if (everyone && peers.length > 0) {
      const count = roomRef.current?.sendToAll(next) ?? 0;
      const offer = count > 1 ? `Offered to ${count} devices.` : "";
      setNotice([offer, ...notes].filter(Boolean).join(" ") || null);
      return;
    }
    const peerId = targetPeer();
    if (!peerId) {
      queuedFiles.current.push(...next);
      setNotice(["Queued until a device joins.", ...notes].filter(Boolean).join(" "));
      return;
    }
    roomRef.current?.sendFiles(peerId, next);
    setNotice(notes.join(" ") || null);
  }

  const sendRef = useRef(sendFiles);
  sendRef.current = sendFiles;

  async function takeDrop(data: DataTransfer | null, peerId?: string) {
    const files = await filesFromDataTransfer(data);
    if (peerId) forcedPeer.current = peerId;
    sendRef.current(files);
  }

  async function sinkFor(name: string) {
    const dir = folderHandle.current;
    if (!dir) return pickSink(name);
    try {
      const handle = await dir.getFileHandle(baseName(name), { create: true });
      return await handle.createWritable();
    } catch {
      return undefined;
    }
  }

  async function acceptItem(item: TransferView) {
    const sink = await sinkFor(item.name);
    roomRef.current?.accept(item.peerId, item.key, sink);
  }

  async function chooseFolder() {
    const picker = (
      window as Window & {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (!picker) {
      setNotice("This browser can’t pick a save folder. Files download instead.");
      return;
    }
    try {
      const handle = await picker();
      folderHandle.current = handle;
      setFolderName(handle.name);
      setNotice(null);
    } catch {
      /* the picker was dismissed */
    }
  }

  async function toggleRecording() {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser can’t record audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        sendRef.current([file]);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setNotice(null);
    } catch {
      setNotice("Microphone permission was blocked.");
    }
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const files = [...(event.clipboardData?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      sendRef.current(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    if (!autoAccept) return;
    for (const item of transfers) {
      if (item.direction !== "in" || item.status !== "pending") continue;
      const id = `${item.peerId}:${item.key}`;
      if (accepting.current.has(id)) continue;
      accepting.current.add(id);
      roomRef.current?.accept(item.peerId, item.key);
    }
  }, [autoAccept, transfers]);

  useEffect(() => {
    if (!notify || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const item of transfers) {
      if (item.direction !== "in" || item.status !== "pending") continue;
      const id = `${item.peerId}:${item.key}`;
      if (seenIncoming.current.has(id)) continue;
      seenIncoming.current.add(id);
      new Notification("Slip", { body: `${baseName(item.name)} is waiting` });
    }
  }, [notify, transfers]);

  useEffect(() => {
    if (!peers.length || queuedFiles.current.length === 0) return;
    const peerId = peers.find((peer) => peer.channelOpen)?.id ?? peers[0]?.id;
    if (!peerId) return;
    const files = queuedFiles.current.splice(0);
    roomRef.current?.sendFiles(peerId, files);
    setNotice(null);
  }, [peers]);

  async function copy(kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "code" ? code : href);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1600);
    } catch {
      setNotice("Copy was blocked by the browser.");
    }
  }

  const selectedPeer = peers.find((peer) => peer.id === selected) ?? null;
  const bridged = transfers.some((item) => item.bridged);
  const finished = transfers.some((item) => item.status !== "active" && item.status !== "pending");

  return (
    <div
      onDragEnter={(event) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if ([...event.dataTransfer.types].includes("Files")) event.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) {
          setDragging(false);
          setHoverPeer(null);
        }
      }}
      onDrop={(event) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        setHoverPeer(null);
        void takeDrop(event.dataTransfer);
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Wordmark />
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="room-device-name">
            Device name
          </label>
          <input
            id="room-device-name"
            className="field w-36 sm:w-44"
            value={name}
            maxLength={24}
            onChange={(event) => onName(event.target.value)}
          />
          <ThemeToggle />
          <button type="button" className="btn btn-ghost" onClick={beginLeave}>
            Leave
          </button>
        </div>
      </header>

      {!online ? (
        <p className="mt-4 text-sm text-muted" role="status">
          Opening the room…
        </p>
      ) : null}

      <div className="mt-8 space-y-5">
        <div className="space-y-5">
          <section className="sheet p-5 sm:p-7">
            <p className="text-sm font-medium text-muted">Give this to the other device</p>
            <p className="font-display mt-1 text-5xl tracking-widest">{code}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">Scan the mark, or type the code. The key travels with the link.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => void copy("code")}>
                {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === "code" ? "Copied" : "Copy code"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void copy("link")} disabled={!href}>
                {copied === "link" ? <Check className="size-4" /> : <Link2 className="size-4" />}
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
              {href && typeof navigator.share === "function" ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    void navigator.share({ title: "Slip", url: href }).catch(() => {});
                  }}
                >
                  <Send className="size-4" />
                  Share
                </button>
              ) : null}
              <button
                type="button"
                className={pin ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => {
                  const next = pin ? "" : String(1000 + Math.floor(Math.random() * 9000));
                  void roomRef.current?.lock(next).then((ok) => {
                    if (!ok) {
                      setNotice("Couldn’t change the room lock.");
                      return;
                    }
                    onPin(next || undefined);
                    setRoomLocked(Boolean(next));
                    setNotice(next ? `Room locked. PIN ${next}.` : null);
                  });
                }}
              >
                <Lock className="size-4" />
                {pin ? `PIN ${pin}` : "Lock room"}
              </button>
            </div>
            {roomLocked && pin ? (
              <p className="mt-3 text-sm text-muted">New devices need this PIN. The QR includes it.</p>
            ) : null}
            {seal ? (
              <div className="mt-4">
                <p className="text-sm text-muted">
                  Sealed{hint ? ` · ${hint}` : ""}. The link carries the key. It never goes to the room server.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="max-w-full rounded-xl bg-surface-2 px-3 py-2 text-sm break-all tracking-wide">{seal}</code>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(seal).then(() => {
                        setCopied("key");
                        window.setTimeout(() => setCopied((current) => (current === "key" ? null : current)), 1600);
                      }).catch(() => setNotice("Copy was blocked by the browser."));
                    }}
                  >
                    {copied === "key" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied === "key" ? "Copied" : "Copy key"}
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="mt-4 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const token = keyDraft.trim();
                  void roomRef.current?.useSeal(token).then((ok) => {
                    if (!ok) {
                      setNotice("That key isn’t valid.");
                      return;
                    }
                    onSeal(token);
                    setNotice(null);
                  });
                }}
              >
                <p className="text-sm text-muted">Paste the host’s encryption key. Files stay sealed until this device has it.</p>
                <input
                  className="field"
                  value={keyDraft}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Encryption key"
                  onChange={(event) => setKeyDraft(event.target.value.trim())}
                />
                <button type="submit" className="btn btn-primary" disabled={keyDraft.length < 22}>
                  Use key
                </button>
              </form>
            )}
            {href ? <RoomQr value={href} /> : null}
          </section>

          <section className="rounded-3xl bg-surface p-5 shadow-ring">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-medium">Devices</h2>
              <span className="text-sm text-muted tabular-nums">{peers.length} here</span>
            </div>
            {peers.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Nobody else yet. You're hosting. Leave and the room forgets you.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {peers.map((peer) => {
                  const active = peer.id === selected;
                  return (
                    <li
                      key={peer.id}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setHoverPeer(peer.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        dragDepth.current = 0;
                        setDragging(false);
                        setHoverPeer(null);
                        void takeDrop(event.dataTransfer, peer.id);
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(peer.id)}
                        className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ${
                          hoverPeer === peer.id
                            ? "bg-surface-2 shadow-ring-strong"
                            : active
                              ? "bg-surface-2 shadow-ring-strong"
                              : dragging
                                ? "bg-surface-2 shadow-ring"
                                : "bg-surface-2 shadow-ring"
                        }`}
                      >
                        <span>
                          <span className="block font-semibold">{peer.name || "Device"}</span>
                          <span className="block text-sm text-muted">
                            {dragging
                              ? "Drop to send here"
                              : `${pathLabel(peer.candidateType, peer.connectionState, peer.channelOpen)}${peer.rttMs != null ? ` · ${peer.rttMs} ms` : ""}`}
                          </span>
                        </span>
                        <span
                          className={`size-2.5 rounded-full ${peer.channelOpen ? "bg-primary" : "bg-line"}`}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {bridged ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The file still goes if you are not on the same Wi-Fi. This one is crossing an encrypted bridge and is deleted as soon as the other device has it.
              </p>
            ) : null}
          </section>
        </div>

        <section className="space-y-5">
          <div
            className={`sheet border-2 border-dashed px-5 py-10 text-center ${
              dragging ? "border-primary" : "border-line"
            }`}
          >
            <Upload className="mx-auto size-6 text-primary" />
            <p className="mt-3 font-semibold">
              {everyone && peers.length > 1
                ? "Send to everyone"
                : selectedPeer
                  ? `Send to ${selectedPeer.name || "device"}`
                  : "Drop files"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              {autoAccept
                ? "Auto-accept is on, so incoming files save without asking."
                : "Drop files or a folder on a device. Anywhere else sends to the selected one."}
            </p>
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                Choose files
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => folderRef.current?.click()}>
                <FolderUp className="size-4" />
                Choose a folder
              </button>
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              multiple
              onChange={(event) => {
                sendFiles([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
            <input
              ref={(node) => {
                folderRef.current = node;
                node?.setAttribute("webkitdirectory", "");
                node?.setAttribute("directory", "");
              }}
              className="sr-only"
              type="file"
              multiple
              onChange={(event) => {
                const files = [...(event.target.files ?? [])].map((file) => {
                  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
                  if (!rel || rel === file.name) return file;
                  return new File([file], rel, { type: file.type, lastModified: file.lastModified });
                });
                sendFiles(files);
                event.target.value = "";
              }}
            />
          </div>

          <details className="more rounded-3xl bg-surface px-4 shadow-ring">
            <summary>
              More
              <span className="text-sm font-medium text-muted">Tools</span>
            </summary>
            <div className="flex flex-wrap gap-2 pb-4">
            {peers.length > 1 ? (
              <button
                type="button"
                className={everyone ? "btn btn-primary" : "btn btn-ghost"}
                aria-pressed={everyone}
                onClick={() => setEveryone((on) => !on)}
              >
                <Users className="size-4" />
                Everyone
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!selectedPeer}
              onClick={() => {
                if (!selected) return;
                const ok = roomRef.current?.ask(selected);
                setNotice(ok ? `Asked ${selectedPeer?.name || "them"} for a file.` : "Waiting for the other device.");
              }}
            >
              Ask for a file
            </button>
            <button
              type="button"
              className={autoAccept ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={autoAccept}
              onClick={() => setAutoAccept((on) => !on)}
            >
              <ShieldCheck className="size-4" />
              Auto-accept
            </button>
            <button
              type="button"
              className={notify ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={notify}
              onClick={() => {
                if (notify) {
                  setNotify(false);
                  return;
                }
                if (typeof Notification === "undefined") {
                  setNotice("This browser doesn’t show notifications.");
                  return;
                }
                void Notification.requestPermission().then((permission) => {
                  if (permission === "granted") {
                    setNotify(true);
                    setNotice(null);
                  } else setNotice("Notifications stay off until the browser allows them.");
                });
              }}
            >
              <Bell className="size-4" />
              Notify
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => photoRef.current?.click()}>
              <Camera className="size-4" />
              Photo
            </button>
            <button
              type="button"
              className={recording ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => void toggleRecording()}
            >
              <Mic className="size-4" />
              {recording ? "Stop" : "Voice"}
            </button>
            <button
              type="button"
              className={chime ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={chime}
              onClick={() => {
                setChime((on) => {
                  const next = !on;
                  localStorage.setItem("slip-chime", next ? "on" : "off");
                  if (next) playChime();
                  return next;
                });
              }}
            >
              {chime ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              Chime
            </button>
            <button
              type="button"
              className={shredAfter ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={shredAfter}
              onClick={() => setShredAfter((on) => !on)}
            >
              Shred after save
            </button>
            <button type="button" className={folderName ? "btn btn-primary" : "btn btn-ghost"} onClick={() => void chooseFolder()}>
              <FolderPlus className="size-4" />
              {folderName ? folderName : "Save folder"}
            </button>
            <button
              type="button"
              className={skipDupes ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={skipDupes}
              onClick={() => setSkipDupes((on) => !on)}
            >
              Skip duplicates
            </button>
            <button
              type="button"
              className={shrinkPhotos ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={shrinkPhotos}
              onClick={() => setShrinkPhotos((on) => !on)}
            >
              Shrink photos
            </button>
            <button
              type="button"
              className={stayFor ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => {
                setStayFor((current) => {
                  const next = current === 0 ? 15 : current === 15 ? 60 : 0;
                  setNotice(next ? `This device leaves the room in ${next} minutes.` : null);
                  return next;
                });
              }}
            >
              {stayFor === 0 ? "Stay open" : `Leave in ${stayFor} min`}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const lines = transfers
                  .filter((item) => item.status === "done")
                  .map((item) => `${item.direction === "out" ? "sent" : "received"}\t${item.name}\t${item.size}\t${item.digest ?? "no-check"}`);
                if (!lines.length) {
                  setNotice("Nothing finished yet.");
                  return;
                }
                const text = [`Slip receipt · ${code}`, ...lines].join("\n");
                void navigator.clipboard.writeText(text).then(
                  () => setNotice("Receipt copied. It lists names and checks, not the files."),
                  () => setNotice("Copy was blocked by the browser."),
                );
              }}
            >
              Copy receipt
            </button>
            <input
              ref={photoRef}
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                sendFiles([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
          </div>

          <form
            className="mt-4 flex flex-col gap-2 pb-4 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const peerId = targetPeer();
              if (!peerId) {
                setNotice("Waiting for the other device to join.");
                return;
              }
              const ok = roomRef.current?.sendText(peerId, text);
              if (!ok) {
                setNotice("The link isn’t open yet.");
                return;
              }
              setText("");
              setNotice(null);
            }}
          >
            <label className="sr-only" htmlFor="slip-text">
              Text to send
            </label>
            <input
              id="slip-text"
              className="field"
              value={text}
              maxLength={4000}
              placeholder="Or send a short note"
              onChange={(event) => setText(event.target.value)}
            />
            <button type="submit" className="btn btn-ghost sm:w-auto" disabled={!text.trim()}>
              <Send className="size-4" />
              Send
            </button>
            <button
              type="button"
              className="btn btn-ghost sm:w-auto"
              onClick={() => {
                const peerId = targetPeer();
                if (!peerId) {
                  setNotice("Waiting for the other device to join.");
                  return;
                }
                void navigator.clipboard
                  .readText()
                  .then((value) => {
                    const ok = roomRef.current?.sendText(peerId, value);
                    setNotice(ok ? null : "Clipboard was empty, or the link isn’t open yet.");
                  })
                  .catch(() => setNotice("Clipboard permission was blocked."));
              }}
            >
              Clipboard
            </button>
          </form>
          </details>

          {notice ? (
            <p className="text-sm text-muted" role="status">
              {notice}
            </p>
          ) : null}

          {asks.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl font-medium">Requests</h2>
              <ul className="mt-3 space-y-2">
                {asks.map((ask) => (
                  <li key={ask.id} className="flex flex-col gap-3 rounded-2xl bg-surface px-4 py-3 shadow-ring sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      <span className="font-semibold">{ask.peerName}</span>
                      <span className="text-muted"> asked for a file.</span>
                    </p>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          forcedPeer.current = ask.peerId;
                          setSelected(ask.peerId);
                          fileRef.current?.click();
                        }}
                      >
                        Send a file
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => roomRef.current?.dismissAsk(ask.id)}>
                        Dismiss
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-medium">Transfers</h2>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="text-sm font-semibold text-muted"
                  onClick={() => setForgetAfter((current) => (current === 0 ? 60 : current === 60 ? 300 : 0))}
                >
                  {forgetAfter === 0 ? "Keep received" : forgetAfter === 60 ? "Forget in 1 min" : "Forget in 5 min"}
                </button>
                {finished ? (
                  <button type="button" className="text-sm font-semibold text-muted" onClick={() => roomRef.current?.clearFinished()}>
                    Clear finished
                  </button>
                ) : null}
                {transfers.filter((item) => item.direction === "in" && item.status === "pending").length > 1 ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary"
                    onClick={() => {
                      for (const item of transfers) {
                        if (item.direction === "in" && item.status === "pending") void acceptItem(item);
                      }
                    }}
                  >
                    Accept all
                  </button>
                ) : null}
                {transfers.filter((item) => item.direction === "in" && item.status === "pending").length > 1 ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-muted"
                    onClick={() => {
                      for (const item of transfers) {
                        if (item.direction === "in" && item.status === "pending") roomRef.current?.reject(item.peerId, item.key);
                      }
                    }}
                  >
                    Decline all
                  </button>
                ) : null}
              </div>
            </div>
            {transfers.length > 3 ? (
              <input
                className="field mt-3"
                value={query}
                placeholder="Find a file"
                onChange={(event) => setQuery(event.target.value)}
              />
            ) : null}
            {transfers.some((item) => item.status === "done") ? (
              <p className="mt-2 text-sm text-muted tabular-nums">
                Sent {formatBytes(transfers.filter((item) => item.direction === "out" && item.status === "done").reduce((sum, item) => sum + item.size, 0))}
                {" · "}
                Received {formatBytes(transfers.filter((item) => item.direction === "in" && item.status === "done").reduce((sum, item) => sum + item.size, 0))}
              </p>
            ) : null}
            {transfers.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing in motion. Drop a file when a device is linked.</p>
            ) : transfers.filter((item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase())).length === 0 ? (
              <p className="mt-2 text-sm text-muted">No file by that name.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {transfers
                  .filter((item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase()))
                  .map((item) => (
                  <TransferRow
                    key={`${item.direction}-${item.peerId}-${item.key}`}
                    item={item}
                    onAccept={async () => {
                      await acceptItem(item);
                    }}
                    onReject={() => roomRef.current?.reject(item.peerId, item.key)}
                    onCancel={() => roomRef.current?.cancel(item.peerId, item.key)}
                    onPause={() => roomRef.current?.pause(item.peerId, item.key)}
                    onResume={() => roomRef.current?.resume(item.peerId, item.key)}
                    onRetry={() => roomRef.current?.retry(item.peerId, item.key)}
                    onShred={() => roomRef.current?.shred(item.peerId, item.key)}
                    onDismiss={() => roomRef.current?.dismiss(item.peerId, item.key)}
                  />
                ))}
              </ul>
            )}
          </section>

          {notes.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl font-medium">Notes</h2>
              <ul className="mt-3 space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-2xl bg-surface px-4 py-3 shadow-ring">
                    <p className="text-sm text-muted">
                      {note.direction === "out" ? "You" : note.peerName || "Device"}
                    </p>
                    <p className="mt-1 leading-relaxed break-words">{note.text}</p>
                    <button
                      type="button"
                      className="btn btn-ghost mt-2"
                      onClick={() => {
                        void navigator.clipboard.writeText(note.text).then(() => {
                          setCopied("note");
                          window.setTimeout(() => setCopied((current) => (current === "note" ? null : current)), 1600);
                        }).catch(() => setNotice("Copy was blocked by the browser."));
                      }}
                    >
                      {copied === "note" ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied === "note" ? "Copied" : "Copy"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
      </div>
      {pinNeeded ? (
        <form
          className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            if (!/^[0-9]{4}$/.test(pinDraft)) {
              setNotice("The PIN is 4 digits.");
              return;
            }
            roomRef.current?.setPin(pinDraft);
            onPin(pinDraft);
            setPinNeeded(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5 shadow-ring">
            <h2 className="font-display text-2xl font-medium">This room is locked</h2>
            <p className="mt-2 text-sm text-muted">Ask the host for the 4-digit PIN.</p>
            <label className="sr-only" htmlFor="room-pin">
              Room PIN
            </label>
            <input
              id="room-pin"
              className="field mt-4 text-center font-display text-2xl tracking-widest"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pinDraft}
              onChange={(event) => setPinDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <button type="submit" className="btn btn-primary mt-3 w-full" disabled={pinDraft.length !== 4}>
              Unlock
            </button>
          </div>
        </form>
      ) : null}
      {closing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-4 sm:items-center" role="dialog" aria-label="Your slip">
          <article className="sheet w-full max-w-md p-6 sm:p-7">
            <p className="text-sm font-medium text-muted">Torn off · {code}</p>
            <h2 className="font-display mt-2 text-4xl leading-none font-medium">{closing.headline}</h2>
            <p className="mt-4 text-sm leading-relaxed">{closing.body}</p>
            <ul className="mt-4 space-y-1 border-t border-dashed border-line pt-4 text-sm tabular-nums">
              {closing.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="font-display mt-4 text-xl leading-snug">{closing.fortune}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className="btn btn-ghost w-full" onClick={() => void saveSlipImage(closing, code)}>
                Save slip
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => {
                  void navigator.clipboard.writeText(closing.plain).then(
                    () => setNotice("Slip copied."),
                    () => setNotice("Copy was blocked by the browser."),
                  );
                }}
              >
                Copy
              </button>
              <button type="button" className="btn btn-primary w-full" onClick={onLeave}>
                Done
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function FilePreview({ item }: { item: TransferView }) {
  const [hideLive, setHideLive] = useState(false);
  const [open, setOpen] = useState(false);
  const text = item.liveText || (item.previewKind === "text" ? item.preview : undefined);
  const image =
    item.mime.startsWith("video/")
      ? undefined
      : item.blobUrl || (hideLive ? undefined : item.liveUrl) || (item.previewKind === "image" ? item.preview : undefined);
  const play = item.blobUrl || item.liveUrl;
  const video = item.mime.startsWith("video/") ? play : undefined;
  const audio = item.mime.startsWith("audio/") ? play : undefined;
  if (!image && !video && !audio && !text) return null;
  return (
    <div className="mt-3">
      {image ? (
        <button type="button" className="block max-w-full" onClick={() => setOpen(true)}>
          <img
            src={image}
            alt=""
            className="max-h-48 rounded-xl"
            onError={() => {
              if (!hideLive && item.liveUrl) setHideLive(true);
            }}
          />
        </button>
      ) : null}
      {video ? <video src={video} controls className="max-h-48 w-full rounded-xl" /> : null}
      {audio ? <audio src={audio} controls className="w-full" /> : null}
      {text ? (
        <pre className="max-h-36 overflow-auto rounded-xl bg-surface-2 p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {text}
        </pre>
      ) : null}
      {open && image ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6"
          role="dialog"
          aria-label={item.name}
          onClick={() => setOpen(false)}
        >
          <img src={image} alt={item.name} className="max-h-[80dvh] max-w-full rounded-2xl" />
        </div>
      ) : null}
    </div>
  );
}

function TransferRow({
  item,
  onAccept,
  onReject,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onDismiss,
  onShred,
}: {
  item: TransferView;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  onShred: () => void;
}) {
  const ratio = item.size === 0 ? (item.status === "done" ? 1 : 0) : Math.min(1, item.bytes / item.size);
  const elapsed = item.startedAt ? (Date.now() - item.startedAt) / 1000 : 0;
  const speed = item.status === "active" && elapsed > 0.2 ? item.bytes / elapsed : 0;
  const eta = speed > 0 ? (item.size - item.bytes) / speed : 0;
  const incoming = item.direction === "in";
  const label =
    item.status === "pending"
      ? incoming
        ? "Needs your OK"
        : "Waiting for them"
      : item.status === "active"
        ? item.paused
          ? "Paused"
          : incoming
            ? "Receiving"
            : "Sending"
        : item.shredded
          ? "Shredded"
          : item.status === "done"
          ? item.savedToDisk
            ? "Saved"
            : incoming
              ? "Received"
              : "Sent"
          : item.status === "rejected"
            ? "Declined"
            : item.status === "cancelled"
              ? "Cancelled"
              : "Interrupted";

  return (
    <li className="rounded-2xl bg-surface px-4 py-3 shadow-ring">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            {incoming ? <ArrowDown className="size-4 shrink-0 text-primary" /> : <ArrowUp className="size-4 shrink-0 text-primary" />}
            <span className="truncate">{item.name}</span>
          </p>
          <p className="mt-1 text-sm text-muted tabular-nums">
            {label}
            {" · "}
            {formatBytes(item.bytes)} / {formatBytes(item.size)}
            {speed > 0 ? ` · ${formatRate(speed)}` : ""}
            {eta ? ` · ${formatEta(eta)}` : ""}
            {item.status === "done" && item.intact === false ? " · Doesn’t match" : ""}
            {item.status === "done" && item.intact && item.direction === "in" ? " · Intact" : ""}
            {item.status === "done" && item.digest ? ` · ${item.digest.slice(0, 8)}` : ""}
          </p>
        </div>
      </div>
      <FilePreview item={item} />
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-primary" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.status === "pending" && incoming ? (
          <>
            <button type="button" className="btn btn-primary" onClick={onAccept}>
              Accept
            </button>
            <button type="button" className="btn btn-ghost" onClick={onReject}>
              Decline
            </button>
          </>
        ) : null}
        {item.status === "active" && !incoming ? (
          <button type="button" className="btn btn-ghost" onClick={item.paused ? onResume : onPause}>
            {item.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {item.paused ? "Resume" : "Pause"}
          </button>
        ) : null}
        {item.status === "failed" && !incoming ? (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        ) : null}
        {item.status === "active" || (item.status === "pending" && !incoming) ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        {item.blobUrl ? (
          <a className="btn btn-primary" href={item.blobUrl} download={baseName(item.name)}>
            Save again
          </a>
        ) : null}
        {item.status !== "active" && item.status !== "pending" && !item.shredded ? (
          <button type="button" className="btn btn-ghost" onClick={onShred}>
            Shred
          </button>
        ) : null}
        {item.status !== "active" && item.status !== "pending" ? (
          <button type="button" className="btn btn-ghost" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </li>
  );
}

function RoomQr({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  useEffect(() => {
    let cancel = false;
    void drawSlipQr(value)
      .then((url) => {
        if (!cancel) setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [value]);
  if (!src) return <div className="mt-4 h-48 w-48 rounded-2xl bg-fg" />;
  return (
    <div className="mt-4">
      <button type="button" className="block" onClick={() => setBig(true)} aria-label="Enlarge QR code">
        <img src={src} alt="QR code that joins this room" className="h-48 w-48 rounded-2xl bg-fg p-2" />
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn btn-ghost" href={src} download="slip-room.png">
          Save QR
        </a>
        <button type="button" className="btn btn-ghost" onClick={() => setBig(true)}>
          Enlarge
        </button>
      </div>
      {big ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-bg/90 p-6"
          role="dialog"
          aria-label="Room QR"
          onClick={() => setBig(false)}
        >
          <img src={src} alt="" className="w-full max-w-md rounded-3xl bg-fg p-4" />
        </div>
      ) : null}
    </div>
  );
}

function buildClosingSlip(input: {
  code: string;
  openedAt: number;
  peers: { name: string }[];
  transfers: TransferView[];
  notes: number;
}): ClosingSlip {
  const done = input.transfers.filter((item) => item.status === "done");
  const sent = done.filter((item) => item.direction === "out");
  const got = done.filter((item) => item.direction === "in");
  const sentBytes = sent.reduce((sum, item) => sum + item.size, 0);
  const gotBytes = got.reduce((sum, item) => sum + item.size, 0);
  const minutes = Math.max(1, Math.round((Date.now() - input.openedAt) / 60000));
  const other = input.peers.map((peer) => peer.name).find(Boolean) || "someone who never told you their name";
  const moving = input.transfers.some((item) => item.status === "active" || item.status === "pending");
  let headline = "Nothing moved.";
  let body = "You opened a room and closed it. The files stayed where they were born.";
  if (sent.length && got.length) {
    headline = "A quiet trade.";
    body = `You gave ${sent.length} and took ${got.length}. ${other} will not be sending an invoice.`;
  } else if (sent.length) {
    headline = sent.length === 1 ? "One file, gone." : `${sent.length} files, gone.`;
    body = `You handed them to ${other}. They are not your problem anymore.`;
  } else if (got.length) {
    headline = got.length === 1 ? "You caught one." : `You caught ${got.length}.`;
    body = `${other} did the carrying. You did the receiving, which is also a skill.`;
  }
  if (moving) body += " Something was still in the air when you left. Bold.";
  const lines = [
    `Sent ${formatBytes(sentBytes)} across ${sent.length} ${sent.length === 1 ? "file" : "files"}.`,
    `Caught ${formatBytes(gotBytes)} in ${got.length} ${got.length === 1 ? "file" : "files"}.`,
    minutes < 2 ? "In and out. A heist with no sirens." : `${minutes} minutes. The room started to know you.`,
    input.notes ? `${input.notes} ${input.notes === 1 ? "note" : "notes"}, none of them stored.` : "No notes. A silent room.",
  ];
  const fortunes = [
    "Nothing was stored. The room already forgot your face.",
    "May the next file be smaller than your patience.",
    "The bridge is gone. Your filenames remain a personal matter.",
    "If the check matched, the universe was briefly on your side.",
    "Tell them the PIN was a feeling.",
    "You can leave. The bytes cannot gossip.",
  ];
  const fortune = fortunes[(input.code.charCodeAt(0) + sent.length * 3 + got.length) % fortunes.length] ?? fortunes[0];
  const plain = [`Slip ${input.code}`, headline, body, ...lines, fortune].join("\n");
  return { headline, body, lines, fortune, plain };
}

function saveSlipImage(slip: ClosingSlip, code: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1040;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#f6f3ea";
  ctx.fillRect(0, 0, 800, 1040);
  ctx.fillStyle = "#d6ff4a";
  ctx.fillRect(0, 0, 800, 16);
  ctx.fillStyle = "#142006";
  ctx.font = "600 28px Figtree, sans-serif";
  ctx.fillText("SLIP", 56, 88);
  ctx.fillStyle = "#5c6758";
  ctx.font = "500 22px Figtree, sans-serif";
  ctx.fillText(code, 56, 126);
  ctx.fillStyle = "#142006";
  ctx.font = "500 52px Fraunces, serif";
  const nextY = wrapCanvasText(ctx, slip.headline, 56, 210, 688, 62);
  ctx.font = "400 26px Figtree, sans-serif";
  const bodyY = wrapCanvasText(ctx, slip.body, 56, nextY + 28, 688, 36);
  ctx.strokeStyle = "#d5cfc2";
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(56, bodyY + 24);
  ctx.lineTo(744, bodyY + 24);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "500 24px Figtree, sans-serif";
  let y = bodyY + 68;
  for (const line of slip.lines) {
    ctx.fillText(line, 56, y);
    y += 38;
  }
  ctx.font = "500 32px Fraunces, serif";
  wrapCanvasText(ctx, slip.fortune, 56, y + 28, 688, 42);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `slip-${code.toLowerCase()}.png`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number) {
  const words = text.split(" ");
  let row = "";
  let cursor = y;
  for (const word of words) {
    const trial = row ? `${row} ${word}` : word;
    if (ctx.measureText(trial).width > max && row) {
      ctx.fillText(row, x, cursor);
      cursor += line;
      row = word;
    } else row = trial;
  }
  if (row) ctx.fillText(row, x, cursor);
  return cursor;
}

type ClosingSlip = {
  headline: string;
  body: string;
  lines: string[];
  fortune: string;
  plain: string;
};

function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /svg|gif/i.test(file.type) || file.size < 400_000) return Promise.resolve(file);
  return createImageBitmap(file)
    .then(async (bitmap) => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      if (scale === 1 && file.size < 1_500_000) {
        bitmap.close();
        return file;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        return file;
      }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (!blob || blob.size >= file.size) return file;
      const base = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
    })
    .catch(() => file);
}

function playChime() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.18);
  osc.onended = () => void ctx.close();
}

function Scanner({ onClose, onCode }: { onClose: () => void; onCode: (raw: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bag = { stop: false, frame: 0, stream: null as MediaStream | null };
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser has no camera. Type the code instead.");
      return;
    }
    void (async () => {
      try {
        bag.stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        if (!bag.stop) setError("Camera permission is blocked. Type the code instead.");
        return;
      }
      if (bag.stop) {
        bag.stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = bag.stream;
      await video.play().catch(() => {});
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      type Detector = { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> };
      const Ctor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
        }
      ).BarcodeDetector;
      const detector = Ctor ? new Ctor({ formats: ["qr_code"] }) : null;
      const jsQR = detector ? null : (await import("jsqr")).default;
      const tick = async () => {
        if (bag.stop || !ctx) return;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          let raw = "";
          if (detector) {
            const found = await detector.detect(video).catch(() => []);
            raw = found[0]?.rawValue ?? "";
          } else if (jsQR) {
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            raw = jsQR(image.data, image.width, image.height)?.data ?? "";
          }
          if (raw) {
            bag.stop = true;
            onCodeRef.current(raw);
            return;
          }
        }
        bag.frame = requestAnimationFrame(() => void tick());
      };
      bag.frame = requestAnimationFrame(() => void tick());
    })();
    return () => {
      bag.stop = true;
      cancelAnimationFrame(bag.frame);
      bag.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-surface p-4 shadow-ring">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium">Scan a room</h2>
          <button type="button" className="btn btn-ghost size-12 px-0" onClick={onClose} aria-label="Close scanner">
            <X className="size-5" />
          </button>
        </div>
        {error ? (
          <p className="text-sm text-muted">{error}</p>
        ) : (
          <video ref={videoRef} className="aspect-square w-full rounded-2xl bg-bg object-cover" muted playsInline />
        )}
      </div>
    </div>
  );
}

async function pickSink(name: string): Promise<FileSystemWritableFileStream | undefined> {
  const picker = (
    window as Window & {
      showSaveFilePicker?: (opts: { suggestedName?: string }) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker;
  if (!picker) return undefined;
  try {
    const handle = await picker({ suggestedName: baseName(name) });
    return await handle.createWritable();
  } catch {
    return undefined;
  }
}
