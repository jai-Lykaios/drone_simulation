export type ImageGrid = { cols: number; rows: number; lit: boolean[]; brightness: number[]; preview: string; effectiveColumns: number };

export const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const maxImageBytes = 5 * 1024 * 1024;

export function sampleImage(name: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable.');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 20; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (name === 'Heart') { ctx.beginPath(); ctx.moveTo(128, 220); ctx.bezierCurveTo(100, 192, 28, 133, 40, 83); ctx.bezierCurveTo(50, 33, 105, 37, 128, 77); ctx.bezierCurveTo(151, 37, 206, 33, 216, 83); ctx.bezierCurveTo(228, 133, 156, 192, 128, 220); ctx.fill(); }
  else if (name === 'Star') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 48 : 108, a = -Math.PI / 2 + i * Math.PI / 5, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); }
  else if (name === 'Smiley') { ctx.beginPath(); ctx.arc(128, 128, 101, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(94, 106, 12, 0, Math.PI * 2); ctx.arc(162, 106, 12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(128, 126, 55, .2, Math.PI - .2); ctx.stroke(); }
  else { ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(128, 128); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, x = 128 + Math.cos(a) * 88, y = 128 + Math.sin(a) * 88; ctx.moveTo(128, 128); ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill(); } ctx.fillRect(95, 112, 66, 32); ctx.beginPath(); ctx.moveTo(161, 128); ctx.lineTo(186, 117); ctx.lineTo(186, 139); ctx.closePath(); ctx.fill(); }
  return canvas.toDataURL('image/png');
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('The image could not be opened.')); image.src = source; });
}

export async function processImage(source: string, requestedColumns: number, threshold: number, invert: boolean, grayscale: boolean, smooth: boolean): Promise<ImageGrid> {
  const image = await loadImage(source); if (!image.naturalWidth || !image.naturalHeight) throw new Error('The image has no pixels to display.');
  const contentAspect = image.naturalWidth / image.naturalHeight;
  let contentColumns = Math.max(16, Math.min(80, Math.round(requestedColumns)));
  const dimensions = (columns: number) => ({ fullColumns: columns + 4, contentRows: Math.max(8, Math.round(columns / contentAspect)), fullRows: Math.max(8, Math.round(columns / contentAspect)) + 4 });
  while (contentColumns > 8 && dimensions(contentColumns).fullColumns * dimensions(contentColumns).fullRows > 1200) contentColumns--;
  const { fullColumns, contentRows, fullRows } = dimensions(contentColumns), sample = document.createElement('canvas'); sample.width = contentColumns; sample.height = contentRows;
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true }); if (!sampleCtx) throw new Error('Could not process the image.');
  sampleCtx.clearRect(0, 0, contentColumns, contentRows); sampleCtx.filter = smooth ? 'blur(0.7px)' : 'none';
  const scale = Math.min(contentColumns / image.naturalWidth, contentRows / image.naturalHeight), drawWidth = image.naturalWidth * scale, drawHeight = image.naturalHeight * scale;
  sampleCtx.drawImage(image, (contentColumns - drawWidth) / 2, (contentRows - drawHeight) / 2, drawWidth, drawHeight); sampleCtx.filter = 'none';
  const data = sampleCtx.getImageData(0, 0, contentColumns, contentRows).data, lit = new Array<boolean>(fullColumns * fullRows).fill(false), brightness = new Array<number>(fullColumns * fullRows).fill(0);
  const preview = document.createElement('canvas'); preview.width = fullColumns * 3; preview.height = fullRows * 3; const previewCtx = preview.getContext('2d'); if (!previewCtx) throw new Error('Could not create image preview.');
  previewCtx.fillStyle = '#07090d'; previewCtx.fillRect(0, 0, preview.width, preview.height);
  for (let y = 0; y < contentRows; y++) for (let x = 0; x < contentColumns; x++) {
    const i = (y * contentColumns + x) * 4, alpha = data[i + 3] / 255, luminance = Math.round((.299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2]) * alpha), level = alpha <= 0 ? 0 : (invert ? 255 - luminance : luminance) / 255, active = alpha > 0 && (grayscale ? level > 0.015 : level * 255 > threshold);
    const at = (y + 2) * fullColumns + x + 2; lit[at] = active; brightness[at] = grayscale ? level : active ? 1 : 0;
    if (active) { const amount = grayscale ? Math.round(level * 255) : 255; previewCtx.fillStyle = `rgb(${amount},${amount},${amount})`; previewCtx.beginPath(); previewCtx.arc((x + 2) * 3 + 1.5, (y + 2) * 3 + 1.5, .95, 0, Math.PI * 2); previewCtx.fill(); }
  }
  return { cols: fullColumns, rows: fullRows, lit, brightness, preview: preview.toDataURL('image/png'), effectiveColumns: contentColumns };
}
