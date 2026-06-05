# Validation Summary: How to Configure OpenTelemetry in Bun Without the Node.js --require Flag

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime
- Bun.serve
- Bun fetch
- Bun SQLite
- JavaScript / TypeScript
- ECMAScript modules
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Node auto-instrumentation
- OTLP HTTP trace and metric exporters

## Sources Consulted
- Bun Runtime CLI documentation: https://bun.sh/docs/runtime
- Bun HTTP server documentation: https://bun.com/docs/runtime/http/server
- Bun fetch documentation: https://bun.com/docs/runtime/networking/fetch
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry NodeSDK API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry semantic-conventions API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry resources package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- MDN JavaScript modules documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- Latest npm package declarations for @opentelemetry/resources, @opentelemetry/sdk-node, @opentelemetry/sdk-metrics, @opentelemetry/sdk-trace-base, @opentelemetry/semantic-conventions, and @opentelemetry/auto-instrumentations-node

## Issues Found
- The install command omitted packages that were imported directly in the snippets. Added `@opentelemetry/sdk-metrics`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions`.
- The resource example used `new Resource(...)`, which is not a current runtime export from `@opentelemetry/resources`. Changed it to `resourceFromAttributes(...)`.
- The semantic convention constants used deprecated `SEMRESATTRS_*` names. Updated them to `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The entry point examples used static imports after `sdk.start()`, but static ESM imports are hoisted and their side effects run before the rest of the module body. Replaced the application imports with dynamic `await import(...)` calls after SDK startup.
- The environment configuration defined `sampleRate` and `exportInterval` but did not apply them. Added those fields to `TelemetryConfig`, configured `TraceIdRatioBasedSampler`, and used the configured metric export interval.
- The auto-instrumentation configuration referenced browser fetch instrumentation and claimed an outgoing Bun `fetch` would be auto-instrumented. Replaced that with `@opentelemetry/instrumentation-undici` in the Node auto-instrumentation config and changed the Bun native fetch example to create a manual span.
- The optimization example used deprecated `spanProcessor`. Updated it to `spanProcessors: [spanProcessor]`.

## Review Notes
The main OpenTelemetry SDK snippets were type-checked against the latest packages in a temporary review project with `npx tsc --noEmit`. Bun itself was not installed in the review environment, so Bun-specific APIs were verified against the official Bun documentation rather than by running the sample server.
