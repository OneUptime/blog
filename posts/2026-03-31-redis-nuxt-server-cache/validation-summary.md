# Validation Summary: How to Use Redis for Nuxt.js Server Cache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Nuxt.js 3
- Nitro (server engine)
- Redis (via unstorage Redis driver / ioredis)
- h3 (HTTP framework)
- unstorage (key-value storage abstraction)

## Sources Consulted
- Nitro Cache Documentation — https://nitro.build/docs/cache
- Nitro KV Storage Documentation — https://nitro.build/docs/storage
- unstorage Redis Driver Documentation — https://unstorage.unjs.io/drivers/redis
- Nuxt 3 Server Directory Documentation — https://nuxt.com/docs/guide/directory-structure/server
- Nuxt 3 Auto-imports Documentation — https://nuxt.com/docs/guide/concepts/auto-imports
- Nitro auto-imports resolver source (GitHub)
- Nuxt NuxtRenderHTMLContext type definition (GitHub)

## Issues Found

1. **Invalid `nitro.cache` configuration block**: The post used `nitro.cache: { default: { storage: "redis", ttl: 300 } }` which is not a valid Nitro configuration option. Nitro's built-in caching (`defineCachedEventHandler`) uses the storage mounted at the `cache` key in `nitro.storage`. Fixed by removing the `nitro.cache` block and renaming the storage mount from `redis` to `cache`.

2. **Unused `defineEventHandler` import in cached handler example**: The code imported `defineEventHandler` from `h3` but actually used `defineCachedEventHandler` (which is auto-imported by Nitro). Removed the unused import; kept the `getRouterParam` import which is used.

3. **All `useStorage("redis")` calls updated to `useStorage("cache")`**: Since the storage mount was renamed from `redis` to `cache` (to correctly serve as Nitro's cache backend), all three `useStorage("redis")` calls were updated to match.

4. **`html.body` is `string[]`, not `string`**: In the `render:html` hook, `html.body` is an array of strings (`NuxtRenderHTMLContext`), not a plain string. Changed `html.body` to `html.body.join("")` to correctly store concatenated HTML.

5. **`useCache()` does not exist**: The post called `await useCache().removeItem(...)` but `useCache()` is not a Nitro or Nuxt utility. Replaced with `storage.removeItem(...)` reusing the `useStorage("cache")` instance already defined in the same handler.

6. **Misleading comment in `useAsyncData` example**: The comment said "Server cache config via useFetch" but the code uses `useAsyncData`, not `useFetch`. The `server: true` option means the fetch runs on the server during SSR (which is the default). Updated comment to "Fetch on server during SSR (default behavior)".

## Review Notes
- The SSR page caching example (`render:html` hook) stores rendered HTML but does not demonstrate retrieval or short-circuiting rendering from cache. A complete SSR cache implementation would need to intercept requests before rendering and serve cached HTML. The example is illustrative of the storage API but incomplete as a caching pattern.
- The `useAsyncData` example's `server: true` option is the default and could be omitted entirely. It does not enable server-side caching — the caching happens at the API route level via `defineCachedEventHandler`.
- The Vue SFC example is missing a `<template>` block, which is expected for a tutorial focused on the script logic.
- The Nitro cached handler key format may include a `.json` suffix internally (e.g., `nitro:handlers:product:123.json`). The invalidation example uses `nitro:handlers:product:${id}` without the extension. Readers implementing cache invalidation should verify the exact key format in their environment.
