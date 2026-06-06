# Validation Summary: How to Track API Version Usage Metrics Across v1/v2/v3 Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry metrics and tracing
- Express middleware and routing
- TypeScript
- Prometheus / PromQL
- API versioning

## Sources Consulted
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript API documentation: https://open-telemetry.github.io/opentelemetry-js/
- Express 4.x API reference for `req.originalUrl`, `req.path`, and mounted middleware behavior: https://expressjs.com/en/4x/api.html
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus PromQL function documentation for `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The middleware extracted the version from `req.path`, but the middleware is mounted with `app.use('/api', ...)`. Express strips the mount point from `req.path` in mounted middleware, so `/api/v1/users` would be seen as `/v1/users` and the regex would not match. Changed the extraction to use `req.originalUrl || req.url`, which preserves the mounted `/api` prefix.
- The PromQL P99 latency example used `histogram_quantile(0.99, rate(...)) by (api_version)`, which is invalid for classic Prometheus histogram buckets. Changed it to aggregate bucket rates with `sum(...) by (le, api_version)` inside `histogram_quantile`.
- The traffic percentage query used an unnecessary vector matching modifier. Simplified it to divide the per-version rate by the total rate.
- The deprecation alert examples referenced `api_requests_by_version` and `api_consumer_version_usage`, but the counters shown in the post export to Prometheus-style counter names with `_total` suffixes. Updated the alert examples to use `api_requests_by_version_total` and `api_consumer_version_usage_total`.

## Review Notes
The OpenTelemetry API usage shown in the TypeScript examples is current: `metrics.getMeter`, `createCounter`, `createHistogram`, `Counter.add`, `Histogram.record`, `trace.getActiveSpan`, and `Span.setAttribute` are valid APIs. The custom attributes are acceptable, but production systems should control attribute cardinality carefully for labels such as consumer IDs and routes.
