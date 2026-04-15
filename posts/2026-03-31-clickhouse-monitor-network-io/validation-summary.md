# Validation Summary: How to Monitor ClickHouse Network IO

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables: system.metrics, system.events, system.query_log, system.replication_queue)
- Prometheus (ClickHouse metrics endpoint)
- Grafana (dashboarding)
- Linux OS-level network tools (nethogs, /proc/net/dev, sar)

## Sources Consulted
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse system.events documentation: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.replication_queue documentation: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse Prometheus integration documentation: https://clickhouse.com/docs/en/interfaces/prometheus
- ClickHouse source code (CurrentMetrics.cpp, ProfileEvents.cpp): https://github.com/ClickHouse/ClickHouse
- nethogs man page

## Issues Found
1. **Incorrect metric name `InterserverConnections`**: The actual metric in system.metrics is `InterserverConnection` (singular). Fixed to `InterserverConnection`.

2. **Incorrect metric name `HTTPConnections`**: The actual metric in system.metrics is `HTTPConnection` (singular). Fixed to `HTTPConnection`.

3. **Invalid column `data_compressed_bytes` in system.replication_queue query**: The `system.replication_queue` table does not have any byte-size columns. Removed the `sum(data_compressed_bytes)` aggregation and simplified the query to count pending parts only, ordering by `pending_parts DESC`.

4. **Invalid type value `FETCH_PARTS` in system.replication_queue query**: The correct type value for fetching parts from another replica is `GET_PART`, not `FETCH_PARTS`. Fixed to `GET_PART`.

5. **Incorrect `_total` suffix on Prometheus ProfileEvents metric names**: ClickHouse does not append `_total` to exported ProfileEvents metrics. Fixed `ClickHouseProfileEvents_NetworkSendBytes_total` to `ClickHouseProfileEvents_NetworkSendBytes` and `ClickHouseProfileEvents_NetworkReceiveBytes_total` to `ClickHouseProfileEvents_NetworkReceiveBytes`.

## Review Notes
- The `result_bytes` column in system.query_log represents the size of the query result in RAM, which correlates with but is not identical to the actual bytes sent over the network. The blog's interpretation is reasonable for practical monitoring purposes.
- The system.events query only selects `event` and `value` columns, but the table also has a `description` column. This is not an error since the query is valid, but readers could benefit from knowing about the description column.
- The nethogs `-p` flag (promiscuous mode) is valid but not commonly used; typical usage is just `nethogs eth0`. The command as written will work.
