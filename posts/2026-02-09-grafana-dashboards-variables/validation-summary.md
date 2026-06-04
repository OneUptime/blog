# Validation Summary: How to implement Grafana dashboards with variables and templating

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboards
- Grafana variables and templating
- Prometheus data source variable queries
- PromQL
- Grafana dashboard JSON provisioning
- Grafana transformations

## Sources Consulted
- Grafana documentation: Variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/
- Grafana documentation: Add variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation: Variable syntax - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana Cloud documentation: Prometheus template variables - https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/template-variables/
- Grafana documentation: Transform data - https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana documentation: Provision Grafana dashboards - https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- Prometheus panel query examples used exact-match label filters with variables that were configured as multi-value and Include All. Changed them to use regex matchers with `${variable:regex}`, as required for Prometheus multi-value and All variables.
- Chained Prometheus variable examples used exact-match interpolation for parent variables. Updated the dependent metric selectors to use regex-compatible interpolation.
- Prometheus query variable examples used the deprecated classic `label_values(...)` form in UI-style configuration snippets. Updated the UI-style snippets to the current Prometheus variable editor fields: `Query type: Label values`, `Label`, and `Metric`.
- Advanced formatting examples used invalid syntax such as `$pod:pipe` and showed CSV/distributed formatting in misleading PromQL expressions. Updated the examples to use `${pod:pipe}`, `${pod:csv}`, and `${pod:distributed}` and clarified their intended usage.
- The transformation JSON for `filterByValue` omitted required condition metadata. Added the condition id, condition options, match mode, and include type.
- The data source variable example repeated `Type` for two different meanings. Changed the second field to `Data source type: Prometheus`.
- A PromQL query comment incorrectly implied that a query selects an environment-specific data source. Clarified that the PromQL uses the threshold variable and added the correct note that the panel data source should be set to `$prometheus_ds`.
- The testing section recommended running `label_values(...)` in Explore, but `label_values(...)` is a Grafana variable query helper rather than PromQL. Updated the section to test selectors in Explore and verify variable values in the variable editor preview.

## Review Notes
The dashboard JSON provisioning example keeps Grafana's classic `label_values(...)` query-string form because this is still a common exported dashboard JSON representation. Grafana's current Prometheus variable editor marks the classic query editor as deprecated, so future revisions could replace that JSON example with an exported dashboard model from the exact Grafana version targeted by the post.
