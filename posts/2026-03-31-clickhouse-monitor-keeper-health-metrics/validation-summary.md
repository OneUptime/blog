# Validation Summary: How to Monitor ClickHouse Keeper Health and Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse Keeper (coordination service)
- Four-letter monitoring commands (ZooKeeper-compatible)
- Prometheus metrics endpoint
- Grafana alerting
- ClickHouse system tables (`system.zookeeper_connection`, `system.zookeeper`)

## Sources Consulted
- ClickHouse Keeper official documentation: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ClickHouse Prometheus configuration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#prometheus
- ClickHouse system.zookeeper_connection docs: https://clickhouse.com/docs/en/operations/system-tables/zookeeper_connection
- ClickHouse system.zookeeper docs: https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse network ports documentation: https://clickhouse.com/docs/en/guides/sre/network-ports

## Issues Found

1. **`mntr` field `leader_uptime` does not exist** (was line 42): This field is not part of the `mntr` output. Replaced with `zk_synced_followers`, which is a real and useful monitoring field.

2. **`mntr` field `followers` missing `zk_` prefix** (was line 43): All `mntr` output fields use the `zk_` prefix. Changed `followers` to `zk_followers`.

3. **Prometheus config missing `asynchronous_metrics`** (was line 50-56): The `<prometheus>` block was missing `<asynchronous_metrics>true</asynchronous_metrics>`, which is needed to expose Keeper-related async metrics. Added the missing element.

4. **Fabricated Prometheus metric names** (was lines 62-67): The post used a non-existent `ClickHouseKeeper*` prefix. ClickHouse uses `ClickHouseMetrics_Keeper*` for Keeper metrics exposed via Prometheus. Additionally, `ClickHouseKeeperAvgLatency`, `ClickHouseKeeperMaxLatency`, and `ClickHouseKeeperEpochsElapsed` do not exist as Prometheus metrics at all — latency metrics are only available via the `mntr` four-letter command. Corrected to list the two real Prometheus metrics (`ClickHouseMetrics_KeeperOutstandingRequests`, `ClickHouseMetrics_KeeperAliveConnections`) and added a note about `mntr` for latency.

5. **Grafana alert expressions used fabricated metric names** (was lines 73-75): Updated to use correct metric names — `zk_avg_latency` from `mntr` for latency alerts, `ClickHouseMetrics_KeeperOutstandingRequests` for queue depth, and `zk_followers` from `mntr` for cluster health.

6. **Incorrect split-brain explanation** (was line 99): The post stated that `Mode: standalone` on multiple nodes indicates split-brain. This is wrong — `standalone` means the node is running in non-clustered mode (a configuration error). Split-brain occurs when multiple nodes report `Mode: leader`. Corrected the explanation to describe both conditions accurately.

## Review Notes
- The four-letter commands (`ruok`, `stat`, `mntr`, `conf`, `cons`), port 9181, and system table queries (`system.zookeeper_connection`, `system.zookeeper`) were all correct.
- The `system.zookeeper` query correctly includes the mandatory `WHERE path = ...` clause.
- The health check bash script is functional and correct.
- A more comprehensive monitoring setup would also scrape the `mntr` output into Prometheus using a custom exporter or Telegraf, since many important Keeper metrics (latency, epochs, synced followers) are only available through the four-letter commands.
