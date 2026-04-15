# Validation Summary: How to Configure TTL to Move Data to Cold Storage in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse TTL (Time To Live) expressions
- ClickHouse storage policies (multi-volume tiered storage)
- ClickHouse system tables (system.tables, system.parts, system.merges)
- S3 cold storage integration

## Sources Consulted
- ClickHouse MergeTree TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse system.parts table documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse system.merges table documentation: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse ALTER TABLE TTL documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse ALTER mutations documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter#mutations
- ClickHouse TTL guide: https://clickhouse.com/docs/en/guides/developer/ttl

## Issues Found
1. **Inaccurate description of multiple TTL clause evaluation** — The post stated "TTL clauses are evaluated in order. The first matching clause wins for a given part." This is misleading. ClickHouse TTL clauses are applied progressively as data ages — a part is first moved to cold storage when the move threshold is reached, and later deleted when the deletion threshold is reached. Both clauses apply at different points in the data lifecycle; it is not a first-match-wins selection. Changed to: "TTL clauses are applied progressively as data ages. Each clause takes effect when its time condition is met, so data is first moved to cold storage and later deleted when the deletion threshold is reached."

## Review Notes
- All SQL syntax (CREATE TABLE with TTL, ALTER TABLE MODIFY TTL, ALTER TABLE MATERIALIZE TTL, TO VOLUME, TO DISK, column-level TTL) verified correct against official ClickHouse documentation.
- XML storage configuration format (disks, policies, volumes) is correct.
- All system table columns referenced (system.parts: disk_name, modification_time, min_time, max_time, bytes_on_disk; system.merges: database, table, elapsed, progress, num_parts, result_part_name, is_mutation) confirmed to exist.
- MATERIALIZE TTL confirmed as a valid command that runs as a background mutation (non-blocking), consistent with the post's description.
- The post's statement that "ClickHouse does not evaluate TTL row by row" is accurate specifically for MOVE and RECOMPRESS operations per the docs ("For parts moving or recompressing, all rows of a part must satisfy the TTL expression criteria"). For DELETE TTL, expired rows can be filtered during merges from mixed parts, but this nuance is acceptable given the article's focus on move operations.
- The intro mentions TTL can "delete rows, delete parts, recompress data, or move parts" — TTL can also aggregate data, but omitting this is acceptable since it's not the article's focus.
