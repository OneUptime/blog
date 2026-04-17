# Validation Summary: How to Use ALTER TABLE DELETE in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse MergeTree engine family
- ClickHouse mutations (`ALTER TABLE DELETE`)
- ClickHouse lightweight DELETE
- ClickHouse `system.mutations` system table
- `KILL MUTATION` statement
- `ALTER TABLE DROP PARTITION`

## Sources Consulted
- ClickHouse official docs — ALTER TABLE DELETE: https://clickhouse.com/docs/en/sql-reference/statements/alter/delete
- ClickHouse official docs — Lightweight DELETE: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse official docs — system.mutations: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse official docs — KILL MUTATION: https://clickhouse.com/docs/en/sql-reference/statements/kill
- ClickHouse official docs — ALTER PARTITION (DROP PARTITION): https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse 22.8 release notes (introduction of experimental lightweight DELETE)

## Issues Found
No technical issues found.

- `ALTER TABLE ... DELETE WHERE` syntax is correct.
- Description of the mutation execution flow (read part, filter rows, write new part, atomic swap) matches ClickHouse behavior.
- `system.mutations` columns listed (database, table, mutation_id, command, create_time, is_done, parts_to_do, parts_to_do_names, latest_fail_reason) all exist.
- Lightweight DELETE was indeed introduced in ClickHouse 22.8 (experimental) and the `allow_experimental_lightweight_delete` session setting was required on older versions; this is accurate.
- `KILL MUTATION` syntax and mutation_id format (e.g., `mutation_2.txt` for non-replicated MergeTree) are correct.
- `ALTER TABLE ... DROP PARTITION '2023-01'` is valid syntax for a partition defined by a string key.

## Review Notes
- Minor nuance (not an error): lightweight DELETE is internally implemented as a mutation on the `_row_exists` column, so it also appears in `system.mutations`. The comparison table implies monitoring is exclusively via `system.parts` for lightweight DELETE, which is an oversimplification but common in introductory material — users can still inspect lightweight delete progress via `system.mutations` as well.
- Version caveat: lightweight DELETE became generally available / production-ready in ClickHouse 23.3. On 23.3+ the `allow_experimental_lightweight_delete` setting is no longer required. The post correctly scopes the setting to "older versions".
- No changes were made to the post.
