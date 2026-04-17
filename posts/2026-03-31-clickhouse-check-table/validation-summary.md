# Validation Summary: How to Use CHECK TABLE in ClickHouse for Data Integrity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (CHECK TABLE statement)
- MergeTree / ReplicatedMergeTree engines
- clickhouse-client CLI
- SQL (DDL / ALTER TABLE DETACH PART, DROP PARTITION)
- SYSTEM SYNC REPLICA
- Bash / awk for CLI alerting

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/statements/check-table
- ClickHouse documentation on `check_query_single_value_result` setting
- ClickHouse ALTER TABLE documentation (DETACH PART, DROP PARTITION)
- ClickHouse SYSTEM SYNC REPLICA documentation

## Issues Found
1. **Incorrect default output format for CHECK TABLE**
   - The post described CHECK TABLE as returning three columns (`part_path`, `is_passed`, `message`) by default. This is incorrect — the default setting `check_query_single_value_result = 1` returns a single `result` column (0 or 1).
   - **Fix applied:** Added explanation that the default returns a single `result` column, and that `SETTINGS check_query_single_value_result = 0` is required to get one row per part with the detailed columns.
   - Updated the "Output Columns" section and all example queries (subquery `SELECT ... FROM (CHECK TABLE ...)`, the "Interpreting the Results" example, the scheduled integrity check example, and the bash CLI example) to include the `SETTINGS check_query_single_value_result = 0` clause. Without this setting, those queries would either return a single-column result (not matching the documented column names) or fail when selecting `part_path`/`is_passed`/`message`.

## Review Notes
- The CHECK TABLE, PARTITION, and PART syntax is accurate.
- The list of engines covered by CHECK TABLE (MergeTree family) is correct; Log-family engines also support it but the post focuses on MergeTree use cases, which is appropriate.
- The repair procedures (DETACH PART, DROP PARTITION, SYSTEM SYNC REPLICA) use valid syntax. Note that for ReplicatedMergeTree, ClickHouse's background replication typically handles broken parts automatically by fetching from a healthy replica; the manual DETACH + SYNC REPLICA flow shown is a reasonable supplementary approach, though users should be aware that ClickHouse may already detect and move broken parts to `detached/` on its own.
- The CLI example using `awk -F'\t'` assumes TabSeparated output, which is the clickhouse-client default for non-interactive queries — correct.
- The `.mrk` mark file extension mentioned is accurate for older formats; newer MergeTree variants may use `.mrk2` or `.mrk3` (for wide format / compact parts). CHECK TABLE validates whichever mark format the part uses.
