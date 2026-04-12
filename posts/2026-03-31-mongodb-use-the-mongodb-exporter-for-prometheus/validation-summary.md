# Validation Summary: How to Use the MongoDB Exporter for Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- Prometheus
- Percona MongoDB Exporter (mongodb_exporter)
- Docker
- systemd
- WiredTiger storage engine
- Prometheus alerting rules (YAML)

## Sources Consulted
- Percona MongoDB Exporter GitHub repository: https://github.com/percona/mongodb_exporter
- Percona MongoDB Exporter REFERENCE.md: https://github.com/percona/mongodb_exporter/blob/main/REFERENCE.md
- MongoDB Official Documentation - Replica Set Oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB Official Documentation - Built-In Roles (clusterMonitor): https://www.mongodb.com/docs/manual/reference/built-in-roles/
- Percona Monitoring and Management Documentation: https://docs.percona.com/percona-monitoring-and-management/

## Issues Found

### Issue 1: Incorrect oplog metric descriptions
- **What was wrong:** `mongodb_replset_oplog_tail_timestamp` was described as "Primary oplog position" and `mongodb_replset_oplog_head_timestamp` as "Secondary oplog position". These descriptions are incorrect — the head timestamp is the latest (newest) entry in the oplog, and the tail timestamp is the oldest entry. They describe boundaries of the oplog window on a single member, not primary vs. secondary positions.
- **What was changed:** Corrected the descriptions to "Latest oplog entry timestamp" (head) and "Oldest oplog entry timestamp" (tail). Reordered to list head before tail for logical flow.
- **Why:** The original descriptions could mislead readers into thinking these metrics track different replica set members, when they actually track the time range of the oplog on a single member.

### Issue 2: Broken replication lag alert
- **What was wrong:** The alert `MongoDBReplicationLag` used the expression `(mongodb_replset_oplog_tail_timestamp - mongodb_replset_oplog_head_timestamp) > 30`. This had two problems: (1) the subtraction was backwards — tail (oldest) minus head (newest) produces a negative number, so the alert would never fire; (2) these metrics measure the oplog window size on a single member, not replication lag between primary and secondary, making the alert conceptually incorrect.
- **What was changed:** Replaced with a `MongoDBOplogWindowSmall` alert that correctly uses `head - tail` and fires when the oplog window shrinks below 1 hour (`< 3600` seconds). A small oplog window is a genuine operational concern because it reduces the time available for secondaries to catch up or for point-in-time recovery.
- **Why:** The original alert could never fire (negative value never exceeds 30) and conflated oplog window size with replication lag. The replacement alert is operationally meaningful and uses the available metrics correctly.

## Review Notes
- The metric names listed in the post (e.g., `mongodb_connections`, `mongodb_opcounters_total`, `mongodb_mem_resident_mb`) follow a commonly documented naming convention. However, Percona's mongodb_exporter v0.40+ may use different internal prefixes (e.g., `mongodb_ss_*` for serverStatus metrics). The exact names depend on the exporter version and whether `--compatible-mode` is enabled. Readers should verify metric names against their running exporter instance via the `/metrics` endpoint.
- The `--mongodb.uri` flag is correct for v0.40.x. Older versions used `--mongodb.dsn`. The `MONGODB_URI` environment variable is also supported as an alternative.
- The release download URL follows the correct GitHub pattern, but the exact artifact filename for v0.40.0 could not be independently verified as only newer releases are readily visible on the releases page.
- For actual replication lag monitoring (primary vs. secondary delay), users would need to compare per-member optime metrics (e.g., `mongodb_mongod_replset_member_optime_date`) rather than oplog window boundaries. This is a more advanced topic beyond the scope of this introductory guide.
