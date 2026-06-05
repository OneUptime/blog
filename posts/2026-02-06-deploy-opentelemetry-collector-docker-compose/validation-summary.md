# Validation Summary: How to Deploy the OpenTelemetry Collector on Docker and Docker Compose

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- Docker
- Docker Compose
- OTLP gRPC and OTLP HTTP
- Jaeger
- Prometheus remote write
- Grafana Loki
- Grafana

## Sources Consulted
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporters registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector receivers registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector extensions registry: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector Docker Stats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/dockerstatsreceiver
- OpenTelemetry Collector releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- OpenTelemetry Demo Docker deployment documentation: https://opentelemetry.io/docs/demo/docker-deployment/
- Local validation using `otel/opentelemetry-collector-contrib:0.153.0 validate`

## Issues Found
- The post described official images as only coming through GitHub Container Registry while using Docker Hub image names. Updated the text and examples to show Docker Hub and GHCR image references.
- The examples used OpenTelemetry Collector `0.93.0` and called it the latest stable version. Updated examples to `0.153.0`, the current release verified during review.
- The Collector examples used the deprecated/removed `logging` exporter. Replaced it with the current `debug` exporter and validated the configs.
- The complete Collector config used the removed `memory_ballast` extension. Removed it from the config and enabled current memory management through `memory_limiter`.
- The Loki exporter example used the removed Collector Loki exporter and `/loki/api/v1/push`. Replaced it with `otlphttp/loki` targeting Loki's native OTLP endpoint and updated the Loki config to enable structured metadata.
- The Docker Compose stack configured `docker_stats` but did not mount the Docker socket or handle official-image non-root access. Added the socket mount and local-example `user: "0"` caveat.
- The Collector healthcheck used `wget`, but the official Collector image does not include `wget`, `curl`, or a shell. Replaced it with a Collector binary validation command and clarified the limitation.
- The `service.telemetry.metrics.address` setting is ignored/invalid in current Collector versions. Replaced it with the current `readers.pull.exporter.prometheus` form.
- Environment variable substitution in Collector config used legacy `${VAR}` syntax. Updated Collector config examples to `${env:VAR}`.
- The two-tier gateway exported metrics and logs to Jaeger over OTLP, which is not appropriate for the Jaeger trace backend. Changed metrics and logs pipelines to use the debug exporter.
- The two-tier `memory_limiter` examples omitted the required `check_interval`. Added `check_interval: 1s`.
- The sample application image `otel/opentelemetry-demo-frontend:latest` was not a valid current public image reference. Updated it to `ghcr.io/open-telemetry/demo:2.2.0-frontend`.
- Updated Docker Compose commands from the legacy `docker-compose` form to `docker compose`.
- Updated troubleshooting commands so they do not rely on utilities inside the minimal Collector image.

## Review Notes
The Collector YAML snippets for the basic, complete, agent, and gateway configurations were validated with the `otel/opentelemetry-collector-contrib:0.153.0` image. The full multi-service stack was not started end-to-end during review.
