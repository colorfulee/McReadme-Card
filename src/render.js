import { renderReceipt } from './themes/receipt.js';
import { renderNeofetch } from './themes/neofetch.js';
import { renderNative } from './themes/native.js';

export const THEMES = {
  receipt: renderReceipt,
  neofetch: renderNeofetch,
  native: renderNative,
};

export const HIDE_KEYS = ['points', 'coupons', 'campaign', 'graph', 'stack', 'channel', 'maindep'];

// privacy=strict：不展示任何账户数字
export function parseHide(hide = '', privacy = 'normal') {
  const set = new Set(
    String(hide)
      .split(/[,\s]+/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
  if (privacy === 'strict') ['points', 'coupons'].forEach((k) => set.add(k));
  return set;
}

export function renderCard(stats, { theme = 'receipt', hide = new Set() } = {}) {
  const fn = THEMES[theme];
  if (!fn) throw new Error(`未知主题：${theme}（可选：${Object.keys(THEMES).join(', ')}）`);
  return fn(stats, hide);
}
