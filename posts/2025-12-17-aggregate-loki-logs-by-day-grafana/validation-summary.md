# Validation Summary: How to Aggregate Loki Logs by Day in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Grafana Loki
- LogQL
- Grafana dashboard panels and transformations
- Loki recording rules

## Sources Consulted
- Grafana Loki metric queries and range aggregations: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki log queries, parsers, line filters, label filters, and pattern parser: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki recording rules: https://grafana.com/docs/loki/latest/operations/recording-rules/
- Grafana dashboard variables and `$__interval`: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana dashboard time zone settings: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/modify-dashboard-settings/
- Grafana bar chart visualization: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/bar-chart/
- Grafana time series visualization: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Grafana transformations, including Organize fields and Group by: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/

## Issues Found
- The post implied that `$__interval` alone creates calendar-day aggregation. Updated the wording to clarify that `count_over_time(...[24h])` and `count_over_time(...[$__interval])` produce range-vector windows at evaluation timestamps, and that calendar-day buckets require a 1-day interval with dashboard time ranges aligned to day boundaries.
- The Grafana setup step referred to **Query options** > **Interval**. Updated it to **Min interval** to match Grafana's panel query option that controls the minimum calculated interval used by `$__interval`.
- Several LogQL query blocks contained `#` comments. LogQL examples are easier to paste correctly without inline comments, so the comments were moved to surrounding prose.
- The pattern parser example used `<timestamp> <level>` against a log line containing both a date and a time before the level. Updated the pattern to capture `<date> <time> <level>` so the fields map correctly.
- The timezone section stated that Grafana and Loki use UTC by default and suggested using `offset -5h` to align time zones. Updated the section to explain that Grafana controls display and time-range selection, while LogQL `offset` shifts a range vector and does not change the dashboard time zone.
- The table transformation instructions said to "Group by day." Updated this to "Group by the time field" because Grafana's Group by transformation groups rows by selected field values; the query interval is what produces daily timestamps.
- The summary said to set the query interval to `1d`. Updated it to say to set the minimum query interval to `1d`, matching the corrected setup instructions.

## Review Notes
The core LogQL functions used in the post, including `count_over_time`, `bytes_over_time`, `rate`, `sum_over_time`, `avg_over_time`, parsed label filters, `pattern`, `unwrap`, aggregation with `sum by`, and recording rule syntax, are consistent with the official Loki documentation. The examples still assume parsed fields such as `status_code`, `response_time_ms`, `level`, and `service` exist in the target logs.
