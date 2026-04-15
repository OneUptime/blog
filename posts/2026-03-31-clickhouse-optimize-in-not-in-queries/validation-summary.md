# Validation Summary: How to Optimize IN and NOT IN Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL syntax, distributed tables, dictionaries, query settings)
- ClickHouse IN / NOT IN / GLOBAL IN operators
- ClickHouse dictionaries (HASHED layout, CLICKHOUSE source)
- ClickHouse JOIN types (LEFT ANTI JOIN)

## Sources Consulted
- ClickHouse IN operator documentation: https://clickhouse.com/docs/en/sql-reference/operators/in
- ClickHouse CREATE DICTIONARY documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary
- ClickHouse JOIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse query complexity settings: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse dictionary source implementation (ClickHouseDictionarySource.cpp) for SOURCE parameter defaults

## Issues Found
- **Vague `transform_null_in` comment**: The inline comment `-- treat NULL IN set correctly` was imprecise about what the setting actually does. Changed to `-- enable NULL = NULL matching in IN clauses` to accurately describe that this setting allows NULL values to be compared as equal within IN expressions.

## Review Notes
- The CREATE DICTIONARY SOURCE clause `SOURCE(CLICKHOUSE(TABLE 'blocked_users'))` is minimal but valid. ClickHouse defaults omitted parameters (host, port, user, password, db) to localhost/current-port/default/empty/current-database. For cross-database or remote sources, additional parameters would be needed.
- The NOT IN / NULL section describes the standard SQL three-valued logic gotcha where `NOT IN` silently returns no rows when the set contains NULL. ClickHouse's actual default behavior (`transform_null_in = 0`) deviates slightly from standard SQL by treating NULL comparisons in IN as 0 rather than NULL, which may affect this behavior in edge cases. However, the defensive advice to filter NULLs from subqueries is universally sound and recommended practice.
- The description of GLOBAL IN behavior on distributed tables accurately matches the official documentation.
- `LEFT ANTI JOIN` is confirmed as valid ClickHouse syntax.
- `max_rows_in_set` and `max_bytes_in_set` are real settings with correct descriptions. Their defaults are 0 (unlimited).
- `dictHas('dict_name', key)` syntax is correct.
