# Validation Summary: How to Instrument Express.js Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide — a hands-on walkthrough for instrumenting Express.js apps with OpenTelemetry (traces, metrics, logs).

## Technologies Covered
- Node.js / Express.js
- OpenTelemetry JavaScript SDK (`@opentelemetry/sdk-node`, `@opentelemetry/api`)
- Auto-instrumentation (`@opentelemetry/auto-instrumentations-node`)
- OTLP exporters (`@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`)
- `@opentelemetry/resources` and `@opentelemetry/semantic-conventions`
- `@opentelemetry/sdk-metrics` and `@opentelemetry/sdk-trace-base`
- Winston (structured logging)

## Sources Consulted
- OpenTelemetry JS — Resources docs: https://opentelemetry.io/docs/languages/js/resources/
- Announcing the OpenTelemetry JavaScript SDK 2.0 (breaking changes): https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/
- `@opentelemetry/resources` API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- `NodeSDKConfiguration` interface (confirms both `spanProcessor` and `spanProcessors` options): https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- `@opentelemetry/semantic-conventions` (deprecation of `SemanticResourceAttributes`, `ATTR_*` constants): https://www.npmjs.com/package/@opentelemetry/semantic-conventions

## Issues Found

1. **Deprecated/removed `Resource` constructor and `SemanticResourceAttributes` (Basic Setup).**
   The post used `new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: ... })`. In OpenTelemetry JS SDK 2.0 (the current major release at this post's date), the `Resource` **class export was removed** in favor of factory functions — `new Resource()` now throws `Resource is not a constructor`. `SemanticResourceAttributes` is also deprecated.
   - **Fix:** Switched the import to `resourceFromAttributes` from `@opentelemetry/resources`, and to the stable `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants from `@opentelemetry/semantic-conventions`. Replaced the deprecated `SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT` with the current `deployment.environment.name` attribute key (the deployment-environment convention lives in the incubating namespace, so the literal string is used rather than an unstable export).

2. **Missing `SpanStatusCode` import in the "Using Context for Span Nesting" example.**
   The snippet imported `{ trace, context }` but referenced `SpanStatusCode.OK` / `SpanStatusCode.ERROR` (and never used `context`), so it would throw `ReferenceError: SpanStatusCode is not defined`.
   - **Fix:** Changed the import to `{ trace, SpanStatusCode }`.

3. **Missing `SpanStatusCode` import in the "Database Query Tracing" example.**
   The `TracedRepository` snippet imported only `{ trace }` but used `SpanStatusCode.OK` / `SpanStatusCode.ERROR` in every method.
   - **Fix:** Changed the import to `{ trace, SpanStatusCode }`.

## Review Notes
- The production-config snippet uses `spanProcessor` (singular). This is valid — `NodeSDKConfiguration` still exposes both `spanProcessor` and `spanProcessors` options.
- Custom-span APIs (`tracer.startSpan(name, options, ctx)`, `startActiveSpan(name, options, fn)`, `trace.setSpan`, `recordException`, `setStatus`), the metrics APIs (`createCounter` / `createHistogram` / `createUpDownCounter` with attribute objects), and `propagation.inject(context.active(), headers)` are all correct for the current API.
- The middleware example relies on a global `crypto.randomUUID()`. This is fine on Node.js 19+ (where `crypto` is a global), which is a safe assumption for the post's timeframe; left unchanged.
- The auto-instrumentation config object passed to `getNodeAutoInstrumentations()` is structured correctly (instrumentation package names mapped to `{ enabled: true }`).
- No version pins are given in the install command; readers on SDK 1.x would still find the pre-fix `Resource` constructor works, but the corrected code is forward-compatible with SDK 2.x and the recommended path going forward.
