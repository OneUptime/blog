# Validation Summary: How to Configure Exporters in OpenTelemetry

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP HTTP exporter
- OTLP gRPC exporter
- Debug exporter
- File exporter
- Prometheus exporter
- Prometheus Remote Write exporter
- Kafka exporter
- Load Balancing exporter
- File Storage extension
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector OTLP HTTP exporter docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector OTLP gRPC exporter docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector exporter helper docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector debug exporter docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Contrib file exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector Contrib Prometheus exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Contrib Kafka exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Contrib Load Balancing exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector Contrib File Storage extension docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- Updated OTLP HTTP exporter snippets from the deprecated `otlphttp` component type to `otlp_http`, matching the current component name.
- Fixed signal-specific OTLP HTTP endpoint examples. The `endpoint` setting is a base URL that appends `/v1/traces`, `/v1/metrics`, or `/v1/logs`; full signal paths now use `traces_endpoint`, `metrics_endpoint`, and `logs_endpoint`.
- Changed the file exporter compression example from `gzip` to `zstd`, because the current file exporter documents `zstd` as the supported compression algorithm.
- Updated Prometheus Remote Write exporter from the deprecated `prometheusremotewrite` alias to `prometheus_remote_write` and added `remote_write_queue`, since that exporter does not use the standard `sending_queue`.
- Updated the Kafka exporter example to configure topic and encoding under the `traces` signal block, and moved TLS configuration to top-level `tls` because `auth.tls` is deprecated.
- Updated the Load Balancing exporter component type from deprecated `loadbalancing` to `load_balancing`.
- Replaced the obsolete `service.telemetry.metrics.address` example with the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- Corrected and expanded internal metric names to reflect current Collector metric naming for spans, metric points, and log records.
- Updated interpolated secret examples to use the explicit `${env:VAR}` environment provider syntax.

## Review Notes
- The post remains version-neutral. Some Collector component schemas continue to evolve quickly, especially internal telemetry configuration, so future reviews should re-check these snippets against the current Collector docs.
- The `otlp` gRPC component name is still shown in official examples, though official docs also show `otlp_grpc`; the existing `otlp` usage was left unchanged because it remains valid.
