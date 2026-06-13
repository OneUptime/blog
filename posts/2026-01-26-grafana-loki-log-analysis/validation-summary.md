# Validation Summary: How to Use Grafana Loki for Log Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana dashboards and alerting
- Promtail
- Grafana Alloy
- YAML configuration

## Sources Consulted
- Grafana Loki LogQL overview: https://grafana.com/docs/loki/latest/query/
- Grafana Loki log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki Promtail documentation and EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/

## Issues Found
- Loki indexing was described as indexing only labels. Updated the wording to state that Loki indexes timestamps and labels rather than full log content, matching the official LogQL documentation.
- The Promtail section presented Promtail as a normal setup choice without noting its current lifecycle status. Added that Promtail is end of life as of March 2, 2026 and that Grafana Alloy should be used for new deployments.
- The Promtail pipeline used an `output` stage with `source: message`, but the JSON stage did not extract `message`. That stage would also replace the JSON log line and make the later `| json` LogQL examples fail against logs collected with the sample config. Removed the output stage and clarified that high-cardinality fields should remain in the original JSON log line instead of being promoted to labels.
- The unwrapped range aggregation examples used `avg_over_time`, `quantile_over_time`, and `sum_over_time` as pipeline stages after `unwrap`, which is invalid LogQL syntax. Rewrote those examples so the range aggregation functions wrap an unwrapped range query, and used the documented `by (endpoint)` grouping form for `quantile_over_time`.

## Review Notes
The remaining LogQL examples align with the documented stream selector, parser, line filter, label filter, formatter, log range aggregation, and alerting rule syntax. The post still uses Promtail because it is framed for existing deployments, but future revisions should consider adding an Alloy-native collection example.
