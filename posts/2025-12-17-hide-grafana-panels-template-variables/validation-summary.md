# Validation Summary: How to Hide Grafana Panels Based on Template Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboards
- Grafana template variables
- Grafana panel and row repeats
- Grafana Show / hide rules
- Grafana transformations
- Prometheus / PromQL
- Grafana dashboard JSON

## Sources Consulted
- Grafana documentation: Configure panel options and repeating panels - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-panel-options/
- Grafana documentation: Create dashboards, repeat options, and Show / hide rules - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard/
- Grafana documentation: Variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/
- Grafana documentation: Variable syntax - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana documentation: Prometheus template variables - https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Transform data and Filter fields by name transformation - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana documentation: Dashboard links - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/manage-dashboard-links/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Prometheus documentation: Querying basics and label matchers - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Operators - https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post incorrectly said Grafana lacks native conditional panel visibility. Current Grafana documentation includes Show / hide rules for panels, rows, or tabs based on template variables, query results, and time ranges. Updated the introduction, TL;DR, challenge section, troubleshooting, and conclusion to describe native Show / hide rules.
- Prometheus queries used exact matching with multi-value Grafana variables, such as `service="$service"`. Grafana's Prometheus documentation says multi-value or Include All variables should be used with regex matching. Updated examples to use `service=~"${service:regex}"`.
- Several PromQL snippets attempted string comparisons against Grafana variables, such as `"$service" == "api"` and `$environment != "production"`. These are not valid PromQL expressions. Replaced them with valid label matcher patterns that return no data when the selected variable does not match.
- The no-data panel configuration included `showNoDataMessage`, which is not supported by the consulted current Grafana panel option documentation. Replaced it with documented Show / hide rule configuration using query-result visibility.
- The transformation example used the wrong transformation ID, `filterByName`. Updated it to `filterFieldsByName`, matching Grafana's Filter fields by name transformation.
- The "All" selection section proposed a hidden custom variable with incompatible fields and unclear `$__all` detection. Replaced it with direct template-variable Show / hide rule configuration.
- The production-only and development-debug examples did not actually depend on the selected environment, or used invalid PromQL. Updated them to use valid Prometheus label matchers.

## Review Notes
- Grafana's Show / hide rule availability can vary by dashboard layout and Grafana version; current documentation notes panel show/hide rules are configurable for panels in Auto grid layout.
- The dashboard JSON example remains a classic dashboard-style example. Grafana documentation now also describes a newer V2 Resource model for dashboards.
