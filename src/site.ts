// Site-wide settings. Change the name here and it updates everywhere.
export const SITE = {
  name: 'শান্ত পাঠ',
  tagline: 'বিজ্ঞাপনের ভিড় ছাড়া, শান্তিতে পড়ার জায়গা',
  description:
    'একটি পরিচ্ছন্ন বাংলা পত্রিকা ও ম্যাগাজিন। সংক্ষিপ্ত সংবাদ-সার, মৌলিক লেখা আর কালজয়ী সাহিত্য।',
  url: 'https://kamrulsydney.github.io', // origin only; the path comes from SITE_BASE
  lang: 'bn',
  // Bangla reading speed used for the reading-time estimate.
  wordsPerMinute: 180,
  // Daily email digest. The /daily.xml feed emits one item per day; point an
  // RSS-to-email service (Buttondown, Kit, MailerLite, Mailchimp) at it and it
  // sends one email each morning. Set the Buttondown username to enable the form.
  newsletter: {
    buttondownUsername: '', // e.g. 'shantopath' → form posts to buttondown.com
    sendHourDhaka: 7,       // shown to readers; the service's schedule must match
  },
};

export const NAV = [
  { href: '/digest/', label: 'সংবাদ-সার' },
  { href: '/lekha/', label: 'লেখা' },
  { href: '/sahitya/', label: 'সাহিত্য' },
  { href: '/about/', label: 'আমাদের কথা' },
];
