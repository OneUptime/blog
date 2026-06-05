# Validation Summary: How to Instrument React Fetch and XHR Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Web Tracer SDK
- OpenTelemetry Fetch instrumentation
- OpenTelemetry XMLHttpRequest instrumentation
- React
- Fetch API
- XMLHttpRequest
- Axios
- Browser PerformanceResourceTiming

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Fetch instrumentation README and package types: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-fetch
- OpenTelemetry XMLHttpRequest instrumentation README and package types: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-xml-http-request
- OpenTelemetry JavaScript `@opentelemetry/resources` package exports and types: https://www.npmjs.com/package/@opentelemetry/resources
- OpenTelemetry JavaScript `@opentelemetry/sdk-trace-web` package exports and types: https://www.npmjs.com/package/@opentelemetry/sdk-trace-web
- OpenTelemetry semantic conventions package exports: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- MDN PerformanceResourceTiming and Timing-Allow-Origin behavior: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming

## Issues Found
- Updated current OpenTelemetry setup code to use `resourceFromAttributes` and stable semantic convention constants instead of the older `new Resource(...)` and `SemanticResourceAttributes` pattern.
- Replaced `provider.addSpanProcessor(...)` examples with `spanProcessors: [...]` in `WebTracerProvider` construction, matching current `@opentelemetry/sdk-trace-web` APIs.
- Added missing install dependency for `@opentelemetry/instrumentation`, which is required for `registerInstrumentations`, and added `@opentelemetry/context-zone` because the examples use `ZoneContextManager`.
- Corrected overbroad claims about automatic timing and header capture. Browser network timing is added as span events when resource timing data is available, and detailed cross-origin timing may require `Timing-Allow-Origin`.
- Guarded Fetch `applyCustomAttributesOnSpan` response handling with `result instanceof Response`, because the hook can receive a fetch error object rather than a `Response`.
- Updated manual span attributes to use stable HTTP semantic convention names where appropriate, such as `url.full`, `http.request.method`, and `http.response.status_code`.
- Removed nonstandard `xhr.requestBody` usage. The XHR instrumentation supports request size through the `measureRequestSize` option.
- Corrected the advanced filtering example because `ignoreUrls` accepts string and RegExp matchers, not predicate functions.
- Clarified Axios browser behavior by noting that Axios typically uses XHR in browsers unless configured otherwise, and set the example adapter to `xhr`.
- Converted URL query parameter values to strings before appending them with `URLSearchParams.append`.

## Review Notes
The Fetch and XMLHttpRequest instrumentation packages are still marked experimental by OpenTelemetry and may introduce breaking changes in future minor releases. The article is accurate for the current OpenTelemetry JavaScript package line reviewed on 2026-06-05.
