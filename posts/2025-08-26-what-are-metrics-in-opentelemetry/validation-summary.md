# Validation Summary: What are metrics in OpenTelemetry: A Complete Guide

## Status
validated

## Post Type
Guide / Tutorial (conceptual explanation of OpenTelemetry metric instrument types plus a practical Node.js + TypeScript implementation walkthrough)

## Technologies Covered
- OpenTelemetry (Metrics API & SDK)
- OpenTelemetry JS packages: `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-metrics`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`
- Node.js
- TypeScript
- Express.js
- OTLP (OpenTelemetry Protocol over HTTP)
- OneUptime (observability backend)

## Sources Consulted
- OpenTelemetry JS Resources docs — https://opentelemetry.io/docs/languages/js/resources/
- `@opentelemetry/resources` npm / API docs (current v2.x, `resourceFromAttributes`) — https://www.npmjs.com/package/@opentelemetry/resources and https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- `@opentelemetry/semantic-conventions` README / npm (deprecation of `SemanticResourceAttributes`, `ATTR_*` constants, `/incubating` entrypoint) — https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md and https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- OpenTelemetry Metrics API concepts (Counter, UpDownCounter, Histogram, Gauge / Observable Gauge) — https://opentelemetry.io/docs/specs/otel/metrics/api/
- Resource semantic conventions (service.name, service.version, service.instance.id) — https://opentelemetry.io/docs/specs/semconv/resource/
- OneUptime OTLP endpoint convention cross-checked against other posts in this blog (`https://oneuptime.com/otlp/v1/metrics`)

## Issues Found
1. **Removed `Resource` constructor and deprecated `SemanticResourceAttributes` (Basic Setup section).**
   - **What was wrong:** The setup imported `import { Resource } from '@opentelemetry/resources'` and used `new Resource({ ... })`, with attribute keys from `SemanticResourceAttributes.SERVICE_NAME` etc. The `Resource` class constructor was removed in `@opentelemetry/resources` 2.0 (released March 2025, prior to this post's date), and `SemanticResourceAttributes` was deprecated in favor of the individual `ATTR_*` string constants. With current packages (`@opentelemetry/sdk-node`/`resources` 2.x) this code does not compile/run.
   - **What I changed:** Replaced the imports with `resourceFromAttributes` from `@opentelemetry/resources`, `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` from `@opentelemetry/semantic-conventions`, and `ATTR_SERVICE_INSTANCE_ID` from `@opentelemetry/semantic-conventions/incubating` (service.instance.id is still in the incubating entrypoint). Updated the `resource:` option to call `resourceFromAttributes({ [ATTR_SERVICE_NAME]: ..., [ATTR_SERVICE_VERSION]: ..., [ATTR_SERVICE_INSTANCE_ID]: ... })`.
   - **Why:** This is the current, working API surface and matches the official OpenTelemetry JS migration guidance.

## Review Notes
- All metric instrument APIs used are correct for current OpenTelemetry JS: `metrics.getMeter`, `createCounter`, `createHistogram`, `createUpDownCounter`, `createObservableGauge` with `addCallback`/`result.observe`, and `PeriodicExportingMetricReader` (`exportIntervalMillis`, `exportTimeoutMillis`). `NodeSDK` still accepts the `metricReader` option.
- The OneUptime OTLP metrics endpoint (`https://oneuptime.com/otlp/v1/metrics`) and `x-oneuptime-token` header match the convention used consistently across other posts in this blog — left unchanged.
- Minor (not changed, left as illustrative): `headers: { 'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN }` types as `string | undefined`, which can trip strict TypeScript; the production-hardened example later in the post correctly uses the non-null assertion (`!`) after validating the env var, so the pattern is demonstrated.
- Minor (not changed, pedagogically hedged): the histogram bucket comments (e.g. "0-0.1s bucket") are illustrative custom boundaries introduced with "e.g."; OpenTelemetry's default explicit bucket boundaries differ, but the post frames these as configurable examples rather than defaults.
- Conceptual explanations of metric types, the Gauge vs UpDownCounter distinction, cardinality guidance, and metrics-vs-traces-vs-logs guidance are accurate.
