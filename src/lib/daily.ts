import { getCollection, type CollectionEntry } from 'astro:content';
import { isoDay } from './text';
import { u } from './urls';

export type Day = { date: string; items: CollectionEntry<'digest'>[] };

/** All digest entries grouped by publication day, newest day first. */
export async function digestByDay(): Promise<Day[]> {
  const entries = (await getCollection('digest')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const map = new Map<string, CollectionEntry<'digest'>[]>();
  for (const e of entries) {
    const key = isoDay(e.data.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }));
}

/** Escape text for use inside XML/HTML. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Email-safe HTML for one day's digest. Inline styles and simple tags only,
 * so it survives Gmail/Outlook. Used both by /daily.xml and the /daily/ pages.
 */
export function dailyHtml(day: Day, siteUrl: URL, siteName: string): string {
  const base = new URL(u('/'), siteUrl).toString().replace(/\/$/, '');
  const items = day.items
    .map(
      (e) => `
<div style="margin:0 0 28px 0;">
  <div style="font-size:13px;color:#8a3b12;margin-bottom:4px;">${esc(e.data.category)} · সূত্র: ${esc(e.data.source)}</div>
  <h2 style="font-size:20px;line-height:1.4;margin:0 0 8px 0;font-weight:600;"><a href="${base}/digest/${e.id}/" style="color:#1c1a17;text-decoration:none;">${esc(e.data.title)}</a></h2>
  <p style="font-size:17px;line-height:1.8;margin:0 0 8px 0;color:#1c1a17;">${esc(e.data.summary)}</p>
  <a href="${e.data.sourceUrl}" style="font-size:14px;color:#8a3b12;">মূল প্রতিবেদন পড়ুন ↗</a>
</div>`,
    )
    .join('');

  return `
<div style="font-family:'Noto Serif Bengali',Kalpurush,Georgia,serif;max-width:600px;margin:0 auto;padding:24px 16px;background:#faf7f1;color:#1c1a17;">
  <div style="border-bottom:2px solid #1c1a17;padding-bottom:8px;margin-bottom:24px;">
    <div style="font-size:24px;font-weight:700;">${esc(siteName)}</div>
    <div style="font-size:13px;color:#6b655c;">আজকের সংবাদ-সার</div>
  </div>
  ${items}
  <div style="border-top:1px solid #e5dfd3;padding-top:12px;font-size:13px;color:#6b655c;line-height:1.6;">
    প্রতিটি সার আমাদের নিজের ভাষায় লেখা; পুরো প্রতিবেদন মূল উৎসে। <a href="${base}/daily/${day.date}/" style="color:#6b655c;">ওয়েবে দেখুন</a>
  </div>
</div>`;
}
