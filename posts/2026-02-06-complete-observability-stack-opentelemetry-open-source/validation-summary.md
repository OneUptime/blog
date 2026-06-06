# Validation Summary: How to Set Up a Complete Observability Stack with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry JavaScript SDK for Node.js
- Docker Compose
- Prometheus
- Grafana
- Jaeger
- Loki
- Helm
- Kubernetes

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- OpenTelemetry JavaScript NodeSDK docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry JavaScript SDK Node README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- Grafana Loki OTLP ingestion docs: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Helm installation docs: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki data source docs: https://grafana.com/docs/grafana/latest/features/datasources/loki/
- Grafana Docker installation docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Jaeger download and v2 image docs: https://www.jaegertracing.io/download/
- Jaeger getting started docs: https://www.jaegertracing.io/docs/2.15/getting-started/
- Prometheus releases: https://github.com/prometheus/prometheus/releases
- Prometheus configuration validated with `promtool` from `prom/prometheus:v3.12.0`

## Issues Found
- The OpenTelemetry Collector image and configuration used outdated components. Updated the Collector image to `0.153.0`, replaced the removed `logging` exporter with `debug`, replaced the deprecated Loki exporter path with the `otlphttp/loki` exporter to Loki's native OTLP endpoint, and updated internal telemetry metrics from the ignored `service.telemetry.metrics.address` field to `readers`.
- The Collector exposed port `13133` but did not configure the health check extension. Added the `health_check` extension and enabled it in `service.extensions`.
- Jaeger used the v1 all-in-one image, which is deprecated/EOL, and exposed host ports `4317` and `4318` that conflicted with the Collector. Updated to the Jaeger v2 image and exposed only the UI port on the host.
- Loki used an older 2.x image and legacy BoltDB/Table Manager retention configuration. Updated to Loki 3.7.2 with TSDB schema v13, filesystem storage, and compactor-based retention.
- Grafana derived fields referenced `datasourceUid: Jaeger` without assigning a matching Jaeger data source UID. Added `uid: jaeger` and updated the derived field reference.
- The Docker commands used the legacy `docker-compose` binary, which was not available locally and is superseded by Docker Compose V2. Updated commands to `docker compose`.
- The Node.js example referenced `PeriodicExportingMetricReader` without importing it and hardcoded `localhost` OTLP endpoints that would fail inside the Compose service. Added the missing import and made the endpoint respect `OTEL_EXPORTER_OTLP_ENDPOINT`.
- The dashboard and alert examples queried `http_requests_total`, but the Collector Prometheus exporter namespace prefixes it as `otel_http_requests_total`. Updated the PromQL examples and added a `status` attribute to the custom counter.
- The Prometheus scrape example implied scraping the demo app, but the demo sends metrics via OTLP and does not expose Prometheus-format metrics. Reworded that scrape job as optional for Prometheus-format application endpoints.
- The Kubernetes Helm section used the deprecated `grafana/loki-stack` chart and old Grafana chart repository. Updated Loki and Grafana chart commands to use `grafana-community`.

## Review Notes
- Validated the edited Collector configuration with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- Validated the edited Prometheus configuration with `promtool check config` from `prom/prometheus:v3.12.0`.
- Validated the edited Loki configuration with `grafana/loki:3.7.2 -verify-config=true`.
- Checked the JavaScript example with `node --check`.
