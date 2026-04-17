# Validation Summary: How to Write a ClickHouse Data Retention Cleanup Script

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface, system tables, ALTER TABLE operations)
- ClickHouse TTL feature
- Bash scripting (associative arrays, curl)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse ALTER PARTITION reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse ALTER TTL reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse HTTP interface: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse Format reference (TabSeparated, PrettyCompactMonoBlock)

## Issues Found
No technical issues found.

Verified:
- Default ClickHouse HTTP port 8123 is correct.
- `system.parts` columns used (`database`, `table`, `partition`, `active`, `min_date`, `bytes_on_disk`) all exist with the documented types. `partition` is a String, so lexicographic comparison works.
- `ALTER TABLE ... DROP PARTITION 'name'` syntax is correct.
- `ALTER TABLE ... MATERIALIZE TTL` syntax is correct (available since ClickHouse 20.4).
- `formatReadableSize()` function exists.
- Output formats `TabSeparated` and `PrettyCompactMonoBlock` are valid.
- Curl HTTP POST with `--data-binary` is the standard way to send queries to the ClickHouse HTTP interface.

## Review Notes
- The script's `partition < '${CUTOFF}'` comparison assumes the table is partitioned by `toYYYYMMDD(date_column)` so that the partition identifier is an 8-digit date string. Tables partitioned by `toYYYYMM`, by tuples, or by other expressions would not work with this comparison. The post's example tables imply daily partitioning, so this assumption is reasonable in context but worth noting for adapters.
- `declare -A` requires Bash 4 or later. Default macOS Bash (3.2) will not run this script without a newer Bash from Homebrew.
- `ALTER TABLE ... DROP PARTITION` is a heavy, irreversible metadata operation; production scripts often add a `--dry-run` mode or confirmation step. The post's script does not include one, but that is a stylistic/safety choice rather than a correctness issue.
- The HTTP error-detection heuristic (treat any non-empty response as an error after a DROP PARTITION) works because successful ALTERs return an empty body, but it would also be tripped by warnings or progress headers in some configurations.
