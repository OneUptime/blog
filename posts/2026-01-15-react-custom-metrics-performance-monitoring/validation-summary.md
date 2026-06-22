# Validation Summary: How to Implement Custom Metrics for React Performance Monitoring

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation guide with extensive code examples)

## Technologies Covered
- React (Profiler API, hooks, error boundaries)
- TypeScript
- OpenTelemetry JS (`@opentelemetry/api`, `@opentelemetry/sdk-trace-web`, `@opentelemetry/sdk-metrics`, OTLP exporters, instrumentation packages)
- web-vitals
- TanStack React Query
- React Router
- OneUptime (OTLP metrics ingestion)

## Sources Consulted
- OpenTelemetry JS Meter API reference — `createObservableGauge` / `addCallback` signatures: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry JS instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- web-vitals v4 upgrade guide (onFID deprecation): https://github.com/GoogleChrome/web-vitals/blob/main/docs/upgrading-to-v4.md
- web-vitals v5 upgrade guide (onFID removal): https://github.com/GoogleChrome/web-vitals/blob/main/docs/upgrading-to-v5.md
- web-vitals PR #435 (Deprecate onFID and remove previously deprecated APIs): https://github.com/GoogleChrome/web-vitals/pull/435
- React Profiler API documentation (`onRender` callback signature)

## Issues Found

1. **Invalid `createObservableGauge` callback form (multiple occurrences) — fixed.**
   The post called `meter.createObservableGauge(name, options, callback)`, passing the observe callback as a third argument. The OpenTelemetry JS Meter API signature is `createObservableGauge(name, options?)`, which returns an `ObservableGauge`; callbacks must be registered separately via the returned instrument's `.addCallback(callback)` method (or `meter.addBatchObservableCallback`). The three-argument form does not exist and would fail to compile in TypeScript. Fixed in the "Observable Gauge" example and in all four gauges in `src/telemetry/performanceMetrics.ts` (`js_heap_size_bytes`, `dom_nodes_count`, `long_tasks_total`, `long_task_duration_avg_ms`) by assigning the instrument to a variable and calling `.addCallback(...)`.

2. **`onFID` import/usage removed from web-vitals (current major version) — fixed.**
   The Web Vitals example imported `onFID` from `web-vitals` and recorded a `web_vital_fid_ms` histogram. `onFID()` was deprecated in web-vitals v4 and **removed** in v5 (the current major version) because First Input Delay was retired in favor of Interaction to Next Paint (INP). The import would break against current `web-vitals`. Removed the `onFID` import, the `fidHistogram` declaration, and the `onFID(...)` registration block. The post already imports and uses `onINP`, so INP coverage is retained. Also updated the corresponding Summary Table row from `web_vital_fid_ms` (First Input Delay) to `web_vital_inp_ms` (Interaction to Next Paint) to keep the table consistent with the emitted metrics.

   Note: the prose reference to "Standard web vitals like LCP, FID, and CLS" was left intact, as FID is a legitimate historical Core Web Vital and the sentence is describing baseline metrics conceptually, not emitting them in code.

## Review Notes
- **Deprecated-but-functional OTel setup APIs (left as-is):** The setup file uses `new Resource({...})`, `SemanticResourceAttributes`, and `tracerProvider.addSpanProcessor(...)`. In the latest OpenTelemetry JS releases these are soft-deprecated in favor of `resourceFromAttributes(...)`, the individual `ATTR_*` constants from `@opentelemetry/semantic-conventions`, and passing `spanProcessors`/`resource` via the `WebTracerProvider` constructor config. They are still exported and functional across the widely-used SDK versions, so they are not broken — left unchanged to avoid introducing version-specific mismatches, but worth modernizing in a future revision.
- `MeterProvider({ readers: [...] })` (constructor-supplied readers) and `PeriodicExportingMetricReader` usage are correct and current.
- The first Observable Gauge snippet uses `performance.memory?.usedJSHeapSize`; `performance.memory` is a non-standard, Chromium-only API and is not in the standard TypeScript DOM typings (the later, more complete example correctly casts via `(performance as any).memory`). This is acceptable for an illustrative snippet but would need a cast or type augmentation to compile under strict settings.
- The React `ProfilerOnRenderCallback` signature `(id, phase, actualDuration, baseDuration, startTime, commitTime)` is correct for current React versions (the legacy trailing `interactions` argument has been removed).
- `@opentelemetry/instrumentation-xml-http-request` is installed in the npm command but not registered in the setup example; harmless, just unused.
- Cardinality guidance, bucketing helpers, error-boundary metrics, and the trace-context propagation in `trackedFetch` are all technically sound.
