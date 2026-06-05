# Validation Summary: How to Trace tRPC API Procedures End-to-End with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- tRPC
- TypeScript
- Next.js
- Monorepo architecture
- WebSockets and subscriptions

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry Resource specification: https://opentelemetry.io/docs/specs/otel/resource/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- tRPC middleware documentation: https://trpc.io/docs/server/middlewares
- tRPC HTTP batch link documentation: https://trpc.io/docs/client/links/httpBatchLink
- tRPC subscriptions documentation: https://trpc.io/docs/server/subscriptions
- tRPC WebSocket link documentation: https://trpc.io/docs/client/links/wsLink
- Next.js instrumentation-client file convention: https://en.nextjs.im/docs/app/api-reference/file-conventions/instrumentation-client

## Issues Found
- The Node tracing setup used `new Resource(...)`, but current OpenTelemetry JavaScript documentation uses `resourceFromAttributes(...)`. Updated the import and resource initialization.
- The shared tracing package was described as usable by both client and server, but the shown `NodeSDK` setup is Node-specific. Changed the wording to server and other Node.js packages.
- The OTLP trace exporter read `OTEL_EXPORTER_OTLP_ENDPOINT` as a full traces URL. Updated the example to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` for the explicit `/v1/traces` URL.
- The tRPC middleware example imported `middleware` from `./trpc` while `trpc.ts` imported the tracing middleware, creating a module cycle. Moved the middleware definition into the `trpc.ts` snippet using `t.middleware`.
- The tRPC middleware used the stale `rawInput` middleware option. Updated it to use `getRawInput()` as shown in current tRPC middleware typings.
- The procedure example threw `TRPCError` without importing it. Added the missing import.
- The client example created spans without showing browser tracer provider initialization. Added a Next.js `instrumentation-client.ts` example using `WebTracerProvider`, `BatchSpanProcessor`, and an OTLP trace exporter.
- The client tRPC example used `createTRPCClient` and `AppRouter` without imports. Added both imports.
- The custom fetch wrapper did not handle `Request` input URLs or `Headers` instances correctly. Updated it to read `Request.url` and inject propagation headers into a `Headers` object with a custom setter.
- The server middleware recorded non-tRPC exceptions but did not mark those spans as errors. Updated the catch block to set an error status for every thrown error.
- The subscription example used `z`, `trace`, `router`, and `tracedProcedure` without imports. Added the missing imports.

## Review Notes
- Browser OpenTelemetry JavaScript remains experimental according to the official OpenTelemetry JavaScript documentation.
- Sending browser spans directly to an OTLP HTTP collector requires appropriate CORS configuration and care not to expose private collector endpoints.
