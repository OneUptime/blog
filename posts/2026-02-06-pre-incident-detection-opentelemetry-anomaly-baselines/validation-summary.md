# Validation Summary: How to Build Pre-Incident Detection Systems

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python metrics API and SDK
- OpenTelemetry Protocol (OTLP) gRPC exporter
- OpenTelemetry Collector receiver, processor, exporter, and pipeline configuration
- Python datetime and NumPy statistical functions
- Anomaly detection concepts: baselines, percentiles, z-scores, and correlated signals

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics Data Model specification: https://opentelemetry.io/docs/reference/specification/metrics/data-model/
- OpenTelemetry HTTP semantic conventions for metrics: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP gRPC exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- Python 3.12 deprecations for datetime.utcnow(): https://docs.python.org/3/whatsnew/3.12.html
- NumPy percentile documentation: https://numpy.org/doc/stable/reference/generated/numpy.percentile.html

## Issues Found
- The OpenTelemetry observable gauge callback returned the result of an undefined helper and did not explicitly return `Observation` objects. Updated the snippet to import `Observation`, define a placeholder `get_current_queue_depth()` function, and return `[Observation(get_current_queue_depth())]` from the callback, matching the OpenTelemetry Python callback contract.
- The `http.server.request.duration` example used `unit="ms"` and described milliseconds. Current OpenTelemetry HTTP semantic conventions define this metric with unit `s`, so the example now uses seconds.
- The examples used `datetime.utcnow()`, which is deprecated as of Python 3.12. Updated the examples to use `datetime.now(UTC)` with `from datetime import UTC, datetime, timedelta` where appropriate.
- The histogram comment said it captures the "full distribution." OpenTelemetry histogram points are aggregated into count, sum, and buckets rather than preserving every raw observation, so the comment now says histograms record measurements so the backend can build distribution and percentile views.
- The baseline computer comment said it fetched "raw metric values." Since OpenTelemetry metrics are generally exported as aggregated metric data points, the wording now says "metric values with timestamps."

## Review Notes
The Collector fan-out configuration shape is valid: receivers, processors, exporters, and metrics pipeline sections match documented Collector configuration patterns. The `0.0.0.0:4317` receiver endpoint is common for containerized examples, though OpenTelemetry documentation notes that binding to `localhost` is preferable when all clients are local. The statistical anomaly detection examples are intentionally simplified and would need production hardening around sample sizes, seasonality, deployment events, and backend-specific histogram percentile queries.
