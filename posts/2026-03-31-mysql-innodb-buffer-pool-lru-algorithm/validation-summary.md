# Validation Summary: How to Understand the InnoDB Buffer Pool LRU Algorithm in MySQL

## Status
validated

## Post Type
Tutorial / Explainer

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB Buffer Pool
- LRU (Least Recently Used) page replacement algorithm
- `performance_schema` and `information_schema` system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: Making the Buffer Pool Scan Resistant — https://dev.mysql.com/doc/refman/8.0/en/innodb-performance-midpoint_insertion.html
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: Server Status Variables (Innodb_buffer_pool_*) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found
1. **Incorrect column names in `INNODB_BUFFER_POOL_STATS` query**: Five column names in the monitoring query were wrong and would cause SQL errors:
   - `page_made_young` was changed to `pages_made_young` (was missing trailing 's')
   - `page_not_made_young` was changed to `pages_not_made_young` (was missing trailing 's')
   - `pages_read` was changed to `number_pages_read` (was missing `number_` prefix)
   - `pages_created` was changed to `number_pages_created` (was missing `number_` prefix)
   - `pages_written` was changed to `number_pages_written` (was missing `number_` prefix)

## Review Notes
- The `innodb_buffer_pool_instances` variable was deprecated in MySQL 8.4. The post does not specify a MySQL version, and the information is accurate for MySQL 8.0, which remains widely deployed. No change needed, but worth noting if the post is updated for MySQL 8.4+.
- All other technical claims are accurate: midpoint insertion strategy, default values for `innodb_old_blocks_pct` (37), `innodb_old_blocks_time` (1000 ms), `innodb_buffer_pool_instances` (8 for pools >= 1 GB), `innodb_read_ahead_threshold` (56), and `innodb_random_read_ahead` (OFF).
- The buffer pool hit rate formula and the recommendation of 70-80% of RAM for buffer pool size are consistent with official MySQL guidance.
- The `SHOW STATUS` variable names (`Innodb_buffer_pool_pages_total`, `Innodb_buffer_pool_pages_free`, `Innodb_buffer_pool_pages_dirty`, `Innodb_buffer_pool_read_ahead`, `Innodb_buffer_pool_read_ahead_evicted`) are all correct.
