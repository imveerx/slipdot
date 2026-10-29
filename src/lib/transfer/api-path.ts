import { previewPathPrefix } from "@/lib/preview-path-prefix";

/** Preview hosts serve the app under a path prefix. Bare "/api/..." misses it. */
export function apiPath(path: string): string {
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
  return prefix ? `${prefix}${path}` : path;
}
