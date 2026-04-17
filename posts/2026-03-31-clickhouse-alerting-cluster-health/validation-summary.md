# Validation Summary: How to Set Up Alerting for ClickHouse Cluster Health

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (server configuration, system tables, ProfileEvents, AsyncMetrics, CurrentMetrics)
- Prometheus (scrape config, alert rules, PromQL `increase()`)
- Grafana / Alertmanager
- ClickHouse Keeper (4-letter words: `ruok` / `imok`, port 9181)
- Bash shell scripting (`nc`, cron)

## Sources Consulted
- ClickHouse official docs — Prometheus endpoint configuration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#prometheus
- ClickHouse source — `src/Server/PrometheusMetricsWriter.cpp` (metric prefix rules: `ClickHouseProfileEvents_`, `ClickHouseMetrics_`, `ClickHouseAsyncMetrics_`)
- ClickHouse source — `src/Common/ProfileEvents.cpp` (FailedQuery, FailedInsertQuery definitions)
- ClickHouse source — `src/Interpreters/ServerAsynchronousMetrics.cpp` (DiskTotal_*, DiskAvailable_*, ReplicasMaxQueueSize, ReplicasMaxMergesInQueue, OSMemoryTotal)
- ClickHouse source — `src/Common/CurrentMetrics.cpp` (MemoryTracking)
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse Keeper docs (4-letter commands, default client port 9181): https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- Prometheus scrape config docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules docs: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Disk metric names missing `AsyncMetrics_` prefix.** The expressions used `ClickHouseDiskTotal_default` and `ClickHouseDiskAvailable_default`, but ClickHouse exposes disk capacity as asynchronous metrics, so the actual exported names are `ClickHouseAsyncMetrics_DiskTotal_default` and `ClickHouseAsyncMetrics_DiskAvailable_default`. As written, both disk-usage alerts would never fire because the metrics would not exist. Fixed in the `ClickHouseDiskUsageHigh` and `ClickHouseDiskUsageCritical` rules.
2. **Failed-insert ProfileEvent pluralization.** The rule referenced `ClickHouseProfileEvents_FailedInsertQueries`, but the profile event is defined in ClickHouse as `FailedInsertQuery` (singular), so the Prometheus-exported name is `ClickHouseProfileEvents_FailedInsertQuery`. Fixed in the `ClickHouseInsertErrors` rule.

## Review Notes
- The `ClickHouseReplicasInReadOnly` alert name does not match its expression — it triggers on a non-zero replication queue, not on a replica being in read-only mode. A dedicated `ClickHouseMetrics_ReadonlyReplica` current metric exists for genuine read-only detection. Left as-is since the annotation text correctly describes the pending-queue behavior and this is a naming/UX concern rather than a technical error.
- The `ClickHouseTooManyParts` alert name suggests parts count but the expression uses `ReplicasMaxMergesInQueue`. A more literal "too many parts" alert would use `ClickHouseAsyncMetrics_MaxPartCountForPartition`. Left as-is because the expression itself is valid and the annotation says "High merge queue".
- The Prometheus `<prometheus>` XML block matches the canonical defaults shipped in ClickHouse's `config.xml`. Some deployments also enable `<status_info>true</status_info>` for extra cluster-state metrics — optional and not required.
- `system.replicas` columns `replica_name`, `queue_size`, and `inserts_in_queue` are all valid.
- Keeper `ruok` / `imok` over port 9181 is correct for ClickHouse Keeper's default client port and ZooKeeper-compatible 4-letter-word interface (requires `4lw.commands.whitelist=*` or explicit allowlisting in keeper config for newer versions).
