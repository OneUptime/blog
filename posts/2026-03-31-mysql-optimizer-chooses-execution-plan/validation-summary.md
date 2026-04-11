# Validation Summary: How MySQL Optimizer Chooses an Execution Plan

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (cost-based optimizer, EXPLAIN, optimizer hints, optimizer trace)
- SQL (query syntax, index hints)

## Sources Consulted
- MySQL 8.0 Reference Manual: Understanding the Query Execution Plan (https://dev.mysql.com/doc/refman/8.0/en/execution-plan-information.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — access type descriptions (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: Controlling the Query Optimizer — optimizer_search_depth (https://dev.mysql.com/doc/refman/8.0/en/controlling-optimizer.html)
- MySQL 8.0 Reference Manual: Optimizer Hints (https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html)
- MySQL 8.0 Reference Manual: Tracing the Optimizer (https://dev.mysql.com/doc/refman/8.0/en/optimizer-tracing.html)
- MySQL 8.0 Reference Manual: The Optimizer Cost Model (https://dev.mysql.com/doc/refman/8.0/en/cost-model.html)

## Issues Found
1. **`ref` access type misdescribed as "index range scan"**: The `ref` access type was described as "index range scan on a non-unique index." In MySQL, `ref` is an index equality lookup (matching a single value or prefix), not a range scan. Range scans are the `range` access type. Changed to "index lookup using equality on a non-unique index."

2. **`optimizer_search_depth` default value comment misleading**: The comment stated "Default 62 (exhaustive search up to 7 tables)." The value 62 is the maximum search depth, meaning the optimizer performs an exhaustive search for any practical number of joined tables (up to 62). The "7 tables" claim is not associated with this variable. Pruning of unpromising partial plans is controlled separately by `optimizer_prune_level` (default 1). Updated comment to "Default 62 (maximum depth, effectively exhaustive for any practical join count)."

## Review Notes
- The post correctly distinguishes between `USE INDEX`/`IGNORE INDEX` (index hints, available since MySQL 5.0) and `/*+ JOIN_ORDER() */` (optimizer hints, MySQL 8.0+), though it groups them under a single "Optimizer Hints" heading. This is acceptable for a blog post audience.
- The `cost_value` column in `mysql.server_cost` and `mysql.engine_cost` may return NULL when the default value is in use. This is expected behavior and the queries shown are correct.
- The `information_schema.STATISTICS` table stores index cardinality but not row counts or full data distribution. The post's description is slightly simplified but acceptable in context since `ANALYZE TABLE` does update the statistics the optimizer relies on.
