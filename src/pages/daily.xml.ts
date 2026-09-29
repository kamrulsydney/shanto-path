import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../site';
import { u } from '../lib/urls';
import { digestByDay, dailyHtml } from '../lib/daily';
import { formatDate } from '../lib/text';

export async function GET(context: APIContext) {
  const days = (await digestByDay()).slice(0, 30);

  return rss({
    title: `${SITE.name} — দৈনিক সংবাদ-সার`,
    description: 'প্রতিদিন সকালে এক ইমেইলে দিনের সংবাদ-সার। এই ফিডটি ইমেইল সার্ভিসের জন্য: এক দিন, এক আইটেম।',
    site: context.site!,
    items: days.map((day) => {
      const latest = day.items[0].data.date;
      return {
        title: `${formatDate(latest)} — ${day.items.length > 1 ? `${day.items.length}টি সংবাদ-সার` : day.items[0].data.title}`,
        description: day.items.map((e) => e.data.title).join(' · '),
        pubDate: latest,
        link: u(`/daily/${day.date}/`),
        content: dailyHtml(day, context.site!, SITE.name),
      };
    }),
    customData: `<language>${SITE.lang}</language>`,
  });
}
