# Validation Summary: How to Monitor API Rate Limiting with OpenTelemetry Custom Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python metrics API and SDK
- OpenTelemetry OTLP metric exporter
- OpenTelemetry Collector processors and OTLP pipeline configuration
- FastAPI / Starlette middleware
- Redis sorted sets and redis-py pipelines
- Prometheus-style alert rules and metric name translation
- HTTP rate limit response headers

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry metrics semantic conventions, including unit guidance: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- HTTP Semantics, Retry-After header: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
- redis-py pipeline documentation: https://redis.readthedocs.io/en/stable/advanced_features.html#pipelines
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/

## Issues Found
- The post described and documented the Redis example as a token bucket limiter, but the implementation uses a Redis sorted-set sliding window. Updated the description and class docstring to say sliding-window rate limiter.
- The Python examples used `Gauge.set(...)`. Current OpenTelemetry Python synchronous gauges record values with `record(...)`; observable gauges use callbacks. Updated the gauge examples to use `record(...)` and removed the incorrect observable-gauge callback comment.
- Several OpenTelemetry metric units used informal values such as `requests`, `ratio`, `changes`, `windows`, and milliseconds for duration histograms. Updated them to UCUM-compatible units: `{request}`, `1`, `{change}`, `{window}`, and seconds (`s`).
- The latency histogram recorded milliseconds while the corrected unit is seconds. Updated the recorded value to seconds and changed the Prometheus alert threshold from `50` to `0.05`.
- The latency PromQL example referenced `rate_limit_check_latency_bucket`, but with a seconds unit the Prometheus-compatible metric name includes the `seconds` unit suffix. Updated the query to `rate_limit_check_latency_seconds_bucket`.
- The FastAPI middleware set `Retry-After` to an absolute Unix timestamp. HTTP `Retry-After` must be an HTTP date or a delay in seconds. Updated the example to return the delay in seconds.
- The Collector text said configured processors can derive additional metrics. The shown processors filter, enrich, batch, and regroup attributes; they do not derive metrics. Updated the wording.
- The Collector filter processor example used the older `metrics.datapoint` configuration shape. Updated it to the current `metric_conditions` form with explicit `datapoint` context and `error_mode: ignore`.
- The group-by-attributes comment implied aggregation for dashboard efficiency. Updated the comment to state that the processor moves selected datapoint attributes to resources and noted its Collector distribution availability.

## Review Notes
- The examples intentionally use `client.id` as a metric attribute for per-client dashboards. That can create high-cardinality metric streams in production and should be bounded, sampled, or routed carefully.
- The Prometheus alert names assume default OpenTelemetry-to-Prometheus character translation, where dots in metric and label names become underscores and counters receive `_total`.
