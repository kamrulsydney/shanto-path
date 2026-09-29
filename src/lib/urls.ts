/**
 * Base-path aware links. GitHub Pages serves the site under /<repo>/, so every
 * internal link goes through u('/path/'). Locally the base is '/', so u() is a no-op.
 */
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const u = (path: string) => base + path;
