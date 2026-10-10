// 主题一：热敏小票。米白纸、锯齿边、等宽字体、"已出餐"印章、条形码。

import { FONT_MONO, EMOJI_CSS, text, truncate, textWidth, fmtInt, stackBar, legend, contribGrid, burgerIcon, code39, levelLadder, round } from './util.js';
import { LEVELS } from '../stats.js';

const C = {
  paper: '#FBF8F1',
  ink: '#2B2A27',
  mute: '#8C877B',
  faint: '#D8D1C2',
  red: '#C8102E',
  on: '#DA291C',
  off: '#ECE6D8',
};

const W = 420;
const PAD = 30;
const INNER = W - PAD * 2;
const TOOTH = 7;

export function renderReceipt(s, hide) {
  const parts = [];
  let y = TOOTH + 30;

  const sep = (style = 'dash') => {
    y += 14;
    if (style === 'double') {
      parts.push(`<line x1="${PAD}" y1="${y - 2}" x2="${W - PAD}" y2="${y - 2}" stroke="${C.ink}" stroke-width="1"/>`);
      parts.push(`<line x1="${PAD}" y1="${y + 2}" x2="${W - PAD}" y2="${y + 2}" stroke="${C.ink}" stroke-width="1"/>`);
    } else {
      parts.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.faint}" stroke-width="1.2" stroke-dasharray="5 4"/>`);
    }
    y += 12;
  };

  const heading = (zh, en, right) => {
    y += 14;
    parts.push(text(PAD, y, `${zh} / ${en}`, { size: 10.5, fill: C.mute, ls: 1 }));
    if (right) parts.push(text(W - PAD, y, right, { size: 10.5, fill: C.mute, anchor: 'end' }));
  };

  const row = (label, value, { color = C.ink, size = 13, weight = 600 } = {}) => {
    y += 22;
    const lw = textWidth(label, 12.5);
    const val = truncate(value, INNER - lw - 36, size);
    const vw = textWidth(val, size);
    parts.push(text(PAD, y, label, { size: 12.5, fill: C.ink }));
    parts.push(text(W - PAD, y, val, { size, fill: color, weight, anchor: 'end' }));
    const x1 = PAD + lw + 8;
    const x2 = W - PAD - vw - 8;
    if (x2 > x1) {
      parts.push(`<line x1="${round(x1)}" y1="${y - 3.5}" x2="${round(x2)}" y2="${y - 3.5}" stroke="${C.faint}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.1 4.5"/>`);
    }
  };

  // ---- 抬头 ----
  parts.push(burgerIcon(W / 2 - 16, y - 18, 32));
  y += 36;
  parts.push(text(W / 2, y, '麦门名片', { size: 22, weight: 800, fill: C.ink, anchor: 'middle', ls: 6 }));
  y += 18;
  parts.push(text(W / 2, y, `McREADME CARD · ORDER #${s.orderNo}`, { size: 10.5, fill: C.mute, anchor: 'middle', ls: 1.5 }));
  y += 26;
  parts.push(text(PAD, y, `顾客 @${truncate(s.user, 150, 12)}`, { size: 12, fill: C.ink }));
  parts.push(text(W - PAD, y, s.generatedAt, { size: 12, fill: C.ink, anchor: 'end' }));
  y += 17;
  parts.push(text(PAD, y, '桌号 GitHub Profile', { size: 12, fill: C.mute }));
  parts.push(text(W - PAD, y, `已记录 ${s.orderCount} 单`, { size: 12, fill: C.mute, anchor: 'end' }));

  // "已出餐"印章
  const stampX = W - PAD - 88;
  const stampY = 26;
  parts.push(`<g transform="rotate(-12 ${stampX + 44} ${stampY + 22})" opacity="0.82">
<rect x="${stampX}" y="${stampY}" width="88" height="44" rx="6" fill="none" stroke="${C.red}" stroke-width="2.4"/>
<rect x="${stampX + 4}" y="${stampY + 4}" width="80" height="36" rx="4" fill="none" stroke="${C.red}" stroke-width="0.8"/>
${text(stampX + 44, stampY + 24, '已出餐', { size: 16, weight: 800, fill: C.red, anchor: 'middle', ls: 3 })}
${text(stampX + 44, stampY + 35, `SHIPPED · ${s.level.code}`, { size: 7.5, fill: C.red, anchor: 'middle', ls: 1.2 })}
</g>`);

  // ---- 职级 ----
  const lv = s.level;
  sep();
  heading('麦门职级', 'RANK', `${lv.xp} XP`);
  y += 44;
  // 奖牌光环：等级越高，光环越大越亮；L5 起加一圈虚线"光芒"
  const haloR = 19 + lv.idx * 1.6;
  const iconsW = textWidth(lv.icons, 22) * 1.08;
  const groupW = haloR * 2 + 8 + iconsW;
  const medalX = W / 2 - groupW / 2 + haloR;
  parts.push(`<circle cx="${round(medalX)}" cy="${y - 12}" r="${round(haloR)}" fill="${lv.color}" fill-opacity="${round(0.08 + lv.idx * 0.03)}"/>`);
  if (lv.idx >= 4) {
    parts.push(`<circle cx="${round(medalX)}" cy="${y - 12}" r="${round(haloR + 5)}" fill="none" stroke="${lv.color}" stroke-opacity="0.55" stroke-width="1.6" stroke-dasharray="2 4" stroke-linecap="round"/>`);
  }
  parts.push(`<text x="${round(medalX)}" y="${y}" font-size="34" text-anchor="middle" class="emo">${lv.medal}</text>`);
  parts.push(`<text x="${round(medalX + haloR + 8)}" y="${y - 3}" font-size="22" class="emo" letter-spacing="1">${lv.icons}</text>`);
  y += 38;
  parts.push(
    `<text x="${W / 2}" y="${y}" font-size="17" font-weight="800" text-anchor="middle" fill="${lv.color}">${lv.code} · ${lv.zh}</text>`
  );
  y += 18;
  parts.push(text(W / 2, y, `${lv.tag} · ${lv.en.toUpperCase()}`, { size: 10.5, fill: C.mute, anchor: 'middle', ls: 2 }));
  y += 18;
  const ladder = levelLadder(PAD + 6, y, INNER - 12, lv, LEVELS, { size: 17, labelFill: C.mute, track: C.faint, bg: C.paper });
  parts.push(ladder.svg);
  y += ladder.height;

  // ---- 明细 ----
  sep();
  heading('明细', 'ITEMS');
  if (!hide.has('maindep')) row('主力依赖', s.mainDep ? `${s.mainDep.name} ×${s.mainDep.count}` : '待首次部署', { color: s.mainDep ? C.ink : C.mute });
  row('发版时段', s.persona ? s.persona.zh : '待观测', { color: s.persona ? C.ink : C.mute });
  row('探索单品', `${s.distinctItems} 款 · ${s.distinctCats} 类`);
  if (s.sinceMonths) row('麦龄', `${s.sinceMonths} 个月`);
  if (!hide.has('channel') && s.channel) row('常用渠道', s.channel);

  // ---- 技术栈 ----
  if (!hide.has('stack') && s.stack.length) {
    sep();
    heading('技术栈', 'TECH STACK');
    y += 12;
    parts.push(stackBar(PAD, y, INNER, 9, s.stack, 'rc-stack'));
    y += 28;
    const lg = legend(PAD, y, INNER, s.stack, { size: 11.5, fill: C.ink, pctFill: C.mute });
    parts.push(lg.svg);
    y += lg.height - 18;
  }

  // ---- 贡献图 ----
  if (!hide.has('graph')) {
    sep();
    heading('贡献图', `LAST ${s.graph.weeks} WEEKS`, `活跃 ${s.graph.activeWeeks}/${s.graph.weeks} 周`);
    y += 12;
    const probe = contribGrid(0, 0, s.graph, { cell: 12, gap: 3 });
    const gx = (W - probe.width) / 2;
    const g = contribGrid(gx, y, s.graph, { cell: 12, gap: 3, on: C.on, off: C.off, today: C.ink });
    parts.push(g.svg);
    y += g.height + 16;
    parts.push(`<rect x="${gx}" y="${y - 9}" width="9" height="9" rx="2" fill="${C.off}"/>`);
    parts.push(text(gx + 13, y, '未开饭', { size: 10, fill: C.mute }));
    parts.push(`<rect x="${gx + 58}" y="${y - 9}" width="9" height="9" rx="2" fill="${C.on}"/>`);
    parts.push(text(gx + 71, y, '已开饭（只记有无，不计次数）', { size: 10, fill: C.mute }));
  }

  // ---- 账户 ----
  const showPoints = !hide.has('points') && s.points;
  const showCoupons = !hide.has('coupons') && s.coupons != null;
  if (showPoints || showCoupons) {
    sep();
    if (showPoints) {
      y += 26;
      parts.push(text(PAD, y, '可用积分', { size: 14, weight: 700, fill: C.ink }));
      parts.push(text(W - PAD, y, fmtInt(s.points.available), { size: 22, weight: 800, fill: C.ink, anchor: 'end' }));
      if (s.points.expiring > 0) {
        y += 20;
        parts.push(text(PAD, y, '! 本月到期', { size: 12, fill: C.red }));
        parts.push(text(W - PAD, y, `-${fmtInt(s.points.expiring)}`, { size: 13, weight: 700, fill: C.red, anchor: 'end' }));
      }
    }
    if (showCoupons) row('可用优惠券', `${s.coupons} 张`);
  }

  // ---- 进行中活动 ----
  if (!hide.has('campaign') && s.campaign) {
    sep('double');
    y += 16;
    parts.push(text(W / 2, y, 'NOW SERVING · 正在进行', { size: 10.5, fill: C.mute, anchor: 'middle', ls: 1.5 }));
    y += 20;
    parts.push(text(W / 2, y, truncate(s.campaign, INNER, 13.5), { size: 13.5, weight: 700, fill: C.ink, anchor: 'middle' }));
  }

  // ---- 升级进度 ----
  sep();
  y += 14;
  if (lv.next) {
    parts.push(`<text x="${PAD}" y="${y}" font-size="11.5" fill="${C.ink}">距 <tspan class="emo">${lv.next.medal}</tspan> ${lv.next.code} ${lv.next.zh}</text>`);
    parts.push(text(W - PAD, y, `还差 ${lv.need} XP · 多探索新品`, { size: 11.5, fill: C.mute, anchor: 'end' }));
  } else {
    parts.push(text(PAD, y, '已达最高职级', { size: 11.5, fill: C.ink }));
    parts.push(text(W - PAD, y, `${lv.xp} XP`, { size: 11.5, fill: C.mute, anchor: 'end' }));
  }
  y += 10;
  parts.push(`<rect x="${PAD}" y="${y}" width="${INNER}" height="6" rx="3" fill="${C.off}"/>`);
  parts.push(`<rect x="${PAD}" y="${y}" width="${round(INNER * Math.max(0.03, lv.progress))}" height="6" rx="3" fill="${lv.color}"/>`);
  y += 6;

  // ---- 条形码 ----
  y += 26;
  const raw = code39(s.user);
  const narrow = Math.min(1.4, (INNER * 0.9) / (raw.width / 1.4));
  const bc = code39(s.user, { narrow });
  const bx = (W - bc.width) / 2;
  parts.push(`<g fill="${C.ink}">${bc.bars.map(([x, w]) => `<rect x="${round(bx + x)}" y="${y}" width="${round(w)}" height="42"/>`).join('')}</g>`);
  y += 56;
  parts.push(text(W / 2, y, bc.label, { size: 10.5, fill: C.ink, anchor: 'middle', ls: 4 }));

  // ---- 页脚 ----
  y += 26;
  parts.push(text(W / 2, y, 'THANK YOU · KEEP SHIPPING', { size: 12, weight: 800, fill: C.ink, anchor: 'middle', ls: 2 }));
  y += 17;
  parts.push(text(W / 2, y, '数据源 麦当劳 MCP · 粉丝自制，非官方', { size: 9.5, fill: C.mute, anchor: 'middle' }));
  y += 22;

  const H = y + TOOTH;
  return wrap(parts.join('\n'), H);
}

function zigzag(H) {
  const step = 12;
  const n = Math.ceil(W / step);
  let d = `M0,${TOOTH}`;
  for (let i = 0; i < n; i++) d += ` L${i * step + step / 2},0 L${Math.min((i + 1) * step, W)},${TOOTH}`;
  d += ` L${W},${H - TOOTH}`;
  for (let i = n - 1; i >= 0; i--) d += ` L${i * step + step / 2},${H} L${i * step},${H - TOOTH}`;
  return d + ' Z';
}

function wrap(body, H) {
  const M = 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + M * 2}" height="${H + M * 2}" viewBox="0 0 ${W + M * 2} ${H + M * 2}" role="img" aria-label="麦门名片 McReadme Card">
<title>麦门名片 McReadme Card</title>
<style>text{font-family:${FONT_MONO}}${EMOJI_CSS}</style>
<defs><filter id="rc-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="3.5" flood-color="#000" flood-opacity="0.16"/></filter></defs>
<g transform="translate(${M},${M})">
<path d="${zigzag(H)}" fill="${C.paper}" filter="url(#rc-shadow)"/>
${body}
</g>
</svg>
`;
}
