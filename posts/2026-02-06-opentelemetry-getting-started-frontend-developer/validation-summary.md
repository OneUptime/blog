# Validation Summary: How to Get Started with OpenTelemetry as a Frontend Developer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry browser tracing
- OpenTelemetry metrics
- OTLP HTTP exporters
- OpenTelemetry Collector
- JavaScript and TypeScript
- React
- Vue.js
- Angular
- Core Web Vitals
- W3C Trace Context and CORS

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JS TypeDoc for WebTracerProvider: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- OpenTelemetry JS TypeDoc for tracer configuration and spanProcessors: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/types.ts
- OpenTelemetry JS TypeDoc for resources: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS TypeDoc for semantic conventions: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry JS TypeDoc for fetch instrumentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-fetch.html
- OpenTelemetry JS TypeDoc for metrics SDK and OTLP metrics exporter: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-metrics.html and https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-metrics-otlp-http.html
- OpenTelemetry Collector Docker and troubleshooting docs: https://opentelemetry.io/docs/collector/install/docker/ and https://opentelemetry.io/docs/collector/troubleshooting/
- web.dev Core Web Vitals documentation: https://web.dev/articles/vitals
- web.dev INP replacement announcement: https://web.dev/blog/inp-cwv-launch
- npm package metadata and local TypeScript checks for current OpenTelemetry JS and web-vitals packages

## Issues Found
- Updated OpenTelemetry setup to use current `WebTracerProvider` configuration with `spanProcessors` in the constructor instead of the removed/deprecated `addSpanProcessor` pattern.
- Added missing packages and setup for metrics export. The original post used `metrics.getMeter()` but did not install or register the metrics SDK, so custom metrics would be no-ops.
- Replaced deprecated resource setup with `resourceFromAttributes()` and `ATTR_SERVICE_NAME` instead of `new Resource()` and `SemanticResourceAttributes`.
- Added `@opentelemetry/context-zone` and registered `ZoneContextManager`, matching current browser instrumentation examples for context propagation.
- Updated the React entry point from `ReactDOM.render()` to `createRoot()` for current React versions.
- Corrected the API-call span claims by removing the unsupported statement that request and response headers are automatically included by browser fetch/XMLHttpRequest instrumentation.
- Narrowed the DocumentLoadInstrumentation claim to navigation and paint timing instead of claiming it automatically captures all Web Vitals including LCP.
- Fixed the custom React span example by importing `useEffect` and `SpanStatusCode`, using `startActiveSpan()` for user-initiated work, and ensuring initialization spans end in `finally`.
- Replaced FID with INP in the Core Web Vitals example because INP replaced FID as a Core Web Vital and current `web-vitals` exports `onINP`.
- Added missing `trace` and `SpanStatusCode` imports in error, Vue, and Angular examples.
- Corrected error-correlation wording so it does not overstate that all error spans are automatically linked to active user work.
- Added a minimal Collector configuration that enables the OTLP HTTP receiver, `debug` exporter, and `zpages` extension; the original compose snippet exposed zPages but did not enable it.
- Fixed the privacy snippet so it does not set span attributes to `undefined`, handles `FetchError` correctly, opts into stable HTTP semantic conventions, and sanitizes `url.full`.
- Added a caveat to lazy-loading instrumentation because delaying OpenTelemetry can miss initial page-load telemetry.
- Softened the logs and trace concept wording where the original text implied automatic browser log collection and complete automatic component/state tracing.

## Review Notes
Browser OpenTelemetry JavaScript packages remain experimental in parts of the ecosystem, especially contrib instrumentations and OTLP web exporters. The examples were validated against current package metadata and TypeScript types available on 2026-06-05, but future minor releases can still introduce browser-instrumentation changes.
