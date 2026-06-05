# Validation Summary: How to Troubleshoot Missing Spans in Next.js When Edge Runtime Does Not Support

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Next.js
- Next.js Edge Runtime
- Next.js Middleware
- Next.js instrumentation file
- OpenTelemetry JavaScript SDK
- W3C Trace Context
- Vercel tracing and `@vercel/otel`

## Sources Consulted
- Next.js Edge Runtime API reference: https://nextjs.org/docs/pages/api-reference/edge
- Next.js Route Segment Config: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
- Next.js Middleware documentation: https://nextjs.org/docs/pages/building-your-application/routing/middleware
- Next.js instrumentation file convention: https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation
- Next.js OpenTelemetry documentation: https://nextjs.org/docs/14/app/building-your-application/optimizing/open-telemetry
- Vercel Tracing documentation: https://vercel.com/docs/tracing
- Vercel OpenTelemetry instrumentation documentation: https://vercel.com/docs/tracing/instrumentation
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The post said Edge Runtime lacks the module system and `process` for environment variables. Updated this to say Edge lacks native Node.js APIs and CommonJS `require()`, while Next.js still supports `process.env` for environment variables in Edge code.
- The post said middleware always runs on Edge. Updated this to say middleware defaults to Edge in stable Next.js, with experimental Node.js middleware support in canary releases that is not recommended for production.
- The first middleware example used `NextRequest` without importing it. Added the type import.
- The manual trace propagation example set `traceparent` on the response headers, which would not propagate context to downstream route handlers. Updated it to set the header on the forwarded request via `NextResponse.next({ request: { headers } })`.
- The generated trace and span IDs could theoretically be all zero, which W3C Trace Context forbids. Updated the ID generator to retry if it produces an all-zero value.
- The instrumentation config implied `experimental.instrumentationHook` is always required. Added that it applies to Next.js 13 and 14, while instrumentation is stable in Next.js 15 and later.
- The Vercel tracing section implied a Next.js config flag enabled Vercel's infrastructure tracing for both runtimes. Replaced it with the documented `@vercel/otel` setup and clarified that Vercel infrastructure spans can cover routing and middleware, but custom spans from Edge runtime functions are not supported.

## Review Notes
The post is now accurate for current stable Next.js behavior as of 2026-06-05. The title remains awkwardly phrased, but that is editorial rather than technical.
