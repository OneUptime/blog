# Validation Summary: How to Use Grafana Dashboard Templating with Repeating Panels per Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboards
- Grafana template variables
- Grafana repeating panels and rows
- Prometheus and PromQL
- Kubernetes namespace metrics
- Grafana dashboard provisioning
- Terraform Grafana provider

## Sources Consulted
- Grafana documentation: Variables - https://grafana.com/docs/grafana/latest/dashboards/variables/
- Grafana documentation: Configure repeat options - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard/
- Grafana documentation: Prometheus template variables - https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Variable syntax - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana documentation: Dashboard HTTP API - https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana documentation: Provision Grafana - https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana documentation: Time series visualization - https://grafana.com/docs/grafana/latest/panels/visualizations/time-series/graph-time-series-stacking/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Terraform Registry: grafana_dashboard resource - https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard

## Issues Found
- The post used classic `label_values(...)` variable query syntax in setup instructions. Grafana documents that classic variable queries are deprecated, so the setup examples were changed to the current Prometheus "Label values" query type with explicit label and metric inputs.
- Several PromQL examples used exact matchers such as `namespace="$namespace"` with multi-value or All-enabled variables. Grafana's Prometheus variable documentation requires regex matchers for those variables, so these were changed to `namespace=~"$namespace"` and similar matchers.
- Rate queries used a fixed `[5m]` range. Grafana recommends `$__rate_interval` for Prometheus `rate()` queries, so the dashboard examples were updated accordingly.
- Dashboard JSON examples used the legacy `graph` visualization type. Grafana's current default graph visualization is `timeseries`, so the examples were updated to `timeseries`.
- The latency p95 PromQL example passed raw classic histogram bucket rates directly to `histogram_quantile`. For an aggregated p95, Prometheus requires preserving the `le` label in the bucket aggregation, so the expression was changed to `histogram_quantile(0.95, sum(rate(..._bucket[...])) by (le))`.
- The provisioning example copied dashboard JSON into `/etc/grafana/provisioning/dashboards/`, which is where dashboard provider YAML files are configured. Grafana loads dashboard JSON from the provider's configured `options.path`, so the example now copies JSON to `/var/lib/grafana/dashboards/` and notes the required provider configuration.

## Review Notes
The remaining JSON snippets are illustrative dashboard fragments. A production dashboard export may include additional fields such as `schemaVersion`, `uid`, `gridPos`, data source UIDs, panel options, and complete variable option objects depending on the Grafana version and export format.
