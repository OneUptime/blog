# Validation Summary: How to Use Loki with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Loki
- OpenTelemetry Collector
- OTLP / OTLP HTTP
- Docker Compose
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- OpenTelemetry Go SDK
- LogQL
- Prometheus metrics

## Sources Consulted
- Grafana Loki documentation: Ingesting logs to Loki using OpenTelemetry Collector: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki documentation: Getting started with the OpenTelemetry Collector and Loki: https://grafana.com/docs/loki/latest/send-data/otel/otel-collector-getting-started/
- Grafana Loki documentation: Native OTLP endpoint versus Loki exporter: https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- OpenTelemetry Collector documentation: Configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector documentation: Internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib Loki exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/lokiexporter
- OpenTelemetry Collector Contrib routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript semantic conventions package guidance: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go otelslog package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/bridges/otelslog
- OpenTelemetry Python logs SDK documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/_logs.html

## Issues Found
- The post claimed Grafana Loki 2.9 supported the native OTLP endpoint and used `grafana/loki:2.9.4`. Native OTLP log ingestion is a Loki 3.x feature, so the prerequisite and Docker image were updated to Loki 3.x.
- The Docker Compose file exposed a non-existent Loki OTLP gRPC port. Loki's native OTLP example uses OTLP HTTP at `/otlp`, so the misleading `3101` mapping was removed.
- The Loki configuration used `distributor.otlp_config.default_labels_enabled`, which belongs to the deprecated Loki exporter behavior, not native OTLP ingestion. It was replaced with `default_resource_attributes_as_index_labels`.
- The Collector configuration used the deprecated Loki exporter and invalid `labels` / `tenant_id` settings for current guidance. The snippets now use `otlphttp` to send native OTLP logs to Loki.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored in current Collector versions. It was changed to the `metrics.readers` Prometheus pull configuration.
- The Docker file log receiver read `/var/lib/docker/containers` without mounting that path into the Collector container. The required read-only volume mount was added.
- The JavaScript example used removed/deprecated OpenTelemetry JS APIs such as `new Resource(...)`, older semantic convention exports, and post-construction log processor registration. It was updated to `resourceFromAttributes` and constructor-based log processor configuration.
- The Go example imported unused packages and relied on older semantic convention helpers. It now uses explicit `attribute.String` values for the resource and HTTP attributes, avoiding compile failures and stale semconv helpers.
- The multi-tenant routing example used the older routing processor/exporter style. It was updated to the routing connector pattern and tenant-specific `otlphttp` exporters using `X-Scope-OrgID`.
- The log filtering section included `tail_sampling`, which is a trace sampling processor and not a log sampling processor. That incorrect block was removed and the section heading was corrected.
- The LogQL examples treated native OTLP metadata as JSON log fields and used old exporter label names such as `env`. Queries were updated for native OTLP metadata and normalized Loki label names.
- The troubleshooting and label configuration snippets still referenced the deprecated Loki exporter. They now use `otlphttp` and Loki-side label configuration.

## Review Notes
OpenTelemetry logs remain less stable than traces and metrics in some language SDKs, especially JavaScript and Go, so future updates should re-check SDK API changes before publishing. The article now follows Grafana's recommended native OTLP path instead of the deprecated Loki exporter path.
