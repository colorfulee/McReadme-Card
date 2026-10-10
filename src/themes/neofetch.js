// 主题二：终端 neofetch。深色终端窗口 + ASCII 汉堡 + 系统信息式麦门档案。

import { LEVELS } from '../stats.js';
import { FONT_MONO, EMOJI_CSS, esc, text, truncate, textWidth, fmtInt, stackBar, legend, contribGrid } from './util.js';

const C = {
  bg: '#1B1A21',
  bar: '#25242D',
  border: '#34333D',
  fg: '#E7E2D6',
  mute: '#8E8A99',
  key: '#FFBC0D',
  red: '#FF5A4E',
  green: '#7BD88F',
  cyan: '#78DCE8',
  off: '#2C2B35',
  on: '#FFBC0D',
};

const W = 800;
const ART = String.raw`
       _.-''''''''-._
    .'  .  '   .  '  '.
   /  '   .  '   .  '  \
  (______________________)
   \/\/\/\/\/\/\/\/\/\/\/
  [######################]
  (~~~~~~~~~~~~~~~~~~~~~~)
   \____________________/
`.split('\n').slice(1, -1);
const ART_COLORS = ['#F2B33D', '#F2B33D', '#F2B33D', '#F2B33D', '#7BD88F', '#B0643A', '#FFC72C', '#F2B33D'];

export function renderNeofetch(s, hide) {
  const parts = [];
  const size = 13.5;
  const lh = 21;

  // 提示符
  let y = 66;
  parts.push(prompt(24, y, 'mcd neofetch'));

  // ASCII 汉堡
  const artY = y + 30;
  ART.forEach((line, i) => {
    parts.push(`<text x="28" y="${artY + i * 19}" font-size="14" fill="${ART_COLORS[i]}" xml:space="preserve">${esc(line)}</text>`);
  });
  let leftY = artY + ART.length * 19 + 14;

  // 左下：贡献图
  if (!hide.has('graph')) {
    parts.push(text(28, leftY, `commits --weeks ${s.graph.weeks}`, { size: 11, fill: C.mute }));
    const g = contribGrid(28, leftY + 10, s.graph, { cell: 11, gap: 3, on: C.on, off: C.off, today: C.fg });
    parts.push(g.svg);
    leftY += 10 + g.height + 18;
    parts.push(text(28, leftY, `${s.graph.activeWeeks}/${s.graph.weeks} weeks active`, { size: 11, fill: C.mute }));
    leftY += 6;
  }

  // 右侧信息
  const ix = 292;
  let ry = artY;
  const head = `${s.user}@mcd`;
  parts.push(
    `<text x="${ix}" y="${ry}" font-size="${size}" font-weight="700"><tspan fill="${C.key}">${esc(s.user)}</tspan><tspan fill="${C.fg}">@</tspan><tspan fill="${C.red}">mcd</tspan><tspan class="emo" dx="12" font-size="15">${s.level.medal}${s.level.icons}</tspan></text>`
  );
  ry += lh - 4;
  parts.push(text(ix, ry, '-'.repeat(Math.min(Math.ceil(textWidth(head, size) / (size * 0.6)), 40)), { size, fill: C.mute }));

  const rows = [];
  const lv = s.level;
  rows.push([
    'Level',
    null,
    `<tspan class="emo">${lv.medal}</tspan> <tspan fill="${lv.color}" font-weight="700">${lv.code} ${esc(lv.zh)}</tspan> <tspan fill="${C.mute}">(${lv.en} · ${esc(lv.tag)})</tspan>`,
  ]);
  rows.push([
    'Rank',
    null,
    LEVELS.map((l, i) =>
      i === lv.idx
        ? `<tspan fill="${lv.color}" font-weight="700">[</tspan><tspan class="emo">${l.medal}</tspan><tspan fill="${lv.color}" font-weight="700">]</tspan>`
        : `<tspan class="emo${i > lv.idx ? ' locked' : ''}">${l.medal}</tspan>`
    ).join('<tspan fill="#55535F"> › </tspan>'),
  ]);
  if (!hide.has('maindep')) rows.push(['Main Dep', s.mainDep ? `${s.mainDep.name} ×${s.mainDep.count}` : '(pending first deploy)']);
  rows.push(['Packages', `${s.distinctItems} 款单品 (${s.distinctCats} 类)`]);
  if (s.sinceMonths) rows.push(['Uptime', `${s.sinceMonths} 个月 · ${s.orderCount} 单已记录`]);
  if (!hide.has('channel') && s.channel) rows.push(['Shell', s.channel]);
  if (s.persona) rows.push(['Deploy', `${s.persona.zh} · ${s.persona.en}`]);
  if (!hide.has('points') && s.points) {
    rows.push(['Points', `${fmtInt(s.points.available)}${s.points.expiring > 0 ? `  (-${fmtInt(s.points.expiring)} 本月到期)` : ''}`]);
  }
  if (!hide.has('coupons') && s.coupons != null) rows.push(['Coupons', `${s.coupons} 张可用`]);
  if (!hide.has('campaign') && s.campaign) rows.push(['Now', s.campaign]);
  if (s.level.next) rows.push(['Next', `${s.level.next.medal} ${s.level.next.code} 还差 ${s.level.need} XP（多探索新品）`]);

  for (const [k, v, raw] of rows) {
    ry += lh;
    const kx = ix + textWidth(k + ': ', size);
    const body = raw ?? `<tspan fill="${C.fg}">${esc(truncate(v, W - 28 - kx, size))}</tspan>`;
    parts.push(
      `<text x="${ix}" y="${ry}" font-size="${size}"><tspan fill="${C.key}" font-weight="700">${esc(k)}</tspan><tspan fill="${C.fg}">: </tspan>${body}</text>`
    );
  }

  // 色块 = 技术栈
  if (!hide.has('stack') && s.stack.length) {
    ry += 22;
    s.stack.forEach((st, i) => parts.push(`<rect x="${ix + i * 30}" y="${ry - 6}" width="26" height="16" fill="${st.color}"/>`));
    ry += 30;
    parts.push(stackBar(ix, ry - 8, W - 28 - ix, 6, s.stack, 'nf-stack'));
    ry += 18;
    const lg = legend(ix, ry, W - 28 - ix, s.stack, { size: 11.5, fill: C.fg, pctFill: C.mute });
    parts.push(lg.svg);
    ry += lg.height - 18;
  }

  // 结尾提示符 + 闪烁光标
  y = Math.max(leftY, ry) + 34;
  parts.push(prompt(24, y, ''));
  parts.push(`<rect class="cursor" x="${24 + textWidth('➜  ~ ', size)}" y="${y - 13}" width="8" height="16" fill="${C.fg}"/>`);
  y += 22;
  parts.push(text(W - 24, y, '数据源 麦当劳 MCP · 粉丝自制，非官方', { size: 10, fill: C.mute, anchor: 'end' }));
  const H = y + 16;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="麦门名片 McReadme Card · neofetch">
<title>麦门名片 McReadme Card</title>
<style>text{font-family:${FONT_MONO}}${EMOJI_CSS}.cursor{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${C.bg}" stroke="${C.border}"/>
<path d="M0.5,34 L0.5,10.5 Q0.5,0.5 10.5,0.5 L${W - 10.5},0.5 Q${W - 0.5},0.5 ${W - 0.5},10.5 L${W - 0.5},34 Z" fill="${C.bar}"/>
<circle cx="20" cy="17" r="6" fill="#FF5F57"/><circle cx="40" cy="17" r="6" fill="#FEBC2E"/><circle cx="60" cy="17" r="6" fill="#28C840"/>
${text(W / 2, 22, `${s.user}@mcd: ~ — zsh`, { size: 12, fill: C.mute, anchor: 'middle' })}
${parts.join('\n')}
</svg>
`;

  function prompt(x, py, cmd) {
    return `<text x="${x}" y="${py}" font-size="${size}" xml:space="preserve"><tspan fill="${C.green}" font-weight="700">➜</tspan><tspan fill="${C.cyan}">  ~ </tspan><tspan fill="${C.fg}">${esc(cmd)}</tspan></text>`;
  }
}
