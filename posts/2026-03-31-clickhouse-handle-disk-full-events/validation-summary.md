# Validation Summary: How to Handle ClickHouse Disk Full Events

## Status
validated

## Post Type
Tutorial / Operational runbook

## Technologies Covered
- ClickHouse (system.parts, ALTER PARTITION, TTL, OPTIMIZE TABLE)
- Linux shell utilities (df, du, awk, tr, mail)
- S3 (as cold-tier storage target for TTL)
- OneUptime (monitoring reference)

## Sources Consulted
- ClickHouse `system.parts` docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `system.detached_parts` docs: https://clickhouse.com/docs/en/operations/system-tables/detached_parts
- ClickHouse `ALTER ... PARTITION` docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse `ALTER ... TTL` docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse `formatReadableSize` docs: https://clickhouse.com/docs/en/sql-reference/functions/other-functions

## Issues Found
1. **`DROP DETACHED PARTITION ID 'all'` was incorrect.** The partition ID `'all'` is a sentinel used only for tables without a PARTITION BY clause; it does not delete detached parts across all partitions of a partitioned table. ClickHouse supports an explicit `ALL` keyword (without the `ID` modifier and without quotes) to target every partition. Changed the statement to `ALTER TABLE events DROP DETACHED PARTITION ALL`.
2. **Missing `allow_drop_detached` setting.** `DROP DETACHED PARTITION|PART` requires `allow_drop_detached = 1` to be enabled; otherwise the query fails. Added `SET allow_drop_detached = 1;` before the DROP DETACHED statement.

## Review Notes
- `OPTIMIZE TABLE ... FINAL` is listed under "Free Space Quickly". The text only claims it "reduces overhead" (accurate — it can reduce part count and therefore filesystem/inode overhead), but readers should be aware that merges temporarily require additional free disk space proportional to the merged parts. On a nearly-full disk this operation can fail or worsen the situation; it is best run after at least some space has been reclaimed via DROP PARTITION / DROP DETACHED.
- `DROP PARTITION '202401'` assumes monthly partitioning via `toYYYYMM(...)`. The example is correct for that convention; readers using different partition expressions should adapt the literal accordingly.
- The system.parts query uses `sum(bytes_on_disk)` — accurate for active parts only (already filtered with `WHERE active`). For total disk footprint including inactive parts awaiting cleanup, dropping the `active` filter is an option.
- The shell alert uses a single threshold (>80%). The OneUptime paragraph correctly notes multi-threshold monitoring as a more robust pattern.
