# How to Use Redis for React Server-Side Rendering Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, React, Server-Side Rendering

Description: Learn how to use Redis to cache React server-side rendered HTML output, reducing rendering CPU load and improving response times for repeated page requests.

---

React SSR with frameworks like Next.js renders HTML on every request. For pages with dynamic but cacheable content, Redis can store rendered HTML and return it in under 1ms instead of re-rendering in 100-500ms.

## Next.js: Cache getServerSideProps Data

```javascript
// lib/redis.js
const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: 6379,
  maxRetriesPerRequest: 3,
});

module.exports = redis;
```

```javascript
// pages/products/[id].js
import redis from "../../lib/redis";

export async function getServerSideProps({ params }) {
  const cacheKey = `ssr:product:${params.id}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return { props: JSON.parse(cached) };
  }

  // Fetch from database
  const product = await fetchProduct(params.id);
  const props = { product };

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(props), "EX", 300);

  return { props };
}
```

## Cache Full HTML Response at Middleware Level

For higher throughput, cache the full rendered HTML response.

> **Note:** Next.js Middleware runs on the Edge Runtime, which does not support Node.js TCP connections required by `ioredis`. Use an HTTP-based Redis client like `@upstash/redis` instead.

```javascript
// middleware.js (Next.js Middleware)
import { NextResponse } from "next/server";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only cache GET requests for specific paths
  if (request.method !== "GET" || !pathname.startsWith("/products")) {
    return NextResponse.next();
  }

  const cacheKey = `ssr:html:${pathname}`;

  // Check cache
  const cached = await getFromRedis(cacheKey);
  if (cached) {
    return new NextResponse(cached, {
      headers: {
        "Content-Type": "text/html",
        "X-Cache": "HIT",
      },
    });
  }

  // Let the request through and cache the response
  const response = await NextResponse.next();
  // Note: caching the response body requires capturing it
  return response;
}
```

## Express + React SSR with Full Page Caching

```javascript
const express = require("express");
const React = require("react");
const { renderToString } = require("react-dom/server");
const Redis = require("ioredis");
const App = require("./App");

const app = express();
const redis = new Redis();

async function renderWithCache(req, res) {
  const cacheKey = `ssr:${req.url}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.send(cached);
  }

  // Fetch data
  const data = await fetchDataForRoute(req.url);

  // Render React component
  const html = renderToString(React.createElement(App, { data }));
  const fullHtml = `<!DOCTYPE html>
<html>
  <body>
    <div id="root">${html}</div>
    <script>window.__INITIAL_DATA__ = ${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
  </body>
</html>`;

  await redis.set(cacheKey, fullHtml, "EX", 300);
  res.setHeader("X-Cache", "MISS");
  res.send(fullHtml);
}

app.get("/products/*", renderWithCache);
```

## Cache Invalidation Strategy

```javascript
async function invalidateProductCache(productId) {
  const pattern = `ssr:product:${productId}*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  // Also invalidate listing pages
  await redis.del("ssr:/products");
}
```

## Summary

Redis SSR caching for React shifts the cost of rendering from per-request to per-cache-miss, dramatically reducing server CPU usage for pages with many repeat visitors. Cache at the data layer (getServerSideProps) for fine-grained control, or at the HTML layer for maximum throughput. Always implement cache invalidation hooks tied to your data update events to prevent stale content.
