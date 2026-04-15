# Validation Summary: How to Use max_rows_to_group_by Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (query complexity settings)
- SQL (GROUP BY aggregation)
- ClickHouse `max_rows_to_group_by` setting
- ClickHouse `group_by_overflow_mode` setting
- ClickHouse `system.query_log` system table
- ClickHouse user profile settings (ALTER USER)

## Sources Consulted
- ClickHouse official documentation — Query Complexity settings: https://clickhouse.com/docs/en/operations/settings/query-complexity#max-rows-to-group-by
- ClickHouse official documentation — group_by_overflow_mode: https://clickhouse.com/docs/en/operations/settings/query-complexity#group-by-overflow-mode
- ClickHouse official documentation — ALTER USER: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse official documentation — system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
1. **Inaccurate description of `any` overflow mode.** The post originally stated that `any` mode "keeps only the first value encountered for keys beyond the limit." This is misleading. The actual behavior is that `any` mode continues aggregation for keys already in the hash table but stops adding new keys beyond the limit. New keys are simply ignored, not stored with a first value. Fixed the description to: "continues aggregation for keys already in the set but stops adding new keys beyond the limit (approximate results)."

## Review Notes
- The statement that `max_rows_to_group_by` is "only meaningful when combined with `group_by_overflow_mode`" is slightly imprecise — `group_by_overflow_mode` defaults to `throw`, so `max_rows_to_group_by` works even without explicitly setting the overflow mode. However, the intent (that users should be aware of which overflow mode they want) is reasonable and not technically wrong.
- The error message text "Limit for number of rows to GROUP BY exceeded" could not be verified from official docs alone but is consistent with ClickHouse's error message naming conventions and is a well-known error string.
- All SQL syntax (SETTINGS clause, ALTER USER with MAX constraint, system.query_log queries) is correct and uses current ClickHouse syntax.
- The `system.query_log` column names and `type` enum values (`ExceptionBeforeStart`, `ExceptionWhileProcessing`) are verified correct.
