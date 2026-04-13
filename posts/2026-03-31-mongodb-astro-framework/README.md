# How to Use MongoDB with Astro Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Astro, Static Site, Node.js, JavaScript

Description: Learn how to integrate MongoDB with the Astro framework using server-side data fetching in frontmatter and API routes for dynamic content.

---

## Why Astro and MongoDB Work Well Together

Astro renders pages at build time by default but supports server-side rendering (SSR) for dynamic pages. This makes it ideal for content-heavy sites where most pages are static (blog posts, product listings) but some need real-time data (user dashboards, search results). MongoDB can serve both use cases from a single connection.

## Project Setup

```bash
npm create astro@latest my-site
cd my-site
npm install mongodb
```

Configure the Astro Node.js adapter for SSR routes:

```bash
npm install @astrojs/node
```

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',  // static by default, SSR where opted in
  adapter: node({ mode: 'standalone' }),
});
```

## Creating a MongoDB Client Module

```javascript
// src/lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = import.meta.env.MONGODB_URI;

let client;
let db;

export async function getDb(dbName = 'mysite') {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  db = client.db(dbName);
  return db;
}
```

## Static Page with MongoDB Data Fetching

In Astro, code in the frontmatter (`---` block) runs at build time on the server:

```astro
---
// src/pages/blog/index.astro
import { getDb } from '../../lib/mongodb.js';

const db = await getDb('mysite');
const posts = await db.collection('posts')
  .find({ published: true })
  .sort({ publishedAt: -1 })
  .limit(20)
  .toArray();
---

<html>
  <head><title>Blog</title></head>
  <body>
    <h1>Blog Posts</h1>
    {posts.map(post => (
      <article>
        <h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
        <p>{post.excerpt}</p>
        <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
      </article>
    ))}
  </body>
</html>
```

## Dynamic SSR Page

For user-specific or real-time data, use `export const prerender = false`:

```astro
---
// src/pages/dashboard.astro
export const prerender = false;  // Enable SSR for this page

import { getDb } from '../lib/mongodb.js';

const userId = Astro.cookies.get('userId')?.value;
if (!userId) return Astro.redirect('/login');

const db = await getDb('mysite');
const user = await db.collection('users').findOne({ _id: userId });
const recentActivity = await db.collection('activity')
  .find({ userId })
  .sort({ timestamp: -1 })
  .limit(10)
  .toArray();
---

<h1>Welcome, {user?.name}</h1>
<ul>
  {recentActivity.map(a => <li>{a.description}</li>)}
</ul>
```

## API Route for Dynamic Data

```javascript
// src/pages/api/search.js
export const prerender = false;

import { getDb } from '../../lib/mongodb.js';

export async function GET({ url }) {
  const query = url.searchParams.get('q');
  if (!query) {
    return new Response(JSON.stringify({ error: 'query required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const db = await getDb('mysite');
  const results = await db.collection('posts')
    .find({ $text: { $search: query }, published: true })
    .project({ title: 1, slug: 1, excerpt: 1, score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(10)
    .toArray();

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Dynamic Routes

```astro
---
// src/pages/blog/[slug].astro
import { getDb } from '../../lib/mongodb.js';

export async function getStaticPaths() {
  const db = await getDb('mysite');
  const posts = await db.collection('posts')
    .find({ published: true }, { projection: { slug: 1 } })
    .toArray();
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const db = await getDb('mysite');
const post = await db.collection('posts').findOne({ slug, published: true });
if (!post) return Astro.redirect('/404');
---

<article>
  <h1>{post.title}</h1>
  <div set:html={post.body} />
</article>
```

## Summary

Astro integrates naturally with MongoDB through server-side data fetching in frontmatter for static pages and SSR routes for dynamic content. Create a shared MongoDB client module to reuse the connection across pages and API routes. Use `export const prerender = false` on specific pages for SSR when you need real-time data, while keeping the rest of your site static for optimal performance.
