import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE } from '../site';
import { u } from '../lib/urls';

export async function GET(context: APIContext) {
  const digest = await getCollection('digest');
  const lekha = await getCollection('lekha');

  const items = [
    ...digest.map((e) => ({
      title: e.data.title,
      description: e.data.summary,
      pubDate: e.data.date,
      link: u(`/digest/${e.id}/`),
      categories: ['সংবাদ-সার', e.data.category],
      // Attribution travels with the item so aggregators show the source too.
      content: `<p>${e.data.summary}</p><p>সূত্র: <a href="${e.data.sourceUrl}">${e.data.source}</a></p>`,
    })),
    ...lekha.map((e) => ({
      title: e.data.title,
      description: e.data.summary,
      pubDate: e.data.date,
      link: u(`/lekha/${e.id}/`),
      author: e.data.author,
      categories: ['লেখা', ...e.data.tags],
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()).slice(0, 50);

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    items,
    customData: `<language>${SITE.lang}</language>`,
  });
}
