# Validation Summary: How to Instrument Vercel Serverless Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- Vercel Functions
- Vercel OpenTelemetry package (`@vercel/otel`)
- Next.js instrumentation
- Next.js API routes / Route Handlers
- OTLP trace export
- W3C Trace Context propagation

## Sources Consulted
- Next.js instrumentation guide: https://nextjs.org/docs/15/app/guides/instrumentation
- Next.js 13 instrumentation guide: https://nextjs.org/docs/13/pages/building-your-application/optimizing/instrumentation
- Next.js 14 `instrumentationHook` config reference: https://nextjs.org/docs/14/app/api-reference/next-config-js/instrumentationHook
- Next.js 15 release notes: https://nextjs.org/blog/next-15
- Vercel OpenTelemetry instrumentation docs: https://vercel.com/docs/tracing/instrumentation
- Vercel Functions docs: https://vercel.com/docs/functions
- Vercel `@vercel/functions` API reference (`waitUntil` lifecycle notes): https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK Node API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript `NodeTracerProvider` API docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.NodeTracerProvider.html

## Issues Found
- The post described metrics collection, but the examples only configured tracing and OTLP trace export. Removed metrics-specific wording so the claims match the implementation.
- The package install command omitted `@opentelemetry/api`, which is used in the manual span examples. Added it. Added `@opentelemetry/sdk-trace-node` because the standalone function example now uses `NodeTracerProvider`.
- The Next.js setup implied `experimental.instrumentationHook` is always required. Updated the text to clarify that it is required for Next.js 13.4 and 14, while instrumentation is stable in Next.js 15 and later.
- The custom SDK examples used `new Resource(...)`, which is outdated for current OpenTelemetry JS packages. Replaced it with `resourceFromAttributes(...)`.
- The custom SDK examples used the deprecated singular `spanProcessor` option. Replaced it with `spanProcessors: [...]`.
- The manual span examples used numeric status code `2`. Replaced it with `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The standalone function example called `sdk.shutdown()` after every request and only initialized at module load, which would break or degrade warm invocations. Reworked the snippet to keep a warm `NodeTracerProvider` and call `forceFlush()` before returning.
- The trace propagation section claimed the SDK automatically injects headers into all standard `fetch` and `axios` calls. Updated it to distinguish `@vercel/otel` fetch propagation configuration from custom SDK setups that need relevant instrumentation packages.
- The custom SDK section did not make clear that the example is for Node.js runtime functions. Added that runtime caveat to avoid applying Node-only SDK setup to Edge runtime code.

## Review Notes
The post is now technically valid as a tracing-focused guide. For future improvement, the article could add a separate metrics example using an OpenTelemetry `MetricReader`, but that would be new scope rather than a correctness fix.
