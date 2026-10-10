// 采集：通过 MCP 拉取卡片所需的只读数据，得到一个"原始数据包"（bundle）。
// bundle 的形状与 --from 文件、--demo 数据一致：{ "<tool-name>": <工具返回> }

import { McdMcpClient } from './mcp-client.js';

export const CARD_TOOLS = ['now-time-info', 'order-list', 'query-my-account', 'query-my-coupons', 'campaign-calendar'];

export async function collectBundle({ token, url, log = () => {} }) {
  const client = new McdMcpClient({ token, url });
  await client.connect();
  let available = null;
  try {
    available = new Set(await client.listTools());
  } catch {
    /* tools/list 失败时直接尝试调用 */
  }

  const bundle = {};
  for (const name of CARD_TOOLS) {
    if (available && !available.has(name)) {
      log(`  - ${name}: 服务端未提供，跳过`);
      continue;
    }
    try {
      bundle[name] = await client.callTool(name, {});
      log(`  ✓ ${name}`);
    } catch (err) {
      if (/401/.test(err.message)) throw err;
      log(`  ✗ ${name}: ${err.message}`);
    }
  }
  return bundle;
}
