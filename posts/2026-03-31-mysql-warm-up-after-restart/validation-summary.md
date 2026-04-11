# Validation Summary: How to Handle MySQL Warm-Up After a Restart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB Buffer Pool (dump/load mechanism)
- Python (mysql-connector-python)
- Performance Schema / Information Schema

## Sources Consulted
- [MySQL 8.4 Reference Manual: INNODB_BUFFER_POOL_STATS Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-innodb-buffer-pool-stats-table.html) — verified HIT_RATE column is per-1000, not percentage
- [MySQL 8.0 Reference Manual: Saving and Restoring the Buffer Pool State](https://dev.mysql.com/doc/refman/8.0/en/innodb-preload-buffer-pool.html) — verified dump/load variables, syntax, and defaults
- [MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html) — verified variable names, defaults, and syntax
- [MySQL 8.0 Reference Manual: LIMIT Query Optimization](https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html) — confirmed LIMIT 0 returns immediately without scanning

## Issues Found

1. **HIT_RATE is per-1000, not a percentage**: The `HIT_RATE` column in `information_schema.INNODB_BUFFER_POOL_STATS` returns a value in the range 0–1000 (per thousand page accesses), not 0–100 (percentage). The original SQL query and Python health check both used the raw value as if it were a percentage. Fixed by dividing by 10 in both the SQL warm-up progress query and the Python health check query.

2. **LIMIT 0 does not scan data**: The original post claimed that `LIMIT 0` "forces MySQL to scan the index without returning rows." In reality, MySQL's optimizer recognizes `LIMIT 0` and returns an empty result set immediately without reading any data or index pages. This means the example query `SELECT * FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 0` would not warm up the buffer pool at all. Fixed by replacing with `SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);` and correcting the explanation.

3. **Python health check threshold mismatch**: As a consequence of issue #1, the Python `is_warm()` function compared a per-1000 HIT_RATE value against a percentage threshold of 90.0, which would have required a hit rate of only 9% to pass. Fixed by dividing by 10 in the SQL query within the Python code.

## Review Notes
- In MySQL 8.0+, both `innodb_buffer_pool_dump_at_shutdown` and `innodb_buffer_pool_load_at_startup` default to ON, so explicitly setting them is redundant but acceptable for clarity and compatibility with MySQL 5.6/5.7.
- The `innodb_buffer_pool_dump_pct` default of 25 is correctly stated and matches the MySQL 5.7.2+ / 8.0 default.
- The Python example hardcodes a password ("secret") which is fine for illustrative purposes, but a production note about using environment variables or config files could be helpful in a future revision.
