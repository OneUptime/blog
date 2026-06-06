# Validation Summary: How to Build a Performance Comparison Dashboard for A/B Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Go SDK
- OpenTelemetry semantic conventions and resource attributes
- OpenTelemetry Collector / Prometheus metric export
- Prometheus and PromQL
- Grafana dashboards and template variables
- Python requests library

## Sources Consulted
- OpenTelemetry Go resources documentation: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry Go semconv package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.40.0
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus OpenTelemetry ingestion guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus query function documentation for `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana Prometheus template variable documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- OpenTelemetry Prometheus exporter Go package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/prometheus

## Issues Found
- The first Go snippet imported `go.opentelemetry.io/otel/metric` but did not use it, which would fail Go compilation. Removed the unused import.
- The Go resource snippet used an older semantic convention import and helper style. Updated it to `go.opentelemetry.io/otel/semconv/v1.40.0` and the current `ServiceNameKey.String` / `ServiceVersionKey.String` resource attribute style.
- The OpenTelemetry counter instrument names included the Prometheus `_total` concept in the OTel-side metric name. Renamed them to `http.requests` and `http.errors`; the Prometheus exporter still produces `http_requests_total` and `http_errors_total` by applying Prometheus counter suffix rules.
- The PromQL filtered on `deployment_variant`, but the post only showed `deployment.variant` as an OpenTelemetry resource attribute. Added the missing requirement to promote or copy that resource attribute into Prometheus metric labels.
- The dashboard JSON hard-coded stable and canary even though the later variables claimed operators could compare arbitrary variants and filter routes. Updated the panel queries to use `$variant_a`, `$variant_b`, `$route`, regex matchers for multi-value variables, and Grafana's `$__rate_interval`.
- The route variable was marked multi-select without an All option even though the panel queries use it as a route filter. Added the All option and default.
- The Python canary script could pass with no usable Prometheus results because an empty `checks` list still returned `True`. Updated it to require at least one check, added HTTP status handling with `raise_for_status()`, and guarded the latency ratio against a zero baseline.

## Review Notes
The dashboard JSON is still a partial Grafana model focused on panel definitions, not a complete importable dashboard. That is acceptable for the post's stated scope, but a future version could include datasource UIDs, templating JSON, units, thresholds, and alert rules.
