# Validation Summary: How to Trace tRPC Procedures with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript API and Node SDK
- tRPC server context, middleware, client links, and subscriptions
- TypeScript
- Node.js
- React Query integration for tRPC
- W3C Trace Context propagation
- Zod input validation

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- tRPC context documentation: https://trpc.io/docs/server/context
- tRPC middleware documentation: https://trpc.io/docs/server/middlewares
- tRPC HTTP batch link documentation: https://trpc.io/docs/client/links/httpBatchLink
- tRPC subscriptions documentation: https://trpc.io/docs/server/subscriptions

## Issues Found
- The introduction said tRPC eliminates the need for runtime validation. Changed this to say tRPC eliminates code generation while allowing runtime validation where needed, because tRPC input validation is optional and commonly implemented with validators such as Zod.
- The dependency list omitted packages used by the snippets, including `zod`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions`. Added them.
- The OpenTelemetry resource setup used older `Resource` and `SemanticResourceAttributes` imports. Updated it to `resourceFromAttributes` and `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION`, matching current OpenTelemetry JavaScript documentation.
- The context example claimed to extract incoming trace context but only used `context.active()`. Updated it to use `propagation.extract(context.active(), req.headers)`.
- The tRPC middleware imported `middleware` from `./trpc`, creating a runtime circular import with the later `trpc.ts` example. Updated the middleware snippet to create a typed middleware builder locally.
- The middleware used `trace.context.with`, which is not part of the OpenTelemetry JS API. Updated it to import and use the separate `context.with` API.
- The middleware relied on a stale context in procedures. Updated it to create a span context with `trace.setSpan` and pass that context through `next({ ctx })`.
- The middleware treated `next()` as if procedure failures always throw. Updated it to inspect the tRPC middleware result's `ok` field, set span status accordingly, and return the result.
- The tRPC middleware examples used a `rawInput` parameter that is not the current documented middleware shape. Updated them to use `getRawInput()`.
- The procedure examples used numeric span status codes directly. Updated them to use `SpanStatusCode.OK` and `SpanStatusCode.ERROR`.
- Several child spans did not set error status or could leak/double-end on failures. Added status handling and corrected the nested procedure span flow.
- The client propagation example manually built only a `traceparent` header and hard-coded sampled flags. Updated it to use `propagation.inject`, which also handles `tracestate` and configured propagators.
- The metrics middleware was missing the `trace` import and did not count non-OK tRPC middleware results as errors. Added the import and result handling.
- The error tracking middleware was missing imports and relied on thrown errors from `next()`. Added imports and updated it to inspect non-OK tRPC middleware results.

## Review Notes
The snippets are still tutorial examples and assume surrounding application code exists, such as database helper functions, router composition, and frontend OpenTelemetry SDK initialization. The article now aligns with current tRPC 11 middleware patterns and current OpenTelemetry JavaScript API usage for manual spans and propagation.
