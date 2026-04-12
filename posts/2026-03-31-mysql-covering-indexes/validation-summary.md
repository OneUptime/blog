# Validation Summary: How to Use Covering Indexes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (CREATE INDEX, EXPLAIN, JOIN, COUNT)
- Covering indexes / composite index design

## Sources Consulted
- MySQL 8.0 Reference Manual: Optimization and Indexes — https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Index Condition Pushdown — https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html
- "High Performance MySQL" (Schwartz, Zaitsev, Tkachenko) — composite index column ordering guidance
- Markus Winand, "Use The Index, Luke" — https://use-the-index-luke.com/

## Issues Found

### 1. Incorrect composite index column ordering rule
**What was wrong:** The post listed the index column order as: (1) equality columns, (2) range columns, (3) ORDER BY/GROUP BY columns, (4) SELECT columns. This is incorrect because a range condition on an index column breaks B-tree ordering for all subsequent columns, meaning ORDER BY columns placed after a range column cannot use the index to avoid filesort.

**What was changed:** Swapped items 2 and 3 so the order is: (1) equality columns, (2) ORDER BY/GROUP BY columns, (3) range columns, (4) SELECT columns. Also updated the summary paragraph at the end which restated the incorrect ordering.

**Why:** This is the well-established "Equality–Sort–Range" (ESR) rule for composite index design. Placing ORDER BY columns before range columns allows the index's B-tree ordering to satisfy the sort, avoiding a filesort operation. Sources: "High Performance MySQL" and "Use The Index, Luke" both recommend this ordering.

### 2. Data generation produces 4000 rows instead of intended 5000
**What was wrong:** The cross join subquery for `d` only included values 0–3 (4 values), producing 10×10×10×4 = 4000 rows. The WHERE clause `n <= 5000` and EXPLAIN output both imply 5000 rows were intended.

**What was changed:** Added `UNION SELECT 4` to the `d` subquery so it produces values 0–4 (5 values), yielding 10×10×10×5 = 5000 rows.

**Why:** The EXPLAIN output examples show `rows: 5000` for the full table scan, and the intent was clearly to generate 5000 sample rows.

## Review Notes
- The EXPLAIN output for the non-covering index case shows `Using index condition` in Extra. For a pure equality ref lookup on both columns of a two-column index, the more common output would be `Using where; Using filesort` or just `Using filesort`. However, `Using index condition` (ICP) can appear in some MySQL versions for this case, so it is not technically wrong — just potentially not representative of what every reader would see.
- The post's examples all use equality conditions (no range conditions), so the corrected column ordering rule doesn't change any of the example indexes. The examples were already correct; only the stated rule was wrong.
- The post correctly notes that `Using index` in EXPLAIN Extra indicates a covering index. This is accurate for InnoDB in MySQL 5.6+.
