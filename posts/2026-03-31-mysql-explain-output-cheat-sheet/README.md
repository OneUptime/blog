# MySQL EXPLAIN Output Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Query Optimizer, Cheat Sheet

Description: Quick reference for reading MySQL EXPLAIN output, including type, key, rows, Extra fields, and how to interpret them for query optimization.

---

## Running EXPLAIN

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE customer_id = 42;
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;  -- 8.0+
```

## EXPLAIN Output Columns

```text
id            - step identifier; same id = same SELECT
select_type   - type of SELECT
table         - table being accessed
partitions    - partition pruning result
type          - join type (access method)
possible_keys - indexes considered
key           - index actually chosen
key_len       - bytes of key used
ref           - column/constant matched against key
rows          - estimated rows examined
filtered      - % of rows passing WHERE after index
Extra         - extra optimizer notes
```

## type Column (access method, best to worst)

```text
system      - single-row system table (best)
const       - at most one row via PRIMARY/UNIQUE
eq_ref      - one row per row from previous table (join on PK)
ref         - multiple rows via non-unique index
fulltext    - FULLTEXT index used
ref_or_null - like ref but also NULL check
index_merge - multiple indexes combined
range       - index range scan
index       - full index scan (all rows in index order)
ALL         - full table scan (worst)
```

## Extra Column Values

```text
Using index          - covering index, no table lookup (good)
Using where          - WHERE filter applied after index fetch
Using filesort       - sort cannot use index (may be slow)
Using temporary      - temp table used (e.g., for GROUP BY/DISTINCT)
Using index condition - Index Condition Pushdown (ICP) active (good)
Using join buffer    - join uses a block-nested-loop buffer (no index)
Impossible WHERE     - condition is always false, returns 0 rows
No tables used       - no FROM clause
Select tables optimized away - aggregate resolved from index only
```

## Reading rows and filtered

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42 AND status = 'SHIPPED';
-- rows = 500 means optimizer estimates 500 rows examined via index
-- filtered = 20.00 means 20% pass the remaining WHERE clause
-- actual rows visited = 500 * 0.20 = ~100
```

## key_len Interpretation

```sql
-- For an index on (dept_id INT, hire_date DATE)
-- key_len = 4  -> only dept_id used
-- key_len = 7  -> both dept_id (4) + hire_date (3) used
```

## EXPLAIN FORMAT=JSON (detailed)

```sql
EXPLAIN FORMAT=JSON
SELECT * FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'PENDING'\G
```

Look for `cost_info.read_cost` and `rows_examined_per_scan` in the JSON output.

## EXPLAIN ANALYZE (actual stats, MySQL 8.0+)

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
-- Returns actual rows and actual time in addition to estimates
-- Format: (cost=X rows=Y) (actual time=T rows=R loops=L)
```

## Common Red Flags

```text
type = ALL with large rows  -> missing index, add one
Extra: Using filesort        -> add/tune ORDER BY index
Extra: Using temporary       -> GROUP BY without index, or complex DISTINCT
key = NULL                   -> no index used; check WHERE clause columns
filtered < 10%               -> index not selective enough
```

## Practical Example

```sql
-- Before: full scan
EXPLAIN SELECT * FROM orders WHERE YEAR(created_at) = 2026;
-- type = ALL (function prevents index use)

-- After: index-friendly rewrite
EXPLAIN SELECT * FROM orders
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
-- type = range (uses index on created_at)
```

## Summary

EXPLAIN is the primary tool for understanding MySQL query execution plans. Focus on the `type` column (ALL is worst, const is best), check `key` to confirm index usage, and watch `Extra` for "Using filesort" or "Using temporary" which signal expensive operations. Use EXPLAIN ANALYZE in MySQL 8.0 to compare estimated vs. actual row counts and identify optimizer misestimates.
