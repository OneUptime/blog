# Validation Summary: How to Monitor Long-Polling API Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry metrics and traces
- Express.js request handlers
- Node.js EventEmitter
- Prometheus alerting and histogram queries
- TypeScript

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry JavaScript API reference for Span: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- Published @opentelemetry/api 1.9.1 TypeScript definitions from npm
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Node.js EventEmitter documentation: https://nodejs.org/dist/latest/docs/api/events.html

## Issues Found
- The first code sample ended the span and decremented `api.long_poll.active` inside the immediate-response branch, then did both again in `finally`. I removed the branch-local cleanup so the `finally` block is the single cleanup path.
- The histogram bucket comment said the custom boundaries were "seconds, not milliseconds", but the metric unit is `ms` and the boundaries are millisecond values. I corrected the comment.
- The alert example referenced `api_long_poll_check_duration_ms_bucket`, but the post did not create or record a corresponding histogram metric. I added `checkDurationHistogram` and recorded the check duration in both relevant code examples.
- The Prometheus `histogram_quantile` example did not aggregate classic histogram buckets by `le`. I changed the query to use `sum by (le) (rate(..._bucket[5m]))`, matching Prometheus guidance for histogram quantiles.
- Error handling called `span.recordException(error)` but did not set the span status to error. I imported `SpanStatusCode` and added `span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })`.
- The outcome counter description omitted the `immediate` outcome used by the code. I updated the description to include it.

## Review Notes
- `advice.explicitBucketBoundaries` is present in the current `@opentelemetry/api` TypeScript definitions, but it is marked experimental in the API package.
- The sample intentionally omits application-specific implementations such as `checkForNewData`, `waitForData`, and `dataEmitter`.
