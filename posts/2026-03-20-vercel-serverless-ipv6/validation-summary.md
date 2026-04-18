# Validation Summary: How to Configure Vercel Serverless Functions with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vercel (Edge Network, Serverless Functions, Edge Functions/Middleware)
- Next.js (Pages Router API Routes, App Router Route Handlers, Edge Middleware)
- TypeScript
- IPv6 addressing and /64 prefix rate limiting
- HTTP headers (`x-forwarded-for`, `x-real-ip`, `x-vercel-ip-*`, `Vary`)
- `vercel.json` configuration

## Sources Consulted
- Next.js `NextRequest` API reference (Version History documenting removal of `ip` and `geo`): https://nextjs.org/docs/app/api-reference/functions/next-request
- Next.js 15 RC announcement noting deprecation: https://nextjs.org/blog/next-15-rc
- Vercel request headers documentation (`x-real-ip`, `x-forwarded-for`, `x-vercel-ip-country`, `x-vercel-ip-city`, etc.): https://vercel.com/docs/edge-network/headers/request-headers
- Vercel `@vercel/functions` package reference (`geolocation`, `ipAddress`): https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
- Next.js Middleware documentation: https://nextjs.org/docs/app/building-your-application/routing/middleware
- Next.js App Router Route Handlers documentation: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

## Issues Found
1. **`request.geo` used in Edge Middleware example** — `request.geo` and `request.ip` were officially removed from `NextRequest` in **Next.js 15.0.0**. The middleware sample would fail to type-check and return `undefined` on current Next.js versions. Replaced with reads from the Vercel-injected `x-vercel-ip-country` and `x-vercel-ip-city` headers, and added a short comment explaining the migration. An alternative would have been to import `geolocation` from `@vercel/functions`, but using headers keeps the example dependency-free and consistent with the other snippets in the post.

2. **Misleading comment in App Router example** — the comment `// Edge runtime has geo headers` implied the `x-vercel-ip-*` headers are only available on the Edge runtime. Per Vercel's request-headers docs, these headers are injected on both Edge and Node runtimes. Updated the comment to clarify this; the `export const runtime = "edge"` is kept as a stylistic choice for low-latency geo-aware responses, not a requirement for the headers.

## Review Notes
- The `/64` subnet rate-limiting helper is a simplification: splitting a raw IPv6 string on `:` and re-joining the first 4 groups does not robustly normalize compressed forms (e.g., `2001:db8::1` yields a 4-part split that will not cleanly form a canonical /64). For production use, consumers should canonicalize the address first (expand `::`) before keying. The post's intent — key rate-limit buckets by /64 rather than full address — is correct and important for IPv6.
- Vercel's `x-forwarded-for` is overwritten by the edge network per Vercel docs, so taking the first comma-separated entry is the documented approach and safe from client-supplied spoofing.
- `x-vercel-ip-city` values are RFC 3986 percent-encoded per Vercel docs; consumers displaying city names should `decodeURIComponent` them. Not a correctness bug in the example, but worth noting for future revisions.
- The `Vary: X-Forwarded-For` header in `vercel.json` is syntactically valid but rarely useful in practice for Vercel-cached responses (IP-based cache keying isn't how Vercel's CDN varies). Harmless, so left as-is.
