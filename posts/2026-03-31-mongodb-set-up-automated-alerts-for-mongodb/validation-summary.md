# Validation Summary: How to Set Up Automated Alerts for MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- Percona MongoDB Exporter (mongodb_exporter)
- Prometheus
- Prometheus Alertmanager
- PagerDuty
- Slack
- Docker

## Sources Consulted
- Percona MongoDB Exporter GitHub repository and documentation (https://github.com/percona/mongodb_exporter)
- MongoDB serverStatus documentation (https://www.mongodb.com/docs/manual/reference/command/serverstatus/)
- Prometheus Alertmanager configuration documentation (https://prometheus.io/docs/alerting/latest/configuration/)
- Alertmanager v0.27.0 release notes (https://github.com/prometheus/alertmanager/releases/tag/v0.27.0)
- PagerDuty Events API v2 documentation

## Issues Found

1. **Description referenced "mongostat" instead of "mongodb_exporter"**: The post description mentioned "mongostat" but the post actually uses the Percona mongodb_exporter. Fixed to say "mongodb_exporter".

2. **Connection utilization formula was incorrect**: The alert expression `mongodb_ss_connections{conn_type="current"} / mongodb_ss_connections{conn_type="available"} > 0.8` was wrong. MongoDB's `connections.available` reports the number of *remaining unused* connections, not the total capacity. With 80% utilization (e.g., 800 current, 200 available), the original formula would yield 4.0, not 0.8. Fixed to `current / (current + available) > 0.8` which correctly calculates utilization as a fraction of total capacity.

3. **Alertmanager API v1 endpoint removed**: The test alert curl command used `/api/v1/alerts`, which was removed in Alertmanager v0.27.0 (February 2024). Fixed to `/api/v2/alerts`.

4. **PagerDuty `service_key` uses deprecated v1 API**: Changed `service_key` to `routing_key` to use PagerDuty Events API v2, which is the current recommended integration method.

5. **Alertmanager `match` directive deprecated**: The `match` routing directive was deprecated in favor of `matchers` with PromQL-style label matching syntax. Updated all route matchers to use the current `matchers` format.

## Review Notes
- The Percona mongodb_exporter version 0.40 is valid but not the latest (0.50.0 is available). The post doesn't claim it's the latest, so this is acceptable.
- The exact Prometheus metric names (e.g., `mongodb_ss_wt_cache_bytes_dirty`, `mongodb_mongod_replset_member_replication_lag`) may vary depending on the exporter version and configuration. Users should verify the actual metric names exported by their specific exporter deployment using the `/metrics` endpoint.
