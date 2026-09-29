/**
 * Daily digest pipeline.
 *
 *   1. Pull the RSS feeds of trusted Bangla publishers (feeds are content the
 *      publisher deliberately distributes for syndication of headline + snippet).
 *   2. Fetch each candidate article page so the summariser has the facts.
 *   3. Ask Claude to pick the day's most important stories and write a short
 *      digest for each IN ITS OWN WORDS - facts only, no sentences copied.
 *   4. Write one Markdown file per story into src/content/digest/, each with a
 *      link back to the original report, and remember the URLs in data/seen.json.
 *
 * Run:  npm run daily            (needs ANTHROPIC_API_KEY or `ant auth login`)
 *       npm run daily -- --dry   (fetch + select candidates, no API call, no files)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import Parser from 'rss-parser';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const OUT_DIR = path.join(ROOT, 'src/content/digest');
const SEEN_FILE = path.join(ROOT, 'data/seen.json');
const DRY = process.argv.includes('--dry');

const MAX_STORIES = 8;          // stories per day
const MAX_PER_SOURCE = 4;       // keep the mix balanced
const MAX_CANDIDATES = 32;      // sent to the model
const WINDOW_HOURS = 30;        // how far back "today" reaches
const ARTICLE_CHARS = 3500;     // context per article

// Publishers whose feeds work reliably. Add more here as they open feeds.
const SOURCES = [
  {
    key: 'pa', name: 'প্রথম আলো', feed: 'https://www.prothomalo.com/feed/',
    keep: (u) => u.includes('www.prothomalo.com') && !u.includes('/video/') && !/\/(lifestyle|religion|entertainment|chakri|onnoalo)\//.test(u),
  },
  {
    key: 'bbc', name: 'বিবিসি বাংলা', feed: 'https://feeds.bbci.co.uk/bengali/rss.xml',
    keep: (u) => u.includes('/bengali/articles/'),
  },
  {
    key: 'dw', name: 'ডয়চে ভেলে বাংলা', feed: 'https://rss.dw.com/rdf/rss-ben-all',
    keep: (u) => /\/a-\d+/.test(u),
  },
];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const parser = new Parser({ timeout: 20000, headers: { 'User-Agent': UA } });

const CATEGORIES = ['জাতীয়', 'আন্তর্জাতিক', 'অর্থনীতি', 'খেলা', 'বিজ্ঞান', 'সংস্কৃতি'];

// ---------- helpers ----------
const dhakaDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const cleanUrl = (u) => { try { const x = new URL(u); x.search = ''; x.hash = ''; return x.toString(); } catch { return u; } };
const strip = (h) => h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

async function fetchArticleText(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
    if (!res.ok) return '';
    const html = await res.text();
    const og = html.match(/property="og:description"\s+content="([^"]*)"/)?.[1] ?? '';
    const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter((p) => p.length > 40);
    return strip(`${og} ${paras.join(' ')}`).slice(0, ARTICLE_CHARS);
  } catch {
    return '';
  }
}

async function loadSeen() {
  try { return new Set(JSON.parse(await fs.readFile(SEEN_FILE, 'utf8')).urls); } catch { return new Set(); }
}

// ---------- 1. collect candidates ----------
async function collect(seen) {
  const since = Date.now() - WINDOW_HOURS * 3600 * 1000;
  const out = [];
  for (const src of SOURCES) {
    try {
      const feed = await parser.parseURL(src.feed);
      let n = 0;
      for (const item of feed.items) {
        const url = cleanUrl(item.link ?? '');
        const when = item.isoDate ? Date.parse(item.isoDate) : NaN;
        if (!url || !src.keep(url) || seen.has(url)) continue;
        if (!Number.isNaN(when) && when < since) continue;
        out.push({ source: src, url, title: strip(item.title ?? ''), snippet: strip(item.contentSnippet ?? item.content ?? ''), when });
        if (++n >= 18) break;
      }
      console.log(`[feed] ${src.name}: ${n} candidates`);
    } catch (e) {
      console.warn(`[feed] ${src.name} failed: ${e.message}`);
    }
  }
  // newest first, then cap
  out.sort((a, b) => (b.when || 0) - (a.when || 0));
  return out.slice(0, MAX_CANDIDATES);
}

// ---------- 2. summarise with Claude ----------
const Digest = z.object({
  stories: z.array(z.object({
    candidate: z.number().int().describe('index of the candidate this story is based on'),
    category: z.enum(CATEGORIES),
    title: z.string().describe('a fresh headline in Bangla, in our own words, not the source headline'),
    summary: z.string().describe('one sentence in Bangla, the whole story at a glance'),
    body: z.string().describe('2-3 short paragraphs in Bangla, Markdown, separated by blank lines'),
  })),
});

const SYSTEM = `তুমি "শান্ত পাঠ" নামের একটি পরিচ্ছন্ন বাংলা পত্রিকার সংবাদ-সার লেখক।
তোমার কাজ: দিনের প্রার্থী খবরগুলো থেকে সবচেয়ে গুরুত্বপূর্ণ ${MAX_STORIES}টি বেছে নিয়ে প্রতিটির সংক্ষিপ্ত সার লেখা।

কঠোর নিয়ম:
1. শুধু দেওয়া লেখায় থাকা তথ্য ব্যবহার করবে। কোনো তথ্য, সংখ্যা, নাম বা উদ্ধৃতি বানাবে না। কিছু অস্পষ্ট হলে বাদ দেবে।
2. সম্পূর্ণ নিজের ভাষায় লিখবে। মূল প্রতিবেদনের কোনো বাক্য হুবহু বা প্রায় হুবহু তুলবে না। শিরোনামও নতুন করে লিখবে।
3. নিরপেক্ষ, শান্ত, তথ্যনির্ভর ভাষা। উত্তেজনা, মতামত বা বিশেষণের বাড়াবাড়ি নয়।
4. কার কথা তা স্পষ্ট রাখবে ("সরকার জানিয়েছে", "প্রতিবেদনে বলা হয়েছে")।
5. বৈচিত্র্য রাখবে: জাতীয়, আন্তর্জাতিক, অর্থনীতি, খেলা মিলিয়ে; একই ঘটনার একাধিক খবর নয়। এক উৎস থেকে সর্বোচ্চ ${MAX_PER_SOURCE}টি।
6. জীবনযাপন, বিনোদন-গসিপ, ধর্মীয় কলাম, প্রচারমূলক লেখা বাদ। নৃশংস অপরাধের খুঁটিনাটি বর্ণনা নয়।
7. body: ২-৩টি ছোট অনুচ্ছেদ, মোট ৮০-১৪০ শব্দ। summary: এক বাক্য। title: ৬-১২ শব্দ।
8. গুরুত্বপূর্ণ খবর ${MAX_STORIES}টির কম থাকলে কম লিখবে। প্রার্থী তালিকা দুর্বল হলে ৪টিও যথেষ্ট।`;

async function summarise(candidates) {
  const client = new Anthropic();
  const listing = candidates.map((c, i) =>
    `### প্রার্থী ${i}\nউৎস: ${c.source.name}\nশিরোনাম: ${c.title}\nসংক্ষেপ: ${c.snippet}\nমূল লেখা: ${c.text || '(পাওয়া যায়নি; শুধু শিরোনাম ও সংক্ষেপ)'}`,
  ).join('\n\n');

  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'high', format: zodOutputFormat(Digest) },
    messages: [{ role: 'user', content: `আজকের তারিখ: ${dhakaDate()}\n\n${listing}` }],
  });
  if (response.stop_reason === 'refusal') throw new Error(`model refused: ${response.stop_details?.explanation ?? ''}`);
  if (!response.parsed_output) throw new Error('could not parse model output');
  return response.parsed_output.stories;
}

// ---------- 3. write files ----------
const yamlStr = (s) => JSON.stringify(s); // JSON strings are valid YAML scalars

async function writeStories(stories, candidates, seen) {
  const date = dhakaDate();
  const perSource = {};
  let written = 0;
  for (const s of stories) {
    const c = candidates[s.candidate];
    if (!c) continue;
    perSource[c.source.key] = (perSource[c.source.key] ?? 0) + 1;
    if (perSource[c.source.key] > MAX_PER_SOURCE || written >= MAX_STORIES) continue;
    const hash = crypto.createHash('sha1').update(c.url).digest('hex').slice(0, 6);
    const file = path.join(OUT_DIR, `${date}-${c.source.key}-${hash}.md`);
    const md = `---
title: ${yamlStr(s.title)}
summary: ${yamlStr(s.summary)}
date: ${date}
category: ${yamlStr(s.category)}
source: ${yamlStr(c.source.name)}
sourceUrl: ${yamlStr(c.url)}
auto: true
---

${s.body.trim()}
`;
    await fs.writeFile(file, md, 'utf8');
    seen.add(c.url);
    written++;
    console.log(`[write] ${path.basename(file)}  ${s.title}`);
  }
  await fs.writeFile(SEEN_FILE, JSON.stringify({ urls: [...seen].slice(-2000) }, null, 0) + '\n');
  return written;
}

// ---------- main ----------
const seen = await loadSeen();
const candidates = await collect(seen);
if (candidates.length === 0) { console.log('No new candidates today.'); process.exit(0); }

console.log(`[fetch] reading ${candidates.length} articles...`);
await Promise.all(candidates.map(async (c) => { c.text = await fetchArticleText(c.url); }));

if (DRY) {
  for (const [i, c] of candidates.entries()) console.log(`${i}. [${c.source.name}] ${c.title}  (${c.text.length} chars)`);
  process.exit(0);
}

const stories = await summarise(candidates);
const n = await writeStories(stories, candidates, seen);
console.log(`Done: ${n} stories written for ${dhakaDate()}.`);
