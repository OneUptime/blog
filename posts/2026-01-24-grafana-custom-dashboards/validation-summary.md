# Validation Summary: How to Create Custom Dashboards in Grafana

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana dashboards
- Grafana panels and visualizations
- Grafana dashboard variables
- Grafana annotations
- Grafana dashboard JSON import/export
- Prometheus
- PromQL
- Prometheus recording rules
- Kubernetes metrics

## Sources Consulted
- Grafana documentation: Create dashboards - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana documentation: Dashboard panel groupings - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard/dashboard-groupings/
- Grafana documentation: Prometheus template variables - https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Annotate visualizations - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Grafana documentation: Share dashboards and panels - https://grafana.com/docs/grafana/latest/visualizations/dashboards/share-dashboards-panels/
- Grafana documentation: Import dashboards - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Operators - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Defining recording rules - https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The dashboard creation navigation used the older left-sidebar plus icon flow. Updated it to the current documented path: **Dashboards** > **New** > **New Dashboard**.
- The row creation instruction used **Add** > **Row**, which does not match current Grafana dashboard grouping documentation. Updated it to enter edit mode and use **+ New row**.
- The latency percentile panel showed three PromQL expressions together without explaining that Grafana should run them as separate panel queries. Added a note that they should be added as separate queries.
- The dashboard variable example used the classic `label_values(http_requests_total, namespace)` syntax, which Grafana now documents as deprecated for Prometheus variables. Replaced it with the current Query variable fields: Query type `Label values`, metric `http_requests_total`, and label `namespace`.
- The dashboard settings and JSON export/import instructions used older UI paths. Updated them to the current documented settings, export-as-code, and import-dashboard paths.

## Review Notes
The PromQL examples use current Prometheus functions and operators (`rate`, `increase`, `histogram_quantile`, `sum by`, `topk`, and `count`) in ways consistent with official documentation. The metric names are illustrative and assume the relevant application, node exporter, and kube-state-metrics style metrics exist in the target Prometheus environment.
