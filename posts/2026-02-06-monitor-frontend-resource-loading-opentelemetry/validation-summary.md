# Validation Summary: How to Monitor Frontend Resource Loading (CSS, JS, Images) with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry OTLP HTTP trace exporter
- Browser Performance API
- PerformanceObserver
- PerformanceResourceTiming
- First Contentful Paint
- JavaScript resource and image analysis

## Sources Consulted
- OpenTelemetry JavaScript browser getting started guide: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript Resource interface TypeDoc: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_resources.Resource.html
- OpenTelemetry JavaScript package metadata for @opentelemetry/sdk-trace-web, @opentelemetry/resources, @opentelemetry/sdk-trace-base, and @opentelemetry/instrumentation-document-load via npm
- MDN Resource timing guide: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Resource_timing
- MDN PerformanceResourceTiming transferSize reference: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize
- MDN Performance data guide: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data

## Issues Found
- The base tracer snippet used `new Resource(...)` and `provider.addSpanProcessor(...)`, which are not current OpenTelemetry JS 2.x patterns. Updated the snippet to use `resourceFromAttributes(...)` and the `spanProcessors` provider constructor option.
- The post stated that OpenTelemetry does not have built-in resource loading instrumentation. Updated this to acknowledge `DocumentLoadInstrumentation`, while keeping the custom instrumentation focus.
- The post implied resource timing fields are fully available for every resource. Added the cross-origin `Timing-Allow-Origin` caveat because many timing and size fields are zeroed without it.
- The cache detection comment and code treated `transferSize === 0` as always cached. Updated it to require `entry.transferSize === 0 && entry.decodedBodySize > 0`, matching MDN guidance and avoiding false positives for cross-origin resources without `Timing-Allow-Origin`.
- The resource summary snippet referenced `RESOURCE_CATEGORIES` without defining or importing it. Added the same category map to make the snippet self-contained.
- The render-blocking explanation overstated certainty. Updated it to describe the results as likely render-blocking candidates.
- The article described summary spans as aggregate metrics. Adjusted wording to aggregate summaries because the code creates spans, not OpenTelemetry metric instruments.
- Replaced the deprecated-style `http.url` span attribute with `url.full`.

## Review Notes
The tutorial is technically sound after the fixes. Future improvements could include setting `performance.setResourceTimingBufferSize(...)` for pages that load more than the browser's default resource timing buffer, and using actual OpenTelemetry metrics if the article wants to emit metric instruments rather than summary spans.
