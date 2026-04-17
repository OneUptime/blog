# Validation Summary: How to Build a Security Operations Center with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered

- ClickHouse (schema design, MergeTree engine, data skipping indexes, TTL, CTEs, aggregate functions)
- ClickHouse data types: `DateTime64`, `IPv4`, `Nullable`, `LowCardinality`, `Map`, `Array`, `UInt8/16/32/64`
- ClickHouse aggregate functions: `count`, `countIf`, `uniq`, `groupArray`, `groupUniqArray`, `min`, `max`, `avg`, `sum`
- SQL features: CTEs (WITH clauses), JOIN, LEFT JOIN, DISTINCT
- Supporting stack referenced only (Vector, Logstash, Syslog, NetFlow, Grafana, PagerDuty)

## Sources Consulted

- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data skipping indexes (bloom_filter, set): https://clickhouse.com/docs/en/optimize/skipping-indexes
- ClickHouse `groupArray`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse `groupUniqArray`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupuniqarray
- ClickHouse `LowCardinality` / `IPv4` / `Map` types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse `dateDiff`, `toDate`, `today`, `toYYYYMMDD`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse TTL clauses: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found

1. **Cyrillic character in SQL identifier** — The `Incident Tracking` query used `avg_mttр_hours` as a column alias, where the "р" was a Cyrillic U+0440 rather than a Latin "r". This would either fail to parse (as ClickHouse treats unquoted identifiers as ASCII) or produce a confusing Unicode identifier. Fixed by replacing with an ASCII `r` so the alias reads `avg_mttr_hours`.

2. **Non-canonical `groupArray(N)(DISTINCT x)` syntax** — The `Lateral Movement Detection` query used `groupArray(10)(DISTINCT target_host)`. Combining the parametric form of `groupArray` with a SQL `DISTINCT` modifier in the argument list is not a documented/reliably supported pattern in ClickHouse. Replaced with the canonical `groupUniqArray(10)(target_host)`, which is the purpose-built function for collecting up to N distinct values.

## Review Notes

- **Partition granularity**: The `security_events` table uses `PARTITION BY toYYYYMMDD(occurred_at)` with a 365-day TTL. This yields ~365 active partitions per node, which is workable but on the high side; `toYYYYMM` is the more conventional choice for long-retention tables. Not a correctness issue — left as the author wrote it.
- **Bloom filter on `source_ip` (IPv4)**: Bloom filters work, but for highly selective point lookups on a 4-byte numeric type a `minmax` or `set` index can also be effective. The author's choice is valid.
- **Network anomaly detection query**: The query joins `today_flows` (distinct pairs) to `known_destinations` via `LEFT JOIN` and then re-joins `network_flows nf` to aggregate byte counts. Logic is correct but the re-join can be expensive on very large tables; a single-pass approach using `NOT IN` / `anti-join` with conditional aggregation may scale better. Left as written since the query is functionally correct.
- **`groupUniqArray` ordering caveat**: After the fix, `sample_hosts` will contain distinct hosts in unspecified order (whereas the original would have preserved insertion order, modulo the DISTINCT semantics). For a threat-hunting sample list this is not a meaningful regression.
