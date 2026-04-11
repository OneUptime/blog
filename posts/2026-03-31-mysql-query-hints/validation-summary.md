# Validation Summary: How to Use Query Hints in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7, 8.0, 8.0.20+)
- MySQL Optimizer Hints (`/*+ */` syntax)
- MySQL Index Hints (USE INDEX, FORCE INDEX, IGNORE INDEX)
- STRAIGHT_JOIN
- EXPLAIN

## Sources Consulted
- MySQL 8.0 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 5.7 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/5.7/en/optimizer-hints.html
- MySQL 8.0 Reference Manual — Index Hints: https://dev.mysql.com/doc/refman/8.0/en/index-hints.html
- MySQL 8.0.20 Release Notes (INDEX/NO_INDEX hint introduction): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html
- MySQL 8.0 Reference Manual — Hash Join Optimization: https://dev.mysql.com/doc/refman/8.0/en/hash-joins.html

## Issues Found
1. **Optimizer hints version mislabeled as "MySQL 5.7+"**: The types list and section title both stated "MySQL 5.7+" for optimizer hints, but the examples used `INDEX()` (requires 8.0.20+), `NO_MERGE()` (requires 8.0+), and `JOIN_ORDER()` (requires 8.0+). Fixed the types list to say "introduced in MySQL 5.7, expanded in 8.0+" and the section title to "MySQL 8.0+" to accurately reflect the version requirements of the examples shown.

2. **FORCE INDEX comment overstated its effect**: The inline comment said "disable full table scan fallback," but per MySQL docs, FORCE INDEX makes table scans "very expensive" in the optimizer's cost model — a table scan is still used if there is no way to use any of the named indexes. Changed to "make full table scan a last resort."

## Review Notes
- The `INDEX()` and `NO_INDEX()` optimizer hints used in the examples specifically require MySQL 8.0.20+, not just 8.0. This is a finer version distinction but is acceptable given the section title says "8.0+".
- `MAX_EXECUTION_TIME()` only applies to read-only SELECT statements. The post's examples only show SELECT, so this is not wrong, but readers should be aware of this limitation.
- `SET_VAR()` was introduced in MySQL 8.0.3, not 5.7. The post does not claim a version for this hint individually, so no fix was needed.
- BNL/NO_BNL hints changed semantics in MySQL 8.0.20+ (they now control hash joins instead of Block Nested-Loop). The post mentions them without version context, which is acceptable for a general overview.
- `NO_MERGE()` was introduced in MySQL 8.0, not 5.7. It is correctly placed under the now-relabeled "MySQL 8.0+" section.
