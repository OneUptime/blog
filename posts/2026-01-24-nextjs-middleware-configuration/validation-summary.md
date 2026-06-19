# Validation Summary: How to Configure Middleware in Next.js 13+

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js Middleware / Proxy
- TypeScript
- NextRequest and NextResponse
- Edge Runtime and Node.js Runtime
- JWT authentication with jose
- HTTP redirects and rewrites
- HTTP headers and CORS
- Internationalization routing
- Rate limiting
- Vercel geolocation helpers

## Sources Consulted
- Next.js 15 middleware file convention: https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware
- Next.js current Proxy guide: https://nextjs.org/docs/app/getting-started/proxy
- Next.js current Proxy file convention: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js NextResponse API reference: https://nextjs.org/docs/app/api-reference/functions/next-response
- Next.js 15 upgrade guide for NextRequest geolocation changes: https://nextjs.org/docs/app/guides/upgrading/version-15
- Vercel @vercel/functions geolocation API reference: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#geolocation

## Issues Found
- The introduction stated that Middleware runs at the edge without a version caveat. Updated it to say Middleware defaults to the Edge Runtime in Next.js 13-15, and noted that Next.js 16 renamed Middleware to Proxy with the same core functionality.
- The basic matcher comment said API routes were excluded, but the pattern did not exclude `api`. Added `api` to the negative lookahead so the code matches the explanation.
- The API versioning rewrite used `pathname.includes('/v')`, which could skip non-versioned routes such as `/api/votes`. Replaced it with a version-prefix regex that only skips paths like `/api/v1` or `/api/v2/users`.
- The geolocation example used `request.geo`, which was removed from `NextRequest` in Next.js 15. Updated the example to use Vercel's `geolocation(request)` helper from `@vercel/functions`.
- The best-practices item said middleware always runs on the Edge Runtime. Updated it to apply specifically when using the Edge Runtime.

## Review Notes
- The `middleware.ts` examples are accurate for Next.js 13-15. For Next.js 16 projects, the same pattern is documented as `proxy.ts` with an exported `proxy` function.
- The in-memory rate limiter is acceptable as a teaching example because the post explicitly recommends Redis in production.
