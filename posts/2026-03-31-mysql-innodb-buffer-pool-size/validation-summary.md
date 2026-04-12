# Validation Summary: How to Configure InnoDB Buffer Pool Size in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (5.7.5+ and 8.0)
- InnoDB storage engine
- InnoDB Buffer Pool
- Performance Schema
- Information Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool Configuration — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html
- MySQL 8.0 Reference Manual: innodb_buffer_pool_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_size
- MySQL 8.0 Reference Manual: innodb_buffer_pool_instances — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_instances
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual: INNODB_BUFFER_PAGE table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-page-table.html
- MySQL 8.0 Reference Manual: INNODB_TABLES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tables-table.html
- MySQL 8.0 Reference Manual: Option File Syntax — https://dev.mysql.com/doc/refman/8.0/en/option-files.html

## Issues Found

1. **INI comment syntax using `--` instead of `#`**: Two configuration file snippets used `--` for inline comments (SQL comment syntax). MySQL config files (`.cnf`/`.ini`) use `#` or `;` for comments, not `--`. Using `--` would cause the config value to be parsed incorrectly or produce an error. Changed `--` to `#` in both occurrences (the `innodb_buffer_pool_dump_pct` and `innodb_old_blocks_time` config lines).

2. **Incorrect `hit_rate` division in Buffer Pool Page Status query**: The `HIT_RATE` column in `information_schema.INNODB_BUFFER_POOL_STATS` is expressed as a value out of 1000 (e.g., 999 means 99.9%). The query divided by 1000, which produces a 0–1 decimal, not a percentage. Changed `hit_rate / 1000` to `hit_rate / 10` so the result is a proper percentage value.

3. **Invalid join in "Finding Tables Consuming Most Buffer Pool Pages" query**: The query joined `INNODB_BUFFER_PAGE` with `information_schema.INNODB_TABLES` using `t.table_schema` and `t.table_name` columns. However, `INNODB_TABLES` does not have those columns — it has a single `NAME` column containing the schema and table in `schema/table` format. Replaced the query with a simpler, correct version that queries `INNODB_BUFFER_PAGE` directly, grouping by its `TABLE_NAME` column and filtering out NULL entries.

## Review Notes
- The "one instance per gigabyte" recommendation for `innodb_buffer_pool_instances` is a commonly cited heuristic but is a simplification. The official MySQL docs state each instance should be "at least 1 GB," which is the minimum, not a target ratio. The formula `MIN(buffer_pool_size_in_GB, 64)` would produce valid but potentially excessive instance counts. In practice, 8–16 instances is common for large pools.
- `innodb_buffer_pool_instances` was deprecated in MySQL 8.4.0. The post targets MySQL 5.7.5+ and is accurate for MySQL 8.0, but readers on MySQL 8.4+ should be aware of this deprecation.
- MySQL 5.7 reached end-of-life in October 2023. The dynamic resizing feature (introduced in 5.7.5) is available in all supported MySQL versions now, so the "5.7.5+" qualifier, while historically accurate, could be simplified.
- The `innodb_buffer_pool_dump_at_shutdown` and `innodb_buffer_pool_load_at_startup` variables default to ON in MySQL 5.7+ and 8.0, so enabling them explicitly is redundant but harmless for clarity.
