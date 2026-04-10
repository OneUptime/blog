# How to Use Redis for Vue.js SSR Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vue.js, Server-Side Rendering

Description: Learn how to use Redis to cache Vue.js SSR rendered output and server-fetched data, reducing rendering CPU load and improving time-to-first-byte.

---

Vue.js SSR with Nuxt or a custom server renders components on every request. Redis caching at the component level or route level eliminates redundant rendering for frequently accessed pages.

## Nuxt 3: Cache useFetch Results with Redis

```javascript
// server/utils/redis.ts
import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

await client.connect();
export default client;
```

```javascript
// server/api/products/[id].ts
import redisClient from "~/server/utils/redis";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const cacheKey = `api:product:${id}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const product = await fetchProductFromDB(id);
  await redisClient.set(cacheKey, JSON.stringify(product), { EX: 300 });
  return product;
});
```

## Vue.js + Express: Route-Level HTML Caching

```javascript
const express = require("express");
const { createSSRApp } = require("vue");
const { renderToString } = require("vue/server-renderer");
const Redis = require("ioredis");

const app = express();
const redis = new Redis();

async function renderVuePage(componentDef, props) {
  const vueApp = createSSRApp(componentDef, props);
  return await renderToString(vueApp);
}

app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `ssr:vue:product:${id}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.send(cached);
  }

  try {
    const product = await fetchProduct(id);
    const html = await renderVuePage(ProductComponent, { product });

    const fullHtml = `<!DOCTYPE html>
<html>
  <body>
    <div id="app">${html}</div>
    <script>window.__PRODUCT__ = ${JSON.stringify(product)}</script>
  </body>
</html>`;

    await redis.set(cacheKey, fullHtml, "EX", 300);
    res.setHeader("X-Cache", "MISS");
    res.send(fullHtml);
  } catch (err) {
    res.status(500).send("Rendering error");
  }
});
```

## Component-Level Caching with vue-server-renderer (Vue 2 Only)

The `vue-server-renderer` package provides built-in component-level caching for Vue 2. Note that this feature is not available in Vue 3's `@vue/server-renderer`.

For fine-grained control in Vue 2, cache individual components:

```javascript
const { createRenderer } = require("vue-server-renderer");

const renderer = createRenderer({
  cache: {
    get(key, cb) {
      redis.get(key).then((val) => cb(val));
    },
    set(key, val) {
      redis.set(key, val, "EX", 600);
    },
  },
});

// In your component, set the serverCacheKey
const ProductCard = {
  name: "ProductCard",
  props: ["product"],
  serverCacheKey: (props) => props.product.id,
  template: `<div class="product">{{ product.title }}</div>`,
};
```

## Cache Invalidation on Product Update

```javascript
async function onProductUpdated(productId) {
  // Invalidate SSR cache
  await redis.del(`ssr:vue:product:${productId}`);
  // Invalidate API cache
  await redis.del(`api:product:${productId}`);
  // Invalidate listing pages that may include this product
  const listingKeys = await redis.keys("ssr:vue:products:*");
  if (listingKeys.length > 0) {
    await redis.del(...listingKeys);
  }
}
```

## Summary

Redis caches Vue.js SSR output at either the route level for full-page HTML or the component level for reusable components. Use Nuxt 3 server API routes as a natural caching layer for data fetching, implement route-level HTML caching in Express for maximum throughput, and always tie cache invalidation to your data mutation events to keep content accurate.
