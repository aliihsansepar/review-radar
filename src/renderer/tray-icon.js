const TRAY_SCALE = 2;
const TRAY_HEIGHT = 18;
const TRAY_COLORS = {
  empty: '#000000',
  normal: '#000000',
  yellow: '#FFD60A',
  red: '#FF453A',
  new: '#0A84FF',
};
const COUNT_FONT = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
const BADGE_FONT = '700 9px -apple-system, BlinkMacSystemFont, sans-serif';

function drawPullGlyph(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [cx, cy] of [[3, 3], [3, 13], [11, 13]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(3, 5);
  ctx.lineTo(3, 11);
  ctx.moveTo(11, 11);
  ctx.lineTo(11, 6.5);
  ctx.quadraticCurveTo(11, 3.5, 8, 3.5);
  ctx.lineTo(6.5, 3.5);
  ctx.moveTo(8.3, 1.7);
  ctx.lineTo(6.5, 3.5);
  ctx.lineTo(8.3, 5.3);
  ctx.stroke();
  ctx.restore();
}

function renderTrayImage({ mode, count, badge }) {
  const color = TRAY_COLORS[mode] ?? TRAY_COLORS.normal;
  const countText = count > 0 ? String(count) : '';
  const badgeText = badge > 0 ? `+${badge}` : '';

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = COUNT_FONT;
  const countWidth = countText ? measure.measureText(countText).width : 0;
  measure.font = BADGE_FONT;
  const badgeWidth = badgeText ? Math.max(measure.measureText(badgeText).width + 8, 14) : 0;

  const glyphWidth = 14;
  let width = 2 + glyphWidth + 2;
  if (countText) width += 3 + countWidth;
  if (badgeText) width += 3 + badgeWidth;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * TRAY_SCALE);
  canvas.height = TRAY_HEIGHT * TRAY_SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(TRAY_SCALE, TRAY_SCALE);
  ctx.globalAlpha = mode === 'empty' ? 0.4 : 1;

  drawPullGlyph(ctx, 2, 1, color);
  let x = 2 + glyphWidth;

  if (countText) {
    x += 3;
    ctx.font = COUNT_FONT;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(countText, x, TRAY_HEIGHT / 2 + 0.5);
    x += countWidth;
  }

  if (badgeText) {
    x += 3;
    const top = 3;
    const height = 12;
    ctx.fillStyle = TRAY_COLORS.new;
    ctx.beginPath();
    ctx.roundRect(x, top, badgeWidth, height, height / 2);
    ctx.fill();
    ctx.font = BADGE_FONT;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, x + badgeWidth / 2, top + height / 2 + 0.5);
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    template: mode === 'empty' || mode === 'normal',
  };
}
