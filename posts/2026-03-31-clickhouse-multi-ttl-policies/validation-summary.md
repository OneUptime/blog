# Validation Summary: How to Set Up Multi-TTL Policies in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse TTL (Time To Live) expressions
- ClickHouse storage policies (volume tiering)
- ClickHouse RECOMPRESS codec directives
- ClickHouse system tables for monitoring

## Sources Consulted
- ClickHouse official documentation on MergeTree TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse official documentation on multiple storage volumes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse official documentation on system.part_log: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse official documentation on system tables: https://clickhouse.com/docs/en/operations/system-tables
- ClickHouse official documentation on ALTER TABLE TTL: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl

## Issues Found

1. **Row-level TTL logical bug (Row-Level TTL section):** The original example had a catch-all DELETE rule at 90 days (`timestamp + INTERVAL 90 DAY`) alongside a WHERE-filtered rule retaining `purchase`/`signup` events for 365 days. Since ClickHouse evaluates each TTL rule independently, the catch-all would delete purchase/signup rows at 90 days, overriding the intended 365-day retention. Fixed by adding a `WHERE event_type NOT IN ('purchase', 'signup')` clause to the 90-day rule and making the 365-day rule the catch-all DELETE.

2. **Non-existent system table (Monitoring TTL Execution section):** The first monitoring query referenced `system.ttl_merges`, which does not exist in ClickHouse. Replaced with a query against `system.part_log` filtering on `merge_reason LIKE 'TTL%'` to show recent TTL-triggered merge events.

3. **Wrong column name (Monitoring TTL Execution section):** The second monitoring query used `reason` as the column name, but the correct column in `system.part_log` is `merge_reason`. Updated all references from `reason` to `merge_reason`.

4. **SQL operator precedence bug (Monitoring TTL Execution section):** The WHERE clause `reason = 'TTLDeleteMerge' OR reason = 'TTLRecompressMerge' AND event_date = today()` was missing parentheses. Due to AND having higher precedence than OR, the date filter only applied to the second condition. Fixed by wrapping the OR conditions in parentheses: `(merge_reason = 'TTLDeleteMerge' OR merge_reason = 'TTLRecompressMerge') AND event_date = today()`.

## Review Notes
- The `RECOMPRESS CODEC(ZSTD(3)) TO VOLUME 'cold'` syntax combining recompression with a volume move in a single TTL rule is supported in recent ClickHouse versions. Some documentation examples show the reverse order (`TO VOLUME ... RECOMPRESS ...`); both orderings should be accepted by the parser, but authors may want to verify against their target ClickHouse version.
- The `OPTIMIZE TABLE ... FINAL` and `ALTER TABLE ... MATERIALIZE TTL` commands for forcing TTL evaluation are correctly documented.
- The basic multi-TTL table and ALTER TABLE MODIFY TTL examples are syntactically correct and follow ClickHouse best practices.
