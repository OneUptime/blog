# Validation Summary: How to Set Up MongoDB Alerts in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- Grafana 9+ (Unified Alerting)
- Prometheus
- percona/mongodb_exporter
- Slack (webhook integration)

## Sources Consulted
- percona/mongodb_exporter source code on GitHub (`exporter/v1_compatibility.go`) — verified metric names for connections, WiredTiger cache, replication, and `mongodb_up`
- Grafana file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana Alerting HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/alerting_provisioning/
- Grafana Slack contact point configuration: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-slack/
- Grafana silence API (Alertmanager v2 API): confirmed via Grafana community forums and GitHub issues (#71502, #89517)

## Issues Found

1. **Slack contact point field name**: The `settings` object used `"channel"` to specify the Slack channel. The correct field name in Grafana's Slack contact point settings is `"recipient"`. Changed `"channel"` to `"recipient"`.

2. **Replication lag PromQL — wrong metric names and incorrect formula**: The original query used `mongodb_replset_oplog_tail_timestamp` and `mongodb_replset_oplog_head_timestamp`, which are missing the `_mongod_` prefix (correct names: `mongodb_mongod_replset_oplog_tail_timestamp` / `mongodb_mongod_replset_oplog_head_timestamp`). More critically, the formula computed the oplog window size (newest entry minus oldest entry), not actual replication lag between primary and secondaries. Replaced with `mongodb_mongod_replset_member_replication_lag > 30`, which is a pre-computed metric from the percona/mongodb_exporter that directly measures the lag between each secondary and the primary.

3. **WiredTiger cache metric names**: The original query used `mongodb_wiredtiger_cache_bytes_currently_in_cache` and `mongodb_wiredtiger_cache_maximum_bytes_configured`, which are not real metric names from the percona/mongodb_exporter. Changed to `mongodb_mongod_wiredtiger_cache_bytes{type="total"}` and `mongodb_mongod_wiredtiger_cache_max_bytes`, which are the correct compatible-mode metric names.

## Review Notes
- The `mongodb_connections{state="current"}` metric and the `mongodb_up` metric are correct and standard for the percona/mongodb_exporter in compatible mode.
- The Grafana alerting provisioning YAML structure (`apiVersion: 1`, `groups`, `rules` with `condition`, `data`, `__expr__` threshold) is correct for Grafana 9+.
- The silence API endpoint (`/api/alertmanager/grafana/api/v2/silences`) and payload format are correct. The matchers omit the optional `isEqual` field, which defaults to `true` — this is acceptable.
- All metric names used in the fixed version assume the percona/mongodb_exporter running in `--compatible-mode`. Users running the exporter without this flag will see different metric names (e.g., `mongodb_ss_connections` instead of `mongodb_connections`). A note about this could improve the post in the future.
- The Go template syntax in the Slack contact point (`{{ .GroupLabels.alertname }}`, `{{ range .Alerts }}`) is correct for Grafana alerting templates.
