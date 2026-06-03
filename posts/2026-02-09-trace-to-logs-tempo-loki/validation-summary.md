# Validation Summary: How to Set Up Trace-to-Logs Linking Between Grafana Tempo and Loki

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Grafana
- Grafana Tempo
- Grafana Loki
- Grafana Alloy
- OpenTelemetry for Go
- Go `log/slog`
- LogQL and TraceQL
- Python `requests`

## Sources Consulted
- Grafana Tempo data source provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace-to-logs correlation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Loki data source provisioning and derived fields: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki LogQL log query reference: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki Promtail installation and deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Alloy Kubernetes discovery component: https://grafana.com/docs/alloy/latest/reference/components/discovery/discovery.kubernetes/
- Grafana Alloy Kubernetes log source component: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/
- Grafana Alloy log processing component: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Alloy Loki writer component: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana Tempo HTTP API: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Traces visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/traces/

## Issues Found
- The Loki example used legacy BoltDB Shipper configuration (`store: boltdb-shipper`, `schema: v11`, `boltdb_shipper.shared_store`) and removed/obsolete config keys (`enforce_metric_name`, `chunk_store_config.max_look_back_period`). Updated the snippet to TSDB (`store: tsdb`, `schema: v13`, `tsdb_shipper`) and removed obsolete keys. Verified the revised block with `grafana/loki:2.9.3 -verify-config`.
- The log shipping section used Promtail, which official Grafana documentation marks as deprecated and EOL as of March 2, 2026. Replaced the Promtail DaemonSet with a Grafana Alloy deployment that discovers Kubernetes pods, tails pod logs through `loki.source.kubernetes`, parses JSON log fields, applies the same correlation labels, and writes to Loki. Verified the embedded Alloy config with `grafana/alloy:v1.16.1 validate`.
- The Tempo data source provisioning used the older `tracesToLogs` key and separate `mappedTags` style. Updated it to the documented `tracesToLogsV2` block and moved tag mappings into the V2 `tags` object form.
- The Grafana deployment enabled feature toggles for trace-to-logs and the TraceQL editor. These are not needed for the documented Grafana/Tempo data source configuration, so the feature-toggle environment variable was removed.

## Review Notes
- The Tempo config remains pinned to `grafana/tempo:2.3.1` and validates with `-config.verify=true`.
- The examples still use `emptyDir` storage and simple admin credentials, which are acceptable for a tutorial/demo but should be replaced with persistent volumes and Kubernetes secrets for production.
- The generated Loki queries assume the application logs contain JSON fields named `trace_id` and `span_id`, matching the Go `slog` example.
