export type PreviewKind = "image" | "text";

export type FilePreview = {
  kind: PreviewKind;
  preview: string;
};

const MAX_PREVIEW = 36_000;

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
  }
  return btoa(bin);
}

function looksText(file: File) {
  if (file.type.startsWith("text/")) return true;
  return /\.(txt|md|json|csv|log|svg|js|ts|css|html)$/i.test(file.name);
}

/** Small picture or text head the other device can show before the file arrives. */
export async function makePreview(file: File): Promise<FilePreview | null> {
  try {
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml" && file.size <= 40 * 1024 * 1024) {
      const bitmap = await createImageBitmap(file);
      const max = 360;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
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
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
      if (!blob || blob.size > 28_000) return null;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const preview = `data:image/jpeg;base64,${bytesToB64(bytes)}`;
      if (preview.length > MAX_PREVIEW) return null;
      return { kind: "image", preview };
    }
    if (looksText(file)) {
      const preview = (await file.slice(0, 2000).text()).slice(0, 800);
      if (!preview.trim()) return null;
      return { kind: "text", preview };
    }
  } catch {
    return null;
  }
  return null;
}
