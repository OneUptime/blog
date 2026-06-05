# Validation Summary: How to Monitor Network Interface Throughput and Error Rates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Host Metrics receiver
- Network scraper
- Resource Detection processor
- Cumulative to Delta processor
- OTLP exporter
- Docker Compose
- PromQL / Prometheus-compatible querying and alerting

## Sources Consulted
- OpenTelemetry Collector Contrib Host Metrics Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Contrib Host Metrics Receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/metadata.yaml
- OpenTelemetry Collector Contrib Network Scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/networkscraper/metadata.yaml
- OpenTelemetry Collector Contrib Cumulative to Delta Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cumulativetodeltaprocessor/README.md
- OpenTelemetry Collector Contrib Resource Detection Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Contrib Resource Detection Processor metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/metadata.yaml
- OpenTelemetry Prometheus and OpenMetrics Compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry system metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases

## Issues Found
- Updated the receiver type from `hostmetrics` to the current `host_metrics` component type. The old type is now a deprecated alias in current Collector metadata.
- Updated the Resource Detection processor from `resourcedetection` to the current `resource_detection` component type. The old type is now a deprecated alias.
- Added `root_path: /hostfs` to the `host_metrics` receiver config and removed the Docker Compose `HOST_PROC` / `HOST_SYS` environment variables. Current host metrics documentation uses `root_path` so the receiver can read the mounted host filesystem.
- Updated the Collector Contrib image from `otel/opentelemetry-collector-contrib:0.96.0` to `otel/opentelemetry-collector-contrib:0.153.0`, the latest official release available during review.
- Corrected the `cumulativetodelta` explanation. The processor converts cumulative counters to delta temporality, not directly to bytes per second.
- Corrected the PromQL throughput metric from `system_network_io_total` to `system_network_io_bytes_total` for default OpenTelemetry-to-Prometheus name translation, because `system.network.io` has unit `By`.
- Narrowed the PromQL wording from "most OTLP-compatible backends" to "Prometheus-compatible backend" and noted the assumption that `host.name` is exposed as the `host_name` label.

## Review Notes
- The main Collector configuration was validated locally with `otel/opentelemetry-collector-contrib:0.153.0` using `otelcol-contrib validate` and a `/hostfs` mount.
- The alerting examples depend on the backend's OpenTelemetry-to-Prometheus translation and resource attribute promotion behavior. The post now states that assumption for the PromQL examples.
