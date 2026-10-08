#!/usr/bin/env node
// List forum posts published since the last run (state.json -> last_seen_post_id).
// Prints a JSON array, oldest first. Does not modify state.json.
// Usage: node fetch-new-posts.cjs
const fs = require('fs');
const path = require('path');

const FORUM = process.env.FORUM_URL || 'https://forum.ephore-market.com';
const STATE = path.join(__dirname, 'state.json');
// Authors whose posts are never testimonials: the founder himself and automated accounts.
const IGNORED_AUTHORS = new Set(['Elio', 'system', 'discobot']);
const MAX_PAGES = 20;

function stripHtml(html) {
  return html
    .replace(/<aside class="quote[\s\S]*?<\/aside>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const lastSeen = state.last_seen_post_id;

  const [site, collected] = [await (await fetch(`${FORUM}/site.json`)).json(), []];
  const categories = Object.fromEntries(site.categories.map((c) => [c.id, c.name]));

  let before = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(`${FORUM}/posts.json${before ? `?before=${before}` : ''}`);
    if (!res.ok) throw new Error(`posts.json: ${res.status}`);
    const posts = (await res.json()).latest_posts || [];
    if (posts.length === 0) break;
    let reachedSeen = false;
    for (const p of posts) {
      if (p.id <= lastSeen) { reachedSeen = true; continue; }
      collected.push(p);
    }
    if (reachedSeen) break;
    before = posts[posts.length - 1].id;
  }

  const result = collected
    .filter((p) => !IGNORED_AUTHORS.has(p.username) && !p.hidden && p.post_type === 1)
    .sort((a, b) => a.id - b.id)
    .map((p) => ({
      post_id: p.id,
      author: p.username,
      created_at: p.created_at,
      topic_title: p.topic_title,
      category: categories[p.category_id] || null,
      url: `${FORUM}/t/${p.topic_slug}/${p.topic_id}/${p.post_number}`,
      has_images: p.cooked.includes('lightbox-wrapper'),
      own_text: stripHtml(p.cooked),
      raw: p.raw,
    }));

  console.log(JSON.stringify({
    last_seen_post_id: lastSeen,
    newest_post_id: collected.reduce((m, p) => Math.max(m, p.id), lastSeen),
    posts: result,
  }, null, 2));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
