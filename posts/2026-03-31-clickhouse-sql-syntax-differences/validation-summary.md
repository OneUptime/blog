# Validation Summary: Key SQL Syntax Differences Between ClickHouse and Standard SQL

## Status
validated

## Post Type
Reference / Quick Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- ANSI SQL
- PostgreSQL (referenced for array syntax comparison)
- MySQL (referenced for positional GROUP BY comparison)

## Sources Consulted
- ClickHouse SQL Syntax documentation — https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse system.functions table documentation — https://clickhouse.com/docs/operations/system-tables/functions
- ClickHouse SAMPLE clause documentation — https://clickhouse.com/docs/sql-reference/statements/select/sample
- ClickHouse PREWHERE documentation — https://clickhouse.com/docs/sql-reference/statements/select/prewhere
- ClickHouse FINAL modifier documentation — https://clickhouse.com/docs/sql-reference/statements/select/from#final-modifier
- ClickHouse Array functions documentation — https://clickhouse.com/docs/sql-reference/functions/array-functions

## Issues Found
1. **Function name case sensitivity was incorrectly described.** The post originally stated: "Function names in ClickHouse are case-sensitive. `sum` works; `SUM` does not in most contexts." This is wrong. ClickHouse registers many common functions (aggregates like `sum`, `count`, `avg`, `min`, `max`, and type conversion functions) as case-insensitive via the `case_insensitive` flag in `system.functions`. Both `sum(amount)` and `SUM(amount)` work correctly. Only ClickHouse-specific functions (e.g., `toStartOfMonth`, `arrayJoin`, `multiIf`) are strictly case-sensitive. The code example was updated to show both cases accurately, and the misleading "Fails" comment was replaced with a correct example of a case-sensitive ClickHouse-specific function. The Summary section was also updated to reflect this nuance.

## Review Notes
- The SAMPLE clause section is correct syntactically, but readers should be aware that `SAMPLE` only works on tables that were created with a `SAMPLE BY` expression in the table engine definition. The post omits this prerequisite. This is not an error but could be a useful addition in a future update.
- All other code examples (array literals, tuple literals, FINAL modifier, GROUP BY positional references, lambda functions, PREWHERE clause) are syntactically correct and accurately described.
