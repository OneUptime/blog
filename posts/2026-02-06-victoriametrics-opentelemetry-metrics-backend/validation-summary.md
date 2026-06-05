# Validation Summary: How to Configure VictoriaMetrics as an OpenTelemetry Metrics Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VictoriaMetrics single-node
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector and OTLP HTTP exporter
- OpenTelemetry Go SDK metrics
- Docker Compose
- Grafana Prometheus datasource
- MetricsQL / PromQL
- vmalert alert rules

## Sources Consulted
- VictoriaMetrics OpenTelemetry integration docs: https://docs.victoriametrics.com/victoriametrics/integrations/opentelemetry/
- VictoriaMetrics OpenTelemetry Collector ingestion docs: https://docs.victoriametrics.com/victoriametrics/data-ingestion/opentelemetry-collector/
- VictoriaMetrics single-node flags via `victoriametrics/victoria-metrics:v1.102.0 -help`
- VictoriaMetrics Grafana integration docs: https://docs.victoriametrics.com/victoriametrics/integrations/grafana/
- VictoriaMetrics vmalert docs: https://docs.victoriametrics.com/victoriametrics/vmalert/
- VictoriaMetrics MetricsQL docs: https://docs.victoriametrics.com/metricsql/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector OTLP HTTP exporter docs: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OpenTelemetry Collector receiver and processor component docs: https://opentelemetry.io/docs/collector/components/receiver/ and https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Go semantic conventions package docs: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Go metric SDK docs: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric

## Issues Found
- The Docker Compose example used `--openTelemetryListenAddr=:8428`, which is not a valid VictoriaMetrics v1.102.0 flag. Removed it because VictoriaMetrics serves OTLP ingestion on the regular HTTP API path.
- The query examples assumed Prometheus-compatible OpenTelemetry names, but the post did not enable that VictoriaMetrics behavior. Added `--opentelemetry.usePrometheusNaming` and clarified that the naming conversion depends on this flag.
- The OTLP endpoint probe sent JSON `{}` to VictoriaMetrics, but VictoriaMetrics expects protobuf-encoded OTLP metrics. Changed the probe to use `Content-Type: application/x-protobuf` with an empty body, which returns an empty 200 response.
- The Collector example used the deprecated `otlphttp` exporter alias and a base `endpoint`. Updated it to `otlp_http/victoriametrics` and `metrics_endpoint: http://localhost:8428/opentelemetry/v1/metrics`.
- The Collector example used the `resourcedetection` processor without noting that this processor is provided by the Contrib distribution. Added a short clarification.
- The Go example used older semantic convention package `v1.21.0` and `semconv.DeploymentEnvironment`. Updated to `semconv/v1.37.0` and `semconv.DeploymentEnvironmentName`.
- The alert example filtered `status_code`, but the Go request counter did not record a `status_code` attribute. Added a `status_code="200"` attribute to the counter example.
- The `topk_avg` MetricsQL example passed `"service_name"` as a third argument, which is not the documented syntax. Changed it to rank the `sum by (service_name)` request-rate series directly.

## Review Notes
- Verified the Go code builds against current OpenTelemetry Go modules using `golang:1.25`.
- Verified the OpenTelemetry Collector configuration validates with the current `otel/opentelemetry-collector-contrib` image.
- Verified VictoriaMetrics v1.102.0 starts with the corrected flags, `/health` returns `OK`, and the OTLP path accepts an empty protobuf request with HTTP 200.
