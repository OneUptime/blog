# Validation Summary: Use Exemplars to Link Error Rate Metric Spikes to Specific OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry metrics exemplars
- OpenTelemetry Collector
- Prometheus and OpenMetrics
- Grafana
- Grafana Tempo

## Sources Consulted
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana exemplars documentation: https://grafana.com/docs/grafana/latest/fundamentals/exemplars/
- Grafana Cloud exemplar setup documentation: https://grafana.com/docs/grafana-cloud/send-data/traces/configure/exemplars/

## Issues Found
- The post implied every active span automatically creates an exemplar. Updated the wording to match OpenTelemetry Python's trace-based exemplar behavior: measurements are eligible when recorded in the context of an active sampled span, and exemplars carry trace ID and span ID.
- The request handler recorded the error metric before setting the span status to error. Moved `record_exception()` and `set_status()` before `error_counter.add()` so the later custom error-only exemplar filter can see the error status at measurement time.
- The request handler imported `context` but did not use it. Removed the unused import.
- The Prometheus configuration omitted the required `--enable-feature=exemplar-storage` startup flag. Added the missing note while keeping the existing `storage.exemplars.max_exemplars` YAML.
- The Grafana trace label was shown as `traceID`, but OpenTelemetry Prometheus/OpenMetrics conversion uses `trace_id` and `span_id` exemplar labels. Updated the label setting to `trace_id`.
- The custom Python exemplar filter imported `ExemplarFilter` from `opentelemetry.sdk.metrics.export`, but the current Python SDK exposes it from `opentelemetry.sdk.metrics`. Corrected the import.
- The custom exemplar filter ignored the measurement context passed to `should_sample`. Updated it to call `trace.get_current_span(context)`.

## Review Notes
Python and YAML snippets were syntax-checked after editing. The Collector configuration keeps both Prometheus exposition and Prometheus remote write examples, but the metrics pipeline exports through the Prometheus exposition exporter only.
