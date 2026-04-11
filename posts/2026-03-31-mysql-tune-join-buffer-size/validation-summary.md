# Validation Summary: How to Tune join_buffer_size for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- MySQL Performance Schema
- MySQL EXPLAIN / EXPLAIN FORMAT=JSON
- Block Nested Loop (BNL) and Hash Join algorithms

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (`join_buffer_size`) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_join_buffer_size
- MySQL 8.0 Reference Manual: Nested-Loop Join Algorithms — https://dev.mysql.com/doc/refman/8.0/en/nested-loop-joins.html
- MySQL 8.0 Reference Manual: Hash Join Optimization — https://dev.mysql.com/doc/refman/8.0/en/hash-joins.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: Performance Schema Timer — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (JSON) — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found

1. **Performance Schema timer conversion was wrong**: The query divided `AVG_TIMER_WAIT` by `1000000000` (10^9) and aliased it as `avg_sec`. Performance Schema timer values are in picoseconds (10^-12 seconds), so dividing by 10^9 yields milliseconds, not seconds. Changed the divisor to `1000000000000` (10^12) to correctly produce seconds.

2. **Incorrect EXPLAIN FORMAT=JSON field for hash join identification**: The post instructed readers to look for `"join_type": "hash"` in the JSON EXPLAIN output. The `join_type` field shows access types (ALL, ref, eq_ref, etc.), not the join algorithm. Hash joins are indicated by `"using_join_buffer": "hash join"`. Corrected the field name.

3. **Inaccurate characterization of hash joins**: Hash joins were described as "more memory-efficient" than BNL. The primary advantage of hash joins is speed (O(1) hash table lookups vs. repeated scans), not memory efficiency. Changed to "faster alternative to BNL."

## Review Notes
- The post correctly notes that BNL was replaced with hash joins in MySQL 8.0, but could be more precise: hash joins were introduced in 8.0.18 for equi-joins without indexes, and BNL was fully removed in 8.0.20. The current phrasing ("replaced with hash joins for some cases") is acceptable for 8.0.18 but understates the change for 8.0.20+.
- The section title "Add Indexes on Join Columns" uses the phrase "foreign key index" in the text. The example actually adds a regular index, not a foreign key constraint. The terminology is slightly imprecise but the advice is sound.
- All SQL syntax is correct and the configuration file format is accurate for MySQL.
- The memory impact calculation logic is correct and the per-connection / per-join-buffer allocation explanation is accurate.
