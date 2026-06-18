# Validation Summary: How to Monitor Vercel Edge Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript
- Vercel Edge Runtime and Vercel Functions
- Next.js middleware and Edge route handlers
- OTLP over HTTP
- W3C Trace Context
- TypeScript

## Sources Consulted
- OpenTelemetry JS API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- OpenTelemetry JS `@opentelemetry/resources` docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS `BasicTracerProvider` docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-base.BasicTracerProvider.html
- OpenTelemetry JS propagation docs: https://opentelemetry.io/docs/languages/js/propagation/
- Vercel Edge Runtime docs: https://vercel.com/docs/functions/runtimes/edge
- Vercel System Environment Variables docs: https://vercel.com/docs/environment-variables/system-environment-variables
- Next.js middleware docs: https://nextjs.org/docs/pages/api-reference/file-conventions/middleware
- Next.js Proxy docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The OpenTelemetry setup used `new Resource(...)`, `provider.addSpanProcessor(...)`, and `provider.register()`. These APIs do not match current OpenTelemetry JS 2.x usage. Updated the snippet to use `resourceFromAttributes`, pass `spanProcessors` to `BasicTracerProvider`, and register the provider with `trace.setGlobalTracerProvider(provider)`.
- The post described the Edge Runtime as a subset of standard Node.js. Vercel documents it as a minimal JavaScript runtime built on Web APIs with only some Node.js-compatible APIs available, so the wording was corrected.
- The introduction said the guide covered standalone Edge Functions. Vercel documents the standalone Edge Functions product as deprecated, and the post did not include a standalone example, so that wording was removed.
- The post stated Edge Runtime functions are typically limited to 30 seconds. Vercel's current Edge Runtime docs say functions must begin sending a response within 25 seconds and can stream for up to 300 seconds. Updated the constraint.
- The post stated `SimpleSpanProcessor` guarantees delivery. That was too strong; exports can still fail and `forceFlush()` is still needed. Reworded this to say it starts exporting spans when they end and reduces the chance of spans remaining batched at the end of an invocation.
- The child span examples accepted a `parentSpan` argument but did not use it, so the spans would be independent roots. Updated the examples to pass an explicit parent context with `trace.setSpan(context.active(), parentSpan)`.
- The manual `traceparent` builder always emitted `01` for trace flags. Updated it to preserve the span's sampled flag with `TraceFlags.SAMPLED`.
- The middleware section said Next.js middleware runs on the Edge Runtime by default without version qualification. Updated it to note that this applies to Next.js 15 and earlier, while Next.js 16 renamed the convention to `proxy.ts` and Proxy defaults to Node.js.
- The environment variable section said the Vercel variables were automatically set with no need to configure. Updated it to state that Vercel System Environment Variables must be exposed.
- The performance section gave an unsupported fixed overhead estimate of 5 to 15 milliseconds per span. Replaced it with a qualitative latency warning tied to network distance and collector latency.

## Review Notes
The tutorial remains a manual-instrumentation example. Future improvements could show incoming context extraction and use OpenTelemetry semantic HTTP attribute names consistently, but those are enhancements rather than correctness blockers for the current guide.
