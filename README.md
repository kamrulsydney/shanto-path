# শান্ত পাঠ — a calm Bangla newspaper & magazine

Static site built with [Astro](https://astro.build). No trackers, one ad slot, Bangla-first typography.

## Run

```
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

## Where things live

- `src/site.ts` — site name, tagline, nav. Rename the paper here.
- `src/styles/global.css` — design tokens (colors, fonts, measure, dark mode).
- `src/components/Sponsor.astro` — the single ad slot. Swap in a sponsor or EthicalAds snippet.
- `src/content/digest/` — news summaries in your own words. Every file needs `source` and `sourceUrl`.
- `src/content/lekha/` — original articles. `author` and `date` required.
- `src/content/sahitya/` — public-domain literature. `authorDied` is checked at build time (life + 60 years, Bangladesh); anything still in copyright is skipped with a warning.

## Content rules (the legal backbone)

1. Never paste another publisher's article text. Write the digest yourself and link to the source.
2. Full third-party text only with a licence (UNB, BSS, CC BY sources such as Global Voices Bangla). Record it in the `licence` field.
3. Literature only when the author has been dead more than 60 years.

## The daily paper writes itself

`npm run daily` (script: `scripts/daily.mjs`) does the morning edition:

1. Reads the RSS feeds of Prothom Alo, BBC Bangla and DW Bangla (headline + snippet the publishers distribute for syndication).
2. Fetches each candidate article so the summariser has the facts.
3. Asks Claude (`claude-opus-5-5`) to choose the day's 8 most important stories and write each **in its own words**: fresh headline, one-line summary, 2-3 short paragraphs. Facts only, nothing copied, nothing invented.
4. Writes one Markdown file per story into `src/content/digest/` with a link to the original report, marks it `auto: true`, and records the URL in `data/seen.json` so it is never repeated.

`npm run daily -- --dry` shows what it would pick without calling the API or writing files.

**Automation**: `.github/workflows/daily.yml` runs this every day at 07:00 Dhaka time (01:00 UTC), commits the new stories, builds the site and deploys it to GitHub Pages. It also redeploys on every push to `main`, and can be run by hand from the Actions tab.

It needs three things in the GitHub repo:

- Secret `ANTHROPIC_API_KEY` — `gh secret set ANTHROPIC_API_KEY`
- Variable `SITE_URL` = the site origin (e.g. `https://<user>.github.io`)
- Variable `SITE_BASE` = `/<repo>` on GitHub Pages, or empty with a custom domain

Without the secret the workflow still deploys whatever is in the repo; it just skips writing new stories.

## RSS and the daily email digest

Two feeds are generated at build time:

- `/rss.xml` — every new digest and original article, newest first. For feed readers and aggregators.
- `/daily.xml` — **one item per day**, containing that day's whole digest as email-ready HTML. This is what the daily email is built from.

The email is sent by an RSS-to-email service, so the site stays static with nothing to host or schedule:

1. Create a free account at Buttondown (Kit, MailerLite and Mailchimp also work).
2. Set your site URL in `src/site.ts` (`url`) so feed links are absolute.
3. In Buttondown: Settings → RSS-to-email → add `https://your-site/daily.xml`, schedule "daily", pick the send time (07:00 Asia/Dhaka matches `newsletter.sendHourDhaka`).
4. Put your Buttondown username in `src/site.ts` → `newsletter.buttondownUsername`. The subscribe form on the home page, the about page and every `/daily/` page then goes live.

Each day's email can be previewed on the web at `/daily/YYYY-MM-DD/`, and `/daily/` lists all days. Because one feed item = one day, the service sends exactly one email per morning, and a day with no digests sends nothing.

## Deploy

GitHub Pages is wired up through the workflow above. Any other static host also works: build command `npm run build`, output directory `dist`, with `SITE_URL` and `SITE_BASE` set for that host.
