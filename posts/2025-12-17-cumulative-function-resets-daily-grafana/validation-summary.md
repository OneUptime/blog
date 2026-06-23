# Validation Summary: How to Create Cumulative Function That Resets Daily in Grafana

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Grafana dashboards and transformations
- Prometheus
- PromQL
- Prometheus recording rules
- Grafana dashboard JSON

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Grafana transformation documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana dashboard time range documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/
- Grafana dashboard time settings documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/modify-dashboard-settings/
- Grafana calculate field transformer source: https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/transformations/transformers/calculateField.ts

## Issues Found
- Fixed wording that implied Prometheus counters themselves can be made to reset at midnight. Prometheus counters are cumulative and reset on process restart or other counter reset events; the daily reset is a query or visualization behavior.
- Replaced examples that used `[1d]` for "today" with Grafana's `$__range` where the dashboard time range is "Today so far". PromQL `[1d]` is a rolling 24-hour selector, not a local calendar-day selector.
- Clarified that the subquery example using `sum_over_time(increase(...)[1d:5m])` is a rolling 24-hour cumulative increase, not a midnight-reset daily cumulative.
- Corrected the Grafana transformation instructions from "Cumulative sum" to the documented cumulative function "Total".
- Corrected the reset-handling formula. `increase()` already adjusts for counter resets, so adding `resets(...) * offset` can overcount.
- Replaced the recording-rule example that attempted to store a midnight value for the whole day. Recording rules evaluate at each interval and do not keep that midnight sample available all day as written. The corrected example records reset-aware rates and interval increases for use with Grafana's cumulative transformation.
- Replaced the invalid Grafana variable example using `now()` with a Grafana time range setup using `now/d` to `now`.
- Clarified that PromQL `offset` shifts selected samples and does not make `[1d]` mean a local calendar day.
- Updated multi-day comparison, stat, and gauge examples to use `$__range` with offsets instead of fixed `[1d]` selectors.
- Corrected the dashboard JSON transformation mode from `cumulativeTotal` to `cumulativeFunctions` with a `cumulative.reducer` of `sum`, matching Grafana's transformer implementation.

## Review Notes
The revised examples depend on Grafana evaluating `$__range` from a dashboard or panel time range such as "Today so far". In plain Prometheus expression browsers, `$__range` is not valid PromQL because it is a Grafana template variable.
