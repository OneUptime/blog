# Validation Summary: How to Build a MongoDB Performance Dashboard in Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Grafana (dashboard JSON model, provisioning, Stat/Time Series/Gauge panels)
- Prometheus (PromQL queries)
- MongoDB Exporter (percona/mongodb_exporter, port 9216)
- WiredTiger storage engine
- Grafana dashboard import API

## Sources Consulted
- Percona MongoDB Exporter metric documentation (https://github.com/percona/mongodb_exporter)
- MongoDB documentation on replica set optime and replication lag
- MongoDB documentation on `net.maxIncomingConnections` server parameter
- Grafana dashboard provisioning documentation (https://grafana.com/docs/grafana/latest/administration/provisioning/#dashboards)
- Grafana HTTP API for dashboard import (https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/#import-dashboard)
- Grafana community dashboard ID 2583 (https://grafana.com/grafana/dashboards/2583)

## Issues Found
1. **Panel 4 Replication Lag - incorrect metric names and wrong concept**: The original query used `mongodb_replset_oplog_tail_timestamp` and `mongodb_replset_oplog_head_timestamp`, which are not real metrics from any standard MongoDB Prometheus exporter. Additionally, the oplog tail-minus-head approach measures the oplog window size (how much history the oplog retains), not replication lag. Replication lag is the time difference between the primary's last applied operation and a secondary's last applied operation. Fixed the query to use `mongodb_mongod_replset_member_optime_date` with `member_state` labels and proper PromQL vector matching (`on() group_right()`) to compute per-secondary replication lag.

2. **Panel 2 Active Connections - off-by-one in maxIncomingConnections default**: The post stated the default `maxIncomingConnections` is 65535. MongoDB's actual default is 65536. Fixed to 65536.

## Review Notes
- The metric names used throughout the post (e.g., `mongodb_connections`, `mongodb_opcounters_total`, `mongodb_wiredtiger_cache_bytes_currently_in_cache`, `mongodb_mem_resident_mb`, `mongodb_network_bytes_in_total`) follow the naming conventions of the older dariubs/mongodb_exporter. The current maintained exporter (percona/mongodb_exporter v0.40+) uses different metric name patterns (e.g., `mongodb_ss_connections`, `mongodb_ss_opcounters`). The post would benefit from noting which exporter version it targets, or providing queries for both naming conventions.
- The Grafana provisioning YAML and dashboard import curl command are correct.
- Dashboard ID 2583 is a real, well-known community MongoDB dashboard on grafana.com.
- The WiredTiger cache gauge thresholds (0-60% green, 60-85% yellow, 85-100% red) are reasonable operational defaults.
