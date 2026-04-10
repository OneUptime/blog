# How to Use Redis for Nuxt.js Server Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Nuxt.js, Caching

Description: Learn how to implement Redis server caching in Nuxt.js 3 using nitro cache, server API routes, and full-page caching for improved performance.

---

Nuxt.js 3 with Nitro has built-in cache support and Redis drivers. You can cache server API responses, page data, and SSR output without building a custom caching layer.

## Install Redis Driver for Nuxt/Nitro

```bash
npm install ioredis
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      cache: {
        driver: "redis",
        host: process.env.REDIS_HOST || "localhost",
        port: 6379,
        db: 0,
      },
    },
  },
});
```

## Cache a Server API Route

```typescript
// server/api/products/[id].ts
import { getRouterParam } from "h3";

export default defineCachedEventHandler(
  async (event) => {
    const id = getRouterParam(event, "id");
    const product = await fetchProductFromDB(id);
    return product;
  },
  {
    maxAge: 300, // 5 minutes
    name: "product",
    getKey: (event) => getRouterParam(event, "id"),
  }
);
```

## Manual Redis Caching in Server Routes

For more control, use the storage API directly:

```typescript
// server/api/categories.ts
import { defineEventHandler } from "h3";
import { useStorage } from "#imports";

export default defineEventHandler(async () => {
  const storage = useStorage("cache");
  const cacheKey = "api:categories:all";

  const cached = await storage.getItem(cacheKey);
  if (cached) {
    return cached;
  }

  const categories = await fetchCategories();
  await storage.setItem(cacheKey, categories, { ttl: 600 });
  return categories;
});
```

## Cache SSR Page Data

```typescript
// server/plugins/cache.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", async (html, { event }) => {
    const url = event.node.req.url;
    const storage = useStorage("cache");
    const key = `ssr:${url}`;

    // Cache rendered pages for public routes
    if (!url.startsWith("/dashboard") && !url.startsWith("/account")) {
      await storage.setItem(key, html.body.join(""), { ttl: 300 });
    }
  });
});
```

## useAsyncData with Server-Side Cache

```typescript
// pages/products/[id].vue
<script setup lang="ts">
const route = useRoute();
const { id } = route.params;

const { data: product } = await useAsyncData(
  `product-${id}`,
  async () => {
    // This runs server-side on SSR; result is cached
    return $fetch(`/api/products/${id}`);
  },
  {
    // Fetch on server during SSR (default behavior)
    server: true,
  }
);
</script>
```

## Invalidate Cache from Server Action

```typescript
// server/api/products/[id].patch.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  await updateProduct(id, body);

  // Invalidate product cache
  const storage = useStorage("cache");
  await storage.removeItem(`product:${id}`);
  // Also purge nitro's cached handler
  await storage.removeItem(`nitro:handlers:product:${id}`);

  return { success: true };
});
```

## Summary

Nuxt 3 with the Nitro Redis driver provides declarative caching via `defineCachedEventHandler` for zero-boilerplate route caching, plus direct Redis storage access for custom caching logic. Use `maxAge` and `getKey` in the cached handler to control TTLs per route, and call `storage.removeItem` from mutation handlers to keep cached data current after updates.
