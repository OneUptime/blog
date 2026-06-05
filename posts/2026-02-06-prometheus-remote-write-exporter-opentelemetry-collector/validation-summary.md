# Validation Summary: How to Configure the Prometheus Remote Write Exporter

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- Prometheus Remote Write exporter
- Prometheus remote write receiver
- Grafana Cloud Metrics
- Amazon Managed Service for Prometheus
- Cortex, Grafana Mimir, Thanos, and VictoriaMetrics
- OpenTelemetry Collector authentication extensions
- OpenTelemetry Collector routing connector

## Sources Consulted
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration and environment substitution documentation: https://opentelemetry.io/docs/collector/configuration/
- Prometheus HTTP API documentation for remote write receiver: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus data model documentation: https://prometheus.io/docs/concepts/data_model/
- Grafana Cloud OpenTelemetry Collector documentation: https://grafana.com/docs/grafana-cloud/monitor-infrastructure/kubernetes-monitoring/configuration/config-other-methods/otel-collector/
- AWS Distro for OpenTelemetry SigV4 documentation: https://aws-otel.github.io/docs/sigv4/
- AWS Distro for OpenTelemetry AMP Prometheus Remote Write configuration documentation: https://aws-otel.github.io/docs/getting-started/advanced-prometheus-remote-write-configurations/

## Issues Found
- Replaced the deprecated `prometheusremotewrite` component type with the current `prometheus_remote_write` component type in all Collector snippets.
- Added the required Prometheus receiver flag `--web.enable-remote-write-receiver` for Prometheus endpoints.
- Removed `x-prometheus-remote-write-version` from user-configured exporter headers because the exporter sets protected remote write protocol headers itself.
- Corrected the Grafana Cloud example to use Basic Auth credentials rather than a bearer token header.
- Clarified metric translation by noting that non-cumulative monotonic, histogram, and summary OTLP metrics are dropped by the exporter.
- Replaced invalid `max_concurrent_requests` configuration with `max_batch_request_parallelism`.
- Corrected compression guidance: the exporter only supports Snappy compression for Prometheus Remote Write.
- Replaced unsupported `sending_queue` and `file_storage` configuration with the exporter's `remote_write_queue` and `wal` settings.
- Replaced the deprecated routing processor example with the routing connector pattern and current `default_pipelines`/`pipelines` syntax.
- Corrected troubleshooting guidance that said empty label values are not allowed; Prometheus permits empty label values.
- Clarified that an empty-body curl authentication check can return `400 Bad Request` after successful authentication because payload validation still fails.
- Replaced an outdated internal latency metric example with current Collector internal telemetry metrics.

## Review Notes
The post is now technically valid for current OpenTelemetry Collector guidance, but the Prometheus Remote Write exporter and routing connector remain beta/alpha components respectively, so future Collector releases may still introduce configuration changes.
