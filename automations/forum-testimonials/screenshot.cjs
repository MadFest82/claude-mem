#!/usr/bin/env node
// Capture a single Discourse post as a PNG, framed like it appears on the forum.
// Usage: node screenshot.cjs <post_id> <out.png>
const { chromium } = require('playwright');

const FORUM = process.env.FORUM_URL || 'https://forum.ephore-market.com';

async function main() {
  const [postId, out] = process.argv.slice(2);
  if (!postId || !out) {
    console.error('Usage: node screenshot.cjs <post_id> <out.png>');
    process.exit(1);
  }

  const res = await fetch(`${FORUM}/posts/${postId}.json`);
  if (!res.ok) throw new Error(`Post ${postId} introuvable (${res.status})`);
  const post = await res.json();
  const url = `${FORUM}/t/${post.topic_slug}/${post.topic_id}/${post.post_number}`;

  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  try {
    const page = await browser.newPage({
      viewport: { width: 820, height: 1400 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
      locale: 'fr-FR',
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const article = page.locator(`article#post_${post.post_number}`);
    await article.waitFor({ state: 'visible', timeout: 30000 });

    // Clean the frame: no cookie/login banners, no "dernière visite" separator, no sticky header.
    await page.addStyleTag({
      content: `
        .d-header-wrap, .d-header, .topic-timeline, .timeline-container,
        .small-action, .topic-post-visited, .topic-post-visited-line,
        .cookied-banner, .global-notice, .signup-cta, #banner,
        .topic-navigation, .post-notice.old { display: none !important; }
      `,
    });
    // Wait for every image in the post (charts, journals...) to finish loading.
    await article.evaluate(async (el) => {
      el.scrollIntoView();
      await Promise.all(
        [...el.querySelectorAll('img')].map((img) =>
          img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
        )
      );
    });
    await page.waitForTimeout(800);

    const box = await article.boundingBox();
    const pad = 10;
    await page.screenshot({
      path: out,
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + pad * 2,
        height: box.height + pad + 2, // less at the bottom: the next post starts right below
      },
    });
    console.log(JSON.stringify({ post_id: Number(postId), url, out }));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
