# How to Use Redis for Next.js ISR (Incremental Static Regeneration)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Next.js, ISR, Static Regeneration, Performance

Description: Combine Redis with Next.js Incremental Static Regeneration to cache dynamic page data and trigger on-demand revalidation when content changes.

---

Next.js ISR regenerates static pages in the background without a full rebuild. Adding Redis to the mix lets you control what data feeds into each page and trigger on-demand revalidation from a CMS webhook or admin action.

## How ISR Works with Redis

The typical flow:

1. Page renders at build time or on first request
2. `getStaticProps` fetches data from Redis (cache) or database (miss)
3. Next.js serves the static page and revalidates in the background
4. On content change, call `res.revalidate()` to regenerate the page

## Cache Data in getStaticProps

```javascript
// pages/blog/[slug].js
import { getRedis } from "../../lib/redis";
import { getPostFromDB } from "../../lib/db";

export async function getStaticProps({ params }) {
  const redis = await getRedis();
  const cacheKey = `post:${params.slug}`;

  let post = null;
  const cached = await redis.get(cacheKey);

  if (cached) {
    post = JSON.parse(cached);
  } else {
    post = await getPostFromDB(params.slug);
    if (post) {
      await redis.setEx(cacheKey, 3600, JSON.stringify(post));
    }
  }

  if (!post) return { notFound: true };

  return {
    props: { post },
    revalidate: 60, // Revalidate page every 60 seconds
  };
}

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}
```

## On-Demand Revalidation Endpoint

```javascript
// pages/api/revalidate.js
import { getRedis } from "../../lib/redis";

export default async function handler(req, res) {
  if (req.headers["x-webhook-secret"] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { slug } = req.query;

  try {
    // Invalidate Redis cache for this post
    const redis = await getRedis();
    await redis.del(`post:${slug}`);

    // Tell Next.js to regenerate the page
    await res.revalidate(`/blog/${slug}`);

    return res.json({ revalidated: true, slug });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

## Trigger Revalidation from a CMS Webhook

```bash
curl -X POST \
  "https://mysite.com/api/revalidate?slug=my-post" \
  -H "x-webhook-secret: my-secret"
```

## Cache Static Path List

Avoid querying the database on every build by caching known paths in Redis:

```javascript
export async function getStaticPaths() {
  const redis = await getRedis();
  let slugs = await redis.lRange("blog:slugs", 0, -1);

  if (slugs.length === 0) {
    const posts = await getAllPostSlugsFromDB();
    slugs = posts.map((p) => p.slug);
    if (slugs.length > 0) {
      await redis.rPush("blog:slugs", ...slugs);
      await redis.expire("blog:slugs", 3600);
    }
  }

  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: "blocking",
  };
}
```

## Summary

Redis and Next.js ISR complement each other well. Redis caches expensive database queries inside `getStaticProps`, reducing regeneration cost for high-traffic pages. On-demand revalidation via a webhook endpoint lets content editors publish changes that appear within seconds, without waiting for the next background revalidation cycle.
