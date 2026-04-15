# Validation Summary: How to Handle Schema Changes in Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, DDL, materialized views)
- Materialized Views with TO clause
- ALTER TABLE (ADD COLUMN, MODIFY COLUMN, RENAME COLUMN)
- ReplacingMergeTree engine
- Aggregate functions (count, avg, quantile)

## Sources Consulted
- ClickHouse ALTER VIEW documentation — https://clickhouse.com/docs/en/sql-reference/statements/alter/view
- ClickHouse ALTER COLUMN documentation — https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse CREATE VIEW documentation — https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse ReplacingMergeTree documentation — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse quantile function documentation — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse SELECT GROUP BY documentation — https://clickhouse.com/docs/en/sql-reference/statements/select/group-by

## Issues Found
- **Incorrect ordering in the Renaming Columns section**: The original post advised renaming columns in the source and target tables first, then dropping and recreating the materialized view. This ordering is wrong — if a source column is renamed while the MV still references the old name, any INSERT to the source table during that window will fail because the MV's internal query tries to read a column that no longer exists. Fixed by reordering to: (1) drop the view, (2) rename columns, (3) recreate the view.

## Review Notes
- All SQL syntax (ALTER TABLE ADD/MODIFY/RENAME COLUMN, CREATE MATERIALIZED VIEW ... TO ... AS SELECT, DROP VIEW, quantile(0.99)(), GROUP BY 1, 2, now() - INTERVAL 1 HOUR) is verified correct against official ClickHouse documentation.
- `DROP VIEW` is valid for materialized views in ClickHouse (though `DROP TABLE` also works).
- `ReplacingMergeTree(version)` with a DateTime column is confirmed valid; the version parameter accepts UInt*, Date, DateTime, and DateTime64.
- Newer ClickHouse versions (22.4+) support `ALTER TABLE ... MODIFY QUERY` for materialized views as an alternative to drop-and-recreate, but the blog's conservative approach works on all versions and is not incorrect.
- The `GROUP BY 1, 2` positional syntax depends on the `enable_positional_arguments` setting, which is enabled by default in modern ClickHouse versions. Readers on older versions may need to enable it explicitly.
