# Validation Summary: How to Use Positional Arguments in ClickHouse GROUP BY

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect)
- Positional arguments in GROUP BY and ORDER BY clauses
- ClickHouse aggregate functions (`count()`, `avg()`, `countIf()`)
- ClickHouse date/time functions (`toStartOfHour()`, `toDate()`)
- ClickHouse GROUP BY modifiers (ROLLUP, CUBE)
- `enable_positional_arguments` setting

## Sources Consulted
- ClickHouse SELECT Query Documentation — https://clickhouse.com/docs/sql-reference/statements/select
- ClickHouse GROUP BY Documentation — https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse ORDER BY Documentation — https://clickhouse.com/docs/sql-reference/statements/select/order-by
- ClickHouse HAVING Documentation — https://clickhouse.com/docs/sql-reference/statements/select/having
- ClickHouse source: `Settings.cpp` — confirms `enable_positional_arguments` defaults to `true`
- ClickHouse source: `TreeRewriter.cpp` — confirms positional replacement applies to GROUP BY, ORDER BY, and LIMIT BY only (not HAVING)
- ClickHouse source: `replaceForPositionalArguments.cpp` — confirms per-element processing allows mixing positional and named references
- GitHub PR #38204 — changed `enable_positional_arguments` default from `false` to `true` (merged June 2022, ~v22.7)

## Issues Found
No technical issues found.

## Review Notes
- The `enable_positional_arguments` setting was changed to default `true` starting around ClickHouse v22.7 (June 2022). The post correctly notes it is enabled by default in "newer versions" without pinning a specific version, which keeps the advice current.
- ClickHouse also supports positional arguments in LIMIT BY clauses, which the post does not mention. This is not an error — just an additional feature that could be covered in a follow-up.
- All SQL examples use valid ClickHouse syntax: `toStartOfHour()`, `toDate()`, `multiIf()`, `countIf()`, `count()`, `avg()`, `lower()`, `INTERVAL` syntax, `WITH ROLLUP`, and `NULLS LAST` are all correct.
- The claim that HAVING does not support positional arguments (only aliases) is confirmed by both the documentation and the ClickHouse source code.
