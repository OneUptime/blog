# Validation Summary: How to Trace CDN Cache Hit Rates and Edge Server Performance Across Global PoPs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry tracing
- OpenTelemetry metrics
- OpenTelemetry semantic conventions
- CDN edge caching
- W3C Trace Context
- Node.js edge request handling

## Sources Consulted
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry JavaScript semantic conventions migration notes: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The request span used the deprecated `http.url` attribute. Changed it to `url.full` and added `http.request.method` to align with current OpenTelemetry HTTP semantic conventions.
- The origin-fetch example claimed trace context propagation but did not inject trace context into outbound headers. Added `propagation.inject(context.active(), originHeaders)` and passed those headers to the origin fetch call.
- The nested origin-fetch span could remain open if the origin request threw an error. Wrapped the origin-fetch span body in `try/finally` so `originSpan.end()` always runs.
- The cache hit ratio observable gauge used `hitCount` and `totalCount`, but the request handler never updated them. Added increments on cache hits and misses so the derived metric reflects actual request traffic.

## Review Notes
The examples remain illustrative and depend on application-specific helpers such as `localCache`, `fetchFromOrigin`, `getOriginUrl`, and `getContentType`. Metric label cardinality should be reviewed in a production implementation, especially for dynamic values such as staleness measurements.
