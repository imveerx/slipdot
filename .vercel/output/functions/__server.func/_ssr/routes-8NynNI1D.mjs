import { o as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as ArrowUp, S as Bell, _ as FolderUp, a as Upload, b as Check, c as ShieldCheck, d as Play, f as Pause, g as Link2, h as Lock, i as Users, l as Send, m as Mic, n as VolumeX, p as Moon, r as Volume2, s as Sun, t as X, u as ScanLine, v as FolderPlus, w as ArrowDown, x as Camera, y as Copy } from "../_libs/lucide-react.mjs";
import { n as Route$2, r as previewPathPrefix } from "./router-DDh_v0dd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-8NynNI1D.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function defaultIceServers() {
	return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
}
/** Preview hosts serve the app under a path prefix. Bare "/api/..." misses it. */
function apiPath(path) {
	if (typeof window === "undefined") return path;
	const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
	return prefix ? `${prefix}${path}` : path;
}
var TOKEN = /^[A-Za-z0-9_-]{22}$/;
function mintSealToken() {
	const raw = /* @__PURE__ */ new Uint8Array(16);
	crypto.getRandomValues(raw);
	return bytesToToken(raw);
}
function decodeSealToken(token) {
	if (!TOKEN.test(token)) return null;
	const pad = token.replace(/-/g, "+").replace(/_/g, "/");
	const bin = atob(pad);
	if (bin.length !== 16) return null;
	const out = /* @__PURE__ */ new Uint8Array(16);
	for (let i = 0; i < 16; i += 1) out[i] = bin.charCodeAt(i);
	return out;
}
function bytesToToken(bytes) {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function owned(data) {
	const copy = new Uint8Array(data.byteLength);
	copy.set(data);
	return copy;
}
async function importSealKey(raw) {
	return crypto.subtle.importKey("raw", owned(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function sealHint(raw) {
	const hex = [...new Uint8Array(await crypto.subtle.digest("SHA-256", owned(raw))).subarray(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
	return `${hex.slice(0, 4)} ${hex.slice(4)}`;
}
async function pack(key, data) {
	const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12));
	const ct = new Uint8Array(await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv
	}, key, owned(data)));
	const out = new Uint8Array(iv.length + ct.length);
	out.set(iv, 0);
	out.set(ct, iv.length);
	return out;
}
async function unpack(key, packed) {
	if (packed.byteLength < 28) return null;
	try {
		const plain = await crypto.subtle.decrypt({
			name: "AES-GCM",
			iv: owned(packed.subarray(0, 12))
		}, key, owned(packed.subarray(12)));
		return new Uint8Array(plain);
	} catch {
		return null;
	}
}
function wipe(bytes) {
	const cap = 65536;
	for (let i = 0; i < bytes.length; i += cap) crypto.getRandomValues(bytes.subarray(i, Math.min(i + cap, bytes.length)));
	bytes.fill(0);
}
function sealFromLink(raw) {
	try {
		const token = new URLSearchParams(new URL(raw.trim()).hash.slice(1)).get("k") ?? "";
		return decodeSealToken(token) ? token : void 0;
	} catch {
		return;
	}
}
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var CODE_RE = /^[A-Z0-9]{4,8}$/;
function makeCode(len = 6) {
	const bytes = new Uint8Array(len);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const b of bytes) out += ALPHABET[b % 32];
	return out;
}
function parseRoom(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	if (!trimmed.includes("://") && CODE_RE.test(trimmed.toUpperCase())) return trimmed.toUpperCase();
	try {
		const room = (new URL(trimmed).searchParams.get("room") ?? "").toUpperCase();
		if (CODE_RE.test(room)) return room;
	} catch {
		return null;
	}
	return null;
}
function formatBytes(n) {
	if (!Number.isFinite(n) || n < 0) return "—";
	if (n < 1024) return `${Math.round(n)} B`;
	const units = [
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let value = n / 1024;
	let i = 0;
	while (value >= 1024 && i < units.length - 1) {
		value /= 1024;
		i += 1;
	}
	const digits = value >= 10 || i === 0 ? 0 : 1;
	return `${value.toFixed(digits)} ${units[i]}`;
}
function formatRate(bytesPerSec) {
	if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "—";
	return `${formatBytes(bytesPerSec)}/s`;
}
function formatEta(seconds) {
	if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400) return "";
	const s = Math.max(1, Math.round(seconds));
	if (s < 60) return `${s}s left`;
	const m = Math.floor(s / 60);
	const rem = s % 60;
	return rem ? `${m}m ${rem}s left` : `${m}m left`;
}
function safeName(name) {
	return name.replace(/\\/g, "/").split("/").filter((part) => part && part !== "." && part !== "..").join("/") || "file";
}
function baseName(name) {
	const safe = safeName(name);
	const slash = safe.lastIndexOf("/");
	return slash >= 0 ? safe.slice(slash + 1) : safe;
}
function pathLabel(candidateType, state, open) {
	if (!open) {
		if (state === "failed" || state === "closed") return "Bridge · any network";
		if (state === "disconnected") return "Reconnecting";
		return "Any network";
	}
	if (candidateType === "host") return "Same network · direct";
	if (candidateType === "srflx" || candidateType === "prflx") return "Across the internet";
	if (candidateType === "relay") return "Relayed";
	return "Connected";
}
var MAX_PREVIEW = 36e3;
function bytesToB64$1(bytes) {
	let bin = "";
	const step = 32768;
	for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
	return btoa(bin);
}
function looksText(file) {
	if (file.type.startsWith("text/")) return true;
	return /\.(txt|md|json|csv|log|svg|js|ts|css|html)$/i.test(file.name);
}
/** Small picture or text head the other device can show before the file arrives. */
async function makePreview(file) {
	try {
		if (file.type.startsWith("image/") && file.type !== "image/svg+xml" && file.size <= 41943040) {
			const bitmap = await createImageBitmap(file);
			const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
			const width = Math.max(1, Math.round(bitmap.width * scale));
			const height = Math.max(1, Math.round(bitmap.height * scale));
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				bitmap.close();
				return null;
			}
			ctx.drawImage(bitmap, 0, 0, width, height);
			bitmap.close();
			const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .7));
			if (!blob || blob.size > 28e3) return null;
			const preview = `data:image/jpeg;base64,${bytesToB64$1(new Uint8Array(await blob.arrayBuffer()))}`;
			if (preview.length > MAX_PREVIEW) return null;
			return {
				kind: "image",
				preview
			};
		}
		if (looksText(file)) {
			const preview = (await file.slice(0, 2e3).text()).slice(0, 800);
			if (!preview.trim()) return null;
			return {
				kind: "text",
				preview
			};
		}
	} catch {
		return null;
	}
	return null;
}
var K = new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
function rotr(x, n) {
	return x >>> n | x << 32 - n;
}
/** Incremental SHA-256. `hex()` does not consume the hasher. */
var Sha256 = class {
	h = new Uint32Array([
		1779033703,
		3144134277,
		1013904242,
		2773480762,
		1359893119,
		2600822924,
		528734635,
		1541459225
	]);
	block = /* @__PURE__ */ new Uint8Array(64);
	blockLen = 0;
	bytes = 0;
	update(data) {
		let offset = 0;
		while (offset < data.length) {
			const n = Math.min(64 - this.blockLen, data.length - offset);
			this.block.set(data.subarray(offset, offset + n), this.blockLen);
			this.blockLen += n;
			offset += n;
			this.bytes += n;
			if (this.blockLen === 64) {
				this.compress(this.block);
				this.blockLen = 0;
			}
		}
	}
	hex() {
		const h = this.h.slice();
		const block = /* @__PURE__ */ new Uint8Array(64);
		block.set(this.block.subarray(0, this.blockLen));
		block[this.blockLen] = 128;
		let len = this.blockLen + 1;
		if (len > 56) {
			this.compress(block, h);
			block.fill(0);
			len = 0;
		}
		const bits = this.bytes * 8;
		const view = new DataView(block.buffer);
		view.setUint32(56, Math.floor(bits / 4294967296));
		view.setUint32(60, bits >>> 0);
		this.compress(block, h);
		let out = "";
		for (const word of h) out += word.toString(16).padStart(8, "0");
		return out;
	}
	compress(block, h = this.h) {
		const w = /* @__PURE__ */ new Uint32Array(64);
		const view = new DataView(block.buffer, block.byteOffset, 64);
		for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(i * 4);
		for (let i = 16; i < 64; i += 1) {
			const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
			const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
			w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
		}
		let a = h[0];
		let b = h[1];
		let c = h[2];
		let d = h[3];
		let e = h[4];
		let f = h[5];
		let g = h[6];
		let hh = h[7];
		for (let i = 0; i < 64; i += 1) {
			const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = e & f ^ ~e & g;
			const t1 = hh + s1 + ch + K[i] + w[i] >>> 0;
			const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
			hh = g;
			g = f;
			f = e;
			e = d + t1 >>> 0;
			d = c;
			c = b;
			b = a;
			a = t1 + t2 >>> 0;
		}
		h[0] = h[0] + a >>> 0;
		h[1] = h[1] + b >>> 0;
		h[2] = h[2] + c >>> 0;
		h[3] = h[3] + d >>> 0;
		h[4] = h[4] + e >>> 0;
		h[5] = h[5] + f >>> 0;
		h[6] = h[6] + g >>> 0;
		h[7] = h[7] + hh >>> 0;
	}
};
var DIRECT_CHUNK = 61440;
var RELAY_CHUNK = 32768;
var RELAY_LANES = 4;
var FAST_POLL = 400;
var IDLE_POLL = 2e3;
var MAX_FILE = 8589934592;
var RELAY_MAX = 104857600;
var STALL_MS = 8e3;
var SlipRoom = class {
	listeners;
	room;
	selfId;
	name;
	peers = /* @__PURE__ */ new Map();
	xfers = /* @__PURE__ */ new Map();
	notes = [];
	asks = [];
	noteSeq = 0;
	askSeq = 0;
	seq = 0;
	cursor = 0;
	seen = /* @__PURE__ */ new Set();
	signalChain = /* @__PURE__ */ new Map();
	pollTimer = null;
	emitTimer = null;
	stallTimer = null;
	closed = false;
	online = false;
	pin = "";
	sealToken = "";
	aes = null;
	held = [];
	shredAfter = true;
	hint = "";
	constructor(opts, listeners) {
		this.listeners = listeners;
		this.room = opts.room;
		this.selfId = opts.selfId;
		this.name = opts.name;
		this.pin = opts.pin ?? "";
		this.sealToken = opts.seal ?? "";
	}
	setName(name) {
		this.name = name.slice(0, 24);
	}
	setPin(pin) {
		this.pin = /^[0-9]{4}$/.test(pin) ? pin : "";
	}
	async useSeal(token) {
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
		for (const xfer of this.xfers.values()) if (xfer.direction === "out" && xfer.status === "pending" && !xfer.announced && !xfer.preparing) await this.offer(xfer);
		return true;
	}
	setShred(on) {
		this.shredAfter = on;
	}
	shred(peerId, key) {
		const xfer = this.xfers.get(this.xid(peerId, key));
		if (!xfer || xfer.status === "active") return;
		this.dropSecret(xfer);
		xfer.shredded = true;
		this.emitNow();
	}
	async lock(pin) {
		const next = /^[0-9]{4}$/.test(pin) ? pin : "";
		this.pin = next;
		try {
			return (await fetch(apiPath("/api/rtc"), {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					op: "lock",
					room: this.room,
					peer: this.selfId,
					pin: next
				})
			})).ok;
		} catch {
			return false;
		}
	}
	async join() {
		if (this.sealToken) await this.useSeal(this.sealToken);
		try {
			await this.pollOnce();
		} catch {}
		if (this.closed) return;
		this.schedule(this.nextDelay());
		this.stallTimer = setInterval(() => this.watchdog(), 2e3);
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
		fetch(apiPath("/api/rtc"), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				op: "leave",
				room: this.room,
				peer: this.selfId,
				pin: this.pin || void 0
			}),
			keepalive: true
		}).catch(() => {});
	}
	sendFiles(peerId, files) {
		for (const file of files) {
			if (file.size > MAX_FILE) continue;
			const key = this.nextKey(peerId);
			const xfer = {
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
				preparing: true
			};
			if (file.type.startsWith("image/") || file.type.startsWith("audio/") || file.type.startsWith("video/")) xfer.liveUrl = URL.createObjectURL(file);
			this.xfers.set(this.xid(peerId, key), xfer);
			this.prepare(xfer);
		}
		this.emitNow();
	}
	sendToAll(files) {
		const ids = [...this.peers.keys()];
		for (const id of ids) this.sendFiles(id, files);
		return ids.length;
	}
	retry(peerId, key) {
		const xfer = this.xfers.get(this.xid(peerId, key));
		if (!xfer || xfer.direction !== "out" || !xfer.file) return false;
		if (xfer.status !== "failed" && xfer.status !== "cancelled") return false;
		const file = xfer.file;
		xfer.file = void 0;
		this.dismiss(peerId, key);
		this.sendFiles(peerId, [file]);
		return true;
	}
	ask(peerId) {
		if (!this.peers.get(peerId)) return false;
		this.sendControl(peerId, { t: "want" });
		return true;
	}
	dismissAsk(id) {
		const next = this.asks.filter((ask) => ask.id !== id);
		if (next.length === this.asks.length) return;
		this.asks.splice(0, this.asks.length, ...next);
		this.listeners.onAsks([...this.asks]);
	}
	clearAsks(peerId) {
		const next = this.asks.filter((ask) => ask.peerId !== peerId);
		if (next.length === this.asks.length) return;
		this.asks.splice(0, this.asks.length, ...next);
		this.listeners.onAsks([...this.asks]);
	}
	sendText(peerId, text) {
		const slot = this.peers.get(peerId);
		const clean = text.trim().slice(0, 4e3);
		if (!clean || !this.aes) return false;
		this.sendControl(peerId, {
			t: "text",
			text: clean
		});
		this.pushNote(peerId, slot?.info.name || "Someone", clean, "out");
		return Boolean(slot);
	}
	accept(peerId, key, sink) {
		const xfer = this.xfers.get(this.xid(peerId, key));
		if (!xfer || xfer.direction !== "in" || xfer.status !== "pending") return;
		if (!(this.peers.get(peerId)?.dc?.readyState === "open" && xfer.via !== "relay") && xfer.via !== "relay") {
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
		this.sendControl(peerId, {
			t: "accept",
			key
		});
		this.emitNow();
	}
	reject(peerId, key) {
		const xfer = this.xfers.get(this.xid(peerId, key));
		if (!xfer || xfer.status !== "pending") return;
		xfer.status = "rejected";
		this.sendControl(peerId, {
			t: "reject",
			key
		});
		this.emitNow();
	}
	cancel(peerId, key) {
		const xfer = this.xfers.get(this.xid(peerId, key));
		if (!xfer || xfer.status === "done" || xfer.status === "cancelled") return;
		xfer.status = "cancelled";
		xfer.paused = false;
		xfer.resume?.();
		xfer.abort?.abort();
		xfer.sink?.abort().catch(() => {});
		this.sendControl(peerId, {
			t: "cancel",
			key
		});
		this.emitNow();
	}
	dismiss(peerId, key) {
		const id = this.xid(peerId, key);
		const xfer = this.xfers.get(id);
		if (!xfer || xfer.status === "active" || xfer.status === "pending") return;
		if (xfer.blobUrl) URL.revokeObjectURL(xfer.blobUrl);
		if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
		this.xfers.delete(id);
		this.emitNow();
	}
	pause(peerId, key) {
		const xfer = this.xfers.get(this.xid(peerId, key));
		if (!xfer || xfer.direction !== "out" || xfer.status !== "active") return;
		xfer.paused = true;
		this.emitNow();
	}
	resume(peerId, key) {
		const xfer = this.xfers.get(this.xid(peerId, key));
		if (!xfer || !xfer.paused) return;
		xfer.paused = false;
		xfer.resume?.();
		xfer.resume = void 0;
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
	release(xfer) {
		if (xfer.blobUrl) URL.revokeObjectURL(xfer.blobUrl);
		if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
		xfer.sink?.abort().catch(() => {});
	}
	async prepare(xfer) {
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
	async offer(xfer) {
		if (!this.aes || xfer.announced || xfer.preparing || xfer.status === "cancelled") return;
		if (this.peers.get(xfer.peerId)?.dc?.readyState === "open") this.announce(xfer.peerId, xfer);
		else if (xfer.size <= RELAY_MAX) await this.relayAnnounce(xfer);
	}
	async hold(xfer) {
		while (xfer.paused) {
			if (xfer.abort?.signal.aborted || xfer.status === "cancelled") return;
			await new Promise((resolve) => {
				xfer.resume = resolve;
			});
		}
	}
	nextKey(peerId) {
		this.seq += 1;
		return (this.selfId > peerId ? 0 : 2147483648) + this.seq >>> 0;
	}
	xid(peerId, key) {
		return `${peerId}:${key}`;
	}
	announce(peerId, xfer) {
		const slot = this.peers.get(peerId);
		if (!this.aes || !slot?.dc || slot.dc.readyState !== "open" || xfer.announced || xfer.preparing) return;
		xfer.announced = true;
		this.sendControl(peerId, this.fileMsg(xfer));
	}
	fileMsg(xfer) {
		const preview = xfer.preview && xfer.previewKind && !xfer.preview.startsWith("blob:") ? xfer.preview.slice(0, 36e3) : void 0;
		return {
			t: "file",
			key: xfer.key,
			name: xfer.name,
			size: xfer.size,
			mime: xfer.mime,
			...preview && xfer.previewKind ? {
				preview,
				previewKind: xfer.previewKind
			} : {}
		};
	}
	attachPreview(xfer, msg) {
		if (msg.previewKind !== "image" && msg.previewKind !== "text") return;
		if (typeof msg.preview !== "string" || msg.preview.length > 36e3 || msg.preview.startsWith("blob:")) return;
		xfer.preview = msg.preview;
		xfer.previewKind = msg.previewKind;
	}
	bumpLive(xfer, payload) {
		if ((xfer.previewKind === "text" || xfer.mime.startsWith("text/") || /\.(txt|md|json|csv|log|svg)$/i.test(xfer.name)) && (xfer.liveText?.length ?? 0) < 2400) xfer.liveText = ((xfer.liveText ?? "") + new TextDecoder().decode(payload)).slice(0, 2400);
		if (!xfer.mime.startsWith("image/") || xfer.mime.includes("svg") || !xfer.parts || xfer.bytes > 2e6) return;
		xfer.liveTicks = (xfer.liveTicks ?? 0) + 1;
		if (xfer.liveTicks % 4 !== 0 && xfer.bytes < xfer.size) return;
		if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
		xfer.liveUrl = URL.createObjectURL(new Blob(xfer.parts, { type: xfer.mime }));
	}
	async sendControl(peerId, msg) {
		if (!this.aes) return;
		const wire = await this.wrap(msg);
		const xfer = "key" in msg ? this.xfers.get(this.xid(peerId, msg.key)) : void 0;
		const dc = this.peers.get(peerId)?.dc;
		if (dc?.readyState === "open" && xfer?.via !== "relay") {
			dc.send(JSON.stringify(wire));
			return;
		}
		this.postMail(peerId, msg);
	}
	async wrap(msg) {
		const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12));
		const ct = new Uint8Array(await crypto.subtle.encrypt({
			name: "AES-GCM",
			iv
		}, this.aes, new TextEncoder().encode(JSON.stringify(msg))));
		return {
			t: "box",
			iv: bytesToB64(iv),
			c: bytesToB64(ct)
		};
	}
	async unbox(sealed) {
		if (!this.aes) return null;
		try {
			const plain = await crypto.subtle.decrypt({
				name: "AES-GCM",
				iv: b64ToBytes(sealed.iv)
			}, this.aes, b64ToBytes(sealed.c));
			const msg = JSON.parse(new TextDecoder().decode(plain));
			return msg && typeof msg === "object" && "t" in msg ? msg : null;
		} catch {
			this.listeners.onSeal("");
			return null;
		}
	}
	dropSecret(xfer) {
		if (xfer.held) {
			for (const part of xfer.held.values()) wipe(part);
			xfer.held = void 0;
		}
		if (xfer.parts) {
			for (const part of xfer.parts) wipe(part);
			xfer.parts = void 0;
		}
		xfer.file = void 0;
		if (xfer.blobUrl) URL.revokeObjectURL(xfer.blobUrl);
		xfer.blobUrl = void 0;
		if (xfer.liveUrl?.startsWith("blob:")) URL.revokeObjectURL(xfer.liveUrl);
		xfer.liveUrl = void 0;
		xfer.preview = void 0;
		xfer.liveText = void 0;
	}
	pushNote(peerId, peerName, text, direction) {
		this.noteSeq += 1;
		this.notes.unshift({
			id: this.noteSeq,
			peerId,
			peerName,
			text,
			direction,
			at: Date.now()
		});
		if (this.notes.length > 40) this.notes.pop();
		this.listeners.onNotes([...this.notes]);
	}
	pushAsk(peerId, peerName) {
		this.askSeq += 1;
		this.asks.unshift({
			id: this.askSeq,
			peerId,
			peerName: peerName || "Device",
			at: Date.now()
		});
		if (this.asks.length > 12) this.asks.pop();
		this.listeners.onAsks([...this.asks]);
	}
	views() {
		return [...this.xfers.values()].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0) || b.key - a.key).map((xfer) => ({
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
			shredded: xfer.shredded
		}));
	}
	emitNow() {
		if (this.emitTimer) {
			clearTimeout(this.emitTimer);
			this.emitTimer = null;
		}
		if (!this.closed) this.listeners.onTransfers(this.views());
	}
	emitSoon() {
		if (this.emitTimer || this.closed) return;
		this.emitTimer = setTimeout(() => {
			this.emitTimer = null;
			this.listeners.onTransfers(this.views());
		}, 100);
	}
	schedule(delay) {
		if (this.closed) return;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		this.pollTimer = setTimeout(() => void this.poll(), delay);
	}
	nextDelay() {
		for (const xfer of this.xfers.values()) if (xfer.via === "relay" && (xfer.status === "pending" || xfer.status === "active")) return 140;
		return this.connecting() ? FAST_POLL : IDLE_POLL;
	}
	connecting() {
		for (const slot of this.peers.values()) if (!slot.info.channelOpen) return true;
		return false;
	}
	async poll() {
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
	async pollOnce() {
		const params = new URLSearchParams({
			room: this.room,
			peer: this.selfId,
			name: this.name,
			since: String(this.cursor)
		});
		if (this.pin) params.set("pin", this.pin);
		const res = await fetch(apiPath(`/api/rtc?${params}`));
		if (this.closed) return;
		if (res.status === 403) {
			this.listeners.onPinRequired();
			return;
		}
		if (!res.ok) throw new Error(String(res.status));
		const body = await res.json();
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
		} catch {}
	}
	reconcile(peers) {
		const alive = new Set(peers.map((p) => p.id));
		for (const peer of peers) {
			if (peer.id === this.selfId) continue;
			const existing = this.peers.get(peer.id);
			if (existing) existing.info.name = peer.name;
			else this.connect(peer.id, peer.name, this.selfId > peer.id);
		}
		for (const [id, slot] of this.peers) if (!alive.has(id)) {
			slot.pc.close();
			this.peers.delete(id);
			this.failPeer(id);
		}
		this.emitPeers();
	}
	emitPeers() {
		this.listeners.onPeers([...this.peers.values()].map((s) => ({ ...s.info })));
	}
	connect(peerId, name, initiator) {
		if (this.closed) return;
		let releaseGate = () => {};
		const descGate = new Promise((resolve) => {
			releaseGate = resolve;
		});
		const pc = new RTCPeerConnection({
			iceCandidatePoolSize: 4,
			bundlePolicy: "max-bundle",
			iceServers: [...defaultIceServers(), { urls: [
				"stun:stun1.l.google.com:19302",
				"stun:stun2.l.google.com:19302",
				"stun:stun3.l.google.com:19302"
			] }]
		});
		const slot = {
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
				candidateType: null
			}
		};
		this.peers.set(peerId, slot);
		pc.onicecandidate = (event) => {
			if (!event.candidate) return;
			const init = event.candidate.toJSON();
			descGate.then(() => this.postSignal(peerId, "ice", init));
		};
		pc.onconnectionstatechange = () => {
			slot.info.connectionState = pc.connectionState;
			if (pc.connectionState === "connected") {
				slot.startedAt = Date.now();
				this.readPath(slot);
			}
			this.emitPeers();
		};
		pc.onnegotiationneeded = async () => {
			try {
				slot.makingOffer = true;
				await pc.setLocalDescription();
				await waitGather(pc, 1500);
				if (pc.localDescription) await this.postSignal(peerId, "offer", pc.localDescription.toJSON());
			} catch {} finally {
				slot.makingOffer = false;
				slot.releaseGate();
			}
		};
		pc.ondatachannel = (event) => this.wire(slot, event.channel);
		if (initiator) this.wire(slot, pc.createDataChannel("files", { ordered: true }));
	}
	pingAll() {
		const now = Math.round(performance.now());
		for (const slot of this.peers.values()) {
			if (slot.dc?.readyState !== "open") continue;
			slot.dc.send(JSON.stringify({
				t: "ping",
				n: now
			}));
		}
	}
	watchdog() {
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
		for (const xfer of this.xfers.values()) if (xfer.direction === "out" && xfer.status === "pending" && !xfer.announced && !xfer.preparing && xfer.size <= RELAY_MAX) this.relayAnnounce(xfer);
	}
	wire(slot, dc) {
		slot.dc = dc;
		dc.binaryType = "arraybuffer";
		dc.bufferedAmountLowThreshold = 786432;
		dc.onopen = () => {
			slot.info.channelOpen = true;
			slot.info.connectionState = slot.pc.connectionState;
			for (const xfer of this.xfers.values()) if (xfer.peerId === slot.info.id && xfer.direction === "out" && !xfer.announced && !xfer.preparing) this.announce(slot.info.id, xfer);
			this.emitPeers();
		};
		dc.onclose = () => {
			slot.info.channelOpen = false;
			for (const xfer of this.xfers.values()) if (xfer.peerId === slot.info.id && xfer.direction === "out" && xfer.status === "pending" && !xfer.announced && !xfer.preparing && xfer.size <= RELAY_MAX) this.relayAnnounce(xfer);
			this.failPeer(slot.info.id);
			this.emitPeers();
		};
		dc.onmessage = (event) => this.onFrame(slot, event.data);
	}
	async readPath(slot) {
		try {
			const stats = await slot.pc.getStats();
			let localId;
			stats.forEach((report) => {
				if (report.type === "candidate-pair" && report.nominated) localId = report.localCandidateId;
			});
			if (!localId) return;
			const local = stats.get(localId);
			slot.info.candidateType = local?.candidateType ?? null;
			this.emitPeers();
		} catch {}
	}
	async onSignal(from, kind, payload, roster) {
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
				const description = data;
				const collision = kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
				slot.ignoreOffer = !polite && collision;
				if (slot.ignoreOffer) return;
				await slot.pc.setRemoteDescription(description);
				await this.flushIce(slot);
				if (kind === "offer") {
					await slot.pc.setLocalDescription();
					await waitGather(slot.pc, 1500);
					if (slot.pc.localDescription) await this.postSignal(from, "answer", slot.pc.localDescription.toJSON());
					slot.releaseGate();
				}
			} else if (kind === "ice") {
				const candidate = data;
				if (!slot.pc.remoteDescription) {
					slot.pendingCandidates.push(candidate);
					return;
				}
				await slot.pc.addIceCandidate(candidate);
			}
		} catch {}
	}
	async flushIce(slot) {
		while (slot.pendingCandidates.length) {
			const candidate = slot.pendingCandidates.shift();
			if (!candidate) break;
			try {
				await slot.pc.addIceCandidate(candidate);
			} catch {}
		}
	}
	postSignal(to, kind, payload) {
		const next = (this.signalChain.get(to) ?? Promise.resolve()).then(async () => {
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
					pin: this.pin || void 0,
					payload
				})
			});
		});
		this.signalChain.set(to, next.catch(() => {}));
		return next;
	}
	onFrame(slot, data) {
		if (typeof data === "string") {
			let msg;
			try {
				msg = JSON.parse(data);
			} catch {
				return;
			}
			if (msg.t === "box") {
				this.takeBox(slot.info.id, msg, slot);
				return;
			}
			this.onControl(slot, msg);
			return;
		}
		if (data instanceof ArrayBuffer) this.onChunk(slot.info.id, data);
	}
	async takeBox(from, sealed, slot) {
		if (!this.aes) {
			this.held.push({
				from,
				slot,
				sealed
			});
			return;
		}
		const msg = await this.unbox(sealed);
		if (!msg) return;
		if (slot) this.onControl(slot, msg);
		else this.onRelay(from, msg);
	}
	onControl(slot, msg) {
		const peerId = slot.info.id;
		if (msg.t === "text") {
			this.pushNote(peerId, slot.info.name, String(msg.text ?? "").slice(0, 4e3), "in");
			return;
		}
		if (msg.t === "want") {
			this.pushAsk(peerId, slot.info.name);
			return;
		}
		if (msg.t === "ping") {
			if (slot.dc?.readyState === "open") slot.dc.send(JSON.stringify({
				t: "pong",
				n: msg.n
			}));
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
			const xfer = {
				key: msg.key >>> 0,
				peerId,
				name: safeName(String(msg.name ?? "file")).slice(0, 240),
				size: msg.size,
				mime: String(msg.mime ?? "application/octet-stream").slice(0, 120),
				direction: "in",
				status: "pending",
				bytes: 0,
				startedAt: null,
				savedToDisk: false
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
			if (xfer.via === "relay") this.relayPump(xfer);
			else this.pump(xfer, slot);
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
			xfer.sink?.abort().catch(() => {});
			this.emitNow();
			return;
		}
		if (msg.t === "done" && xfer.direction === "in") {
			if (typeof msg.sha === "string" && /^[a-f0-9]{64}$/.test(msg.sha)) xfer.expected = msg.sha;
			this.finish(xfer);
		}
	}
	async onChunk(peerId, buf) {
		if (!this.aes || buf.byteLength < 8) return;
		const key = new DataView(buf).getUint32(0);
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
				await xfer.sink.write(chunk);
				wipe(chunk);
			});
		} else {
			xfer.parts?.push(payload);
			this.bumpLive(xfer, payload);
		}
		this.emitSoon();
	}
	async pump(xfer, slot) {
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
				this.sendControl(xfer.peerId, this.doneMsg(xfer));
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
					const sealed = await pack(this.aes, piece);
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
			this.sendControl(xfer.peerId, this.doneMsg(xfer));
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
	async finish(xfer) {
		if (xfer.status === "done" || xfer.status === "cancelled") return;
		try {
			if (xfer.sink) {
				await xfer.writeChain;
				await xfer.sink.close();
				xfer.savedToDisk = true;
			} else {
				const blob = new Blob(xfer.parts ?? [], { type: xfer.mime });
				if (xfer.parts) for (const part of xfer.parts) wipe(part);
				xfer.blobUrl = URL.createObjectURL(blob);
				xfer.parts = void 0;
				triggerDownload(xfer.blobUrl, xfer.name);
			}
			xfer.bytes = xfer.size;
			xfer.status = "done";
			const local = xfer.hash?.hex();
			if (local) xfer.digest = local;
			if (xfer.expected && local) xfer.intact = xfer.expected === local;
			if (xfer.blobUrl && xfer.liveUrl?.startsWith("blob:") && xfer.liveUrl !== xfer.blobUrl) {
				URL.revokeObjectURL(xfer.liveUrl);
				xfer.liveUrl = void 0;
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
	seal(xfer) {
		const sha = xfer.hash?.hex();
		if (!sha) return;
		xfer.digest = sha;
		xfer.intact = true;
	}
	doneMsg(xfer) {
		return {
			t: "done",
			key: xfer.key,
			sha: xfer.digest
		};
	}
	failPeer(peerId) {
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
	async relayAnnounce(xfer) {
		if (!this.aes || xfer.announced || xfer.size > RELAY_MAX) return;
		xfer.via = "relay";
		xfer.announced = true;
		if (!await this.postMail(xfer.peerId, this.fileMsg(xfer)) && xfer.status === "pending") {
			xfer.status = "failed";
			this.emitNow();
		}
	}
	async relayPump(xfer) {
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
			const queue = [];
			const waiters = [];
			let readDone = false;
			let failed = false;
			const wake = () => {
				waiters.shift()?.();
			};
			const pushJob = async (job) => {
				while (queue.length >= 8 && !failed && !abort.signal.aborted) await new Promise((resolve) => waiters.push(resolve));
				if (failed || abort.signal.aborted) return;
				queue.push(job);
				wake();
			};
			const pullJob = async () => {
				while (!queue.length && !readDone && !failed && !abort.signal.aborted) await new Promise((resolve) => waiters.push(resolve));
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
					if (!await this.postMail(xfer.peerId, {
						t: "chunk",
						key: xfer.key,
						at: job.at,
						b64: job.b64
					})) {
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
					const sealed = await pack(this.aes, piece);
					wipe(piece);
					await pushJob({
						at,
						b64: bytesToB64(sealed),
						len
					});
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
	async pollMail() {
		const res = await fetch(apiPath(`/api/slip?room=${this.room}&peer=${this.selfId}${this.pin ? `&pin=${this.pin}` : ""}`));
		if (res.status === 403) {
			this.listeners.onPinRequired();
			return;
		}
		if (!res.ok || this.closed) return;
		const body = await res.json();
		for (const message of body.messages ?? []) {
			const payload = unwrap(message.payload);
			if (!payload || typeof payload !== "object" || !("t" in payload)) continue;
			if (payload.t === "box") {
				this.takeBox(message.from, payload);
				continue;
			}
			this.onRelay(message.from, payload);
		}
	}
	async postMail(to, payload) {
		if (!this.aes) return false;
		try {
			const wire = await this.wrap(payload);
			return (await fetch(apiPath("/api/slip"), {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					op: "send",
					room: this.room,
					from: this.selfId,
					to,
					pin: this.pin || void 0,
					payload: wire
				})
			})).ok;
		} catch {
			return false;
		}
	}
	async takeRelayChunk(xfer, b64, at) {
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
			xfer.held ??= /* @__PURE__ */ new Map();
			xfer.held.set(at, payload);
			return;
		}
		this.applyRelayPiece(xfer, payload);
		while (xfer.held?.has(xfer.bytes)) {
			const next = xfer.held.get(xfer.bytes);
			xfer.held.delete(xfer.bytes);
			this.applyRelayPiece(xfer, next);
		}
		this.emitSoon();
	}
	applyRelayPiece(xfer, payload) {
		xfer.hash?.update(payload);
		xfer.bytes += payload.byteLength;
		if (xfer.sink) {
			const chunk = payload.slice();
			wipe(payload);
			xfer.writeChain = (xfer.writeChain ?? Promise.resolve()).then(async () => {
				await xfer.sink.write(chunk);
				wipe(chunk);
			});
		} else {
			xfer.parts?.push(payload);
			this.bumpLive(xfer, payload);
		}
	}
	onRelay(from, msg) {
		if (!this.peers.has(from)) this.connect(from, "", this.selfId > from);
		const slot = this.peers.get(from);
		if (!slot) return;
		if (msg.t === "text") {
			this.pushNote(from, slot.info.name, String(msg.text ?? "").slice(0, 4e3), "in");
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
				via: "relay"
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
};
function unwrap(payload) {
	if (typeof payload === "string") try {
		return JSON.parse(payload);
	} catch {
		return payload;
	}
	return payload;
}
function waitGather(pc, ms) {
	if (pc.iceGatheringState === "complete") return Promise.resolve();
	return new Promise((resolve) => {
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
function bytesToB64(bytes) {
	let bin = "";
	const step = 32768;
	for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
	return btoa(bin);
}
function b64ToBytes(b64) {
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
	return out;
}
function encodeChunk(key, offset, data) {
	const buf = new ArrayBuffer(8 + data.byteLength);
	const view = new DataView(buf);
	view.setUint32(0, key);
	view.setUint32(4, offset);
	new Uint8Array(buf, 8).set(data);
	return buf;
}
function waitForRoom(dc, signal) {
	if (signal.aborted || dc.bufferedAmount < 2097152) return Promise.resolve();
	return new Promise((resolve) => {
		const done = () => {
			dc.onbufferedamountlow = null;
			signal.removeEventListener("abort", done);
			resolve();
		};
		signal.addEventListener("abort", done);
		dc.onbufferedamountlow = done;
	});
}
function triggerDownload(url, name) {
	const link = document.createElement("a");
	link.href = url;
	const slash = name.lastIndexOf("/");
	link.download = slash >= 0 ? name.slice(slash + 1) : name;
	link.click();
}
var PAPER = "#f6f3ea";
var INK = "#121613";
var LIME = "#d6ff4a";
function roundRect(ctx, x, y, w, h, r) {
	const radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + w, y, x + w, y + h, radius);
	ctx.arcTo(x + w, y + h, x, y + h, radius);
	ctx.arcTo(x, y + h, x, y, radius);
	ctx.arcTo(x, y, x + w, y, radius);
	ctx.closePath();
}
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(/* @__PURE__ */ new Error("logo"));
		image.src = src;
	});
}
/** Slip's room code: paper ground, ink modules, and the mark in the center. */
async function drawSlipQr(value, logoUrl = "/slip-mark.jpg") {
	const symbol = (await import("../_libs/qrcode.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()))).create(value, { errorCorrectionLevel: "H" });
	const count = symbol.modules.size;
	const quiet = 4;
	const cell = 8;
	const frame = 10;
	const code = (count + 8) * cell;
	const size = code + 20;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas");
	ctx.fillStyle = INK;
	ctx.fillRect(0, 0, size, size);
	roundRect(ctx, frame / 2, frame / 2, size - frame, size - frame, 18);
	ctx.fillStyle = LIME;
	ctx.fill();
	ctx.fillStyle = PAPER;
	ctx.fillRect(frame, frame, code, code);
	const logoSpan = Math.max(7, Math.round(count * .18));
	const logoAt = Math.floor((count - logoSpan) / 2);
	const inLogo = (row, col) => row >= logoAt && row < logoAt + logoSpan && col >= logoAt && col < logoAt + logoSpan;
	ctx.fillStyle = INK;
	for (let row = 0; row < count; row += 1) for (let col = 0; col < count; col += 1) {
		if (!symbol.modules.get(row, col) || inLogo(row, col)) continue;
		const x = frame + (col + quiet) * cell;
		const y = frame + (row + quiet) * cell;
		ctx.fillRect(x, y, cell, cell);
	}
	const plate = logoSpan * cell;
	const px = frame + (logoAt + quiet) * cell;
	const py = frame + (logoAt + quiet) * cell;
	ctx.fillStyle = PAPER;
	ctx.fillRect(px, py, plate, plate);
	try {
		const logo = await loadImage(logoUrl);
		const inset = Math.max(4, Math.round(cell * .7));
		const side = Math.min(logo.width, logo.height);
		const sx = (logo.width - side) / 2;
		const sy = Math.max(0, (logo.height - side) / 2);
		ctx.save();
		roundRect(ctx, px + inset, py + inset, plate - 12, plate - 12, 10);
		ctx.clip();
		ctx.drawImage(logo, sx, sy, side, side, px + inset, py + inset, plate - 12, plate - 12);
		ctx.restore();
		ctx.strokeStyle = LIME;
		ctx.lineWidth = 3;
		roundRect(ctx, px + inset, py + inset, plate - 12, plate - 12, 10);
		ctx.stroke();
	} catch {
		ctx.fillStyle = INK;
		ctx.font = `700 ${Math.round(plate * .22)}px Figtree, sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("SLIP", px + plate / 2, py + plate / 2);
	}
	return canvas.toDataURL("image/png");
}
function asFile(entry, path) {
	return new Promise((resolve) => {
		entry.file((file) => {
			const rel = path ? `${path}${file.name}` : file.name;
			resolve(rel === file.name ? file : new File([file], rel, {
				type: file.type,
				lastModified: file.lastModified
			}));
		}, () => resolve(null));
	});
}
function readDir(dir) {
	return new Promise((resolve) => {
		const reader = dir.createReader();
		const all = [];
		const pull = () => {
			reader.readEntries((batch) => {
				if (!batch.length) resolve(all);
				else {
					all.push(...batch);
					pull();
				}
			}, () => resolve(all));
		};
		pull();
	});
}
async function walk(entry, out, path = "") {
	if (entry.isFile) {
		const file = await asFile(entry, path);
		if (file) out.push(file);
		return;
	}
	if (!entry.isDirectory) return;
	const children = await readDir(entry);
	for (const child of children) await walk(child, out, `${path}${entry.name}/`);
}
/** Files from a drop, including folders the browser exposes as entries. */
async function filesFromDataTransfer(data) {
	if (!data) return [];
	const entries = [];
	for (const item of data.items) {
		const entry = item.webkitGetAsEntry?.();
		if (entry) entries.push(entry);
	}
	if (!entries.length) return [...data.files];
	const out = [];
	for (const entry of entries) await walk(entry, out);
	return out.length ? out : [...data.files];
}
var LEFT = [
	"Amber",
	"Quiet",
	"Brisk",
	"Cedar",
	"Lunar",
	"Copper",
	"Gentle",
	"Rapid",
	"Misty",
	"Solar",
	"Velvet",
	"Crisp",
	"Hidden",
	"Noble",
	"Bright",
	"Silver",
	"Calm",
	"Wild",
	"Tiny",
	"Bold"
];
var RIGHT = [
	"Harbor",
	"Finch",
	"Pebble",
	"Lantern",
	"Meadow",
	"Quartz",
	"Willow",
	"Comet",
	"Brook",
	"Maple",
	"Heron",
	"Cinder",
	"Prairie",
	"Orbit",
	"Thistle",
	"Marble",
	"Falcon",
	"Dune",
	"Iris",
	"Nimbus"
];
var GENERIC = /^(phone|computer|this device|device|laptop|desktop|mobile)$/i;
function randomDeviceName() {
	const bytes = /* @__PURE__ */ new Uint8Array(2);
	crypto.getRandomValues(bytes);
	return `${LEFT[bytes[0] % LEFT.length]} ${RIGHT[bytes[1] % RIGHT.length]}`;
}
function storedDeviceName() {
	const saved = localStorage.getItem("slip-name")?.trim() ?? "";
	if (saved && !GENERIC.test(saved)) return saved.slice(0, 24);
	const next = randomDeviceName();
	localStorage.setItem("slip-name", next);
	return next;
}
function SlipApp({ room, pin, onRoom }) {
	const [name, setName] = (0, import_react.useState)("");
	const [ready, setReady] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [notice, setNotice] = (0, import_react.useState)(null);
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const [seal, setSeal] = (0, import_react.useState)();
	(0, import_react.useEffect)(() => {
		setName(storedDeviceName());
		setReady(true);
	}, []);
	function remember(next) {
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
	function join(raw) {
		const code = parseRoom(raw);
		if (!code) {
			setNotice("Enter a 4–8 character room code, or a Slip link.");
			return;
		}
		remember(name);
		setNotice(null);
		setScanning(false);
		let nextPin;
		const token = sealFromLink(raw);
		if (token) sessionStorage.setItem(`slip-seal:${code}`, token);
		try {
			const fromLink = new URL(raw.trim()).searchParams.get("pin") ?? "";
			if (/^[0-9]{4}$/.test(fromLink)) nextPin = fromLink;
		} catch {}
		onRoom(code, nextPin);
	}
	(0, import_react.useEffect)(() => {
		if (!room) {
			setSeal(void 0);
			return;
		}
		const fromHash = sealFromLink(window.location.href);
		const fromSession = sessionStorage.getItem(`slip-seal:${room}`) ?? "";
		const token = fromHash || (fromSession && sealFromLink(`http://local/#k=${fromSession}`) ? fromSession : "");
		if (!token) {
			setSeal(void 0);
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto flex w-full max-w-xl flex-col px-4 py-6 sm:px-6 sm:py-10",
			children: room ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Room, {
				code: room,
				pin,
				seal,
				name,
				ready,
				onName: (value) => {
					setName(value.slice(0, 24));
				},
				onLeave: () => onRoom(void 0),
				onPin: (next) => onRoom(room, next),
				onSeal: (token) => {
					sessionStorage.setItem(`slip-seal:${room}`, token);
					setSeal(token);
					const url = new URL(window.location.href);
					url.hash = `k=${token}`;
					window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
				}
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lobby, {
				name,
				ready,
				draft,
				notice,
				onName: setName,
				onDraft: setDraft,
				onHost: host,
				onJoin: () => join(draft),
				onScan: () => {
					setNotice(null);
					setScanning(true);
				}
			})
		}), scanning ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scanner, {
			onClose: () => setScanning(false),
			onCode: (raw) => join(raw)
		}) : null]
	});
}
function Wordmark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-display text-3xl leading-none font-medium tracking-tight",
			children: "Slip"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "size-2 rounded-full bg-primary",
			"aria-hidden": "true"
		})]
	});
}
function ThemeToggle() {
	const [light, setLight] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const on = document.documentElement.dataset.theme === "light";
		setLight(on);
	}, []);
	function apply(next) {
		setLight(next);
		if (next) document.documentElement.dataset.theme = "light";
		else delete document.documentElement.dataset.theme;
		localStorage.setItem("slip-theme", next ? "light" : "dark");
		document.querySelector("meta[name=\"theme-color\"]")?.setAttribute("content", next ? "#e7e1d4" : "#0e1411");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "btn btn-ghost size-12 shrink-0 px-0",
		"aria-label": light ? "Use dark mode" : "Use light mode",
		onClick: () => apply(!light),
		children: light ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "size-5" })
	});
}
function Lobby({ name, ready, draft, notice, onName, onDraft, onHost, onJoin, onScan }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-md flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-10 text-5xl leading-none font-medium sm:text-6xl",
				children: "Hand it across."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-base leading-relaxed text-muted",
				children: "Host a room, or join with a code or a scan. The file is never stored. Same Wi-Fi is faster. Any network still works."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "sheet mt-8 p-5 sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "block text-sm font-medium",
						htmlFor: "device-name",
						children: "Your name"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "device-name",
						className: "field mt-2",
						value: name,
						maxLength: 24,
						placeholder: "Name",
						onChange: (event) => onName(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-primary mt-4 w-full",
						disabled: !ready,
						onClick: onHost,
						children: "Host a room"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "my-5 flex items-center gap-3 text-sm text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-line" }),
							"or join",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-line" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: (event) => {
							event.preventDefault();
							onJoin();
						},
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "sr-only",
								htmlFor: "room-code",
								children: "Room code"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "room-code",
								className: "field text-center font-display text-xl tracking-widest uppercase",
								value: draft,
								maxLength: 8,
								autoCapitalize: "characters",
								autoCorrect: "off",
								spellCheck: false,
								placeholder: "CODE",
								onChange: (event) => onDraft(event.target.value.toUpperCase())
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								className: "btn btn-ghost w-full",
								disabled: !ready || draft.trim().length < 4,
								children: "Join with code"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "btn btn-ghost mt-3 w-full",
						onClick: onScan,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanLine, { className: "size-5" }), "Scan a QR"]
					}),
					notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-muted",
						role: "status",
						children: notice
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-muted",
						children: "You approve every file that comes in."
					})
				]
			})
		]
	});
}
function Room({ code, pin, seal, name, ready, onName, onLeave, onPin, onSeal }) {
	const roomRef = (0, import_react.useRef)(null);
	const [peers, setPeers] = (0, import_react.useState)([]);
	const [transfers, setTransfers] = (0, import_react.useState)([]);
	const [notes, setNotes] = (0, import_react.useState)([]);
	const [asks, setAsks] = (0, import_react.useState)([]);
	const [online, setOnline] = (0, import_react.useState)(false);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [href, setHref] = (0, import_react.useState)("");
	const [copied, setCopied] = (0, import_react.useState)(null);
	const [hint, setHint] = (0, import_react.useState)("");
	const [keyDraft, setKeyDraft] = (0, import_react.useState)("");
	const [shredAfter, setShredAfter] = (0, import_react.useState)(true);
	const [forgetAfter, setForgetAfter] = (0, import_react.useState)(0);
	const [chime, setChime] = (0, import_react.useState)(false);
	const [query, setQuery] = (0, import_react.useState)("");
	const [text, setText] = (0, import_react.useState)("");
	const [dragging, setDragging] = (0, import_react.useState)(false);
	const [hoverPeer, setHoverPeer] = (0, import_react.useState)(null);
	const [notice, setNotice] = (0, import_react.useState)(null);
	const [everyone, setEveryone] = (0, import_react.useState)(false);
	const [skipDupes, setSkipDupes] = (0, import_react.useState)(false);
	const [shrinkPhotos, setShrinkPhotos] = (0, import_react.useState)(false);
	const [stayFor, setStayFor] = (0, import_react.useState)(0);
	const [autoAccept, setAutoAccept] = (0, import_react.useState)(false);
	const [notify, setNotify] = (0, import_react.useState)(false);
	const [pinNeeded, setPinNeeded] = (0, import_react.useState)(false);
	const [roomLocked, setRoomLocked] = (0, import_react.useState)(Boolean(pin));
	const [pinDraft, setPinDraft] = (0, import_react.useState)("");
	const [recording, setRecording] = (0, import_react.useState)(false);
	const [folderName, setFolderName] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const folderRef = (0, import_react.useRef)(null);
	const queuedFiles = (0, import_react.useRef)([]);
	const forcedPeer = (0, import_react.useRef)(null);
	const seenIncoming = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const accepting = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const dragDepth = (0, import_react.useRef)(0);
	const photoRef = (0, import_react.useRef)(null);
	const recorderRef = (0, import_react.useRef)(null);
	const folderHandle = (0, import_react.useRef)(null);
	const forgetTimers = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const chimeReady = (0, import_react.useRef)(false);
	const peerCount = (0, import_react.useRef)(0);
	const heard = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	(0, import_react.useEffect)(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("room", code);
		if (pin) url.searchParams.set("pin", pin);
		else url.searchParams.delete("pin");
		url.hash = seal ? `k=${seal}` : "";
		setHref(url.toString());
	}, [
		code,
		pin,
		seal
	]);
	(0, import_react.useEffect)(() => {
		let slip = null;
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
			slip = new SlipRoom({
				room: code,
				selfId: id,
				name: saved,
				pin,
				seal: token
			}, {
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
				onSeal: (next) => setHint(next)
			});
			roomRef.current = slip;
			slip.join();
		}, 40);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
			slip?.close();
			if (slip && roomRef.current === slip) roomRef.current = null;
		};
	}, [code]);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		const clean = name.trim().slice(0, 24) || randomDeviceName();
		localStorage.setItem("slip-name", clean);
		roomRef.current?.setName(clean);
	}, [name, ready]);
	(0, import_react.useEffect)(() => {
		roomRef.current?.setPin(pin ?? "");
		if (seal) roomRef.current?.useSeal(seal);
	}, [pin, seal]);
	(0, import_react.useEffect)(() => {
		roomRef.current?.setShred(shredAfter);
	}, [shredAfter]);
	const openedAt = (0, import_react.useRef)(Date.now());
	const closeRef = (0, import_react.useRef)(() => {});
	const [closing, setClosing] = (0, import_react.useState)(null);
	function beginLeave() {
		setClosing((current) => current ?? buildClosingSlip({
			code,
			openedAt: openedAt.current,
			peers,
			transfers,
			notes: notes.length
		}));
	}
	closeRef.current = beginLeave;
	(0, import_react.useEffect)(() => {
		if (!stayFor) return;
		const timer = window.setTimeout(() => closeRef.current(), stayFor * 60 * 1e3);
		return () => window.clearTimeout(timer);
	}, [stayFor]);
	(0, import_react.useEffect)(() => {
		setChime(localStorage.getItem("slip-chime") === "on");
	}, []);
	(0, import_react.useEffect)(() => {
		if (!chimeReady.current) {
			chimeReady.current = true;
			peerCount.current = peers.length;
			for (const item of transfers) if (item.status === "done") heard.current.add(`${item.direction}:${item.peerId}:${item.key}`);
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
	}, [
		chime,
		peers.length,
		transfers
	]);
	(0, import_react.useEffect)(() => {
		const timers = forgetTimers.current;
		return () => {
			for (const timer of timers.values()) window.clearTimeout(timer);
			timers.clear();
		};
	}, []);
	(0, import_react.useEffect)(() => {
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
			}, forgetAfter * 1e3);
			forgetTimers.current.set(id, timer);
		}
	}, [forgetAfter, transfers]);
	(0, import_react.useEffect)(() => {
		if (selected && peers.some((peer) => peer.id === selected)) return;
		const next = peers.find((peer) => peer.channelOpen) ?? peers[0];
		setSelected(next?.id ?? null);
	}, [peers, selected]);
	const busy = transfers.some((item) => item.status === "active");
	(0, import_react.useEffect)(() => {
		if (!busy || !("wakeLock" in navigator)) return;
		let lock = null;
		let cancel = false;
		navigator.wakeLock.request("screen").then((sentinel) => {
			if (cancel) sentinel.release();
			else lock = sentinel;
		}).catch(() => {});
		return () => {
			cancel = true;
			lock?.release();
		};
	}, [busy]);
	function targetPeer() {
		if (selected && peers.some((peer) => peer.id === selected)) return selected;
		return peers.find((peer) => peer.channelOpen)?.id ?? null;
	}
	function sendFiles(list) {
		const forced = forcedPeer.current;
		forcedPeer.current = null;
		if (!list.length) return;
		deliver(list, forced);
	}
	async function deliver(list, forced) {
		const notes = [];
		let next = list;
		if (skipDupes) {
			const kept = next.filter((file) => !transfers.some((item) => item.direction === "out" && item.name === file.name && item.size === file.size && (item.status === "pending" || item.status === "active" || item.status === "done")));
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
	const sendRef = (0, import_react.useRef)(sendFiles);
	sendRef.current = sendFiles;
	async function takeDrop(data, peerId) {
		const files = await filesFromDataTransfer(data);
		if (peerId) forcedPeer.current = peerId;
		sendRef.current(files);
	}
	async function sinkFor(name) {
		const dir = folderHandle.current;
		if (!dir) return pickSink(name);
		try {
			return await (await dir.getFileHandle(baseName(name), { create: true })).createWritable();
		} catch {
			return;
		}
	}
	async function acceptItem(item) {
		const sink = await sinkFor(item.name);
		roomRef.current?.accept(item.peerId, item.key, sink);
	}
	async function chooseFolder() {
		const picker = window.showDirectoryPicker;
		if (!picker) {
			setNotice("This browser can’t pick a save folder. Files download instead.");
			return;
		}
		try {
			const handle = await picker();
			folderHandle.current = handle;
			setFolderName(handle.name);
			setNotice(null);
		} catch {}
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
			const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : void 0);
			const chunks = [];
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
	(0, import_react.useEffect)(() => {
		function onPaste(event) {
			const target = event.target;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
			const files = [...event.clipboardData?.files ?? []];
			if (!files.length) return;
			event.preventDefault();
			sendRef.current(files);
		}
		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!autoAccept) return;
		for (const item of transfers) {
			if (item.direction !== "in" || item.status !== "pending") continue;
			const id = `${item.peerId}:${item.key}`;
			if (accepting.current.has(id)) continue;
			accepting.current.add(id);
			roomRef.current?.accept(item.peerId, item.key);
		}
	}, [autoAccept, transfers]);
	(0, import_react.useEffect)(() => {
		if (!notify || typeof Notification === "undefined" || Notification.permission !== "granted") return;
		for (const item of transfers) {
			if (item.direction !== "in" || item.status !== "pending") continue;
			const id = `${item.peerId}:${item.key}`;
			if (seenIncoming.current.has(id)) continue;
			seenIncoming.current.add(id);
			new Notification("Slip", { body: `${baseName(item.name)} is waiting` });
		}
	}, [notify, transfers]);
	(0, import_react.useEffect)(() => {
		if (!peers.length || queuedFiles.current.length === 0) return;
		const peerId = peers.find((peer) => peer.channelOpen)?.id ?? peers[0]?.id;
		if (!peerId) return;
		const files = queuedFiles.current.splice(0);
		roomRef.current?.sendFiles(peerId, files);
		setNotice(null);
	}, [peers]);
	async function copy(kind) {
		try {
			await navigator.clipboard.writeText(kind === "code" ? code : href);
			setCopied(kind);
			window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1600);
		} catch {
			setNotice("Copy was blocked by the browser.");
		}
	}
	const selectedPeer = peers.find((peer) => peer.id === selected) ?? null;
	const bridged = transfers.some((item) => item.bridged);
	const finished = transfers.some((item) => item.status !== "active" && item.status !== "pending");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		onDragEnter: (event) => {
			if (![...event.dataTransfer.types].includes("Files")) return;
			event.preventDefault();
			dragDepth.current += 1;
			setDragging(true);
		},
		onDragOver: (event) => {
			if ([...event.dataTransfer.types].includes("Files")) event.preventDefault();
		},
		onDragLeave: () => {
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) {
				setDragging(false);
				setHoverPeer(null);
			}
		},
		onDrop: (event) => {
			if (![...event.dataTransfer.types].includes("Files")) return;
			event.preventDefault();
			dragDepth.current = 0;
			setDragging(false);
			setHoverPeer(null);
			takeDrop(event.dataTransfer);
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "sr-only",
							htmlFor: "room-device-name",
							children: "Device name"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "room-device-name",
							className: "field w-36 sm:w-44",
							value: name,
							maxLength: 24,
							onChange: (event) => onName(event.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "btn btn-ghost",
							onClick: beginLeave,
							children: "Leave"
						})
					]
				})]
			}),
			!online ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-muted",
				role: "status",
				children: "Opening the room…"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 space-y-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "sheet p-5 sm:p-7",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-muted",
								children: "Give this to the other device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display mt-1 text-5xl tracking-widest",
								children: code
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-relaxed text-muted",
								children: "Scan the mark, or type the code. The key travels with the link."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex flex-wrap gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "btn btn-ghost",
										onClick: () => void copy("code"),
										children: [copied === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), copied === "code" ? "Copied" : "Copy code"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "btn btn-ghost",
										onClick: () => void copy("link"),
										disabled: !href,
										children: [copied === "link" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, { className: "size-4" }), copied === "link" ? "Copied" : "Copy link"]
									}),
									href && typeof navigator.share === "function" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "btn btn-ghost",
										onClick: () => {
											navigator.share({
												title: "Slip",
												url: href
											}).catch(() => {});
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" }), "Share"]
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: pin ? "btn btn-primary" : "btn btn-ghost",
										onClick: () => {
											const next = pin ? "" : String(1e3 + Math.floor(Math.random() * 9e3));
											roomRef.current?.lock(next).then((ok) => {
												if (!ok) {
													setNotice("Couldn’t change the room lock.");
													return;
												}
												onPin(next || void 0);
												setRoomLocked(Boolean(next));
												setNotice(next ? `Room locked. PIN ${next}.` : null);
											});
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" }), pin ? `PIN ${pin}` : "Lock room"]
									})
								]
							}),
							roomLocked && pin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm text-muted",
								children: "New devices need this PIN. The QR includes it."
							}) : null,
							seal ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm text-muted",
									children: [
										"Sealed",
										hint ? ` · ${hint}` : "",
										". The link carries the key. It never goes to the room server."
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex flex-wrap items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
										className: "max-w-full rounded-xl bg-surface-2 px-3 py-2 text-sm break-all tracking-wide",
										children: seal
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "btn btn-ghost",
										onClick: () => {
											navigator.clipboard.writeText(seal).then(() => {
												setCopied("key");
												window.setTimeout(() => setCopied((current) => current === "key" ? null : current), 1600);
											}).catch(() => setNotice("Copy was blocked by the browser."));
										},
										children: [copied === "key" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), copied === "key" ? "Copied" : "Copy key"]
									})]
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								className: "mt-4 space-y-2",
								onSubmit: (event) => {
									event.preventDefault();
									const token = keyDraft.trim();
									roomRef.current?.useSeal(token).then((ok) => {
										if (!ok) {
											setNotice("That key isn’t valid.");
											return;
										}
										onSeal(token);
										setNotice(null);
									});
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: "Paste the host’s encryption key. Files stay sealed until this device has it."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "field",
										value: keyDraft,
										autoCapitalize: "off",
										autoCorrect: "off",
										spellCheck: false,
										placeholder: "Encryption key",
										onChange: (event) => setKeyDraft(event.target.value.trim())
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										className: "btn btn-primary",
										disabled: keyDraft.length < 22,
										children: "Use key"
									})
								]
							}),
							href ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomQr, { value: href }) : null
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-3xl bg-surface p-5 shadow-ring",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-display text-2xl font-medium",
									children: "Devices"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm text-muted tabular-nums",
									children: [peers.length, " here"]
								})]
							}),
							peers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-muted",
								children: "Nobody else yet. You're hosting. Leave and the room forgets you."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-3 space-y-2",
								children: peers.map((peer) => {
									const active = peer.id === selected;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
										onDragOver: (event) => {
											event.preventDefault();
											event.stopPropagation();
											setHoverPeer(peer.id);
										},
										onDrop: (event) => {
											event.preventDefault();
											event.stopPropagation();
											dragDepth.current = 0;
											setDragging(false);
											setHoverPeer(null);
											takeDrop(event.dataTransfer, peer.id);
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setSelected(peer.id),
											className: `flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ${hoverPeer === peer.id ? "bg-surface-2 shadow-ring-strong" : active ? "bg-surface-2 shadow-ring-strong" : dragging ? "bg-surface-2 shadow-ring" : "bg-surface-2 shadow-ring"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block font-semibold",
												children: peer.name || "Device"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block text-sm text-muted",
												children: dragging ? "Drop to send here" : `${pathLabel(peer.candidateType, peer.connectionState, peer.channelOpen)}${peer.rttMs != null ? ` · ${peer.rttMs} ms` : ""}`
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `size-2.5 rounded-full ${peer.channelOpen ? "bg-primary" : "bg-line"}`,
												"aria-hidden": "true"
											})]
										})
									}, peer.id);
								})
							}),
							bridged ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-muted",
								children: "The file still goes if you are not on the same Wi-Fi. This one is crossing an encrypted bridge and is deleted as soon as the other device has it."
							}) : null
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `sheet border-2 border-dashed px-5 py-10 text-center ${dragging ? "border-primary" : "border-line"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mx-auto size-6 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 font-semibold",
									children: everyone && peers.length > 1 ? "Send to everyone" : selectedPeer ? `Send to ${selectedPeer.name || "device"}` : "Drop files"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mx-auto mt-1 max-w-sm text-sm text-muted",
									children: autoAccept ? "Auto-accept is on, so incoming files save without asking." : "Drop files or a folder on a device. Anywhere else sends to the selected one."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 flex flex-col justify-center gap-2 sm:flex-row",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "btn btn-primary",
										onClick: () => fileRef.current?.click(),
										children: "Choose files"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "btn btn-ghost",
										onClick: () => folderRef.current?.click(),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderUp, { className: "size-4" }), "Choose a folder"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: fileRef,
									className: "sr-only",
									type: "file",
									multiple: true,
									onChange: (event) => {
										sendFiles([...event.target.files ?? []]);
										event.target.value = "";
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: (node) => {
										folderRef.current = node;
										node?.setAttribute("webkitdirectory", "");
										node?.setAttribute("directory", "");
									},
									className: "sr-only",
									type: "file",
									multiple: true,
									onChange: (event) => {
										sendFiles([...event.target.files ?? []].map((file) => {
											const rel = file.webkitRelativePath;
											if (!rel || rel === file.name) return file;
											return new File([file], rel, {
												type: file.type,
												lastModified: file.lastModified
											});
										}));
										event.target.value = "";
									}
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
							className: "more rounded-3xl bg-surface px-4 shadow-ring",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: ["More", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium text-muted",
									children: "Tools"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap gap-2 pb-4",
									children: [
										peers.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: everyone ? "btn btn-primary" : "btn btn-ghost",
											"aria-pressed": everyone,
											onClick: () => setEveryone((on) => !on),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4" }), "Everyone"]
										}) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "btn btn-ghost",
											disabled: !selectedPeer,
											onClick: () => {
												if (!selected) return;
												const ok = roomRef.current?.ask(selected);
												setNotice(ok ? `Asked ${selectedPeer?.name || "them"} for a file.` : "Waiting for the other device.");
											},
											children: "Ask for a file"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: autoAccept ? "btn btn-primary" : "btn btn-ghost",
											"aria-pressed": autoAccept,
											onClick: () => setAutoAccept((on) => !on),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4" }), "Auto-accept"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: notify ? "btn btn-primary" : "btn btn-ghost",
											"aria-pressed": notify,
											onClick: () => {
												if (notify) {
													setNotify(false);
													return;
												}
												if (typeof Notification === "undefined") {
													setNotice("This browser doesn’t show notifications.");
													return;
												}
												Notification.requestPermission().then((permission) => {
													if (permission === "granted") {
														setNotify(true);
														setNotice(null);
													} else setNotice("Notifications stay off until the browser allows them.");
												});
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "size-4" }), "Notify"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "btn btn-ghost",
											onClick: () => photoRef.current?.click(),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-4" }), "Photo"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: recording ? "btn btn-primary" : "btn btn-ghost",
											onClick: () => void toggleRecording(),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-4" }), recording ? "Stop" : "Voice"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: chime ? "btn btn-primary" : "btn btn-ghost",
											"aria-pressed": chime,
											onClick: () => {
												setChime((on) => {
													const next = !on;
													localStorage.setItem("slip-chime", next ? "on" : "off");
													if (next) playChime();
													return next;
												});
											},
											children: [chime ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }), "Chime"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: shredAfter ? "btn btn-primary" : "btn btn-ghost",
											"aria-pressed": shredAfter,
											onClick: () => setShredAfter((on) => !on),
											children: "Shred after save"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: folderName ? "btn btn-primary" : "btn btn-ghost",
											onClick: () => void chooseFolder(),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderPlus, { className: "size-4" }), folderName ? folderName : "Save folder"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: skipDupes ? "btn btn-primary" : "btn btn-ghost",
											"aria-pressed": skipDupes,
											onClick: () => setSkipDupes((on) => !on),
											children: "Skip duplicates"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: shrinkPhotos ? "btn btn-primary" : "btn btn-ghost",
											"aria-pressed": shrinkPhotos,
											onClick: () => setShrinkPhotos((on) => !on),
											children: "Shrink photos"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: stayFor ? "btn btn-primary" : "btn btn-ghost",
											onClick: () => {
												setStayFor((current) => {
													const next = current === 0 ? 15 : current === 15 ? 60 : 0;
													setNotice(next ? `This device leaves the room in ${next} minutes.` : null);
													return next;
												});
											},
											children: stayFor === 0 ? "Stay open" : `Leave in ${stayFor} min`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "btn btn-ghost",
											onClick: () => {
												const lines = transfers.filter((item) => item.status === "done").map((item) => `${item.direction === "out" ? "sent" : "received"}\t${item.name}\t${item.size}\t${item.digest ?? "no-check"}`);
												if (!lines.length) {
													setNotice("Nothing finished yet.");
													return;
												}
												const text = [`Slip receipt · ${code}`, ...lines].join("\n");
												navigator.clipboard.writeText(text).then(() => setNotice("Receipt copied. It lists names and checks, not the files."), () => setNotice("Copy was blocked by the browser."));
											},
											children: "Copy receipt"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											ref: photoRef,
											className: "sr-only",
											type: "file",
											accept: "image/*",
											capture: "environment",
											onChange: (event) => {
												sendFiles([...event.target.files ?? []]);
												event.target.value = "";
											}
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									className: "mt-4 flex flex-col gap-2 pb-4 sm:flex-row",
									onSubmit: (event) => {
										event.preventDefault();
										const peerId = targetPeer();
										if (!peerId) {
											setNotice("Waiting for the other device to join.");
											return;
										}
										if (!roomRef.current?.sendText(peerId, text)) {
											setNotice("The link isn’t open yet.");
											return;
										}
										setText("");
										setNotice(null);
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "sr-only",
											htmlFor: "slip-text",
											children: "Text to send"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											id: "slip-text",
											className: "field",
											value: text,
											maxLength: 4e3,
											placeholder: "Or send a short note",
											onChange: (event) => setText(event.target.value)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "submit",
											className: "btn btn-ghost sm:w-auto",
											disabled: !text.trim(),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" }), "Send"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "btn btn-ghost sm:w-auto",
											onClick: () => {
												const peerId = targetPeer();
												if (!peerId) {
													setNotice("Waiting for the other device to join.");
													return;
												}
												navigator.clipboard.readText().then((value) => {
													const ok = roomRef.current?.sendText(peerId, value);
													setNotice(ok ? null : "Clipboard was empty, or the link isn’t open yet.");
												}).catch(() => setNotice("Clipboard permission was blocked."));
											},
											children: "Clipboard"
										})
									]
								})
							]
						}),
						notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							role: "status",
							children: notice
						}) : null,
						asks.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl font-medium",
							children: "Requests"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 space-y-2",
							children: asks.map((ask) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex flex-col gap-3 rounded-2xl bg-surface px-4 py-3 shadow-ring sm:flex-row sm:items-center sm:justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold",
									children: ask.peerName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: " asked for a file."
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "btn btn-primary",
										onClick: () => {
											forcedPeer.current = ask.peerId;
											setSelected(ask.peerId);
											fileRef.current?.click();
										},
										children: "Send a file"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "btn btn-ghost",
										onClick: () => roomRef.current?.dismissAsk(ask.id),
										children: "Dismiss"
									})]
								})]
							}, ask.id))
						})] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-display text-2xl font-medium",
									children: "Transfers"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap justify-end gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "text-sm font-semibold text-muted",
											onClick: () => setForgetAfter((current) => current === 0 ? 60 : current === 60 ? 300 : 0),
											children: forgetAfter === 0 ? "Keep received" : forgetAfter === 60 ? "Forget in 1 min" : "Forget in 5 min"
										}),
										finished ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "text-sm font-semibold text-muted",
											onClick: () => roomRef.current?.clearFinished(),
											children: "Clear finished"
										}) : null,
										transfers.filter((item) => item.direction === "in" && item.status === "pending").length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "text-sm font-semibold text-primary",
											onClick: () => {
												for (const item of transfers) if (item.direction === "in" && item.status === "pending") acceptItem(item);
											},
											children: "Accept all"
										}) : null,
										transfers.filter((item) => item.direction === "in" && item.status === "pending").length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "text-sm font-semibold text-muted",
											onClick: () => {
												for (const item of transfers) if (item.direction === "in" && item.status === "pending") roomRef.current?.reject(item.peerId, item.key);
											},
											children: "Decline all"
										}) : null
									]
								})]
							}),
							transfers.length > 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field mt-3",
								value: query,
								placeholder: "Find a file",
								onChange: (event) => setQuery(event.target.value)
							}) : null,
							transfers.some((item) => item.status === "done") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-sm text-muted tabular-nums",
								children: [
									"Sent ",
									formatBytes(transfers.filter((item) => item.direction === "out" && item.status === "done").reduce((sum, item) => sum + item.size, 0)),
									" · ",
									"Received ",
									formatBytes(transfers.filter((item) => item.direction === "in" && item.status === "done").reduce((sum, item) => sum + item.size, 0))
								]
							}) : null,
							transfers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Nothing in motion. Drop a file when a device is linked."
							}) : transfers.filter((item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase())).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "No file by that name."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-3 space-y-3",
								children: transfers.filter((item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase())).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransferRow, {
									item,
									onAccept: async () => {
										await acceptItem(item);
									},
									onReject: () => roomRef.current?.reject(item.peerId, item.key),
									onCancel: () => roomRef.current?.cancel(item.peerId, item.key),
									onPause: () => roomRef.current?.pause(item.peerId, item.key),
									onResume: () => roomRef.current?.resume(item.peerId, item.key),
									onRetry: () => roomRef.current?.retry(item.peerId, item.key),
									onShred: () => roomRef.current?.shred(item.peerId, item.key),
									onDismiss: () => roomRef.current?.dismiss(item.peerId, item.key)
								}, `${item.direction}-${item.peerId}-${item.key}`))
							})
						] }),
						notes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl font-medium",
							children: "Notes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 space-y-2",
							children: notes.map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "rounded-2xl bg-surface px-4 py-3 shadow-ring",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: note.direction === "out" ? "You" : note.peerName || "Device"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 leading-relaxed break-words",
										children: note.text
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "btn btn-ghost mt-2",
										onClick: () => {
											navigator.clipboard.writeText(note.text).then(() => {
												setCopied("note");
												window.setTimeout(() => setCopied((current) => current === "note" ? null : current), 1600);
											}).catch(() => setNotice("Copy was blocked by the browser."));
										},
										children: [copied === "note" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), copied === "note" ? "Copied" : "Copy"]
									})
								]
							}, note.id))
						})] }) : null
					]
				})]
			}),
			pinNeeded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
				className: "fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center",
				onSubmit: (event) => {
					event.preventDefault();
					if (!/^[0-9]{4}$/.test(pinDraft)) {
						setNotice("The PIN is 4 digits.");
						return;
					}
					roomRef.current?.setPin(pinDraft);
					onPin(pinDraft);
					setPinNeeded(false);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-3xl bg-surface p-5 shadow-ring",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl font-medium",
							children: "This room is locked"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Ask the host for the 4-digit PIN."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "sr-only",
							htmlFor: "room-pin",
							children: "Room PIN"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "room-pin",
							className: "field mt-4 text-center font-display text-2xl tracking-widest",
							inputMode: "numeric",
							autoComplete: "off",
							maxLength: 4,
							value: pinDraft,
							onChange: (event) => setPinDraft(event.target.value.replace(/\D/g, "").slice(0, 4))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "btn btn-primary mt-3 w-full",
							disabled: pinDraft.length !== 4,
							children: "Unlock"
						})
					]
				})
			}) : null,
			closing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-4 sm:items-center",
				role: "dialog",
				"aria-label": "Your slip",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "sheet w-full max-w-md p-6 sm:p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-medium text-muted",
							children: ["Torn off · ", code]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display mt-2 text-4xl leading-none font-medium",
							children: closing.headline
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-sm leading-relaxed",
							children: closing.body
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-1 border-t border-dashed border-line pt-4 text-sm tabular-nums",
							children: closing.lines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display mt-4 text-xl leading-snug",
							children: closing.fortune
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "btn btn-ghost w-full",
									onClick: () => void saveSlipImage(closing, code),
									children: "Save slip"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "btn btn-ghost w-full",
									onClick: () => {
										navigator.clipboard.writeText(closing.plain).then(() => setNotice("Slip copied."), () => setNotice("Copy was blocked by the browser."));
									},
									children: "Copy"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "btn btn-primary w-full",
									onClick: onLeave,
									children: "Done"
								})
							]
						})
					]
				})
			}) : null
		]
	});
}
function FilePreview({ item }) {
	const [hideLive, setHideLive] = (0, import_react.useState)(false);
	const [open, setOpen] = (0, import_react.useState)(false);
	const text = item.liveText || (item.previewKind === "text" ? item.preview : void 0);
	const image = item.mime.startsWith("video/") ? void 0 : item.blobUrl || (hideLive ? void 0 : item.liveUrl) || (item.previewKind === "image" ? item.preview : void 0);
	const play = item.blobUrl || item.liveUrl;
	const video = item.mime.startsWith("video/") ? play : void 0;
	const audio = item.mime.startsWith("audio/") ? play : void 0;
	if (!image && !video && !audio && !text) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3",
		children: [
			image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "block max-w-full",
				onClick: () => setOpen(true),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: image,
					alt: "",
					className: "max-h-48 rounded-xl",
					onError: () => {
						if (!hideLive && item.liveUrl) setHideLive(true);
					}
				})
			}) : null,
			video ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				src: video,
				controls: true,
				className: "max-h-48 w-full rounded-xl"
			}) : null,
			audio ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
				src: audio,
				controls: true,
				className: "w-full"
			}) : null,
			text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "max-h-36 overflow-auto rounded-xl bg-surface-2 p-3 text-xs leading-relaxed whitespace-pre-wrap",
				children: text
			}) : null,
			open && image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6",
				role: "dialog",
				"aria-label": item.name,
				onClick: () => setOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: image,
					alt: item.name,
					className: "max-h-[80dvh] max-w-full rounded-2xl"
				})
			}) : null
		]
	});
}
function TransferRow({ item, onAccept, onReject, onCancel, onPause, onResume, onRetry, onDismiss, onShred }) {
	const ratio = item.size === 0 ? item.status === "done" ? 1 : 0 : Math.min(1, item.bytes / item.size);
	const elapsed = item.startedAt ? (Date.now() - item.startedAt) / 1e3 : 0;
	const speed = item.status === "active" && elapsed > .2 ? item.bytes / elapsed : 0;
	const eta = speed > 0 ? (item.size - item.bytes) / speed : 0;
	const incoming = item.direction === "in";
	const label = item.status === "pending" ? incoming ? "Needs your OK" : "Waiting for them" : item.status === "active" ? item.paused ? "Paused" : incoming ? "Receiving" : "Sending" : item.shredded ? "Shredded" : item.status === "done" ? item.savedToDisk ? "Saved" : incoming ? "Received" : "Sent" : item.status === "rejected" ? "Declined" : item.status === "cancelled" ? "Cancelled" : "Interrupted";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "rounded-2xl bg-surface px-4 py-3 shadow-ring",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-start justify-between gap-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-2 font-semibold",
						children: [incoming ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "size-4 shrink-0 text-primary" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: item.name
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted tabular-nums",
						children: [
							label,
							" · ",
							formatBytes(item.bytes),
							" / ",
							formatBytes(item.size),
							speed > 0 ? ` · ${formatRate(speed)}` : "",
							eta ? ` · ${formatEta(eta)}` : "",
							item.status === "done" && item.intact === false ? " · Doesn’t match" : "",
							item.status === "done" && item.intact && item.direction === "in" ? " · Intact" : "",
							item.status === "done" && item.digest ? ` · ${item.digest.slice(0, 8)}` : ""
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePreview, { item }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full bg-primary",
					style: { width: `${Math.round(ratio * 100)}%` }
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [
					item.status === "pending" && incoming ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-primary",
						onClick: onAccept,
						children: "Accept"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-ghost",
						onClick: onReject,
						children: "Decline"
					})] }) : null,
					item.status === "active" && !incoming ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "btn btn-ghost",
						onClick: item.paused ? onResume : onPause,
						children: [item.paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" }), item.paused ? "Resume" : "Pause"]
					}) : null,
					item.status === "failed" && !incoming ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-primary",
						onClick: onRetry,
						children: "Retry"
					}) : null,
					item.status === "active" || item.status === "pending" && !incoming ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-ghost",
						onClick: onCancel,
						children: "Cancel"
					}) : null,
					item.blobUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "btn btn-primary",
						href: item.blobUrl,
						download: baseName(item.name),
						children: "Save again"
					}) : null,
					item.status !== "active" && item.status !== "pending" && !item.shredded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-ghost",
						onClick: onShred,
						children: "Shred"
					}) : null,
					item.status !== "active" && item.status !== "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-ghost",
						onClick: onDismiss,
						children: "Dismiss"
					}) : null
				]
			})
		]
	});
}
function RoomQr({ value }) {
	const [src, setSrc] = (0, import_react.useState)(null);
	const [big, setBig] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let cancel = false;
		drawSlipQr(value).then((url) => {
			if (!cancel) setSrc(url);
		}).catch(() => {});
		return () => {
			cancel = true;
		};
	}, [value]);
	if (!src) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-4 h-48 w-48 rounded-2xl bg-fg" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "block",
				onClick: () => setBig(true),
				"aria-label": "Enlarge QR code",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src,
					alt: "QR code that joins this room",
					className: "h-48 w-48 rounded-2xl bg-fg p-2"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					className: "btn btn-ghost",
					href: src,
					download: "slip-room.png",
					children: "Save QR"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "btn btn-ghost",
					onClick: () => setBig(true),
					children: "Enlarge"
				})]
			}),
			big ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-40 flex items-center justify-center bg-bg/90 p-6",
				role: "dialog",
				"aria-label": "Room QR",
				onClick: () => setBig(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src,
					alt: "",
					className: "w-full max-w-md rounded-3xl bg-fg p-4"
				})
			}) : null
		]
	});
}
function buildClosingSlip(input) {
	const done = input.transfers.filter((item) => item.status === "done");
	const sent = done.filter((item) => item.direction === "out");
	const got = done.filter((item) => item.direction === "in");
	const sentBytes = sent.reduce((sum, item) => sum + item.size, 0);
	const gotBytes = got.reduce((sum, item) => sum + item.size, 0);
	const minutes = Math.max(1, Math.round((Date.now() - input.openedAt) / 6e4));
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
		input.notes ? `${input.notes} ${input.notes === 1 ? "note" : "notes"}, none of them stored.` : "No notes. A silent room."
	];
	const fortunes = [
		"Nothing was stored. The room already forgot your face.",
		"May the next file be smaller than your patience.",
		"The bridge is gone. Your filenames remain a personal matter.",
		"If the check matched, the universe was briefly on your side.",
		"Tell them the PIN was a feeling.",
		"You can leave. The bytes cannot gossip."
	];
	const fortune = fortunes[(input.code.charCodeAt(0) + sent.length * 3 + got.length) % fortunes.length] ?? fortunes[0];
	const plain = [
		`Slip ${input.code}`,
		headline,
		body,
		...lines,
		fortune
	].join("\n");
	return {
		headline,
		body,
		lines,
		fortune,
		plain
	};
}
function saveSlipImage(slip, code) {
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
function wrapCanvasText(ctx, text, x, y, max, line) {
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
function shrinkImage(file) {
	if (!file.type.startsWith("image/") || /svg|gif/i.test(file.type) || file.size < 4e5) return Promise.resolve(file);
	return createImageBitmap(file).then(async (bitmap) => {
		const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
		if (scale === 1 && file.size < 15e5) {
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
		const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
		if (!blob || blob.size >= file.size) return file;
		const base = file.name.replace(/\.[^.]+$/, "") || "photo";
		return new File([blob], `${base}.jpg`, {
			type: "image/jpeg",
			lastModified: file.lastModified
		});
	}).catch(() => file);
}
function playChime() {
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) return;
	const ctx = new Ctx();
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "sine";
	osc.frequency.value = 660;
	gain.gain.setValueAtTime(1e-4, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(.04, ctx.currentTime + .02);
	gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + .16);
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.start();
	osc.stop(ctx.currentTime + .18);
	osc.onended = () => void ctx.close();
}
function Scanner({ onClose, onCode }) {
	const videoRef = (0, import_react.useRef)(null);
	const onCodeRef = (0, import_react.useRef)(onCode);
	onCodeRef.current = onCode;
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const bag = {
			stop: false,
			frame: 0,
			stream: null
		};
		const video = videoRef.current;
		if (!video || !navigator.mediaDevices?.getUserMedia) {
			setError("This browser has no camera. Type the code instead.");
			return;
		}
		(async () => {
			try {
				bag.stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: { facingMode: { ideal: "environment" } }
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
			const Ctor = window.BarcodeDetector;
			const detector = Ctor ? new Ctor({ formats: ["qr_code"] }) : null;
			const jsQR = detector ? null : (await import("../_libs/jsqr.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()))).default;
			const tick = async () => {
				if (bag.stop || !ctx) return;
				if (video.readyState >= 2 && video.videoWidth > 0) {
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					ctx.drawImage(video, 0, 0);
					let raw = "";
					if (detector) raw = (await detector.detect(video).catch(() => []))[0]?.rawValue ?? "";
					else if (jsQR) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-30 flex items-end justify-center bg-bg/80 p-4 sm:items-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md rounded-3xl bg-surface p-4 shadow-ring",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl font-medium",
					children: "Scan a room"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "btn btn-ghost size-12 px-0",
					onClick: onClose,
					"aria-label": "Close scanner",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
				})]
			}), error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: error
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref: videoRef,
				className: "aspect-square w-full rounded-2xl bg-bg object-cover",
				muted: true,
				playsInline: true
			})]
		})
	});
}
async function pickSink(name) {
	const picker = window.showSaveFilePicker;
	if (!picker) return void 0;
	try {
		return await (await picker({ suggestedName: baseName(name) })).createWritable();
	} catch {
		return;
	}
}
function Home() {
	const { room, pin } = Route$2.useSearch();
	const navigate = Route$2.useNavigate();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlipApp, {
		room,
		pin,
		onRoom: (next, nextPin) => {
			navigate({ search: {
				room: next,
				pin: next ? nextPin : void 0
			} });
		}
	});
}
//#endregion
export { Home as component };
