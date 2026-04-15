# Validation Summary: How to Rename Columns in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL, DDL, ALTER TABLE)
- MergeTree engine family (MergeTree, SummingMergeTree)
- ClickHouse system tables (system.tables, system.columns)
- ClickHouse materialized views
- ClickHouse cluster DDL (ON CLUSTER)

## Sources Consulted
- ClickHouse official documentation — ALTER TABLE column operations: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse official documentation — system.tables: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse official documentation — system.columns: https://clickhouse.com/docs/en/operations/system-tables/columns

## Issues Found

### Issue 1: Incorrect claim about PARTITION BY columns
- **What was wrong:** The post stated that columns in `ORDER BY`, `PRIMARY KEY`, or `PARTITION BY` cannot be renamed. The official documentation only restricts columns in `ORDER BY` or `PRIMARY KEY` (producing SQL Error [524]). `PARTITION BY` is not mentioned as a restriction.
- **What was changed:** Updated the text to reference only `ORDER BY` and `PRIMARY KEY`, and added the specific error code (SQL Error [524]).

### Issue 2: Complete Example renamed ORDER BY columns
- **What was wrong:** The example table was created with `ORDER BY (usr, evt_ts)`, but the subsequent ALTER TABLE statement attempted to rename both `usr` and `evt_ts`. This would fail with SQL Error [524] since those columns are in the sorting key.
- **What was changed:** Removed `usr` and `evt_ts` from the rename list and added a comment noting these columns are in the ORDER BY key and cannot be renamed.

### Issue 3: ON CLUSTER example renamed an ORDER BY column
- **What was wrong:** The ON CLUSTER example renamed `evt_ts` which is part of the `page_views` table's ORDER BY key.
- **What was changed:** Changed the example to rename `pg TO page_path` instead, which is a non-key column.

### Issue 4: Summary section inaccuracy
- **What was wrong:** The summary mentioned "ordering/partition keys" as blocking renames. This was inconsistent with the corrected body text and the documentation.
- **What was changed:** Updated the summary to say "ordering/primary keys" and clarified that these block the rename, while materialized expressions and views are the ones not updated automatically.

## Review Notes
- The `POPULATE` keyword used when recreating the materialized view in the "Handling Materialized View Dependencies" section is technically correct but worth noting: data inserted between the DROP and CREATE MATERIALIZED VIEW statements will be missed. The post doesn't mention this caveat. This is a minor omission that could be improved in a future update but is not a technical error.
- All SQL syntax, system table column names (`sorting_key`, `partition_key`, `primary_key`, `default_kind`, `default_expression`), function names (`generateUUIDv4()`), and ON CLUSTER syntax were verified as correct.
- The `default_kind` values `MATERIALIZED` and `ALIAS` are confirmed valid per the system.columns documentation.
