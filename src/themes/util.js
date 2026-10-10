// SVG 绘制工具。GitHub 以 <img> 方式渲染 SVG，无法加载外部字体，因此只用系统字体栈，
// 并按"中文 1em / 英文 0.6em"估算宽度来排版和截断。

export const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace";
export const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', Helvetica, Arial, sans-serif";

export const FONT_EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif";

// 各主题 <style> 里都要带上这段：emoji 字体 + 未达成等级的灰度效果
export const EMOJI_CSS = `.emo{font-family:${FONT_EMOJI}}.locked{filter:grayscale(1);opacity:.28}`;

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isWide(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    cp >= 0x1f300
  );
}

export function textWidth(s, size, ascii = 0.6) {
  let w = 0;
  for (const ch of String(s)) w += isWide(ch.codePointAt(0)) ? 1 : ascii;
  return w * size;
}

export function truncate(s, maxPx, size, ascii = 0.6) {
  s = String(s ?? '');
  if (textWidth(s, size, ascii) <= maxPx) return s;
  let out = '';
  for (const ch of s) {
    if (textWidth(out + ch + '…', size, ascii) > maxPx) break;
    out += ch;
  }
  return out + '…';
}

export const fmtInt = (n) => Number(n || 0).toLocaleString('en-US');

export function text(x, y, str, { size = 12, weight, fill, anchor, cls, ls, opacity } = {}) {
  const attrs = [
    `x="${round(x)}"`,
    `y="${round(y)}"`,
    `font-size="${size}"`,
    weight ? `font-weight="${weight}"` : '',
    fill ? `fill="${fill}"` : '',
    anchor ? `text-anchor="${anchor}"` : '',
    cls ? `class="${cls}"` : '',
    ls ? `letter-spacing="${ls}"` : '',
    opacity != null ? `opacity="${opacity}"` : '',
  ].filter(Boolean);
  return `<text ${attrs.join(' ')}>${esc(str)}</text>`;
}

export const round = (n) => Math.round(n * 100) / 100;

// 堆叠条（类似 GitHub 语言条）
export function stackBar(x, y, w, h, stack, id) {
  let cx = x;
  const segs = stack
    .map((s, i) => {
      const sw = i === stack.length - 1 ? x + w - cx : (w * s.pct) / 100;
      const r = `<rect x="${round(cx)}" y="${y}" width="${round(Math.max(sw, 0))}" height="${h}" fill="${s.color}"/>`;
      cx += sw;
      return r;
    })
    .join('');
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/></clipPath><g clip-path="url(#${id})">${segs}</g>`;
}

// 图例：圆点 + 名称 + 百分比，自动换行。返回 { svg, height }
export function legend(x, y, maxW, stack, { size = 11, fill, pctFill, cls, ascii = 0.6, gapX = 14, lineH = 18 } = {}) {
  let cx = x;
  let cy = y;
  const out = [];
  for (const s of stack) {
    const label = s.name;
    const pct = `${s.pct.toFixed(s.pct < 10 ? 1 : 0)}%`;
    const w = 12 + textWidth(label + ' ' + pct, size, ascii);
    if (cx + w > x + maxW && cx > x) {
      cx = x;
      cy += lineH;
    }
    out.push(`<circle cx="${round(cx + 4)}" cy="${round(cy - size * 0.35)}" r="4" fill="${s.color}"/>`);
    out.push(
      `<text x="${round(cx + 12)}" y="${round(cy)}" font-size="${size}" ${cls ? `class="${cls}"` : ''} ${fill ? `fill="${fill}"` : ''}>${esc(label)} <tspan ${pctFill ? `fill="${pctFill}"` : ''}>${pct}</tspan></text>`
    );
    cx += w + gapX;
  }
  return { svg: out.join(''), height: cy - y + lineH };
}

// 贡献图：列=周，行=周一..周日。只记录"那天去没去"，不按次数加深颜色。
export function contribGrid(x, y, graph, { cell = 11, gap = 3, on, off, radius = 2, today } = {}) {
  const out = [];
  const start = Date.parse(graph.start);
  const end = Date.parse(graph.end);
  for (let w = 0; w < graph.weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const t = start + (w * 7 + d) * 86400e3;
      if (t > end) continue;
      const ymd = new Date(t).toISOString().slice(0, 10);
      const active = graph.days.has(ymd);
      const isToday = today && ymd === graph.end;
      out.push(
        `<rect x="${x + w * (cell + gap)}" y="${y + d * (cell + gap)}" width="${cell}" height="${cell}" rx="${radius}" fill="${active ? on : off}"${isToday ? ` stroke="${today}" stroke-width="1.2"` : ''}/>`
      );
    }
  }
  return { svg: out.join(''), width: graph.weeks * (cell + gap) - gap, height: 7 * (cell + gap) - gap };
}

// 原创几何汉堡图标（不使用任何官方 Logo）
export function burgerIcon(x, y, s, { bun = '#F2B33D', lettuce = '#6CBF5A', patty = '#7A3E1D', cheese = '#FFC72C', seed = '#FFF4D6' } = {}) {
  const k = s / 32;
  const p = (n) => round(n * k);
  return `<g transform="translate(${round(x)},${round(y)})">
<path d="M${p(3)},${p(13)} C${p(3)},${p(4)} ${p(29)},${p(4)} ${p(29)},${p(13)} Z" fill="${bun}"/>
<circle cx="${p(11)}" cy="${p(8.5)}" r="${p(0.9)}" fill="${seed}"/><circle cx="${p(16)}" cy="${p(7)}" r="${p(0.9)}" fill="${seed}"/><circle cx="${p(21)}" cy="${p(8.5)}" r="${p(0.9)}" fill="${seed}"/>
<path d="M${p(2)},${p(15)} q${p(2.5)},${p(-2.6)} ${p(5)},0 t${p(5)},0 t${p(5)},0 t${p(5)},0 t${p(5)},0 t${p(3)},0" fill="none" stroke="${lettuce}" stroke-width="${p(2.2)}" stroke-linecap="round"/>
<path d="M${p(4)},${p(17)} L${p(28)},${p(17)} L${p(23)},${p(21.5)} Z" fill="${cheese}"/>
<rect x="${p(3)}" y="${p(18)}" width="${p(26)}" height="${p(4.6)}" rx="${p(2.3)}" fill="${patty}"/>
<path d="M${p(3)},${p(24)} L${p(29)},${p(24)} C${p(29)},${p(28.5)} ${p(3)},${p(28.5)} ${p(3)},${p(24)} Z" fill="${bun}"/>
</g>`;
}

// Code 39 条形码：编码 GitHub 用户名，扫码即得 ID（彩蛋）
const CODE39 = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

export function code39(value, { narrow = 1.4, ratio = 2.6 } = {}) {
  const chars = `*${String(value).toUpperCase().replace(/[^0-9A-Z\-. ]/g, '-')}*`;
  const bars = [];
  let x = 0;
  for (const ch of chars) {
    const pat = CODE39[ch];
    for (let i = 0; i < 9; i++) {
      const w = pat[i] === 'w' ? narrow * ratio : narrow;
      if (i % 2 === 0) bars.push([x, w]);
      x += w;
    }
    x += narrow;
  }
  return { bars, width: x - narrow, label: chars };
}

// 职级阶梯：6 格，已达成=彩色，当前=主题色描边高亮，未达成=灰度。返回 { svg, height }
export function levelLadder(x, y, w, level, levels, { size = 18, labelFill = '#8C877B', track = '#E4DED0', bg = '#FBF8F1', bgClass } = {}) {
  const n = levels.length;
  const slot = w / n;
  const out = [];
  const cy = y + size * 0.65;
  // 进度轨道
  const lx1 = x + slot / 2;
  const lx2 = x + w - slot / 2;
  const cur = x + slot * (level.idx + 0.5);
  out.push(`<line x1="${round(lx1)}" y1="${round(cy)}" x2="${round(lx2)}" y2="${round(cy)}" stroke="${track}" stroke-width="2" stroke-dasharray="2 3"/>`);
  if (level.idx > 0) out.push(`<line x1="${round(lx1)}" y1="${round(cy)}" x2="${round(cur)}" y2="${round(cy)}" stroke="${level.color}" stroke-width="2.4" stroke-linecap="round"/>`);
  levels.forEach((l, i) => {
    const cx = x + slot * (i + 0.5);
    const isCur = i === level.idx;
    const box = size * 1.9;
    if (isCur) {
      out.push(`<rect x="${round(cx - box / 2)}" y="${round(cy - box / 2)}" width="${round(box)}" height="${round(box)}" rx="${round(box * 0.28)}" fill="${level.color}" fill-opacity="0.14" stroke="${level.color}" stroke-width="1.6"/>`);
    } else {
      // 遮住轨道线，让图标像串在轨道上的珠子
      out.push(`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(size * 0.72)}" fill="${bg}"${bgClass ? ` class="${bgClass}"` : ''}/>`);
    }
    out.push(`<text x="${round(cx)}" y="${round(cy + size * 0.36)}" font-size="${isCur ? size * 1.15 : size}" text-anchor="middle" class="emo${i > level.idx ? ' locked' : ''}">${l.medal}</text>`);
    out.push(`<text x="${round(cx)}" y="${round(cy + box / 2 + 13)}" font-size="9.5" text-anchor="middle" fill="${isCur ? level.color : labelFill}"${isCur ? ' font-weight="800"' : ''}>${l.code}</text>`);
  });
  return { svg: out.join(''), height: size * 1.9 + 18 };
}
