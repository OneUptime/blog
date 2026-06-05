# Validation Summary: How to Instrument Netlify Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry JavaScript
- Netlify Functions
- Netlify Edge Functions
- Netlify Scheduled Functions
- AWS Lambda compatibility
- Node.js
- JavaScript
- OTLP over HTTP

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry `@opentelemetry/sdk-node` API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry `NodeSDK` API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry `@opentelemetry/resources` API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry `SimpleSpanProcessor` API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-base.SimpleSpanProcessor.html
- OpenTelemetry `@opentelemetry/instrumentation-fetch` API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-fetch.html
- Netlify Functions documentation: https://docs.netlify.com/functions/get-started/
- Netlify Lambda compatibility documentation: https://docs.netlify.com/build/functions/lambda-compatibility/
- Netlify Scheduled Functions documentation: https://docs.netlify.com/functions/scheduled-functions/
- Netlify Edge Functions overview: https://docs.netlify.com/edge-functions/overview/
- Netlify Edge Functions API reference: https://docs.netlify.com/edge-functions/api/
- Netlify environment variables documentation: https://docs.netlify.com/build/environment-variables/overview/
- Netlify build environment variables reference: https://docs.netlify.com/build/configure-builds/environment-variables/

## Issues Found
- The post described Netlify Edge Functions as "Deno on Cloudflare Workers." Netlify's documentation describes Edge Functions as Deno-based functions running on Netlify's edge network. Updated the wording to avoid the incorrect Cloudflare Workers claim.
- The dependency list installed `@opentelemetry/instrumentation-fetch`, but the official OpenTelemetry JS reference states that package does not instrument Node.js `fetch` and points to Undici instrumentation for Node.js. Replaced it with `@opentelemetry/instrumentation-undici`.
- The telemetry wrapper imported and instantiated `Resource` from `@opentelemetry/resources`. Current OpenTelemetry JS exports `Resource` as a type/interface and documents `resourceFromAttributes()` for creating resources. Updated the code to use `resourceFromAttributes()`.
- The telemetry wrapper used the deprecated `spanProcessor` `NodeSDK` option. Updated it to the current `spanProcessors` array option.
- The telemetry wrapper installed instrumentation packages but did not pass instrumentations into `NodeSDK`. Added `HttpInstrumentation` and `UndiciInstrumentation` to the SDK configuration.
- The flush helper attempted to call `forceFlush()` on `trace.getTracerProvider()`. The documented public force-flush API is on span processors, and `SimpleSpanProcessor` implements `forceFlush()`. Updated the wrapper to keep a reference to the span processor and flush it directly.
- The examples used `span.setStatus({ code: 2 })`. While this currently maps to the error status enum value, the public API exposes `SpanStatusCode.ERROR`. Updated the examples to import and use `SpanStatusCode.ERROR`.
- The environment variable section did not mention function runtime scope. Netlify documentation states variables must include the Functions scope to be available to functions at runtime, so the setup instructions now call that out.

## Review Notes
- The post uses Netlify's Lambda-compatible `exports.handler` API, which Netlify still documents as an alternative supported API surface.
- The scheduled function example uses inline `exports.config = { schedule: "0 * * * *" }`, consistent with Netlify's documented JavaScript/TypeScript scheduled function configuration pattern.
- The code snippets are illustrative and reference application-specific functions such as `fetchUsersFromDB`, `chargePayment`, and `deleteExpiredSessions`; those are expected placeholders rather than complete runnable implementations.
- A runtime sanity check of the updated OpenTelemetry wrapper imports and `NodeSDK` configuration passed against current npm package versions on 2026-06-05.
