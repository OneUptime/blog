# Validation Summary: How to Implement Log Analytics with Loki

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana dashboards
- Loki recording rules
- Loki HTTP API
- jq
- curl
- Grafana Alloy and supported Loki log clients

## Sources Consulted
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki template function documentation: https://grafana.com/docs/loki/latest/query/template_functions/
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/

## Issues Found
- The architecture diagram listed Promtail as the collection agent. Promtail is EOL as of March 2, 2026 according to current Grafana Loki documentation, so this was changed to "Grafana Alloy or supported clients."
- Several unwrapped latency metric queries omitted the documented `__error__=""` filter after `unwrap`. This can cause metric queries to fail when parsing or unwrap conversion errors are present, so the latency examples, dashboard examples, and recording rule now filter errors after `unwrap`.
- The latency distribution example attempted to aggregate a raw log pipeline with `sum by (le)` and used `le="100ms"` as if it assigned a label. The example now uses `count_over_time` to produce a metric vector and `label_format le="100ms"` to create the bucket label.
- The CSV export command used a `jq` expression that would serialize Loki matrix `values` arrays incorrectly. It now emits one CSV row per sample with service, timestamp, and value.

## Review Notes
The remaining examples are representative LogQL patterns and depend on the application's extracted JSON fields, such as `service`, `duration`, `endpoint`, `user_id`, and `hour`, being present and consistently typed. Future improvements could mention that high-cardinality labels such as user IDs or raw error messages should usually be parsed at query time rather than promoted to indexed Loki labels.
