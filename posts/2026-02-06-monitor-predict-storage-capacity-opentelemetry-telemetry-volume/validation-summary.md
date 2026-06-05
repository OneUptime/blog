# Validation Summary: How to Monitor and Predict Storage Capacity Needs from OpenTelemetry Telemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- Prometheus and PromQL
- Prometheus alerting rules
- Python
- NumPy
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector tail sampling processor

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/

## Issues Found
- The Collector telemetry config used `service.telemetry.metrics.address`, which current OpenTelemetry docs say is ignored as of Collector v0.123.0. I changed it to the current `service.telemetry.metrics.readers` Prometheus pull exporter format with `host` and `port`.
- The PromQL examples referenced `otelcol_exporter_sent_bytes_total`, which is not listed as a current Collector internal metric. I changed that query to use the detailed batch processor payload-size histogram, `otelcol_processor_batch_batch_send_size_bytes_sum`.
- The "top producers by service" query grouped `otelcol_receiver_accepted_spans_total` by `service_name`, but Collector receiver ingress metrics are internal Collector metrics, not per-service span metrics. I changed it to a receiver and transport breakdown.
- The storage-ratio Python example only counted spans while the post covers spans, metric points, and log records. I updated it to include all three accepted telemetry counters and compute bytes per telemetry item.
- The disk exhaustion alert divided available bytes by a negative derivative, which would make the alert true for any decreasing disk trend. I replaced it with Prometheus `predict_linear(..., 21 * 24 * 3600) < 0` and kept the negative-derivative guard.
- The filter processor snippet used legacy `traces.span` and `logs.log_record` keys that the current filter processor README marks as deprecated. I updated it to `trace_conditions` and `log_conditions` using explicit OTTL context prefixes.
- The log filter used the numeric literal `9` for INFO severity. I changed it to the documented OTTL enum `SEVERITY_NUMBER_INFO` so the intent is clearer and less brittle.

## Review Notes
The Collector internal metrics schema is still evolving, and the OpenTelemetry docs warn that some internal telemetry configuration may change before the declarative configuration schema reaches 1.0. The article is now accurate for the current documented configuration style and metric names reviewed on 2026-06-05.
