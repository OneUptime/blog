# Validation Summary: How to Configure MySQL Cost Model Settings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0 query optimizer
- MySQL cost model (`mysql.server_cost` and `mysql.engine_cost` tables)
- `FLUSH OPTIMIZER_COSTS` command
- `EXPLAIN FORMAT=JSON` for plan cost inspection

## Sources Consulted
- MySQL 8.0 Reference Manual — The Optimizer Cost Model: https://dev.mysql.com/doc/refman/8.0/en/cost-model.html
- MySQL 8.0 Reference Manual — server_cost Table: https://dev.mysql.com/doc/refman/8.0/en/server-cost-table.html
- MySQL 8.0 Reference Manual — engine_cost Table: https://dev.mysql.com/doc/refman/8.0/en/engine-cost-table.html
- MySQL 8.0 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html

## Issues Found
No technical issues found.

All six server cost constants and their default values are accurate. Both engine cost constants (`io_block_read_cost` = 1.0, `memory_block_read_cost` = 0.25) are correct. SQL syntax for querying, updating, inserting, and resetting cost values is valid. The `FLUSH OPTIMIZER_COSTS` command is the correct way to reload changes. The `EXPLAIN FORMAT=JSON` output structure with `query_block.cost_info.query_cost` is accurate. The engine-specific override using `INSERT ... ON DUPLICATE KEY UPDATE` with `device_type = 0` is correct.

## Review Notes
- The `default_value` column in the cost tables was added in MySQL 8.0.2. The post does not specify a MySQL version, but all content is accurate for MySQL 8.0.2+, which covers all mainstream MySQL 8.0 deployments.
- In MySQL 8.4+, these cost model tables remain the same, so the post is forward-compatible.
- The post could mention that cost model changes are global and persistent (stored in InnoDB system tables), which is worth noting for production use, but this is a style suggestion rather than a correctness issue.
