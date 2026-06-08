# Validation Summary: How to Use Next.js Middleware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js (App Router / Pages Router middleware)
- Next.js Edge Runtime
- TypeScript
- `next/server` (`NextRequest`, `NextResponse`)
- `jose` library (JWT verification)
- Web Crypto API (`crypto.randomUUID`)
- HTTP security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- CORS preflight handling
- Path-to-regexp matcher syntax used by Next.js

## Sources Consulted
- Next.js middleware reference: https://nextjs.org/docs/app/api-reference/file-conventions/middleware
- Next.js 15 upgrade guide (deprecation of `NextRequest.geo` and `NextRequest.ip`): https://nextjs.org/docs/app/guides/upgrading/version-15
- Next.js Edge Runtime API reference: https://nextjs.org/docs/app/api-reference/edge
- `jose` library docs (`jwtVerify` v5/v6 signature): https://github.com/panva/jose
- Vercel request headers documentation for `x-vercel-ip-*`
- MDN `URL` interface (for `nextUrl` properties such as `pathname`, `host`, `protocol`, `search`)

## Issues Found
- **`request.geo` and `request.ip` deprecated/removed in Next.js 15**: The post used `request.geo?.country`, `request.geo?.city`, and `request.ip` in several places. These properties were deprecated in Next.js 14 and removed in Next.js 15.0 (October 2024). Since the post is dated February 2026, this is out of date.

  Fixed in four code blocks:
  - "Modifying Request Headers" example — replaced `request.geo?.country` with `request.headers.get('x-vercel-ip-country')`, `request.geo?.city` with `request.headers.get('x-vercel-ip-city')`, and `request.ip` with parsing the first entry of the `x-forwarded-for` header (falling back to `x-real-ip`).
  - "Rate Limiting" example — removed `request.ip` fallback and trimmed the parsed `x-forwarded-for` entry.
  - "Logging and Monitoring" example — replaced `request.geo?.country` and `request.ip` with header-based equivalents.
  - "Complete Production Middleware Example" — replaced `request.geo?.country` with `request.headers.get('x-vercel-ip-country')`.

  The Vercel-specific headers (`x-vercel-ip-country`, `x-vercel-ip-city`, `x-forwarded-for`, `x-real-ip`) are the documented replacements when self-deriving geo/IP info on Vercel; on other hosting providers the trust-boundary headers will differ but the API shape is the same.

## Review Notes
- All other code is correct against current Next.js 15.x APIs: matcher patterns (both path-to-regexp `:path*` and negative-lookahead regex), `NextResponse.next({ request: { headers } })` for upstream header mutation, `NextResponse.redirect()` / `NextResponse.rewrite()` signatures, `jwtVerify` from `jose`, and `crypto.randomUUID()` in the Edge Runtime.
- The claim that middleware "executes before cached content and route matching" is consistent with Next.js documentation.
- `X-XSS-Protection` is deprecated by modern browsers, but the post correctly frames it as a header for older browsers, so it remains technically accurate (not removed).
- The CSP example includes `'unsafe-inline'` and `'unsafe-eval'`, which is necessary for many Next.js setups but is a wide policy — the post already implies this is a starting point. No change made.
- The in-memory rate-limit store will not work across serverless invocations; the post explicitly notes "use Redis in production," so this is acknowledged.
- **Future caveat (not changed)**: Next.js 16 (released around early 2026) introduces a rename of `middleware.ts` → `proxy.ts` (with a codemod `npx @next/codemod@canary middleware-to-proxy .`). The post is written for Next.js 15.x conventions, which remains valid; readers using Next.js 16+ will eventually need to migrate, but `middleware.ts` is still supported.
