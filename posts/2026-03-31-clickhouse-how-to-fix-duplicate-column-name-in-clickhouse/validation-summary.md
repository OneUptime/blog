# Validation Summary: How to Fix 'Duplicate column name' in ClickHouse

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse system tables (`system.columns`)
- ClickHouse-specific SQL features: `SELECT * EXCEPT`, `JOIN ... USING`, CTEs

## Sources Consulted
- ClickHouse error codes source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- ClickHouse SELECT / column transformers docs: https://clickhouse.com/docs/en/sql-reference/statements/select
- ClickHouse JOIN clause docs: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse `system.columns` docs: https://clickhouse.com/docs/en/operations/system-tables/columns

## Issues Found
- **Incorrect error code**: The post originally listed the duplicate column error as `Code: 44`. That code is `ILLEGAL_COLUMN` in ClickHouse. The correct error code for duplicate column names is `15` (`DUPLICATE_COLUMN`), per the official `ErrorCodes.cpp`. I updated both error snippets in the "Understanding the Error" section from `Code: 44` to `Code: 15`.

## Review Notes
- `SELECT * EXCEPT (col)` syntax is valid in ClickHouse and is a supported column transformer.
- `JOIN ... USING (col)` does collapse the join key column into a single output column, matching the claim in Fix 3.
- The `system.columns` query in the "Checking for Duplicate Columns in a Table" section is technically correct; `database`, `table`, and `name` are valid columns of `system.columns`. Note that ClickHouse enforces uniqueness of column names at CREATE TABLE time, so this diagnostic query will generally return no rows — the post acknowledges this caveat ("should not exist, but helpful after migrations"), which is accurate.
- The phrasing of the UNION ALL bullet in "Common Causes" ("where both branches have a column with duplicate names in the same branch") is a little awkward but technically accurate: a duplicate within a single branch of a UNION causes the failure. Left as-is since it was not factually wrong.
