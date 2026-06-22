# Validation Summary: How to Monitor React Application Performance with OneUptime

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation walkthrough)

## Technologies Covered
- React 18 (`react-dom/client`, error boundaries, hooks)
- OpenTelemetry JavaScript Web SDK (`@opentelemetry/sdk-trace-web`, `sdk-trace-base`, `api`, `resources`, `semantic-conventions`, `context-zone`, `instrumentation-fetch`, `instrumentation-xml-http-request`)
- OTLP HTTP trace exporter
- `web-vitals` library (Core Web Vitals)
- React Router (`react-router-dom`)
- Browser performance APIs (`PerformanceObserver`, `performance.memory`, Resource Timing, Long Task)
- OneUptime (OTLP-native ingestion, dashboards, alerts)

## Sources Consulted
- OpenTelemetry JS docs — Web tracer setup, `WebTracerProvider`, `BatchSpanProcessor` (https://opentelemetry.io/docs/languages/js/)
- `@opentelemetry/resources` 2.x API — `resourceFromAttributes()` replacing the removed `new Resource()` constructor
- `@opentelemetry/semantic-conventions` — stable `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants replacing the deprecated `SemanticResourceAttributes` enum
- `web-vitals` library changelog — `onFID` removed in v4 after Google replaced FID with INP as a Core Web Vital (March 2024) (https://github.com/GoogleChrome/web-vitals)
- Google web.dev — Core Web Vitals / INP (https://web.dev/articles/inp)
- Established repo conventions in sibling posts: `2026-02-06-opentelemetry-browser-instrumentation-real-user-monitoring`, `2026-02-06-instrument-angular-opentelemetry-web-sdk`, and `2026-01-15-track-web-vitals-lcp-fid-cls-react` (OneUptime OTLP endpoint, modern OTel resource API, current web-vitals imports)

## Issues Found
1. **Wrong OneUptime OTLP endpoint.** The post used `https://otlp.oneuptime.com/v1/traces` in both `tracing.ts` and `.env.production`. The correct, repo-wide convention is `https://oneuptime.com/otlp/v1/traces` (the `otlp` path segment lives under the main `oneuptime.com` host). Fixed both occurrences.
2. **Removed/deprecated OpenTelemetry resource API.** The post used `new Resource({ ... })` with `SemanticResourceAttributes.SERVICE_NAME` etc. In current OpenTelemetry JS (2.x, used by `web-vitals`/`sdk-trace-web` peers), the `Resource` constructor is no longer exported and `SemanticResourceAttributes` is gone. Replaced with `resourceFromAttributes({ [ATTR_SERVICE_NAME]: ..., [ATTR_SERVICE_VERSION]: ... })` and a string-literal `'deployment.environment.name'` key, matching sibling web posts.
3. **Removed `addSpanProcessor` API.** `provider.addSpanProcessor(...)` was removed in OpenTelemetry JS 2.0. Moved the `BatchSpanProcessor` into the `WebTracerProvider` constructor via the `spanProcessors: [ ... ]` option.
4. **`onFID` no longer exists in `web-vitals`.** The post imported and called `onFID` from `web-vitals`. FID was deprecated by Google (replaced by INP in March 2024) and `onFID` was removed in `web-vitals` v4 — the unpinned `npm install web-vitals` pulls v4+, so the import would break the build. Removed `onFID` from the import list, the `thresholds` map, and `initWebVitalsMonitoring()`. INP coverage (`onINP`) was already present.
5. **Outdated Core Web Vitals prose.** The intro listed FID as a current Core Web Vital. Updated to list INP and note that INP replaced FID (March 2024) and that `web-vitals` dropped `onFID` in v4, keeping it consistent with the corrected code.

## Review Notes
- The `x-oneuptime-token` exporter header is correct and matches repo convention.
- `String.prototype.substr` in the error-boundary ID generator is deprecated but still functional in all browsers; left unchanged as it is not an error.
- `performance.memory` is non-standard (Chromium-only); the code correctly feature-detects it, and the post frames it as advanced/optional — acceptable.
- The "Resource Loading Performance" line is missing its `###` heading marker (renders as plain text). Left as-is since it is a cosmetic formatting nit, not a technical inaccuracy.
- Dashboard/alert UI steps (Telemetry > Services, Dashboards, Monitors) are described generically and are plausible for OneUptime; no version-specific claims to verify.
