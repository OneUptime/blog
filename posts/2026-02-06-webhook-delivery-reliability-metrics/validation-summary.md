# Validation Summary: How to Monitor Webhook Delivery Reliability with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry OTLP metrics exporter
- Prometheus metric naming and PromQL
- Prometheus alerting rules
- Python requests-based webhook delivery

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry metrics concepts documentation: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry Prometheus client libraries compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The in-flight deliveries section was titled as a gauge, but the code correctly uses an OpenTelemetry UpDownCounter. Updated the section title to match the instrument used.
- The success-rate PromQL examples divided successful deliveries by total attempts. Because attempts include retries, this understates delivery success when a webhook succeeds after retry. Updated the denominator to completed deliveries by aggregating the success and permanent-failure counters.
- The latency PromQL examples used `webhook_delivery_latency_bucket`, but the OpenTelemetry Prometheus translation adds the `milliseconds` unit suffix for a histogram instrument using `unit="ms"` by default. Updated the histogram bucket metric names to `webhook_delivery_latency_milliseconds_bucket`.
- The query comment said "Average delivery latency" while the expression calculated a 95th percentile with `histogram_quantile(0.95, ...)`. Updated the comment to say P95 delivery latency.

## Review Notes
- The Python OpenTelemetry metric APIs used in the snippets are current and valid.
- The webhook sender uses `time.time()` for elapsed durations. `time.perf_counter()` is usually preferable for elapsed-time measurement, but the existing code remains functionally correct for an illustrative example.
- Attributes such as `webhook.subscriber_id` and `webhook.last_error` can create high-cardinality metrics in large systems. This is operationally important, but not a syntax or API correctness issue.
