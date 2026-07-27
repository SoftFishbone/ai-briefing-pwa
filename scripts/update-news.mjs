import { readFile, writeFile } from 'node:fs/promises';

// 公开 RSS 源：官方源优先，媒体源用于补充行业动态。
const feeds = [
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', region: '全球', category: '开源', aiOnly: true },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', region: '全球', category: '研究与产品', aiOnly: true },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', region: '全球', category: '公司与产品', aiOnly: true },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', region: '全球', category: '行业观察', aiOnly: false }
];

const file = new URL('../public/news.json', import.meta.url);
const aiTerms = /\b(ai|artificial intelligence|llm|large language|generative|agent|model|neural|machine learning|deep learning|robot|inference|gpu|chatgpt|gemini|claude|openai|anthropic|hugging face)\b|人工智能|大模型|生成式|智能体|机器学习|深度学习|机器人|推理|算力|芯片|模型|Agent/iu;

const decodeEntities = (value = '') => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

const clean = (value = '') => decodeEntities(value
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim())
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tag = (xml, name) => clean(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1] || '');
const hash = (value) => [...value].reduce((sum, character) => ((sum << 5) - sum + character.charCodeAt(0)) | 0, 0).toString(36);

function sentences(text) {
  return text.split(/(?<=[。！？.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 18);
}

function buildSummary(title, description, feed) {
  const parts = sentences(description);
  if (parts.length >= 2) return parts.slice(0, 3).join(' ');
  if (description.length > 80) return `${description} 这篇内容重点围绕“${title}”展开，建议结合原文中的背景、数据和限制条件理解。`;
  return `这条资讯来自${feed.name}，主题是“${title}”。目前公开摘要信息有限，下面的原文链接是判断细节、数据和适用范围的主要依据。`;
}

function buildWhy(title, description, feed) {
  const text = `${title} ${description}`;
  if (/agent|智能体|工具调用|workflow|工作流/i.test(text)) return '它反映出 AI 应用正在从单轮问答走向多步骤执行。对学生来说，值得重点理解任务拆解、工具调用、权限控制和结果验证，这些能力会直接影响 Agent 产品能否真正落地。';
  if (/open source|开源|hugging face|本地|端侧|inference|推理/i.test(text)) return '它说明模型能力正在向更低成本、更容易部署的方向扩散。除了调用模型，还值得学习模型评测、量化、推理速度和部署环境，这些是把 Demo 做成产品时会遇到的实际问题。';
  if (/funding|fund|融资|valuation|startup|startup|公司|acquisition|收购/i.test(text)) return '公司和资本的变化可以帮助判断 AI 产业的真实需求，而不只是看模型发布的热度。阅读时应关注收入来源、客户场景、技术壁垒和竞争对手，这些也是理解行业与准备面试的重要线索。';
  if (/safety|安全|policy|政策|regulation|合规|privacy|隐私/i.test(text)) return 'AI 产品的竞争已经不只取决于模型效果，也取决于数据来源、隐私、版权和安全边界。提前理解这些限制，有助于你在课程项目和求职作品中做出更可信、可上线的设计。';
  return `这条来自${feed.name}的更新值得放进行业脉络中观察：它可能影响模型能力、产品形态、开发工具或岗位技能。阅读原文时重点留意具体事实、适用边界和是否存在未经证实的推测。`;
}

function keywords(title, description, category) {
  const candidates = ['大模型', 'Agent', '开源模型', 'AI 编程', '端侧 AI', '推理', '多模态', '算力', '融资', 'AI 安全', '隐私合规', '机器人'];
  const matched = candidates.filter((keyword) => new RegExp(keyword.replace(' ', '\\s*'), 'i').test(`${title} ${description}`));
  return [...new Set([category, ...matched])].slice(0, 4);
}

async function readFeed(feed) {
  const response = await fetch(feed.url, { headers: { 'user-agent': 'AI-Briefing-PWA/0.2' } });
  if (!response.ok) throw new Error(`${feed.name}: HTTP ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<(item|entry)[^>]*>([\s\S]*?)<\/(item|entry)>/gi)].slice(0, 20).map((match) => {
    const block = match[2];
    const title = tag(block, 'title');
    const description = tag(block, 'content:encoded') || tag(block, 'description') || tag(block, 'summary') || tag(block, 'content');
    const url = tag(block, 'link') || block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || '';
    const publishedAt = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || new Date().toISOString();
    return { title, description, url, publishedAt, feed };
  }).filter((item) => item.title && item.url && (item.feed.aiOnly || aiTerms.test(`${item.title} ${item.description}`))).map((item) => ({
    id: `${item.feed.name}-${hash(item.title)}`,
    title: item.title,
    source: item.feed.name,
    publishedAt: Number.isNaN(new Date(item.publishedAt).getTime()) ? new Date().toISOString() : new Date(item.publishedAt).toISOString(),
    category: item.feed.category,
    region: item.feed.region,
    summary: buildSummary(item.title, item.description, item.feed),
    whyItMatters: buildWhy(item.title, item.description, item.feed),
    keywords: keywords(item.title, item.description, item.feed.category),
    url: item.url
  }));
}

let previous = { updatedAt: new Date().toISOString(), items: [] };
try { previous = JSON.parse(await readFile(file, 'utf8')); } catch {}

const results = [];
for (const feed of feeds) {
  try { results.push(...await readFeed(feed)); } catch (error) { console.warn(error.message); }
}

const unique = new Map();
for (const item of results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))) {
  const key = item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 80);
  if (!unique.has(key)) unique.set(key, item);
}

const items = [...unique.values()].slice(0, 24);
const output = { updatedAt: new Date().toISOString(), items: items.length ? items : previous.items };
await writeFile(file, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Updated ${output.items.length} detailed AI stories at ${output.updatedAt}`);
