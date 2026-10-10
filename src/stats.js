// 从订单历史 + 账户数据计算卡片指标。
// 设计原则：职级只奖励"探索广度"和"麦龄"，不奖励下单次数，不鼓励多吃。

import { createHash } from 'node:crypto';
import { CATEGORY_COLORS, cst } from './normalize.js';

// 职级阶梯：奖牌逐级升格（新芽→铜→银→金→奖杯→王冠），
// 每升一级多"解锁"一个品类图标（对应职级计分里的探索广度），并配一个专属主题色。
export const LEVELS = [
  { code: 'L1', at: 0, zh: '麦门实习生', en: 'Intern', medal: '🌱', icons: '🍟', color: '#3FA34D', tag: '新芽入麦' },
  { code: 'L2', at: 20, zh: '初级麦门工程师', en: 'Junior', medal: '🥉', icons: '🍟🍔', color: '#B5713A', tag: '铜牌食客' },
  { code: 'L3', at: 40, zh: '麦门工程师', en: 'Engineer', medal: '🥈', icons: '🍟🍔🥤', color: '#7D8B99', tag: '银牌常客' },
  { code: 'L4', at: 70, zh: '高级麦门工程师', en: 'Senior', medal: '🥇', icons: '🍟🍔🥤🍦', color: '#C99A06', tag: '金牌老饕' },
  { code: 'L5', at: 100, zh: '资深麦门专家', en: 'Staff', medal: '🏆', icons: '🍟🍔🥤🍦☕', color: '#E8590C', tag: '奖杯级玩家' },
  { code: 'L6', at: 140, zh: '麦门架构师', en: 'Principal', medal: '👑', icons: '🍟🍔🥤🍦☕🥐', color: '#8E44AD', tag: '加冕麦门' },
];

export const PERSONAS = [
  { from: 5, to: 10, zh: '早八发版', en: 'Morning Deploy' },
  { from: 10, to: 14, zh: '午间发版', en: 'Lunch Release' },
  { from: 14, to: 17, zh: '下午茶 Hotfix', en: 'Afternoon Hotfix' },
  { from: 17, to: 21, zh: '晚间构建', en: 'Evening Build' },
  { from: 21, to: 29, zh: '夜间值守', en: 'Night Watch' },
];

export const GRAPH_WEEKS = 16;

function personaOf(hour) {
  const h = hour < 5 ? hour + 24 : hour;
  return PERSONAS.find((p) => h >= p.from && h < p.to);
}

function monthsBetween(a, b) {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma) + 1;
}

export function levelOf(xp) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.at) idx = i;
  });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return {
    ...cur,
    idx,
    xp,
    next,
    need: next ? next.at - xp : 0,
    progress: next ? (xp - cur.at) / (next.at - cur.at) : 1,
  };
}

export function computeStats({ entries, account, coupons, campaigns, now, user }) {
  const today = cst(now);
  const lineCount = new Map();
  const leafCount = new Map();
  const catCount = new Map();
  const months = new Set();
  const days = new Set();
  const hourBucket = new Map();
  const channels = new Map();

  for (const e of entries) {
    months.add(e.ymd.slice(0, 7));
    days.add(e.ymd);
    const p = personaOf(e.h);
    if (p) hourBucket.set(p, (hourBucket.get(p) || 0) + 1);
    if (e.ch) channels.set(e.ch, (channels.get(e.ch) || 0) + 1);
    for (const line of e.lines) {
      lineCount.set(line.n, (lineCount.get(line.n) || 0) + line.q);
      for (const leaf of line.leaves) {
        leafCount.set(leaf.n, (leafCount.get(leaf.n) || 0) + leaf.q);
        catCount.set(leaf.c, (catCount.get(leaf.c) || 0) + leaf.q);
      }
    }
  }

  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  const mainDep = top(lineCount);
  const persona = top(hourBucket);
  const channel = top(channels);

  const totalLeaf = [...catCount.values()].reduce((a, b) => a + b, 0) || 1;
  let stack = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, pct: (n / totalLeaf) * 100, color: CATEGORY_COLORS[name] || CATEGORY_COLORS.其他 }));
  if (stack.length > 5) {
    const rest = stack.slice(4).reduce((a, b) => a + b.pct, 0);
    stack = [...stack.slice(0, 4), { name: '其他', pct: rest, color: CATEGORY_COLORS.其他 }];
  }

  const firstYm = [...months].sort()[0];
  const sinceMonths = firstYm ? monthsBetween(firstYm, today.ym) : 0;
  const distinctItems = leafCount.size;
  const distinctCats = catCount.size;
  const xp = distinctItems * 3 + distinctCats * 4 + Math.min(sinceMonths, 24) * 2;

  // 贡献图：最近 GRAPH_WEEKS 周（周一为每列第一格）
  const startMs = now.getTime() - (today.dow + (GRAPH_WEEKS - 1) * 7) * 86400e3;
  const graphStart = cst(new Date(startMs)).ymd;
  const activeWeeks = new Set(
    [...days].filter((d) => d >= graphStart && d <= today.ymd).map((d) => Math.floor((Date.parse(d) - Date.parse(graphStart)) / (7 * 86400e3)))
  ).size;

  return {
    user,
    orderNo: createHash('sha256').update(String(user)).digest('hex').slice(0, 6).toUpperCase(),
    generatedAt: `${today.ymd} ${today.hm}`,
    today: today.ymd,
    level: levelOf(xp),
    mainDep: mainDep ? { name: mainDep[0], count: mainDep[1] } : null,
    persona: persona ? persona[0] : null,
    channel: channel ? channel[0] : null,
    distinctItems,
    distinctCats,
    sinceMonths,
    orderCount: entries.length,
    stack,
    graph: { weeks: GRAPH_WEEKS, start: graphStart, end: today.ymd, days, activeWeeks },
    points: account,
    coupons,
    // 每天轮换展示一个进行中的活动，卡片天天有新鲜感
    campaign: campaigns?.ongoing?.length
      ? campaigns.ongoing[Math.floor(Date.parse(today.ymd) / 86400e3) % campaigns.ongoing.length]
      : null,
  };
}
