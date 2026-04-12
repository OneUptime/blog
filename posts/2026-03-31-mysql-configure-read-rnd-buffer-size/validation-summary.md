# Validation Summary: How to Configure read_rnd_buffer_size in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7, 8.0+)
- MySQL Server Configuration (`read_rnd_buffer_size`, `sort_buffer_size`)
- MySQL EXPLAIN and filesort
- MySQL covering indexes

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — `read_rnd_buffer_size` (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_read_rnd_buffer_size)
- MySQL 8.0 Reference Manual: Server Status Variables — `Handler_read_rnd`, `Handler_read_rnd_next` (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: ORDER BY Optimization (https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html)
- MySQL 8.0 Reference Manual: CREATE INDEX — Descending Indexes (https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)

## Issues Found
No technical issues found.

## Review Notes
- The `DESC` index syntax (`created_at DESC`) in the covering index example requires MySQL 8.0+. In MySQL 5.7, `DESC` in index definitions is parsed but ignored. The post does not specify a version, which is acceptable since MySQL 8.0 is the current GA release.
- The post focuses on the filesort use case of `read_rnd_buffer_size`. This variable is also used by the Multi-Range Read (MRR) optimization (MySQL 5.6+), which is not mentioned but is not required for the scope of this tutorial.
- The advice to set large values per-session rather than globally is correct and aligns with MySQL documentation, which notes that this buffer is allocated per client connection.
