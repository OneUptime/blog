# Validation Summary: How to Use EXPLAIN FORMAT=JSON in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (EXPLAIN FORMAT=JSON, EXPLAIN FORMAT=TREE, EXPLAIN ANALYZE)
- Python (subprocess, json modules)
- SQL (SELECT, JOIN, subqueries)

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual — EXPLAIN ANALYZE: https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze
- MySQL 8.0 Reference Manual — Index Condition Pushdown Optimization: https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html

## Issues Found

1. **Incorrect `cost_info` fields in multi-table JOIN JSON example**: The per-table `cost_info` objects used `query_cost`, which only appears at the top-level `query_block.cost_info`. Real MySQL output uses `read_cost`, `eval_cost`, `prefix_cost`, and `data_read_per_join` inside each table's `cost_info`. Fixed by replacing with accurate field names and adding the top-level `query_cost` at the `query_block` level.

2. **Python variable shadowing function name**: The local variable `explain_query` on line 119 shadowed the enclosing function name `explain_query`. While not a runtime error in this case, it is confusing and poor practice. Renamed the local variable to `explain_sql`.

3. **Inaccurate claim about `attached_condition` and ICP**: The post stated that `attached_condition` helps "verify Index Condition Pushdown (ICP)." In reality, `attached_condition` shows conditions applied at a table access step, but ICP is specifically indicated by `"message": "Using index condition"` in the JSON output. Corrected the explanation.

4. **Invalid `EXPLAIN ANALYZE FORMAT=JSON` syntax**: The summary recommended `EXPLAIN ANALYZE FORMAT=JSON`, but `EXPLAIN ANALYZE` in MySQL 8.0.18+ only supports TREE format output. Specifying `FORMAT=JSON` would produce an error. Changed to `EXPLAIN ANALYZE` with a note that it outputs in TREE format.

## Review Notes
- The Python example passes the password on the command line via `-p{password}`, which is visible in process listings. This is a known security concern but is a common pattern in tutorial examples. Not changed since it's outside the scope of the article's focus.
- The `\G` suffix on the multi-table JOIN SQL example is a mysql client formatter. It works but is unnecessary with JSON output since there's only one column. Left as-is since it's not incorrect.
