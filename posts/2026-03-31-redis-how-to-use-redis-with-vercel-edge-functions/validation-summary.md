# Validation Summary: How to Use Redis with Vercel Edge Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (via Upstash REST API)
- Vercel Edge Functions (V8 isolate runtime)
- Next.js App Router (route handlers and middleware)
- @upstash/redis SDK
- @upstash/ratelimit SDK

## Sources Consulted
- Upstash Redis JS SDK source and docs: https://github.com/upstash/redis-js
- Upstash Ratelimit JS SDK source and docs: https://github.com/upstash/ratelimit-js
- Upstash Ratelimit duration parser source: https://github.com/upstash/ratelimit-js/blob/main/src/duration.ts
- Next.js Route Handlers docs: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js 15 async dynamic APIs migration guide: https://nextjs.org/docs/messages/sync-dynamic-apis
- Next.js Middleware docs: https://nextjs.org/docs/app/api-reference/file-conventions/middleware
- NextResponse API reference: https://nextjs.org/docs/app/api-reference/functions/next-response
- Vercel Middleware API: https://vercel.com/docs/routing-middleware/api

## Issues Found
1. **`params` not awaited in route handler (line 51)**: In Next.js 15+, `params` in route handlers is a Promise and must be awaited. Changed `const { id } = params` to `const { id } = await params`. Without this fix, the code would generate a deprecation warning in Next.js 15 and will break in future versions.

## Review Notes
- **`request.geo` deprecation**: `request.geo?.country` used in the geolocation example still works on Vercel but is being phased out. The preferred replacement is `geolocation()` from the `@vercel/functions` package. This is not yet broken, so left as-is.
- **`request.ip` reliability**: `request.ip` in middleware is a valid `NextRequest` property but can return `undefined` even on Vercel. The post already handles this with a fallback (`?? '127.0.0.1'`). For more reliable IP detection, `ipAddress()` from `@vercel/functions` is recommended.
- **`NextResponse.next({ headers })` pattern**: Passing response headers directly via `NextResponse.next({ headers })` works but is discouraged by Next.js docs for middleware, as it can interfere with framework behavior. For passing data downstream, `NextResponse.next({ request: { headers } })` is preferred. Left as-is since it functions correctly for the demonstrated use case.
- **`redis.setex()` API**: Verified correct. The `@upstash/redis` SDK supports `setex(key, seconds, value)` matching the standard Redis SETEX command signature.
- **`Ratelimit.fixedWindow(100, '1 m')` API**: Verified correct. The duration format `'1 m'` is valid per the SDK's duration parser, and `analytics` and `prefix` are documented options.
