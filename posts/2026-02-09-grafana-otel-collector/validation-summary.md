# Validation Summary: How to implement Grafana with OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Python SDK and OTLP exporters
- Grafana Tempo
- Grafana Loki
- Prometheus and Prometheus scraping
- Kubernetes DaemonSet and Deployment manifests
- Docker Compose

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- Grafana Tempo OpenTelemetry Collector documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry semantic conventions deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Kubernetes command and arguments documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found
- The post used the deprecated/removed `loki` exporter and `/loki/api/v1/push` configuration. Updated Loki examples to use the `otlphttp` exporter with Loki's native OTLP endpoint at `http://loki:3100/otlp`.
- The multi-backend example used the old `jaeger` exporter. Updated it to send to Jaeger through an OTLP gRPC exporter endpoint.
- The Collector health example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current `readers.pull.exporter.prometheus` configuration.
- The Collector health example had duplicate top-level `service` keys. Merged telemetry and extensions under a single `service` block.
- The PromQL examples referenced `otelcol_processor_dropped_spans`, which is not part of the current first-party internal metrics list. Replaced it with current failed enqueue and refused spans metrics.
- The Kubernetes manifests used `command` for Collector flags, which overrides the image entrypoint. Changed those entries to `args` so the image's default entrypoint receives the config flag.
- Several YAML examples referenced `batch`, `otlp`, or `otlp/tempo` in pipelines without defining them in the same snippet. Added minimal definitions where needed.
- The Python example used Flask route syntax without creating a Flask app. Added the Flask import and app initialization, and made the local OTLP gRPC exporters explicitly insecure for the HTTP collector endpoint.
- The text described metrics as being exported to Prometheus. Clarified that the Prometheus exporter exposes a scrape endpoint, while Mimir can be reached by export paths such as remote write or OTLP.
- The Python example used the deprecated `deployment.environment` resource attribute. Updated it, and the Collector resource processor example, to `deployment.environment.name`.

## Review Notes
- The examples still use `:latest` container tags for brevity, but production deployments should pin Collector image versions.
- The Prometheus Kubernetes service discovery example assumes the Collector runs with suitable Kubernetes RBAC and network access.
