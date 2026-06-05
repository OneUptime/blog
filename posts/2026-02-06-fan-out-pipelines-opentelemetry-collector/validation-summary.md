# Validation Summary: How to Build Fan-Out Pipelines in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- Collector receivers, processors, exporters, connectors, and pipelines
- OTLP, Zipkin, Jaeger, Prometheus, Prometheus Remote Write
- Collector batch, resource, probabilistic sampler, filter, cumulative-to-delta, and span metrics components

## Sources Consulted
- OpenTelemetry Collector architecture documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Collector components documentation: https://opentelemetry.io/docs/collector/components/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry cumulative-to-delta processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cumulativetodeltaprocessor/README.md
- OpenTelemetry blog: migrating away from the Jaeger exporter: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector issue announcing logging exporter replacement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337

## Issues Found
- The basic trace fan-out example used the removed native `jaeger` exporter. Updated it to export to Jaeger via the supported OTLP exporter.
- The TLS examples used `cert_file` as if it were a trust bundle. Updated those examples to use `ca_file` for server certificate trust.
- The metrics filter example used older include-style filter configuration. Updated it to current OTTL `metric_conditions` syntax that drops non-HTTP metrics.
- The Prometheus Remote Write and OTLP HTTP exporter examples used older component names. Updated them to `prometheus_remote_write` and `otlp_http/metrics`.
- The cross-signal example used the deprecated/removed span metrics processor style with `metrics_exporter`. Updated it to the current `span_metrics` connector pattern, where the connector is an exporter from a traces pipeline and a receiver in a metrics pipeline.
- The Prometheus exporter endpoint was shown as a Prometheus server address. Updated it to an address where the Collector exposes scrapeable metrics.
- The error-handling example defined a nonexistent `retry` processor. Removed it and kept retry/queue settings at the exporter level, where Collector retry behavior is configured.
- The error-handling example used the removed `logging` exporter. Updated it to the current `debug` exporter.

## Review Notes
The post is technically valid after the fixes. Future updates should continue to watch Collector component renames, because several components are moving toward snake_case names while older aliases may remain temporarily accepted.
