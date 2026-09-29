import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// সংবাদ-সার: news written in OUR OWN WORDS, always with a link to the source.
// Facts are not copyrighted; the publisher's wording is. Never paste article text here.
const digest = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/digest' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    category: z.enum(['জাতীয়', 'আন্তর্জাতিক', 'অর্থনীতি', 'খেলা', 'বিজ্ঞান', 'সংস্কৃতি']),
    source: z.string(), // e.g. "প্রথম আলো"
    sourceUrl: z.string().url(),
    // Optional: wire-agency licence (UNB/BSS) when full text is used.
    licence: z.string().optional(),
    // true when the daily pipeline wrote it (shown to readers as a small note).
    auto: z.boolean().default(false),
  }),
});

// লেখা: original articles, columns and reviews written for this site.
const lekha = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lekha' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

// সাহিত্য: public-domain literature. In Bangladesh copyright lasts 60 years
// after the author's death, so record the death year and check it before publishing.
const sahitya = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sahitya' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    authorDied: z.number().int(),
    kind: z.enum(['কবিতা', 'গল্প', 'প্রবন্ধ', 'উপন্যাস-অংশ']),
    firstPublished: z.string().optional(),
    summary: z.string().optional(),
  }),
});

export const collections = { digest, lekha, sahitya };
