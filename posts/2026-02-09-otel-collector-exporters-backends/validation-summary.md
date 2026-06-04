# Validation Summary: How to implement OpenTelemetry Collector exporters to multiple backends

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP and OTLP HTTP exporters
- Prometheus Remote Write exporter
- Jaeger OTLP ingestion
- AWS CloudWatch Logs, AWS CloudWatch EMF, and AWS X-Ray exporters
- Google Cloud exporter
- Azure Monitor exporter
- Kafka exporter
- Load Balancing exporter
- File exporter
- Failover connector
- Kubernetes kubectl commands and PrometheusRule alerts

## Sources Consulted
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- AWS CloudWatch EMF exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awsemfexporter/README.md
- AWS CloudWatch Logs exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awscloudwatchlogsexporter/README.md
- Google Cloud exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/googlecloudexporter/README.md
- Azure Monitor exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/azuremonitorexporter/README.md
- Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- Load Balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- File exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- Failover connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector/README.md
- Grafana Cloud OTLP endpoint docs: https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The OneUptime exporter example used a gRPC `otlp` exporter pointed at `oneuptime.com:443` with `x-oneuptime-api-key`. Changed it to `otlp_http/oneuptime`, `https://oneuptime.com/otlp`, JSON encoding, and `x-oneuptime-token`, matching OneUptime's OTLP ingestion docs.
- The Grafana Cloud example used a gRPC-style endpoint. Changed it to `otlp_http/grafana-cloud` with the documented `https://.../otlp` endpoint format.
- The Prometheus Remote Write snippets used the deprecated `prometheusremotewrite` component name and deprecated `add_metric_suffixes`. Updated them to `prometheus_remote_write` and `translation_strategy`.
- The native Jaeger exporter example was outdated because current Collector releases no longer include native Jaeger exporters. Replaced it with an OTLP exporter targeting Jaeger's OTLP endpoint.
- The AWS CloudWatch example used a non-existent combined `awscloudwatch` exporter for both logs and metrics. Split it into `awscloudwatchlogs` for logs and `awsemf` for metrics, while keeping `awsxray` for traces.
- The Google Cloud example placed `resource_filters` at the exporter top level. Moved it under the `metric` block, where the exporter documents that setting.
- The Azure Monitor example used legacy `instrumentation_key` and underscored batch field names. Updated it to the recommended `connection_string` and current `maxbatchsize` / `maxbatchinterval` fields.
- The Kafka example used current-deprecated or unsupported field placement for topic, encoding, TLS, and metadata retry settings. Moved trace topic and encoding under `traces`, moved TLS to top level, and replaced metadata retry settings with `refresh_interval`.
- The Load Balancing exporter example used the deprecated `loadbalancing` alias and configured both static and DNS resolvers together. Updated it to `load_balancing` and kept one resolver.
- The File exporter example used `gzip` compression, but the current file exporter documents `zstd` as the supported compression algorithm. Updated the compression value.
- The failover example used the removed/deprecated routing processor and described it as failover. Replaced it with the current failover connector pattern.
- The troubleshooting snippet attempted to configure a `debug` block inside an OTLP exporter. Replaced it with Collector telemetry log-level configuration.
- The explanatory text overstated loss prevention and referenced the Jaeger exporter as current. Adjusted the wording to avoid implying guaranteed no-loss behavior and to avoid the outdated Jaeger exporter reference.

## Review Notes
- Some examples depend on distribution choice. Several components are in `otelcol-contrib` or the Kubernetes distribution rather than every Collector build.
- The failover connector is alpha according to the official component README, so production users should test behavior carefully.
- Prometheus Remote Write ingestion into a vanilla Prometheus server may require Prometheus-side receiver configuration; the exporter endpoint alone is not sufficient if remote write receiving is disabled.
