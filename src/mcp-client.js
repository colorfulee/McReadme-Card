// 零依赖的麦当劳 MCP 客户端（Streamable HTTP + JSON-RPC 2.0）。
// 安全设计：只允许调用只读白名单内的工具，代码层面杜绝下单 / 领券 / 抽奖 / 兑换。

import { unwrapToolResult } from './unwrap.js';

export const DEFAULT_MCP_URL = 'https://mcp.mcd.cn';

export const READ_ONLY_TOOLS = new Set([
  'now-time-info',
  'order-list',
  'query-order',
  'query-my-account',
  'query-my-coupons',
  'campaign-calendar',
  'list-nutrition-foods',
]);

export class McdMcpError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class McdMcpClient {
  constructor({ token, url = DEFAULT_MCP_URL, fetchImpl = globalThis.fetch, version = '1.0.0' } = {}) {
    if (!token) throw new McdMcpError('缺少 MCP Token：请设置环境变量 MCD_MCP_TOKEN');
    this.token = token;
    this.url = url;
    this.fetch = fetchImpl;
    this.version = version;
    this.sessionId = null;
    this.protocolVersion = null;
    this.nextId = 1;
  }

  async connect() {
    const result = await this.#rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'mcreadme-card', version: this.version },
    });
    this.protocolVersion = result?.protocolVersion || null;
    await this.#send({ jsonrpc: '2.0', method: 'notifications/initialized' }, false);
    return result;
  }

  async listTools() {
    const result = await this.#rpc('tools/list', {});
    return (result?.tools || []).map((t) => t.name);
  }

  async callTool(name, args = {}) {
    if (!READ_ONLY_TOOLS.has(name)) {
      throw new McdMcpError(`拒绝调用非只读工具：${name}`);
    }
    const result = await this.#rpc('tools/call', { name, arguments: args });
    if (result?.isError) {
      const msg = (result.content || []).map((c) => c.text).join(' ').slice(0, 200);
      throw new McdMcpError(`工具 ${name} 返回错误：${msg}`);
    }
    return unwrapToolResult(result);
  }

  async #rpc(method, params) {
    return this.#send({ jsonrpc: '2.0', id: this.nextId++, method, params }, true);
  }

  async #send(body, expectResponse) {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    if (this.protocolVersion) headers['MCP-Protocol-Version'] = this.protocolVersion;

    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await this.fetch(this.url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.status === 429) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      if (res.status === 401) throw new McdMcpError('MCP Token 无效、已过期或未提供（401）');
      if (!res.ok) throw new McdMcpError(`MCP 请求失败：HTTP ${res.status}`);

      const sid = res.headers.get('mcp-session-id');
      if (sid) this.sessionId = sid;
      if (!expectResponse) return null;

      const text = await res.text();
      const type = res.headers.get('content-type') || '';
      const msg = type.includes('text/event-stream') ? pickSseMessage(text, body.id) : JSON.parse(text);
      if (!msg) throw new McdMcpError(`MCP 未返回 ${body.method} 的响应`);
      if (msg.error) throw new McdMcpError(`MCP 错误：${msg.error.message || JSON.stringify(msg.error)}`);
      return msg.result;
    }
    throw new McdMcpError('触发限流（429），请稍后重试');
  }
}

export function pickSseMessage(text, id) {
  let fallback = null;
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    try {
      const msg = JSON.parse(data);
      if (msg.id === id) return msg;
      if (msg.result || msg.error) fallback = msg;
    } catch {
      /* 忽略非 JSON 事件 */
    }
  }
  return fallback;
}
