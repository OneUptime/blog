# Validation Summary: How to Build Server-Side Analytics with ClickHouse and Next.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (server-side analytics database)
- @clickhouse/client (official Node.js client)
- Next.js (Pages Router API routes and App Router Server Components)
- TypeScript
- React Server Components

## Sources Consulted
- @clickhouse/client official GitHub repository and source code: https://github.com/ClickHouse/clickhouse-js
- @clickhouse/client npm package documentation: https://www.npmjs.com/package/@clickhouse/client
- ClickHouse JavaScript client official docs: https://clickhouse.com/docs/integrations/javascript
- Next.js official documentation (v16.2.3): https://nextjs.org/docs
- Next.js `unstable_cache` API reference: https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- Next.js error.tsx file convention: https://nextjs.org/docs/app/api-reference/file-conventions/error
- Next.js Server Components documentation: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Pages Router API routes: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
- RFC 5861 (HTTP Cache-Control Extensions for Stale Content): https://datatracker.ietf.org/doc/html/rfc5861

## Issues Found
1. **`stale-while-revalidate` missing required value in Cache-Control header**: The API route example used `'s-maxage=60, stale-while-revalidate'` without a delta-seconds value. Per RFC 5861, the `stale-while-revalidate` directive requires a value (e.g., `stale-while-revalidate=300`). Fixed to `'s-maxage=60, stale-while-revalidate=300'`.

2. **Error boundary component missing `reset` prop**: The `error.tsx` example only destructured `{ error: Error }`, omitting the `reset` function that Next.js passes to error boundary components. This function allows users to retry the failed operation, which is a key feature of error boundaries. Fixed to include `reset: () => void` in the props and added a "Try again" button.

## Review Notes
- The `unstable_cache` API from `next/cache` still works but has been superseded by the `'use cache'` directive in Next.js 16. The blog code is functional but readers on Next.js 16+ should be aware that the recommended approach is now `'use cache'` with `cacheLife()` and `cacheTag()`. Since the post doesn't specify a Next.js version and `unstable_cache` still functions, this was not changed.
- Next.js 16 also introduced `unstable_retry` as a newer alternative to `reset` in error boundaries. The `reset` function used in the fix is still supported and more widely understood, so it was kept.
- The `@clickhouse/client` API usage is fully correct: `createClient` with `url` (not the deprecated `host`), `query()` with `query_params` and `format: 'JSONEachRow'`, and `.json<T>()` generic on the result set all match the current API.
- The ClickHouse parameterized query syntax `{days:UInt32}` is correct and properly paired with `query_params`.
