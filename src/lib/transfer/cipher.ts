const TOKEN = /^[A-Za-z0-9_-]{22}$/;

export function mintSealToken(): string {
  const raw = new Uint8Array(16);
  crypto.getRandomValues(raw);
  return bytesToToken(raw);
}

export function decodeSealToken(token: string): Uint8Array | null {
  if (!TOKEN.test(token)) return null;
  const pad = token.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad);
  if (bin.length !== 16) return null;
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToToken(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function owned(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy;
}

export async function importSealKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", owned(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealHint(raw: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", owned(raw)));
  const hex = [...digest.subarray(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${hex.slice(0, 4)} ${hex.slice(4)}`;
}

export async function pack(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, owned(data)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

export async function unpack(key: CryptoKey, packed: Uint8Array): Promise<Uint8Array | null> {
  if (packed.byteLength < 28) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: owned(packed.subarray(0, 12)) },
      key,
      owned(packed.subarray(12)),
    );
    return new Uint8Array(plain);
  } catch {
    return null;
  }
}

export function wipe(bytes: Uint8Array) {
  const cap = 65536;
  for (let i = 0; i < bytes.length; i += cap) {
    crypto.getRandomValues(bytes.subarray(i, Math.min(i + cap, bytes.length)));
  }
  bytes.fill(0);
}

export function sealFromLink(raw: string): string | undefined {
  try {
    const token = new URLSearchParams(new URL(raw.trim()).hash.slice(1)).get("k") ?? "";
    return decodeSealToken(token) ? token : undefined;
  } catch {
    return undefined;
  }
}
