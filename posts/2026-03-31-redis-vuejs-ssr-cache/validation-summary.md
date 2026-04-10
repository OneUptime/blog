# Validation Summary: How to Use Redis for Vue.js SSR Cache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (node-redis v4, ioredis)
- Vue.js 3 (createSSRApp, vue/server-renderer)
- Vue.js 2 (vue-server-renderer, serverCacheKey)
- Nuxt 3 (Nitro server routes, defineEventHandler)
- Express.js
- Node.js

## Sources Consulted
- Vue 3 Server-Side Rendering API: https://vuejs.org/guide/scaling-up/ssr.html
- Vue 3 `@vue/server-renderer` API: https://vuejs.org/api/ssr.html
- Vue 2 SSR Guide and `vue-server-renderer` API: https://v2.ssr.vuejs.org/api/
- Nuxt 3 Server Routes documentation: https://nuxt.com/docs/guide/directory-structure/server
- node-redis v4 documentation: https://github.com/redis/node-redis
- ioredis documentation: https://github.com/redis/ioredis
- Redis command reference (SET, GET, DEL, KEYS): https://redis.io/commands

## Issues Found

### 1. Vue 2 component-level caching section not labeled as Vue 2 only
**What was wrong:** The "Component-Level Caching with vue-server-renderer" section used `vue-server-renderer` (a Vue 2 package) and the `serverCacheKey` component option (a Vue 2 feature), while the rest of the post uses Vue 3 APIs (`createSSRApp`, `vue/server-renderer`). There was no indication that this section only applies to Vue 2. In Vue 3, `@vue/server-renderer` does not export `createRenderer` and does not support built-in component-level caching or `serverCacheKey`.

**What was changed:** Added "(Vue 2 Only)" to the section title and added a clarifying note that `vue-server-renderer` is Vue 2 specific and that this feature is not available in Vue 3's `@vue/server-renderer`.

### 2. Incorrect cache.get implementation for vue-server-renderer
**What was wrong:** The `cache.get` method returned `redis.get(key)`, which returns a Promise (when using ioredis). Vue 2's `vue-server-renderer` cache interface expects either a synchronous return value or a callback-based pattern (`get(key, cb)` where `cb(val)` is called with the cached value). Returning a Promise would result in the cache never producing a hit, since the Promise object itself would be treated as a truthy non-string value.

**What was changed:** Updated the `get` method to use the callback pattern: `get(key, cb) { redis.get(key).then((val) => cb(val)); }`.

## Review Notes
- The inline script tag in the Express section (`<script>window.__PRODUCT__ = ${JSON.stringify(product)}</script>`) is susceptible to XSS if product data contains a `</script>` string. In production, a serialization library like `serialize-javascript` should be used. This is a common tutorial pattern and not changed, but worth noting.
- The `redis.keys("ssr:vue:products:*")` call in the cache invalidation section blocks Redis while scanning all keys. In production, `SCAN` with a cursor-based approach is strongly preferred. Acceptable for a tutorial but worth noting for production use.
- Vue 3 does not have a built-in replacement for Vue 2's component-level SSR caching. Projects migrating to Vue 3 that need this feature will need to implement custom caching logic at the application level.
