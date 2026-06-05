# Validation Summary: How to Set Up a Local OpenTelemetry Playground with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Docker Compose
- Jaeger
- Prometheus
- Grafana
- YAML configuration
- curl

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose up command reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose ps command reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector troubleshooting/debug exporter documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector/releases
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Prometheus downloads/releases: https://prometheus.io/download/
- Grafana Docker image documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana Jaeger data source documentation: https://grafana.com/docs/grafana/latest/datasources/jaeger/

## Issues Found
- The Docker Compose example used the top-level `version: '3.8'` field. Docker's current Compose Specification treats this field as obsolete and only informative, so it was removed.
- The container image tags were significantly outdated for a 2026-dated tutorial. Updated OpenTelemetry Collector, Jaeger, Prometheus, and Grafana image tags to current documented release lines while preserving the same architecture and configuration style.
- The verification step said `docker compose ps` confirms services are healthy, but the Compose file does not define healthchecks. Changed the wording to say it verifies the services are running.
- The application environment variable example used the OTLP HTTP endpoint on port 4318 without setting `OTEL_EXPORTER_OTLP_PROTOCOL`. OpenTelemetry documents the default protocol as SDK-dependent, so `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` was added to make the example deterministic.

## Review Notes
- The OTLP/HTTP JSON test payload is valid for OTLP JSON: the specification uses lowerCamelCase fields, integer enum values, and hex-encoded `traceId` and `spanId` values.
- The Jaeger all-in-one setup uses in-memory storage by default, which is appropriate for a local playground but not for production persistence.
