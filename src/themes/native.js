// 主题三：GitHub 原生风。和 github-readme-stats 并排不违和，跟随系统深浅色。

import { FONT_SANS, EMOJI_CSS, text, truncate, fmtInt, stackBar, legend, round } from './util.js';

const W = 495;

export function renderNative(s, hide) {
  const parts = [];
  const rows = [];
  if (!hide.has('maindep')) rows.push(['主力依赖', s.mainDep ? `${s.mainDep.name} ×${s.mainDep.count}` : '待首次部署', '#DA291C']);
  rows.push(['探索单品', `${s.distinctItems} 款 · ${s.distinctCats} 类`, '#FFBC0D']);
  rows.push(['发版时段', s.persona ? s.persona.zh : '待观测', '#2D9CDB']);
  if (!hide.has('points') && s.points) rows.push(['可用积分', fmtInt(s.points.available), '#F2994A']);
  else if (s.sinceMonths) rows.push(['麦龄', `${s.sinceMonths} 个月`, '#F2994A']);
  if (!hide.has('coupons') && s.coupons != null) rows.push(['可用优惠券', `${s.coupons} 张`, '#8B5E3C']);
  else if (!hide.has('channel') && s.channel) rows.push(['常用渠道', s.channel, '#8B5E3C']);

  parts.push(text(25, 36, `@${truncate(s.user, 260, 18, 0.55)} 的麦门名片`, { size: 18, weight: 600, cls: 'title' }));

  let y = 70;
  rows.slice(0, 5).forEach(([k, v, color], i) => {
    const val = truncate(v, 150, 14, 0.55);
    parts.push(`<g class="fade" style="animation-delay:${150 + i * 120}ms">
<circle cx="31" cy="${y - 5}" r="5" fill="${color}"/>
${text(45, y, k, { size: 14, cls: 'label' })}
${text(300, y, val, { size: 14, weight: 700, cls: 'value', anchor: 'end' })}
</g>`);
    y += 25;
  });

  // 职级环
  const cx = 410;
  const cy = 98;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const prog = Math.max(0.02, s.level.progress);
  const lv = s.level;
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${lv.color}" fill-opacity="0.08" stroke="${lv.color}" stroke-opacity="0.2" stroke-width="6"/>`);
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${lv.color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${round(circ * prog)} ${round(circ)}" transform="rotate(-90 ${cx} ${cy})"/>`
  );
  parts.push(`<text x="${cx}" y="${cy + 6}" font-size="30" text-anchor="middle" class="emo">${lv.medal}</text>`);
  parts.push(text(cx, cy + 26, lv.code, { size: 12, weight: 800, fill: lv.color, anchor: 'middle', ls: 1 }));
  parts.push(text(cx, cy + r + 22, truncate(lv.zh, 130, 12.5, 0.55), { size: 12.5, weight: 700, fill: lv.color, anchor: 'middle' }));
  parts.push(`<text x="${cx}" y="${cy + r + 41}" font-size="13" text-anchor="middle" class="emo" letter-spacing="1">${lv.icons}</text>`);
  if (lv.next) {
    parts.push(text(cx, cy + r + 58, `距 ${lv.next.medal} ${lv.next.code} 还差 ${lv.need} XP`, { size: 10.5, cls: 'mute', anchor: 'middle' }));
  }

  // 技术栈
  y = Math.max(y, cy + r + 66) + 6;
  if (!hide.has('stack') && s.stack.length) {
    parts.push(text(25, y, '麦门技术栈', { size: 12, weight: 600, cls: 'label' }));
    y += 10;
    parts.push(stackBar(25, y, W - 50, 8, s.stack, 'nt-stack'));
    y += 26;
    const lg = legend(25, y, W - 50, s.stack, { size: 11.5, cls: 'label', ascii: 0.55 });
    parts.push(lg.svg);
    y += lg.height - 6;
  }
  parts.push(text(W - 25, y + 4, '数据源 麦当劳 MCP · 粉丝自制，非官方', { size: 9.5, cls: 'mute', anchor: 'end' }));
  const H = y + 18;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="麦门名片 McReadme Card">
<title>麦门名片 McReadme Card</title>
<style>
text{font-family:${FONT_SANS}}
${EMOJI_CSS}
.bg{fill:#FFFEFE;stroke:#E4E2E2}
.title{fill:#C8102E}.label{fill:#434D58}.value{fill:#24292F}.mute{fill:#6A737D}
.fade{animation:fadeIn .5s ease-in-out backwards}
@keyframes fadeIn{from{opacity:0}}
@media (prefers-color-scheme: dark){
.bg{fill:#0D1117;stroke:#30363D}
.title{fill:#FF7B72}.label{fill:#C9D1D9}.value{fill:#F0F6FC}.mute{fill:#8B949E}
}
</style>
<rect x="0.5" y="0.5" rx="4.5" width="${W - 1}" height="${H - 1}" class="bg"/>
${parts.join('\n')}
</svg>
`;
}

