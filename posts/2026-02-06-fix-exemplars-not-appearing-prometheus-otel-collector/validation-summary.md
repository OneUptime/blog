# Validation Summary: How to Fix Exemplars Not Appearing in Prometheus Despite Being Received by the

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry SDK metrics and exemplars
- OpenTelemetry Collector
- Prometheus remote write and exemplar storage
- Prometheus OpenMetrics exposition
- Grafana exemplars and Tempo links
- Go OpenTelemetry stdout metric exporter

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Go stdoutmetric package: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/stdout/stdoutmetric
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector prometheusremotewrite exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector prometheus exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/config.go
- Prometheus feature flags documentation for exemplar storage: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Prometheus command-line flags documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus v2.53 command-line flags documentation: https://prometheus.io/docs/prometheus/2.53/command-line/prometheus/
- Prometheus configuration documentation for storage.exemplars: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#exemplars
- Prometheus exposition formats documentation: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus HTTP API documentation for query_exemplars: https://prometheus.io/docs/prometheus/latest/querying/api/
- Grafana exemplars documentation: https://grafana.com/docs/grafana/latest/fundamentals/exemplars/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/

## Issues Found
- The post said OpenTelemetry automatically attaches exemplars whenever a span is active. Updated this to say measurements are eligible for exemplar sampling when exemplar sampling is enabled and the context contains a sampled active span, matching the OpenTelemetry Metrics SDK TraceBased exemplar filter behavior.
- The Collector examples used `prometheusremotewrite`, which is now a deprecated alias. Updated examples and summary text to use the current `prometheus_remote_write` exporter name.
- The Collector remote write debug example used an HTTP endpoint without `tls.insecure: true`. Added the TLS setting required by the exporter when using a non-TLS endpoint.
- The Prometheus examples used `--storage.exemplars.max-exemplars`, which is not listed in current or v2.53 Prometheus command-line flags. Moved exemplar buffer sizing to `storage.exemplars.max_exemplars` in `prometheus.yml`.
- The Prometheus remote write receiver example used the deprecated feature flag `--enable-feature=remote-write-receiver`. Updated it to `--web.enable-remote-write-receiver`, the documented command-line flag.
- The post implied scrape-based exemplars have only limited format support. Reworded it to clarify that Prometheus needs OpenMetrics for scrape-based exemplars because the legacy Prometheus text format does not support exemplars.
- The Grafana display wording said exemplars appear as dots. Updated this to the less version-specific term "markers."
- The Grafana label-name pitfall implied `traceID` is universally expected. Reworded it so the configured Grafana exemplar label must match the actual label stored in Prometheus, such as `traceID` or `trace_id`.

## Review Notes
The post remains version-sensitive because Prometheus exemplar storage is still documented as experimental and Collector component names and feature gates have changed over time. The specific Prometheus image shown, `prom/prometheus:v2.53.0`, is outdated but the corrected flags are valid for that version and current Prometheus documentation.
