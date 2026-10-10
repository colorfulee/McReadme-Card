// 把 MCP 工具返回的各种形态统一成 JS 对象。
// 麦当劳 MCP 实测会出现：structuredContent、纯 JSON 文本、
// "Markdown 说明 + ## Original Response + JSON" 的包装、纯 Markdown 文本。

export function unwrapToolResult(result) {
  if (result?.structuredContent && Object.keys(result.structuredContent).length) {
    return result.structuredContent;
  }
  const text = (result?.content || [])
    .filter((c) => c && c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n')
    .trim();
  return parsePayload(text);
}

export function parsePayload(text) {
  if (text == null) return null;
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const direct = tryJson(trimmed);
  if (direct !== undefined) return direct;

  const idx = trimmed.search(/#+\s*Original Response/i);
  if (idx >= 0) {
    const tail = trimmed.slice(idx);
    const fenced = tail.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      const j = tryJson(fenced[1].trim());
      if (j !== undefined) return j;
    }
    const j = extractFirstJson(tail);
    if (j !== undefined) return j;
  }
  return trimmed;
}

function tryJson(s) {
  if (!/^[[{]/.test(s)) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

// 从文本中找出第一个括号配平的 JSON 对象/数组
export function extractFirstJson(text) {
  for (let start = 0; start < text.length; start++) {
    const open = text[start];
    if (open !== '{' && open !== '[') continue;
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (ch === '\\') i++;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close && --depth === 0) {
        const j = tryJson(text.slice(start, i + 1));
        if (j !== undefined) return j;
        break;
      }
    }
  }
  return undefined;
}
