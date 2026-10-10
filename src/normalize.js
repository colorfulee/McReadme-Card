// 把 MCP 原始数据归一化成卡片需要的结构。字段名以实测为主，同时保留候选键兜底。

export const CATEGORY_COLORS = {
  汉堡: '#DA291C',
  小食: '#FFBC0D',
  饮品: '#2D9CDB',
  咖啡: '#8B5E3C',
  甜品: '#F48FB1',
  早餐: '#F2994A',
  其他: '#9AA0A6',
};

const CATEGORY_RULES = [
  ['早餐', /麦满分|猪柳|吉士蛋|薯饼|粥|豆浆|油条|早餐|晨/],
  ['甜品', /麦旋风|圆筒|新地|冰淇淋|甜筒|派|蛋挞|雪芭/],
  ['咖啡', /咖啡|拿铁|美式|卡布|摩卡|馥芮白|澳白|McCafe|麦咖啡/i],
  ['饮品', /可乐|雪碧|芬达|茶|果汁|奶昔|饮|水|牛奶|柠檬|气泡/],
  ['汉堡', /堡|卷|板烧|巨无霸|麦香鸡|麦香鱼/],
  ['小食', /薯条|鸡块|麦乐鸡|翅|鸡米花|小食|鸡腿|鸡排|薯|鸡/],
];

export function classify(name) {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(name)) return cat;
  return '其他';
}

export function canonicalName(name) {
  return String(name || '')
    .replace(/[（(【\[].*?[)）】\]]/g, '')
    .replace(/套餐|单点|[大中小](份|杯|号)|\s+/g, '')
    .trim();
}

export function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  return undefined;
}

// 在任意嵌套结构里找第一个"元素含有指定键"的对象数组
export function findList(data, hintKeys, depth = 0) {
  if (data == null || depth > 5) return null;
  if (Array.isArray(data)) {
    if (data.some((x) => x && typeof x === 'object' && hintKeys.some((k) => k in x))) return data;
    for (const x of data) {
      const r = findList(x, hintKeys, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof data === 'object') {
    for (const v of Object.values(data)) {
      const r = findList(v, hintKeys, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

function findObject(data, hintKey, depth = 0) {
  if (data == null || typeof data !== 'object' || depth > 5) return null;
  if (!Array.isArray(data) && hintKey in data) return data;
  for (const v of Object.values(data)) {
    const r = findObject(v, hintKey, depth + 1);
    if (r) return r;
  }
  return null;
}

// ---------- 时间：MCP 返回的是北京时间字符串 ----------

export function parseCnTime(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' || /^\d{10,13}$/.test(String(v))) {
    const n = Number(v);
    return new Date(n < 1e12 ? n * 1000 : n);
  }
  const m = String(v).match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, h = '12', mi = '0', s = '0'] = m;
  const pad = (x) => String(x).padStart(2, '0');
  return new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}+08:00`);
}

export function cst(date) {
  const t = new Date(date.getTime() + 8 * 3600 * 1000);
  const ymd = t.toISOString().slice(0, 10);
  return { ymd, ym: ymd.slice(0, 7), hour: t.getUTCHours(), dow: (t.getUTCDay() + 6) % 7, hm: t.toISOString().slice(11, 16) };
}

// ---------- 订单 ----------

const ORDER_KEYS = ['orderId', 'orderProductList', 'createTime', 'orderNo'];
const CHANNEL_KEYS = ['orderTypeName', 'orderTypeDesc', 'channelName', 'sceneName', 'beTypeName', 'orderType', 'channel', 'scene'];

function channelOf(order) {
  const v = String(pick(order, CHANNEL_KEYS) ?? '');
  if (/外送|麦乐送|配送|delivery/i.test(v)) return '麦乐送';
  if (/得来速|drive/i.test(v)) return '得来速';
  if (/到店|堂食|外带|自取|pickup|dine/i.test(v)) return '到店取餐';
  return null;
}

function lineItems(order) {
  const list = pick(order, ['orderProductList', 'productList', 'products', 'items', 'goods']) || [];
  const lines = [];
  for (const p of Array.isArray(list) ? list : []) {
    const name = canonicalName(pick(p, ['productName', 'mealName', 'itemName', 'goodsName', 'name', 'title']));
    if (!name) continue;
    const qty = Number(pick(p, ['quantity', 'qty', 'num', 'count'])) || 1;
    const combo = pick(p, ['comboItemList', 'comboItems', 'subProducts']) || [];
    const leaves = [];
    for (const c of Array.isArray(combo) ? combo : []) {
      const cn = canonicalName(pick(c, ['productName', 'name', 'itemName', 'mealName']));
      if (cn) leaves.push({ n: cn, q: (Number(pick(c, ['quantity', 'qty', 'num'])) || 1) * qty, c: classify(cn) });
    }
    if (!leaves.length) leaves.push({ n: name, q: qty, c: classify(name) });
    lines.push({ n: name, q: qty, leaves });
  }
  return lines;
}

export function normalizeOrders(raw) {
  const list = findList(raw, ORDER_KEYS) || [];
  const orders = [];
  for (const o of list) {
    const status = String(pick(o, ['orderStatusName', 'orderStatusDesc', 'orderStatus', 'status']) ?? '');
    if (/取消|退款|cancel|refund|关闭/i.test(status)) continue;
    const time = parseCnTime(pick(o, ['createTime', 'orderTime', 'payTime', 'createdAt', 'gmtCreate', 'time', 'date']));
    if (!time || isNaN(time)) continue;
    const lines = lineItems(o);
    if (!lines.length) continue;
    orders.push({
      id: String(pick(o, ['orderId', 'orderNo', 'id']) ?? ''),
      time,
      channel: channelOf(o),
      lines,
    });
  }
  return orders;
}

// ---------- 积分 / 券 / 活动 / 时间 ----------

export function normalizeAccount(raw) {
  const acc = findObject(raw, 'availablePoint');
  if (!acc) return null;
  const num = (v) => (v == null || v === '' ? 0 : Number(String(v).replace(/,/g, '')) || 0);
  return {
    available: num(acc.availablePoint),
    expiring: num(acc.currentMouthExpirePoint ?? acc.currentMonthExpirePoint),
  };
}

export function countCoupons(raw) {
  if (raw == null) return null;
  const meta = findObject(raw, 'totalCount');
  if (meta && Number.isFinite(Number(meta.totalCount))) return Number(meta.totalCount);
  if (typeof raw === 'string') {
    const h = (raw.match(/^##\s+/gm) || []).length;
    return h || (raw.match(/优惠券标题[：:]/g) || []).length;
  }
  const list = findList(raw, ['couponId', 'couponName', 'couponCode', 'title', 'name']);
  if (list) return list.length;
  const inner = typeof raw === 'object' ? raw.data : null;
  return typeof inner === 'string' ? countCoupons(inner) : 0;
}

// 活动标题里常有 emoji 和"数学粗体"数字（𝟗.𝟗），NFKC 归一化后去掉 emoji，避免卡片排版错乱
export function cleanTitle(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/\p{Extended_Pictographic}|[️‍]|[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 实测结构：data.dailyList[].{ date, dateText, events[].articleDto.title }
function parseDailyList(cal, now) {
  const today = now ? cst(now).ymd : null;
  const titleOf = (e) => cleanTitle(e?.articleDto?.title || e?.activityTitle || e?.activitySubTitle);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const todayBlock = cal.dailyList.find((d) => d.date === today) || cal.dailyList.find((d) => /今日/.test(d.dateText || ''));
  const ongoing = uniq((todayBlock?.events || []).map(titleOf));
  const upcoming = uniq(cal.dailyList.filter((d) => today && d.date > today).flatMap((d) => (d.events || []).map(titleOf)));
  return { ongoing, upcoming };
}

export function parseCampaigns(raw, now) {
  const cal = findObject(raw, 'dailyList');
  if (cal && Array.isArray(cal.dailyList)) return parseDailyList(cal, now);
  let text = raw;
  if (raw && typeof raw === 'object') {
    const list = findList(raw, ['title', 'name', 'campaignName', 'activityName']);
    if (list) {
      const names = list.map((x) => cleanTitle(pick(x, ['title', 'name', 'campaignName', 'activityName']))).filter(Boolean);
      return { ongoing: names, upcoming: [] };
    }
    text = typeof raw.data === 'string' ? raw.data : JSON.stringify(raw);
  }
  if (typeof text !== 'string') return { ongoing: [], upcoming: [] };

  const out = { ongoing: [], upcoming: [], other: [] };
  let bucket = 'other';
  for (const line of text.split(/\r?\n/)) {
    if (/^#+\s/.test(line) || /^\*\*[^*]+\*\*\s*$/.test(line.trim())) {
      if (/进行中|当前|正在/.test(line)) bucket = 'ongoing';
      else if (/未来|即将|预告|upcoming/i.test(line)) bucket = 'upcoming';
      else if (/往期|已结束|过去/.test(line)) bucket = 'past';
    }
    const m = line.match(/活动(?:标题|名称)\**\s*[：:]\s*(.+)/);
    if (m && bucket !== 'past') {
      const name = cleanTitle(m[1].replace(/[*`]/g, ''));
      if (name && !out[bucket].includes(name)) out[bucket].push(name);
    }
  }
  return { ongoing: out.ongoing.length ? out.ongoing : out.other, upcoming: out.upcoming };
}

export function parseNow(raw) {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
  const m = text.match(/\d{4}-\d{1,2}-\d{1,2}[ T]\d{1,2}:\d{2}(:\d{2})?/);
  return m ? parseCnTime(m[0]) : null;
}
