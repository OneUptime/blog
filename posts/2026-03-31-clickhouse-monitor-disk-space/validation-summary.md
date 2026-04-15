# Validation Summary: How to Monitor Disk Space Usage in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables: `system.disks`, `system.parts`, `system.detached_parts`, `system.merges`)
- ClickHouse SQL functions: `formatReadableSize()`, `dateDiff()`, `round()`, `currentDatabase()`
- `clickhouse-client` CLI
- Bash scripting for alerting

## Sources Consulted
- ClickHouse system.disks table documentation: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse system.parts table documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse system.detached_parts table documentation: https://clickhouse.com/docs/en/operations/system-tables/detached_parts
- ClickHouse system.merges table documentation: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse arithmetic operators documentation: https://clickhouse.com/docs/en/sql-reference/operators/arithmetic
- ClickHouse dateDiff function documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff

## Issues Found
No technical issues found.

## Review Notes
- The "Checking Temporary File Usage" section queries `system.disks WHERE path LIKE '%tmp%'` and sums `total_space`. This shows the total capacity of disks with 'tmp' in the path, not the actual temporary file usage at that moment. The `du -sh` command that follows is more useful for checking actual temp file consumption. This is not incorrect, but could be more informative.
- The growth estimation query could produce `inf` if `dateDiff` returns 0 (all parts modified on the same day). The `HAVING count() > 1` mitigates this for the most common case, and ClickHouse handles division by zero gracefully (returns inf rather than erroring), so this is an edge case rather than a bug.
- The statement "Large amounts of inactive parts indicate that background merges are behind" is slightly imprecise — many inactive parts more precisely indicate that cleanup/garbage collection of obsolete parts is lagging, not necessarily that merges themselves are behind. The associated `system.merges` check is still useful context.
