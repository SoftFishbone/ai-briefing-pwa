import { readFile, writeFile } from 'node:fs/promises';

const feeds = [
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', region: '全球', category: '开源' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', region: '全球', category: '产品' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', region: '全球', category: '行业' }
];

const file = new URL('../public/news.json', import.meta.url);
const clean = (value = '') => value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const tag = (xml, name) => clean(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] || '');
const escape = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));
const hash = (value) => [...value].reduce((sum, character) => ((sum << 5) - sum + character.charCodeAt(0)) | 0, 0).toString(36);

async function readFeed(feed) {
  const response = await fetch(feed.url, { headers: { 'user-agent': 'AI-Briefing-PWA/0.1' } });
  if (!response.ok) throw new Error(`${feed.name}: HTTP ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<(item|entry)[^>]*>([\s\S]*?)<\/(item|entry)>/gi)].slice(0, 12).map((match) => {
    const block = match[2];
    const title = tag(block, 'title');
    const url = tag(block, 'link') || block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || '';
    const publishedAt = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || new Date().toISOString();
    return { id: `${feed.name}-${hash(title)}`, title, source: feed.name, publishedAt, category: feed.category, region: feed.region, summary: `${title}。这是来自公开来源的行业更新，建议打开原文了解完整背景。`, whyItMatters: '理解这条变化，有助于判断 AI 技术、产品与学习方向正在如何演进。', keywords: [feed.category, '行业趋势'], url };
  }).filter((item) => item.title && item.url);
}

let previous = { updatedAt: new Date().toISOString(), items: [] };
try { previous = JSON.parse(await readFile(file, 'utf8')); } catch {}
const results = [];
for (const feed of feeds) {
  try { results.push(...await readFeed(feed)); } catch (error) { console.warn(error.message); }
}

const unique = new Map();
for (const item of results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))) {
  const key = item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 60);
  if (!unique.has(key)) unique.set(key, item);
}
const items = [...unique.values()].slice(0, 24);
const output = { updatedAt: new Date().toISOString(), items: items.length ? items : previous.items };
await writeFile(file, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Updated ${output.items.length} stories at ${output.updatedAt}`);
