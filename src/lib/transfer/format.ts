const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const CODE_RE = /^[A-Z0-9]{4,8}$/;

export function makeCode(len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function parseRoom(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("://") && CODE_RE.test(trimmed.toUpperCase())) return trimmed.toUpperCase();
  try {
    const url = new URL(trimmed);
    const room = (url.searchParams.get("room") ?? "").toUpperCase();
    if (CODE_RE.test(room)) return room;
  } catch {
    return null;
  }
  return null;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const digits = value >= 10 || i === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[i]}`;
}

export function formatRate(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "—";
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86_400) return "";
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `${s}s left`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s left` : `${m}m left`;
}

export function safeName(name: string): string {
  const parts = name
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");
  return parts.join("/") || "file";
}

export function baseName(name: string): string {
  const safe = safeName(name);
  const slash = safe.lastIndexOf("/");
  return slash >= 0 ? safe.slice(slash + 1) : safe;
}

export function pathLabel(candidateType: string | null, state: RTCPeerConnectionState, open: boolean): string {
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
