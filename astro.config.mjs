// @ts-check
import { defineConfig } from 'astro/config';
import { SITE } from './src/site.ts';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? SITE.url, // absolute links in RSS/email
  base: process.env.SITE_BASE ?? '/',     // '/<repo>' on GitHub Pages
});
