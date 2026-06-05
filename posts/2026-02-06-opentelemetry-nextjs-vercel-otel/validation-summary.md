# Validation Summary: How to Configure OpenTelemetry in Next.js Using @vercel/otel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript API
- Next.js
- Vercel
- `@vercel/otel`
- Vercel Speed Insights
- OTLP exporter environment variables

## Sources Consulted
- Vercel `@vercel/otel` instrumentation docs: https://vercel.com/docs/tracing/instrumentation
- Vercel OpenTelemetry collector quickstart: https://vercel.com/docs/observability/otel-overview
- `@vercel/otel` npm package README and published TypeScript types for version 2.1.2: https://www.npmjs.com/package/@vercel/otel
- Next.js `instrumentation.js|ts` file convention: https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation
- Next.js Middleware file convention and runtime notes: https://nextjs.org/docs/pages/api-reference/file-conventions/middleware
- Next.js Edge Runtime API reference: https://nextjs.org/docs/app/api-reference/edge
- Vercel Edge Runtime documentation: https://vercel.com/docs/functions/runtimes/edge-runtime
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- Vercel Speed Insights docs: https://vercel.com/docs/speed-insights

## Issues Found
- The post described `@vercel/otel` as configuring broad Node.js auto-instrumentations such as HTTP, DNS, and filesystem. Updated this to match the current package behavior: it defaults to fetch instrumentation and relies on Next.js/Vercel tracing support for framework spans.
- The configuration examples used an invalid boolean object for `instrumentations` (`fetch: false`, `fs: false`, `dns: false`). Replaced these with the current `instrumentations: ['fetch']` and `instrumentationConfig.fetch` options.
- The setup instructions implied `experimental.instrumentationHook` is always required. Updated the text to note that it applies to Next.js 13 and 14 and is not required in Next.js 15+.
- The Vercel deployment section incorrectly required `VERCEL_OTEL_ENABLED=1`. Replaced this with the current Vercel flow: configure a tracing integration, or set standard OpenTelemetry exporter environment variables for a custom backend.
- Several OTLP examples used `OTEL_EXPORTER_OTLP_ENDPOINT` with a `/v1/traces` path. Updated the examples to use a base endpoint for `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` when specifying the full trace endpoint.
- The Server Actions section claimed database calls are automatically instrumented. Changed the example to wrap the database operation in a manual span unless the database client has its own instrumentation.
- The Middleware section created custom spans without noting Edge runtime limitations. Updated it to explain that custom spans from Edge runtime functions are not supported and added the Node.js middleware runtime configuration for Next.js 15.5+.
- Custom span examples used numeric span status codes and did not always close spans on error paths. Updated examples to import `SpanStatusCode`, record exceptions, set error statuses, and close spans on failures.
- The manual setup comparison overstated limitations of `@vercel/otel`, such as custom sampler support. Revised the comparison to focus on full SDK lifecycle control and access to unsupported or bleeding-edge SDK features.

## Review Notes
The post is now technically accurate for the current `@vercel/otel` 2.1.2 API and current Vercel/Next.js documentation. Some examples still use placeholder `db` clients and example backend URLs, which is appropriate for a guide but would need application-specific imports and credentials in a real project.
