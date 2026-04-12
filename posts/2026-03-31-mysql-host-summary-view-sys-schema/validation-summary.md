# Validation Summary: How to Use the host_summary View in MySQL sys Schema

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL sys schema
- MySQL Performance Schema
- sys.host_summary and x$host_summary views
- sys.host_summary_by_statement_type view

## Sources Consulted
- MySQL 8.0 Reference Manual — sys.host_summary view: https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary.html
- MySQL 8.0 Reference Manual — sys.host_summary_by_statement_type view: https://dev.mysql.com/doc/refman/8.0/en/sys-host-summary-by-statement-type.html
- MySQL 8.0 Reference Manual — Using the sys Schema: https://dev.mysql.com/doc/refman/8.0/en/sys-schema-usage.html

## Issues Found
- **`NOT IN` with NULL value**: The query in the "Comparing Statement Averages Across Hosts" section used `WHERE host NOT IN ('background', NULL)`. In SQL, `NOT IN` with a NULL element causes the entire predicate to evaluate to NULL (unknown) for every row due to three-valued logic, meaning the query would return zero results. Additionally, the sys.host_summary view already converts NULL hosts to the string `'background'` via an IF() function, so filtering for NULL is unnecessary. Fixed to `WHERE host != 'background'`.

## Review Notes
- All column names listed for sys.host_summary are accurate and match the official MySQL 8.0 documentation.
- The x$host_summary variant description is correct — latency columns return raw picoseconds and memory columns return raw bytes.
- The claim that `'background'` represents internal MySQL threads is accurate.
- The host_summary_by_statement_type query only selects 5 of the view's 11 columns, but that is fine for the blog's purpose — all referenced columns exist.
- The companion view `host_summary_by_file_io` mentioned in the summary section also exists in the sys schema.
