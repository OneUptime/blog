# Validation Summary: How to Configure MySQL Optimizer Switch Settings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL optimizer_switch system variable
- MySQL query optimizer flags (index_merge, ICP, MRR, BKA, semijoin, derived_merge, hash_join)
- MySQL optimizer hints (INDEX, NO_BNL, SET_VAR)
- MySQL configuration file (my.cnf / my.ini)

## Sources Consulted
- MySQL 8.0 Reference Manual — optimizer_switch: https://dev.mysql.com/doc/refman/8.0/en/switchable-optimizations.html
- MySQL 8.0 Reference Manual — Block Nested-Loop and Batched Key Access Joins: https://dev.mysql.com/doc/refman/8.0/en/bnl-bka-optimization.html
- MySQL 8.0 Reference Manual — Hash Join Optimization: https://dev.mysql.com/doc/refman/8.0/en/hash-joins.html
- MySQL 8.0 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Reference Manual — Multi-Range Read Optimization: https://dev.mysql.com/doc/refman/8.0/en/mrr-optimization.html

## Issues Found

1. **`mrr_cost_based=on` prevents BKA from working** (lines 72, 98, 137): Three separate code examples enabled `batched_key_access=on` alongside `mrr_cost_based=on`. Per MySQL documentation, BKA requires `mrr_cost_based=off` to function — otherwise the cost-based check may reject MRR, which BKA depends on. Changed all three instances to `mrr_cost_based=off`.

2. **`hash_join` flag described as "MySQL 8.0+"** (line 59): The `hash_join` optimizer_switch flag only existed in MySQL 8.0.18–8.0.19. It was removed in MySQL 8.0.20, after which hash joins are always available and controlled by `block_nested_loop`. Updated the description to specify the exact version range.

3. **`block_nested_loop=off` comment said "forces hash join or index use"** (line 69): This is incorrect. In MySQL 8.0.20+, disabling `block_nested_loop` also disables hash join (they share the same flag). Updated the comment to accurately describe this behavior.

4. **`NO_HASH_JOIN` optimizer hint deprecated** (line 119): The `NO_HASH_JOIN` hint was deprecated in MySQL 8.0.20 and has no effect in 8.0.20+. Replaced with `NO_BNL`, which is the correct hint for disabling hash joins in 8.0.20+, and added a version note.

5. **Summary recommended `hash_join=on` for MySQL 8.0** (line 142): Since the `hash_join` flag doesn't exist in MySQL 8.0.20+, this recommendation was misleading. Replaced with accurate guidance that hash joins are available by default in 8.0.18+ and no flag is needed in 8.0.20+. Also added `mrr_cost_based=off` to the BKA recommendation.

## Review Notes
- The sample output of optimizer_switch flags (lines 27–47) is a subset of what MySQL actually returns. This is fine since the post doesn't claim it's complete, but readers should be aware that MySQL 8.0 has many more flags (e.g., `prefer_ordering_index`, `hypergraph_optimizer`, `subquery_to_derived`).
- The post doesn't mention that `block_nested_loop` itself was deprecated in MySQL 8.0.20. It still functions, but readers working with MySQL 8.4+ should check current documentation for any changes.
- The `SELECT REPLACE(@@optimizer_switch, ',', '\n')` trick works in the mysql CLI client but the newline rendering depends on the client being used.
