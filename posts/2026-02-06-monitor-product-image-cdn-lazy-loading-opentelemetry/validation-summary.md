# Validation Summary: How to Monitor Product Image CDN Performance and Lazy Loading

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript metrics SDK
- OpenTelemetry OTLP HTTP metrics exporter
- Browser PerformanceObserver API
- Resource Timing API
- Server-Timing API
- Intersection Observer API
- HTMLImageElement load/error state
- JavaScript browser instrumentation

## Sources Consulted
- OpenTelemetry JavaScript `@opentelemetry/exporter-metrics-otlp-http` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-metrics-otlp-http.html
- OpenTelemetry JavaScript `@opentelemetry/resources` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Metrics API specification for instrument advisory parameters: https://opentelemetry.io/docs/specs/otel/metrics/api/
- MDN `PerformanceResourceTiming.transferSize`: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize
- MDN Resource Timing API guide: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Resource_timing
- MDN `PerformanceResourceTiming.serverTiming`: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/serverTiming
- MDN `HTMLImageElement.complete`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/complete

## Issues Found
- The OpenTelemetry resource example used `new Resource(...)`, but current `@opentelemetry/resources` documentation exposes resources through helpers such as `resourceFromAttributes`. Changed the import and resource construction to `resourceFromAttributes(...)`.
- The setup text referred to "resource detection", but the snippet manually configures resource attributes. Updated the wording to match the code.
- The post attempted to infer CDN cache hits from `transferSize < decodedBodySize * 0.1`. Resource Timing documents `transferSize` as browser transfer size, with `0` also possible for browser cache or cross-origin resources without `Timing-Allow-Origin`; it does not directly identify CDN cache hits. Replaced this with a `cdn.cache_status` attribute read from `PerformanceResourceTiming.serverTiming` and added the required `Server-Timing`/`Timing-Allow-Origin` caveat.
- The image format extraction used `entry.name.split('.').pop()`, which includes query strings for URLs such as `image.jpg?edge=abc`. Changed it to parse the URL pathname before extracting the extension.
- The lazy-loading example treated any `img.complete` image as successfully loaded. MDN documents that `complete` can also be true for broken images. Added a `naturalWidth > 0` check and records errors for completed-but-broken images.
- The image load error counter was declared but never used. Exported it from the image metrics snippet and used it in the lazy-load error path.

## Review Notes
The examples are technically valid as illustrative browser instrumentation, but production deployments should control metric attribute cardinality carefully, especially for CDN edge, image position, and cache status values.
