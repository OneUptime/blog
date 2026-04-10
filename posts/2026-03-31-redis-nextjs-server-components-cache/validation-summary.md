# Validation Summary: How to Cache Next.js Server Components with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Next.js App Router (Server Components, Route Handlers)
- Redis (via node-redis v4+ npm package)
- TypeScript

## Sources Consulted
- Next.js 15 release blog post — https://nextjs.org/blog/next-15
- Next.js page file conventions (searchParams) — https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js async dynamic APIs documentation — https://nextjs.org/docs/messages/sync-dynamic-apis
- node-redis GitHub repository and source (createClient, setEx, sMembers, sAdd, del) — https://github.com/redis/node-redis

## Issues Found

1. **`searchParams` used synchronously (outdated for Next.js 15+)**
   - **What was wrong:** The server component typed `searchParams` as `{ category?: string }` and accessed it synchronously. In Next.js 15, `searchParams` became a `Promise` and must be awaited.
   - **What was changed:** Updated the type to `Promise<{ category?: string }>` and added `await` before accessing the property.
   - **Why:** Next.js 15 made `searchParams`, `params`, `cookies()`, `headers()`, and `draftMode()` asynchronous. Synchronous access is deprecated and will be removed in a future version.

2. **Inaccurate claim about default fetch caching**
   - **What was wrong:** The opening paragraph stated "By default Next.js caches `fetch` responses." Starting with Next.js 15, fetch requests default to `no-store` (uncached) instead of `force-cache`.
   - **What was changed:** Reworded to "While Next.js provides built-in caching for `fetch` requests" — accurate for both Next.js 14 and 15 without implying a specific default.
   - **Why:** Next.js 15 changed the default caching semantics. The original wording was only true for Next.js 13-14.

## Review Notes
- The node-redis v4 API usage (`createClient`, `connect`, `setEx`, `get`, `sMembers`, `sAdd`, `del`) is all correct and current.
- The tag-based invalidation pattern works correctly but has a minor design consideration: the tag set (`sAdd`) has no TTL, so expired cache keys may linger as stale references in the set. This is harmless (deleting a non-existent key is a no-op in Redis) but could cause the set to grow over time. Not fixed as this is a design trade-off, not an error.
- The singleton Redis client pattern using a module-level variable is a common and valid approach for serverless/edge environments in Next.js.
- The `Response.json()` usage in the route handler is correct for modern Next.js.
