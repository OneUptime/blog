# Validation Summary: How to Use the Hash Join Algorithm in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (specifically 8.0.18+)
- Hash join algorithm
- MySQL query optimizer
- EXPLAIN FORMAT=TREE / EXPLAIN ANALYZE

## Sources Consulted
- MySQL 8.0 Hash Join Optimization: https://dev.mysql.com/doc/refman/8.0/en/hash-joins.html
- MySQL 8.0 Switchable Optimizations: https://dev.mysql.com/doc/refman/8.0/en/switchable-optimizations.html
- MySQL 8.0 Optimizer Hints: https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Server System Variables (join_buffer_size): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0.18 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-18.html
- MySQL 8.0.20 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html

## Issues Found

### 1. Incorrect optimizer switch flag for controlling hash join
**What was wrong:** The post used `hash_join=off` in `optimizer_switch` and `SELECT @@optimizer_switch LIKE '%hash_join=on%'` to control/check hash join. The `hash_join` flag only worked in MySQL 8.0.18. From MySQL 8.0.19 onward it is silently ignored; the `block_nested_loop` flag controls hash join behavior instead.
**What was changed:** Replaced `hash_join=off/on` with `block_nested_loop=off/on` and added a note explaining the version history.

### 2. Deprecated HASH_JOIN/NO_HASH_JOIN optimizer hints
**What was wrong:** The post used `/*+ NO_HASH_JOIN(c, r) */` and `/*+ HASH_JOIN(c, r) */` optimizer hints. These were deprecated in MySQL 8.0.19 and have no effect. The correct hints from MySQL 8.0.20 onward are `BNL`/`NO_BNL`.
**What was changed:** Replaced `HASH_JOIN`/`NO_HASH_JOIN` hints with `BNL`/`NO_BNL` hints, with a version note.

### 3. Incorrect method for detecting hash join disk spill
**What was wrong:** The post suggested using `SHOW STATUS LIKE 'Created_tmp_disk_tables'` to check if hash join spilled to disk. This status variable tracks internal temporary tables created on disk (for GROUP BY, sorting, etc.), not hash join chunk file spills, which use a different mechanism.
**What was changed:** Replaced the `Created_tmp_disk_tables` suggestion with `EXPLAIN ANALYZE`, which shows actual execution details including spill information in its output.

## Review Notes
- The post correctly identifies MySQL 8.0.18 as the version that introduced hash join, and accurately describes the build/probe phases.
- The SQL code examples for table creation, basic joins, and EXPLAIN usage are all correct.
- The `join_buffer_size` default of 256KB is correct.
- The multi-table hash join example is valid.
