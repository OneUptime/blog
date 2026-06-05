# Validation Summary: How to Build a Complete LGTM Stack with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Go SDK
- Grafana
- Grafana Loki
- Grafana Tempo
- Grafana Mimir
- Docker Compose
- Helm charts
- Prometheus remote write

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Logs SDK specification: https://opentelemetry.io/docs/specs/otel/logs/sdk/
- OpenTelemetry Go `otelslog` bridge package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/bridges/otelslog
- OpenTelemetry Go logs global provider package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/log/global
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Grafana Loki structured metadata documentation: https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo metrics-generator documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana Tempo span metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/
- Grafana trace-to-logs correlation documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Mimir OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/mimir/latest/configure/configure-otel-collector
- Grafana Mimir HTTP API documentation: https://grafana.com/docs/mimir/latest/operators-guide/reference-http-api/
- Grafana Mimir visualization documentation: https://grafana.com/docs/mimir/latest/visualize/
- Docker Compose CLI documentation: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Grafana Loki Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Mimir Helm chart documentation: https://grafana.com/docs/mimir/latest/set-up/helm-chart/
- Grafana Tempo Helm chart documentation: https://grafana.com/docs/tempo/latest/setup/helm-chart/

## Issues Found
- The Grafana `tracesToMetrics` tag mapping used `service_name`, but Tempo's span metrics use the `service` label by default. Changed the trace-to-metrics mapping from `service_name` to `service` so the provided `traces_spanmetrics_calls_total{$$__tags}` queries match generated Tempo metrics.
- The Docker Compose example used the legacy top-level `version: "3.8"` field and the old `docker-compose` command. Removed the version field and changed the command to `docker compose up -d`, matching the current Compose Specification and Docker Compose V2 CLI.
- The Go sample configured an OpenTelemetry log exporter and logger provider, but did not connect `log/slog` to OpenTelemetry. Added the official `otelslog` bridge, registered the global OpenTelemetry log provider, and set the default `slog` logger so `slog.InfoContext` emits OTLP logs with context.
- The Go sample used older OpenTelemetry semantic convention package `v1.24.0`. Updated it to `v1.37.0`, the current semantic convention package shown in the OpenTelemetry Go package documentation consulted during review.
- The production Helm guidance referenced `loki-distributed`, which is no longer the current Loki chart guidance. Updated it to reference the `loki` chart alongside `mimir-distributed` and `tempo-distributed`.

## Review Notes
- The post intentionally uses `latest` container tags. This is workable for a local tutorial, but production examples should pin image versions to avoid config-schema drift.
- The Go compiler was not available in the local environment, so the Go snippet was reviewed against official package documentation rather than compiled locally.
