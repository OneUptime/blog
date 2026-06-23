# Validation Summary: How to Add Trace Exemplars to Go Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- OpenTelemetry Go SDK
- OpenTelemetry metrics and traces
- Prometheus exporter and OpenMetrics exemplars
- Prometheus configuration
- Grafana Prometheus data source exemplars

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go getting started prerequisites: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go Prometheus exporter package docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/prometheus
- OpenTelemetry Go metric SDK package docs: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go exemplar package docs: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric/exemplar
- OpenTelemetry Prometheus and OpenMetrics compatibility spec: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Prometheus metrics exporter spec: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana Prometheus data source provisioning docs: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Prometheus OTLP translator package docs: https://pkg.go.dev/github.com/prometheus/otlptranslator

## Issues Found
- Updated the Go prerequisite from 1.21 to 1.23 to match current OpenTelemetry Go documentation.
- Replaced deprecated `prometheus.WithoutUnits()` usage with `prometheus.WithTranslationStrategy(otlptranslator.UnderscoreEscapingWithoutSuffixes)` and added the required dependency/import.
- Corrected exemplar wording from unconditional automatic attachment to sampled-span and reservoir-based behavior, matching the OpenTelemetry Go exemplar filter behavior.
- Added missing imports in code examples (`math/rand`, Prometheus client package) and removed unused imports.
- Added the required Prometheus `--enable-feature=exemplar-storage` note for exemplar storage configuration.
- Replaced deprecated HTTP semantic convention attributes with current attribute names such as `http.request.method`, `url.full`, `url.path`, `user_agent.original`, and `http.response.status_code`.
- Corrected the custom exemplar labels section: baggage is not automatically exported as exemplar labels in the Go SDK; filtered metric attributes are the supported mechanism.
- Updated semantic convention imports from `v1.24.0` to `v1.41.0`.

## Review Notes
The environment does not have the `go` tool installed, so snippets were reviewed against official package documentation rather than compiled locally.
