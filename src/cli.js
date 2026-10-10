#!/usr/bin/env node
// McReadme Card 命令行入口。
//
//   在线：MCD_MCP_TOKEN=xxx node src/cli.js --user octocat --theme receipt
//   离线：node src/cli.js --from bundle.json     （Skill / WorkBuddy 场景：由 Agent 调 MCP 后写入）
//   演示：node src/cli.js --demo --theme receipt,neofetch,native --out examples/card.svg
//
// 注意：Actions 日志在公开仓库中是公开的，本程序不会打印任何原始返回数据。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, extname } from 'node:path';
import { parsePayload } from './unwrap.js';
import { normalizeOrders, normalizeAccount, countCoupons, parseCampaigns, parseNow, parseCnTime } from './normalize.js';
import { loadHistory, mergeHistory, saveHistory } from './history.js';
import { computeStats } from './stats.js';
import { renderCard, parseHide, THEMES } from './render.js';
import { collectBundle } from './collect.js';
import { demoBundle, DEMO_NOW } from './demo.js';

function parseArgs(argv) {
  const args = {
    theme: 'receipt',
    out: 'mcd-card.svg',
    user: process.env.GITHUB_REPOSITORY_OWNER || 'mcd-dev',
    history: '.mcd-card/history.json',
    hide: '',
    privacy: 'normal',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (['demo', 'help'].includes(key)) args[key] = true;
    else args[key] = argv[++i] ?? '';
  }
  return args;
}

const HELP = `McReadme Card · 把麦门履历挂上 GitHub 主页

用法:
  node src/cli.js [选项]

数据来源（三选一）:
  （默认）          读取环境变量 MCD_MCP_TOKEN，在线调用麦当劳 MCP
  --from <file>     读取已采集的数据包 JSON（{ "order-list": ..., ... }）
  --demo            使用内置虚构数据

选项:
  --theme <names>   ${Object.keys(THEMES).join(' | ')}，逗号分隔可一次生成多张（默认 receipt）
  --out <path>      输出路径（默认 mcd-card.svg；多主题时自动加后缀，如 mcd-card-neofetch.svg）
  --user <id>       卡片上显示的 GitHub ID（默认取 GITHUB_REPOSITORY_OWNER）
  --history <path>  订单历史累积文件（默认 .mcd-card/history.json；传 off 关闭）
  --hide <keys>     隐藏模块：points,coupons,campaign,graph,stack,channel,maindep
  --privacy strict  隐藏所有账户数字（积分、优惠券）
  --now <time>      指定"现在"（调试用，如 "2026-10-10 09:00"）
`;

function outPath(base, theme, multi) {
  if (!multi) return base;
  const ext = extname(base) || '.svg';
  return base.slice(0, base.length - extname(base).length) + `-${theme}${ext}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  const log = (m) => console.log(m);

  let bundle;
  if (args.demo) {
    bundle = demoBundle();
    if (!args.now) args.now = DEMO_NOW;
    if (args.history === '.mcd-card/history.json') args.history = 'off';
    log('▶ 使用演示数据');
  } else if (args.from) {
    bundle = JSON.parse(readFileSync(args.from, 'utf8'));
    log(`▶ 读取数据包 ${args.from}`);
  } else {
    const token = process.env.MCD_MCP_TOKEN;
    if (!token) {
      console.error('✗ 缺少 MCD_MCP_TOKEN。也可以用 --demo 预览，或 --from 读取数据包。\n');
      console.error(HELP);
      process.exit(1);
    }
    log('▶ 连接麦当劳 MCP …');
    bundle = await collectBundle({ token, url: process.env.MCD_MCP_URL, log });
  }

  const data = Object.fromEntries(Object.entries(bundle).map(([k, v]) => [k, parsePayload(v)]));
  const now = (args.now && parseCnTime(args.now)) || parseNow(data['now-time-info']) || new Date();

  const fresh = normalizeOrders(data['order-list']);
  const useHistory = args.history && args.history !== 'off' && args.history !== 'false';
  const entries = mergeHistory(useHistory ? loadHistory(args.history) : [], fresh, now);
  if (useHistory) saveHistory(args.history, entries);

  const stats = computeStats({
    entries,
    account: normalizeAccount(data['query-my-account']),
    coupons: countCoupons(data['query-my-coupons']),
    campaigns: parseCampaigns(data['campaign-calendar'], now),
    now,
    user: args.user,
  });

  log(`▶ 本次获取 ${fresh.length} 单，累计 ${entries.length} 单 · ${stats.level.code} ${stats.level.zh}`);

  const hide = parseHide(args.hide, args.privacy);
  const themes = String(args.theme).split(',').map((t) => t.trim()).filter(Boolean);
  for (const theme of themes) {
    const svg = renderCard(stats, { theme, hide });
    const file = outPath(args.out, theme, themes.length > 1);
    mkdirSync(dirname(file) || '.', { recursive: true });
    writeFileSync(file, svg);
    log(`✓ ${theme} → ${file}`);
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
