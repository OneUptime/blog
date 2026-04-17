# Validation Summary: How to Create UDFs in ClickHouse with SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL user-defined functions (SQL UDFs)
- ClickHouse system tables (`system.functions`)
- ClickHouse built-in functions (`multiIf`, `toDayOfWeek`, `concat`, `upper`, `lower`, `substring`, `if`, `today`, `now`)

## Sources Consulted
- ClickHouse CREATE FUNCTION docs: https://clickhouse.com/docs/sql-reference/statements/create/function
- ClickHouse DROP FUNCTION docs: https://clickhouse.com/docs/sql-reference/statements/drop
- ClickHouse UDF overview: https://clickhouse.com/docs/sql-reference/functions/udf
- ClickHouse `system.functions` table: https://clickhouse.com/docs/operations/system-tables/functions
- ClickHouse `toDayOfWeek` docs: https://clickhouse.com/docs/sql-reference/functions/date-time-functions#toDayOfWeek

## Issues Found
No technical issues found.

- `CREATE FUNCTION name AS (params) -> expression` matches the official syntax.
- `toDayOfWeek(dt) IN (6, 7)` correctly identifies Saturday (6) and Sunday (7) under the default mode where Monday=1 through Sunday=7.
- `system.functions.origin = 'SQLUserDefined'` is a valid enum value for filtering SQL UDFs.
- `DROP FUNCTION` and `DROP FUNCTION IF EXISTS` are both valid.
- Nesting SQL UDFs (non-recursive) is officially supported.
- The stated limitations (no state, no table access, no loops, no subqueries) accurately reflect ClickHouse's documented restrictions for SQL UDFs.

## Review Notes
- The `origin` column in `system.functions` is marked "Obsolete" in the ClickHouse docs but still exists and works for the query shown. If the column is eventually removed, readers may need to filter differently (e.g., by querying `system.user_defined_functions` or checking via the `CREATE FUNCTION` statement). This is not an error in the post today.
- ClickHouse also supports `CREATE OR REPLACE FUNCTION` as a single-statement alternative to the `DROP` + `CREATE` pattern shown in "Replace an Existing UDF" — worth mentioning in a future revision, but the approach shown is valid.
