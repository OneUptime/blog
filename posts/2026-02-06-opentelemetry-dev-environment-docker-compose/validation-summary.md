# Validation Summary: How to Set Up an OpenTelemetry Development Environment with Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry JavaScript SDK for Node.js
- Docker Compose
- Jaeger
- Prometheus
- Grafana
- Loki
- Express.js

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector extensions registry: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Docker Compose CLI documentation: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose file version documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Prometheus installation and configuration documentation: https://prometheus.io/docs/prometheus/latest/installation/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.75/deployment/
- npm package registry metadata for current OpenTelemetry JavaScript package versions.

## Issues Found
- The Compose file used the obsolete top-level `version: '3.8'` property. Removed it to match the current Compose Specification.
- Docker commands used the legacy `docker-compose` command. Updated commands to `docker compose`.
- The Docker image versions were old for a 2026 guide. Updated OpenTelemetry Collector, Jaeger, Prometheus, Loki, and Grafana image tags to current pinned versions.
- The Collector exposed port `13133` but did not enable the `health_check` extension. Added the extension and enabled it under `service.extensions`.
- The Collector used the deprecated `logging` exporter. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The Collector used the Loki exporter and `/loki/api/v1/push` endpoint. Updated log export to `otlphttp/loki` with `endpoint: http://loki:3100/otlp`, matching current Loki OTLP ingestion guidance.
- The Collector metrics pipeline scraped its own Prometheus exporter through a Prometheus receiver. Removed the unnecessary Prometheus receiver from the Collector pipeline.
- The Prometheus configuration actively scraped `host.docker.internal:8080/metrics`, but the sample app does not expose a Prometheus `/metrics` endpoint. Changed that block to a commented optional example.
- The Node.js sample used outdated OpenTelemetry package versions and the old `metricExporter` `NodeSDK` option. Updated dependencies and changed metrics export to `PeriodicExportingMetricReader`.
- The Node.js sample used `new Resource()` and `SemanticResourceAttributes`, which are no longer the current documented JavaScript resource setup. Updated it to `resourceFromAttributes()` and `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION`.
- The custom counter was named `http_requests_total`, which could produce confusing Prometheus counter naming. Renamed it to `http_requests` and updated the Prometheus query example to `otel_http_requests_total`.
- The additional-service example used the OTLP gRPC port without setting the protocol. Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`.
- Processor ordering placed `batch` before later processors. Updated pipelines so `batch` is last.

## Review Notes
- Verified the updated Compose snippet with `docker compose config`.
- Verified the updated OpenTelemetry Collector snippet with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- Verified the Prometheus snippet with `prom/prometheus:v3.5.3 promtool check config`.
- Verified the Node.js snippets with `node --check`, `npm install`, and a runtime import/shutdown check for `tracing.js`.
