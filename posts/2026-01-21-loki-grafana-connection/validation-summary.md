# Validation Summary: How to Connect Loki to Grafana

## Status
validated

## Post Type
Tutorial / technical configuration guide

## Technologies Covered
- Grafana
- Grafana Loki
- LogQL
- Grafana data source provisioning
- Grafana Alerting provisioning
- Kubernetes ConfigMaps and Deployments
- Tempo, Jaeger, and Zipkin trace correlation

## Sources Consulted
- Grafana Loki data source documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Loki LogQL log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki multi-tenancy documentation: https://grafana.com/docs/loki/latest/operations/multi-tenancy/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana alerting provisioning API schema reference: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/alerting_provisioning/
- Grafana server-side expression documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/expression-queries/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/

## Issues Found
- The Grafana alert provisioning example omitted `relativeTimeRange` and common query model fields such as datasource metadata, `intervalMs`, `maxDataPoints`, and `refId`. I added those fields so the example matches Grafana's provisioned alert rule structure more closely.
- The alert threshold expression used `B > 10`, but Grafana server-side math expressions reference prior queries with `$B`. I changed it to a math expression using `$$B > 10` so provisioning keeps the literal `$B` reference.
- The performance section showed `{namespace="production"} [1h]` as a standalone LogQL query. A range selector is valid inside metric queries, so I changed the example to `count_over_time({namespace="production"}[1h])`.
- The performance section showed `{namespace="production"} | limit 1000`, but `limit` is not a LogQL pipeline stage in the official LogQL log query documentation. I changed the example to use the plain query and point to Grafana Explore's line limit setting.

## Review Notes
Most data source provisioning, authentication, TLS, custom header, derived field, LogQL parser/filter, metric query, and Kubernetes examples are consistent with current Grafana and Loki documentation. The Grafana UI navigation label may vary by Grafana version, but the underlying action of adding a Loki data source remains correct.
