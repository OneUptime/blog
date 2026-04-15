# Validation Summary: How to Use system.merges Table in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- system.merges system table
- system.parts system table
- ClickHouse SQL functions: formatReadableSize, nullIf, round
- SYSTEM STOP/START MERGES commands

## Sources Consulted
- ClickHouse system.merges documentation — https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse SYSTEM statements documentation — https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse TTL documentation — https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse formatReadableSize function docs — https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse nullIf function docs — https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse "Too many parts" knowledge base — https://clickhouse.com/docs/knowledgebase/exception-too-many-parts

## Issues Found
No technical issues found.

All column names (database, table, result_part_name, elapsed, progress, total_size_bytes_compressed, bytes_read_uncompressed, rows_read, merge_type, memory_usage) are verified as valid system.merges columns. The merge_type values (REGULAR, TTL_DELETE, TTL_RECOMPRESS) are correct. SQL queries are syntactically valid. The ETA calculation using nullIf to avoid division by zero is correct. The 300-part insert throttling threshold is accurate (controlled by the parts_to_throw_insert setting which defaults to 300). SYSTEM STOP/START MERGES syntax is correct.

## Review Notes
- The 300-part threshold mentioned is specifically controlled by the `parts_to_throw_insert` MergeTree setting (default 300). ClickHouse also has `parts_to_delay_insert` (default 150) which begins slowing inserts before the hard reject. The post simplifies this to just the 300 threshold, which is acceptable for a practical guide.
- SYSTEM STOP/START MERGES commands do not persist across server restarts — the lock is held in memory only. This is a minor operational detail not mentioned in the post.
- The system.merges table has additional useful columns not covered (e.g., num_parts, source_part_names, partition_id, is_mutation, merge_algorithm) which could be topics for a follow-up post.
