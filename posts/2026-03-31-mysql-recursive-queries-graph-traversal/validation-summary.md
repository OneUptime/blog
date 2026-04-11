# Validation Summary: How to Use Recursive Queries for Graph Traversal in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Recursive Common Table Expressions (CTEs)
- Graph traversal algorithms (BFS, path enumeration, ancestor lookup)

## Sources Consulted
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — Recursive Common Table Expressions: https://dev.mysql.com/doc/refman/8.0/en/with.html#common-table-expressions-recursive
- MySQL 8.0 Reference Manual — FIND_IN_SET(): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_find-in-set
- MySQL 8.0 Reference Manual — CAST(): https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html

## Issues Found

### 1. Duplicate anchor rows in recursive CTEs (queries 1, 2, 3)
**What was wrong:** The anchor members of the first three recursive CTEs selected `from_node` from the `edges` table filtered by `WHERE from_node = 1`. Since multiple edges originate from node 1, the anchor produced duplicate rows. For the "all paths" query, this caused every path to appear multiple times in the output.
**What was changed:** Replaced the anchor members with literal `SELECT` statements (e.g., `SELECT 1 AS node, 0 AS depth`) that produce exactly one seed row, eliminating the duplicates.
**Why:** A tutorial should produce correct, clean output. The all-paths query was returning duplicate results, and the other queries were doing redundant work.

### 2. Ancestor query was completely broken
**What was wrong:** The ancestor lookup query used `WHERE from_node = 5` in the anchor, looking for edges originating from node 5. In the sample data, node 5 has no outgoing edges, so the query returned zero results. Additionally, the column mappings were reversed (`to_node` was labeled as `ancestor` instead of `from_node`), and the recursive join condition was also reversed (`e.from_node = a.ancestor` instead of `e.to_node = a.ancestor`).
**What was changed:** Fixed the anchor to `WHERE to_node = 5` (finding edges pointing TO node 5), corrected column mappings so `from_node` is the ancestor, and fixed the recursive join to `e.to_node = a.ancestor` to walk edges backwards toward the root.
**Why:** To find ancestors, you must follow edges in reverse — from child to parent. The original query followed edges forward, which finds descendants, not ancestors, and produced no results with the sample data.

### 3. Redundant DISTINCT with GROUP BY (query 1)
**What was wrong:** `SELECT DISTINCT node, MIN(depth) AS min_depth FROM reachable GROUP BY node` — the `DISTINCT` keyword is redundant when `GROUP BY node` already guarantees one row per node.
**What was changed:** Removed `DISTINCT` from the outer SELECT.
**Why:** Cleaner SQL for a tutorial. GROUP BY already handles uniqueness.

## Review Notes
- The `CHAR(200)` cast for path strings works for the sample data but would truncate paths in large graphs. Production use should consider larger sizes or alternative cycle-detection approaches.
- The post describes the BFS query as stopping "as soon as the destination is first reached," but MySQL recursive CTEs cannot terminate early mid-recursion. The full recursion runs (bounded by the hop limit), and `LIMIT 1` filters the final result. The output is correct, but the description slightly overstates how it works.
- The `CREATE INDEX idx_edges_from ON edges(from_node)` in the performance tips is redundant with the `PRIMARY KEY (from_node, to_node)` defined on the table, since MySQL's primary key index already covers `from_node` as its leading column. The `idx_edges_to` index on `to_node` is useful, especially for the corrected ancestor query.
- MySQL's `cte_max_recursion_depth` system variable (default 1000) is not mentioned. The depth guards in the queries (10, 20) are well below this limit, so it's not an issue, but it could be worth a note for readers working with deeper graphs.
