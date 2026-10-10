// 演示数据：模拟麦当劳 MCP 的真实返回形态（Markdown 包装 + Original Response JSON），
// 用于 README 示例图和无 Token 时的本地预览。所有数据均为虚构。

export const DEMO_NOW = '2026-10-10 09:17:00';

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMBOS = [
  ['麦辣鸡腿堡套餐', ['麦辣鸡腿堡', '中薯条', '中可乐']],
  ['麦辣鸡腿堡套餐', ['麦辣鸡腿堡', '中薯条', '中雪碧']],
  ['巨无霸套餐', ['巨无霸', '中薯条', '中可乐']],
  ['板烧鸡腿堡套餐', ['板烧鸡腿堡', '麦乐鸡5块', '中杯拿铁']],
  ['双层吉士汉堡套餐', ['双层吉士汉堡', '中薯条', '中可乐']],
];
const SINGLES = ['麦辣鸡翅2块', '麦乐鸡5块', '香芋派', '麦旋风奥利奥', '大杯美式咖啡', '原味板烧鸡腿麦满分', '猪柳蛋麦满分', '脆薯饼', '鸡米花', '新地圆筒', '大杯拿铁', '无糖可乐'];
const CHANNELS = ['麦乐送', '到店取餐', '到店取餐'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmt(ms, hour, minute) {
  const d = new Date(ms + 8 * 3600e3);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(hour)}:${pad(minute)}:00`;
}

function wrap(title, obj) {
  return `# ${title}\n\n以下为查询结果。\n\n## Original Response\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``;
}

export function demoBundle() {
  const rnd = mulberry32(1024);
  const now = Date.parse(DEMO_NOW.replace(' ', 'T') + '+08:00');
  const list = [];
  const push = (daysAgo) => {
    const r = rnd();
    const hour = r < 0.18 ? 8 : r < 0.66 ? 12 : r < 0.8 ? 15 : r < 0.94 ? 19 : 22;
    const products = [];
    if (hour === 8) {
      products.push({ productCode: 'B01', productName: SINGLES[5 + Math.floor(rnd() * 3)], quantity: 1 });
      products.push({ productCode: 'B02', productName: SINGLES[rnd() < 0.5 ? 4 : 10], quantity: 1 });
    } else {
      const [name, items] = COMBOS[Math.floor(rnd() * COMBOS.length)];
      products.push({
        productCode: 'C01',
        productName: name,
        quantity: 1,
        comboItemList: items.map((n) => ({ productName: n, quantity: 1 })),
      });
      if (rnd() < 0.55) products.push({ productCode: 'S01', productName: SINGLES[Math.floor(rnd() * SINGLES.length)], quantity: 1 });
    }
    list.push({
      orderId: `DEMO${String(list.length + 1).padStart(6, '0')}`,
      orderTypeName: CHANNELS[Math.floor(rnd() * CHANNELS.length)],
      createTime: fmt(now - daysAgo * 86400e3, hour, Math.floor(rnd() * 60)),
      storeName: '演示门店',
      orderStatus: '已完成',
      realTotalAmount: '0.00',
      orderProductList: products,
    });
  };

  for (let d = 1; d < 112; d += 3 + Math.floor(rnd() * 9)) push(d);
  for (let d = 120; d < 430; d += 9 + Math.floor(rnd() * 20)) push(d);

  return {
    'now-time-info': wrap('当前时间', { data: { datetime: DEMO_NOW, timezone: 'Asia/Shanghai' } }),
    'order-list': wrap('历史订单', { code: 200, data: { list } }),
    'query-my-account': wrap('我的积分', {
      data: { availablePoint: '1024', accumulativePoint: '3650', currentMouthExpirePoint: '120', nextMouthExpirePoint: '0' },
    }),
    'query-my-coupons': '# 我的优惠券\n\n## 演示券 A\n- 有效期至 2026-10-31\n\n## 演示券 B\n\n## 演示券 C\n\n## 演示券 D\n\n## 演示券 E\n',
    'campaign-calendar':
      '# 活动日历\n\n## 进行中\n- **活动标题**：程序员节 · 1024 限定活动（演示）\n\n## 往期\n- **活动标题**：夏日演示活动\n\n## 未来\n- **活动标题**：冬季演示活动\n',
  };
}
