const PAPER = "#f6f3ea";
const INK = "#121613";
const LIME = "#d6ff4a";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("logo"));
    image.src = src;
  });
}

/** Slip's room code: paper ground, ink modules, and the mark in the center. */
export async function drawSlipQr(value: string, logoUrl = "/slip-mark.jpg"): Promise<string> {
  const qr = await import("qrcode");
  const symbol = qr.create(value, { errorCorrectionLevel: "H" });
  const count = symbol.modules.size;
  const quiet = 4;
  const cell = 8;
  const frame = 10;
  const code = (count + quiet * 2) * cell;
  const size = code + frame * 2;
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

  const logoSpan = Math.max(7, Math.round(count * 0.18));
  const logoAt = Math.floor((count - logoSpan) / 2);
  const inLogo = (row: number, col: number) =>
    row >= logoAt && row < logoAt + logoSpan && col >= logoAt && col < logoAt + logoSpan;

  ctx.fillStyle = INK;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!symbol.modules.get(row, col) || inLogo(row, col)) continue;
      const x = frame + (col + quiet) * cell;
      const y = frame + (row + quiet) * cell;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  const plate = logoSpan * cell;
  const px = frame + (logoAt + quiet) * cell;
  const py = frame + (logoAt + quiet) * cell;
  ctx.fillStyle = PAPER;
  ctx.fillRect(px, py, plate, plate);

  try {
    const logo = await loadImage(logoUrl);
    const inset = Math.max(4, Math.round(cell * 0.7));
    const side = Math.min(logo.width, logo.height);
    const sx = (logo.width - side) / 2;
    const sy = Math.max(0, (logo.height - side) / 2);
    ctx.save();
    roundRect(ctx, px + inset, py + inset, plate - inset * 2, plate - inset * 2, 10);
    ctx.clip();
    ctx.drawImage(logo, sx, sy, side, side, px + inset, py + inset, plate - inset * 2, plate - inset * 2);
    ctx.restore();
    ctx.strokeStyle = LIME;
    ctx.lineWidth = 3;
    roundRect(ctx, px + inset, py + inset, plate - inset * 2, plate - inset * 2, 10);
    ctx.stroke();
  } catch {
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(plate * 0.22)}px Figtree, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SLIP", px + plate / 2, py + plate / 2);
  }

  return canvas.toDataURL("image/png");
}
