import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePayload, unwrapToolResult } from '../src/unwrap.js';
import { normalizeOrders, normalizeAccount, countCoupons, parseCampaigns, classify, canonicalName, cleanTitle, parseCnTime } from '../src/normalize.js';
import { mergeHistory } from '../src/history.js';
import { computeStats, levelOf } from '../src/stats.js';
import { renderCard, THEMES, parseHide } from '../src/render.js';
import { demoBundle, DEMO_NOW } from '../src/demo.js';
import { McdMcpClient, pickSseMessage } from '../src/mcp-client.js';

const wrapped = '# API Response\n\n- **data.list**: 订单列表\n\n## Original Response\n\n```json\n{"data":{"list":[{"orderId":"1"}]}}\n```';

test('parsePayload 解析 Markdown 包装与纯 JSON', () => {
  assert.deepEqual(parsePayload(wrapped), { data: { list: [{ orderId: '1' }] } });
  assert.deepEqual(parsePayload('{"a":1}'), { a: 1 });
  assert.equal(parsePayload('## 纯文本'), '## 纯文本');
  assert.deepEqual(unwrapToolResult({ content: [{ type: 'text', text: '{"b":2}' }] }), { b: 2 });
});

test('品类识别与餐品名归一化', () => {
  assert.equal(classify('麦辣鸡腿堡'), '汉堡');
  assert.equal(classify('中薯条'), '小食');
  assert.equal(classify('大杯拿铁'), '咖啡');
  assert.equal(classify('猪柳蛋麦满分'), '早餐');
  assert.equal(classify('麦旋风奥利奥'), '甜品');
  assert.equal(canonicalName('麦辣鸡腿堡套餐（中）'), '麦辣鸡腿堡');
});

test('订单归一化：拆套餐、跳过取消单、按北京时间解析', () => {
  const orders = normalizeOrders({
    data: {
      list: [
        { orderId: 'A', createTime: '2026-10-09 12:30:00', orderStatus: '已完成', orderProductList: [{ productName: '巨无霸套餐', quantity: 1, comboItemList: [{ productName: '巨无霸' }, { productName: '中薯条' }] }] },
        { orderId: 'B', createTime: '2026-10-09 13:00:00', orderStatus: '已取消', orderProductList: [{ productName: '可乐' }] },
      ],
    },
  });
  assert.equal(orders.length, 1);
  assert.equal(orders[0].lines[0].leaves.length, 2);
  assert.equal(parseCnTime('2026-10-09 12:30:00').toISOString(), '2026-10-09T04:30:00.000Z');
});

test('实测返回结构：积分 / 券 / 活动日历', () => {
  assert.deepEqual(normalizeAccount({ data: { availablePoint: '43.8', currentMouthExpirePoint: '12' } }), { available: 43.8, expiring: 12 });
  assert.equal(countCoupons({ data: { coupons: [], totalCount: 0 } }), 0);
  assert.equal(countCoupons('## 券A\n\n## 券B'), 2);
  const cal = {
    data: {
      dailyList: [
        { date: '2026-10-09', dateText: '往期回顾', events: [{ articleDto: { title: '旧活动' } }] },
        { date: '2026-10-10', dateText: '今日', events: [{ articleDto: { title: '超值𝟗.𝟗元早餐😋' } }] },
        { date: '2026-10-12', dateText: '', events: [{ articleDto: { title: '新活动' } }] },
      ],
    },
  };
  const c = parseCampaigns(cal, parseCnTime('2026-10-10 09:00'));
  assert.deepEqual(c.ongoing, ['超值9.9元早餐']);
  assert.deepEqual(c.upcoming, ['新活动']);
  assert.equal(cleanTitle('🍫麦咖啡 黑巧'), '麦咖啡 黑巧');
});

test('历史累积按订单哈希去重', () => {
  const o = normalizeOrders({ data: { list: [{ orderId: 'X', createTime: '2026-10-01 12:00:00', orderProductList: [{ productName: '可乐' }] }] } });
  const now = parseCnTime('2026-10-10 09:00');
  const once = mergeHistory([], o, now);
  const twice = mergeHistory(once, o, now);
  assert.equal(twice.length, 1);
  assert.ok(!JSON.stringify(twice).includes('"X"'), '不保存原始订单号');
});

test('职级只看探索广度与麦龄', () => {
  assert.equal(levelOf(0).code, 'L1');
  assert.equal(levelOf(100).code, 'L5');
  assert.equal(levelOf(500).next, null);
});

test('三套主题都能渲染出合法 SVG，且转义了特殊字符', () => {
  const now = parseCnTime(DEMO_NOW);
  const data = Object.fromEntries(Object.entries(demoBundle()).map(([k, v]) => [k, parsePayload(v)]));
  const entries = mergeHistory([], normalizeOrders(data['order-list']), now);
  const stats = computeStats({
    entries,
    account: normalizeAccount(data['query-my-account']),
    coupons: countCoupons(data['query-my-coupons']),
    campaigns: { ongoing: ['<script>&"活动"'] },
    now,
    user: 'a&b<c>',
  });
  for (const theme of Object.keys(THEMES)) {
    const svg = renderCard(stats, { theme, hide: new Set() });
    assert.ok(svg.startsWith('<svg'), theme);
    assert.ok(!svg.includes('<script>'), `${theme} 未转义`);
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|#)/.test(svg), `${theme} 存在裸 &`);
  }
  const strict = renderCard(stats, { theme: 'receipt', hide: parseHide('', 'strict') });
  assert.ok(!strict.includes('1,024'), 'strict 模式不展示积分');
});

test('空账号（无订单）也能渲染', () => {
  const stats = computeStats({ entries: [], account: null, coupons: null, campaigns: null, now: new Date(), user: 'nobody' });
  for (const theme of Object.keys(THEMES)) assert.ok(renderCard(stats, { theme, hide: new Set() }).includes('</svg>'));
});

test('MCP 客户端拒绝调用写操作工具', async () => {
  const c = new McdMcpClient({ token: 'test', fetchImpl: async () => assert.fail('不应发出请求') });
  await assert.rejects(() => c.callTool('create-order', {}), /拒绝调用/);
  await assert.rejects(() => c.callTool('draw-lottery', {}), /拒绝调用/);
});

test('SSE 响应解析', () => {
  const sse = 'event: message\ndata: {"jsonrpc":"2.0","id":3,"result":{"ok":1}}\n\n';
  assert.deepEqual(pickSseMessage(sse, 3).result, { ok: 1 });
});
