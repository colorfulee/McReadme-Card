// order-list 每次只返回近期约 10 单，所以每天把新订单累积进仓库里的 history.json，
// 卡片会"越挂越准"。只存统计必需字段：订单号哈希、日期、小时、渠道、餐品名。
// 不存门店、金额、地址、原始订单号。

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { cst } from './normalize.js';

const KEEP_DAYS = 400;

export function orderKey(order) {
  const { ymd, hm } = cst(order.time);
  const basis = order.id || `${ymd} ${hm} ${order.lines.map((l) => l.n).join(',')}`;
  return createHash('sha256').update(basis).digest('hex').slice(0, 12);
}

export function toEntry(order) {
  const { ymd, hour } = cst(order.time);
  return { k: orderKey(order), ymd, h: hour, ch: order.channel || undefined, lines: order.lines };
}

export function loadHistory(path) {
  if (!path || !existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(data.orders) ? data.orders : [];
  } catch {
    return [];
  }
}

export function mergeHistory(existing, orders, now = new Date()) {
  const map = new Map(existing.map((e) => [e.k, e]));
  for (const o of orders) {
    const e = toEntry(o);
    map.set(e.k, e);
  }
  const cutoff = cst(new Date(now.getTime() - KEEP_DAYS * 86400e3)).ymd;
  return [...map.values()].filter((e) => e.ymd >= cutoff).sort((a, b) => (a.ymd + a.h).localeCompare(b.ymd + b.h));
}

export function saveHistory(path, entries) {
  mkdirSync(dirname(path), { recursive: true });
  const body = {
    note: 'McReadme Card 订单历史：仅含统计必需字段（日期/小时/渠道/餐品名），不含门店、金额、地址与原始订单号。',
    version: 1,
    orders: entries,
  };
  writeFileSync(path, JSON.stringify(body, null, 1) + '\n');
}
