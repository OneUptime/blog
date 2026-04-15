# Validation Summary: How to Write a ClickHouse Table Size Report Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system tables: `system.parts`, `system.columns`)
- Bash shell scripting
- curl (HTTP interface to ClickHouse)
- cron (job scheduling)
- ClickHouse SQL functions: `formatReadableSize`, `formatReadableQuantity`, `round`
- ClickHouse output formats: `PrettyCompactMonoBlock`, `TabSeparated`

## Sources Consulted
- ClickHouse documentation on `system.parts` table: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation on `system.columns` table: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse `formatReadableSize` and `formatReadableQuantity` function documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- crontab man page for `-` (stdin) behavior

## Issues Found

### Issue 1: Incorrect column name in `system.columns` query
- **What was wrong:** The "Viewing Column-Level Compression" query used `column` as a field name in `SELECT` and `GROUP BY` clauses when querying `system.columns`. In ClickHouse, the field that stores the column name in `system.columns` is called `name`, not `column`. This would cause the query to fail with an "Unknown identifier" error.
- **What was changed:** Changed `column` to `name AS column` in the SELECT clause and `column` to `name` in the GROUP BY clause, preserving the output alias for readability.

### Issue 2: Crontab command replaces entire crontab
- **What was wrong:** The command `echo "..." | crontab -` replaces the user's entire crontab with a single entry, silently deleting any existing cron jobs. This is a destructive operation.
- **What was changed:** Replaced with the standard append idiom `(crontab -l 2>/dev/null; echo "...") | crontab -`, which preserves existing crontab entries while appending the new job.

## Review Notes
- The email alert query (`SELECT count() FROM system.parts ... GROUP BY database, table HAVING sum(bytes_on_disk) > 107374182400`) returns part counts per qualifying table rather than table names. While functional for triggering the alert (the `-n` check works correctly), the email body would only contain numbers. A more informative query would include `database` and `table` in the SELECT list. This is a usability improvement rather than a correctness error, so it was not changed.
- The partition breakdown query filters individual parts > 1 GB before grouping (`WHERE bytes_on_disk > 1073741824`). This means partitions that are large in aggregate but composed of many smaller parts would be excluded. This is a valid design choice, not an error.
- Port 8123 is correctly used as the default ClickHouse HTTP interface port.
- The `active = 1` filter on `system.parts` correctly excludes inactive (merged/deleted) parts.
