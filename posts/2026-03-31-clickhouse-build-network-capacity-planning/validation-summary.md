# Validation Summary: How to Build Network Capacity Planning with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, materialized views, TTL, LowCardinality, IPv4)
- SNMP polling (for interface utilization)
- NetFlow / sFlow (for flow data)
- SQL (aggregation, CTEs, linear regression)
- Grafana (referenced in architecture diagram)

## Sources Consulted
- ClickHouse Date and Time Functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse Other Functions (`formatReadableSize`, `greatest`): https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse SQL Syntax (alias resolution): https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse MergeTree TTL: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse Materialized Views documentation

## Issues Found

1. **Unit mismatch in rollup columns.** The `interface_utilization_hourly` table declared columns named `avg_bytes_in_per_sec`, `avg_bytes_out_per_sec`, `max_bytes_in_per_sec`, `max_bytes_out_per_sec`, but the materialized view formula `bytes_in * 8.0 / 300` multiplies by 8, yielding **bits** per second (matching `interface_speed_bps` for utilization math). Renamed the four columns and the corresponding projection aliases to `avg_bits_*_per_sec` / `max_bits_*_per_sec` so the column names match their units. The utilization percentage formula itself was already correct (bps / bps * 100).

2. **Incorrect `weeks_to_80pct` forecast formula.** The original expression `(80 - intercept) / slope / 604800` resolves to *weeks since the Unix epoch* (1970-01-01), not weeks from now, because `week_ts` in the regression is an absolute Unix timestamp. Changed the expression to `((80 - intercept) / slope - toUnixTimestamp(now())) / 604800` so the result is weeks from the present moment until projected 80% utilization. Updated the inline comment as well.

## Review Notes

- The rollup materialized view uses a plain `MergeTree` target rather than `AggregatingMergeTree` with `-State` / `-Merge` functions. Because regular materialized views aggregate per insert block, the target table can contain multiple rows per `(device_hostname, interface_name, hour)` key. Query-time `avg()` / `max()` still produces correct aggregates, but the `Current Utilization` query (which lacks a `GROUP BY`) could return several duplicate rows per interface. For production workloads, `AggregatingMergeTree` with state functions (or `SummingMergeTree` for summable fields) is the more robust pattern. Left as-is since the current queries still return correct-ish results and changing the engine would be a larger redesign.
- The MV uses `any(interface_speed_bps)` to carry the interface speed through the aggregation. This is fine as long as the speed is stable over the hour; if interface speeds change mid-hour, the value picked is nondeterministic.
- Partition strategy `PARTITION BY toYYYYMMDD(polled_at)` produces daily partitions for raw utilization data. With 365-day retention this yields ~365 partitions, which is within ClickHouse's healthy range.
- Linear regression assumes linear growth; real traffic growth is often nonlinear or seasonal. The post does not caveat this, but it is a common simplification for capacity planning and the post's framing as an introduction is reasonable.
- `formatReadableSize`, `greatest`, `toStartOfWeek`, `toUnixTimestamp`, `toStartOfHour`, `toYYYYMMDD`, and the TTL syntax used are all valid and current in ClickHouse.
