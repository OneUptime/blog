# Validation Summary: How to Time Shift Single Query Backwards in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboards and panels
- Grafana panel time range overrides
- Grafana transformations
- Grafana template variables
- Prometheus
- PromQL

## Sources Consulted
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Grafana query and transform data documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/
- Grafana dashboard time range documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/
- Grafana transform data documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana Join by field transformation learning path: https://grafana.com/docs/learning-paths/data-transformation/join-by-field/
- Grafana Add field from calculation transformation learning path: https://grafana.com/docs/learning-paths/data-transformation/add-field-from-calculation/
- Grafana custom variable documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- Grafana relative time guidance implied the setting could be applied to separate queries in the same panel for non-PromQL sources. Grafana documents Relative time and Time shift as panel-level query options, so the section now states that they apply to the whole panel and uses panel-level examples.
- The DST section described `offset 1d` as a calendar-day offset. Prometheus documents `1d` as exactly `24h`, ignoring daylight saving time, so the example now explains that both `24h` and `1d` are fixed 24-hour durations.
- The custom variable key/value example used YAML mapping syntax instead of Grafana custom variable CSV key/value syntax. It now uses `Same time yesterday : 1d, ...` and notes that `${compare_period:value}` should be used in queries.

## Review Notes
The PromQL `offset` examples are syntactically correct, including use with range vectors such as `rate(http_requests_total[5m] offset 1w)`. The Grafana JSON snippets are partial panel/dashboard examples rather than complete importable dashboards; future revisions could state that explicitly.
