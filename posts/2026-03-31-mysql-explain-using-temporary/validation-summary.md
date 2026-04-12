# Validation Summary: How to Identify Using Temporary Using EXPLAIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (EXPLAIN statement)
- MySQL query optimizer (temporary tables, filesort)
- MySQL server variables (`tmp_table_size`, `max_heap_table_size`)
- MySQL status variables (`Created_tmp_disk_tables`, `Created_tmp_tables`)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: Internal Temporary Table Use in MySQL (https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html)
- MySQL 8.0 Reference Manual: Server System Variables — tmp_table_size, max_heap_table_size (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: Server Status Variables — Created_tmp_disk_tables, Created_tmp_tables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/create-index.html)
- MySQL 8.0 Reference Manual: UNION Clause (https://dev.mysql.com/doc/refman/8.0/en/union.html)

## Issues Found
No technical issues found.

## Review Notes
- The EXPLAIN output examples are simplified to show only the most relevant columns (id, type, key, rows, Extra), omitting columns like select_type, table, partitions, possible_keys, key_len, ref, and filtered. This is acceptable for a tutorial blog post focused on the Extra column.
- In MySQL 8.0.13+, implicit sorting for GROUP BY was removed, so GROUP BY no longer guarantees ordered output. The post's examples showing "Using filesort" alongside "Using temporary" for GROUP BY are still valid since the optimizer may still use filesort depending on the query plan, but readers on MySQL 8.0.13+ may see slightly different EXPLAIN output in some cases.
- The effective in-memory temporary table size limit is actually the minimum of `tmp_table_size` and `max_heap_table_size`, which is why the post correctly sets both variables together. This nuance could be called out more explicitly but is not an error.
