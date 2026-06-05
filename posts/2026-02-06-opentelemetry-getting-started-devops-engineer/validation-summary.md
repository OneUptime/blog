# Validation Summary: How to Get Started with OpenTelemetry as a DevOps Engineer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector processors, receivers, exporters, and extensions
- Docker
- Kubernetes
- Helm
- Prometheus and Prometheus Remote Write
- Kafka
- Kubernetes Secrets
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector host metrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector official releases: https://github.com/open-telemetry/opentelemetry-collector-releases
- Local validation with `otel/opentelemetry-collector-contrib:0.153.0 validate`

## Issues Found
- Replaced the deprecated/removed `logging` exporter configuration with the current `debug` exporter and updated pipeline exporter references. The debug exporter is the current supported console troubleshooting exporter.
- Updated the Docker image tag from `0.92.0` to `0.153.0`, the latest official Collector release available during review.
- Added the `health_check` extension and exposed port `13133` so the documented health-check `curl http://localhost:13133/` command works.
- Replaced `service.telemetry.metrics.address` with the current `readers.pull.exporter.prometheus.host` and `port` configuration because `address` is ignored in Collector v0.123.0 and later.
- Removed nonexistent client certificate paths from the introductory OTLP exporter example and used an insecure example endpoint so the learning configuration validates without missing local files.
- Changed the Helm starter values to use the `debug` exporter instead of a placeholder OTLP backend, keeping the example installable without requiring an external backend.
- Updated the filter processor example from the older `metrics.exclude` / `spans.exclude` style to current OTTL-based `metric_conditions` and `trace_conditions`.
- Corrected the Kafka exporter example so `topic` and `encoding` are configured under `traces`, `metrics`, and `logs`, and `compression` is nested under `producer`.
- Updated collector self-monitoring metric examples and alerts from outdated or incorrect metric names to current internal telemetry names.

## Review Notes
The main Docker collector configuration, updated filter processor example, and updated Kafka exporter example were validated locally with `otel/opentelemetry-collector-contrib:0.153.0 validate`. Some snippets remain illustrative and require environment-specific endpoints, credentials, RBAC, backend services, or Kubernetes cluster context before they can run in production.
