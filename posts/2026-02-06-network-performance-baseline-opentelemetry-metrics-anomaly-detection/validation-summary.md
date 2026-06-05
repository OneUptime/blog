# Validation Summary: How to Build a Network Performance Baseline from OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry hostmetrics receiver
- OpenTelemetry cumulativetodelta processor
- OpenTelemetry metrics transform processor
- OTLP exporter and receiver
- Prometheus-compatible HTTP query API
- Python
- NumPy

## Sources Consulted
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry hostmetrics network scraper generated documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/networkscraper/documentation.md
- OpenTelemetry Collector cumulativetodelta processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cumulativetodeltaprocessor/README.md
- OpenTelemetry Collector metrics transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- OpenTelemetry system metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/

## Issues Found
- The Collector snippet used the deprecated `metricstransform` component type and defined the processor without adding it to the metrics pipeline. Changed it to the current documented `metrics_transform` type and added it to the pipeline.
- The comment above the metrics transform processor said it calculated per-second rates, but the configured operation aggregates label sets and does not compute rates. Updated the comment to say it aggregates interface-level deltas by direction and that per-second rates should be calculated in the backend.
- The OTLP receiver was described as collecting application spans, but no traces pipeline consumed it. Added a traces pipeline using the existing OTLP receiver, batch processor, and OTLP exporter.
- The baseline calculator imported `timedelta` and accepted a `lookback_weeks` parameter that was not used. Removed the unused import and parameter so the example matches its behavior.
- The Python examples used local time for hour-of-week buckets while Prometheus timestamps are Unix timestamps. Updated both baseline calculation and current bucket selection to use UTC consistently.
- The anomaly detector described `/api/v1/query_range` as an OTLP-compatible backend API. Changed this to Prometheus-compatible backend, which matches the endpoint and response shape.
- The Prometheus range query used `start="-672h"` and `end="now"`, but the HTTP API expects RFC3339 or Unix timestamps for `start` and `end`. Updated the example to compute Unix timestamps with `datetime` and `timedelta`.
- The detector assumed a non-empty query result and would fail with `IndexError` on no data. Added an empty-result guard and skipped empty histories.
- The throughput query used `system_network_io_total`; under the default Prometheus/OpenTelemetry translation with suffixes, the byte counter is exposed as `system_network_io_bytes_total`. Updated the receive and transmit queries.

## Review Notes
The OpenTelemetry Collector config was parsed from the post and validated successfully with `otel/opentelemetry-collector-contrib:latest validate --config=/etc/otelcol/config.yaml`. The Python snippets were compiled successfully, and the YAML snippet parsed successfully.
