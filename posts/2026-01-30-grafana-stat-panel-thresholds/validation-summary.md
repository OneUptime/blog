# Validation Summary: How to Build Grafana Stat Panel Thresholds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana stat panels
- Grafana thresholds, field configuration, field overrides, and value mappings
- Grafana dashboard JSON
- Prometheus / PromQL
- Observability dashboard design

## Sources Consulted
- Grafana documentation: Configure thresholds - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-thresholds/
- Grafana documentation: Stat visualization - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/stat/
- Grafana documentation: Configure value mappings - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-value-mappings/
- Grafana documentation: Configure standard options - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/
- Grafana documentation: Configure field overrides - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-overrides/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana OpenAPI/dashboard schema in local source checkout: `.tmp/grafana-src-review/packages/grafana-openapi/src/apis/dashboard.grafana.app-v2.json`
- Grafana threshold implementation in local source checkout: `.tmp/grafana-src-review/packages/grafana-data/src/field/thresholds.ts`
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- Corrected the threshold evaluation explanation. Grafana threshold steps are sorted by value and the active color is the highest matching step, rather than evaluating from highest to lowest with the first match.
- Updated the threshold evaluation Mermaid diagram and summary table to match Grafana's threshold behavior.
- Corrected the dynamic-threshold section. Static stat panel threshold values are field configuration; dynamic status should be calculated in the query, handled with value mappings, or applied through field overrides.
- Fixed the PromQL error-rate example so it calculates a 5xx percentage using a numerator divided by total request rate, instead of multiplying a raw 500-rate by 100.
- Wrapped field overrides in the proper `fieldConfig.overrides` dashboard JSON shape.
- Added explicit `"mode": "absolute"` fields to threshold snippets that only showed `steps`, matching Grafana's threshold configuration shape.
- Changed commented JSON examples to `jsonc` and split multi-object code blocks so each snippet is syntactically valid.

## Review Notes
The threshold values shown are example operational choices and should still be tuned to each system's SLOs, capacity, and alerting policy. No deprecated Grafana APIs were found in the reviewed examples.
