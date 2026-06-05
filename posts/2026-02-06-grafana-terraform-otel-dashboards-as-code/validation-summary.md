# Validation Summary: How to Build Observability Dashboards as Code with Grafana Terraform Provider

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana
- Grafana Terraform provider
- Terraform HCL
- OpenTelemetry
- Prometheus
- Tempo
- TraceQL
- Loki
- Grafana dashboard JSON

## Sources Consulted
- Grafana Terraform provider documentation: https://registry.terraform.io/providers/grafana/grafana/latest
- `grafana_dashboard` resource documentation: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard.html
- `grafana_data_source` resource documentation: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source
- Grafana service account documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Loki data source provisioning and derived fields documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Prometheus data source configuration documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli

## Issues Found
- Updated the Grafana Terraform provider constraint from `~> 2.0` to `~> 4.0` so the example targets the current provider major version.
- Replaced the `grafana_api_key` variable with `grafana_service_account_token`, because Grafana service account tokens are now the primary recommended authentication mechanism for automated Grafana API access.
- Added explicit datasource UIDs and used local UID values in datasource correlation settings. The original Tempo, Prometheus, and Loki resources referenced each other's computed `uid` attributes, which would create Terraform dependency cycles.
- Updated PromQL dashboard filters from `service_name` to `job`. Current OpenTelemetry-to-Prometheus compatibility maps `service.name` to the Prometheus `job` label by convention unless resource attributes are explicitly copied to metric labels.
- Updated the TraceQL `select` expression to use intrinsic field syntax, `span:duration` and `span:status`, matching the current TraceQL field syntax.

## Review Notes
The dashboard JSON remains intentionally minimal for a tutorial. Production dashboards may also want explicit panel `refId` values, dashboard UIDs, units, alerting rules, and handling for namespaced OpenTelemetry services where `job` may be `<service.namespace>/<service.name>`.
