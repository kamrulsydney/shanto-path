import { SITE } from '../site';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Convert ASCII digits in a string to Bangla digits. */
export function bn(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Estimated reading time in minutes for Bangla prose. */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / SITE.wordsPerMinute));
}

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

/** Format a date as e.g. "৩০ সেপ্টেম্বর ২০২৬". */
export function formatDate(d: Date): string {
  return `${bn(d.getDate())} ${MONTHS[d.getMonth()]} ${bn(d.getFullYear())}`;
}

/** Public-domain check under Bangladesh copyright (life + 60 years). */
export function isPublicDomain(authorDied: number, now = new Date()): boolean {
  return now.getFullYear() > authorDied + 60;
}

/** YYYY-MM-DD in local time, used for the daily digest URLs. */
export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
