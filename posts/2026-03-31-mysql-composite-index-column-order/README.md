# How to Choose the Right Column Order for Composite Indexes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Composite, Performance, Query

Description: Learn the rules for ordering columns in MySQL composite indexes to maximize query coverage, satisfy range queries, and leverage the leftmost prefix principle.

---

## The Leftmost Prefix Rule

MySQL can use a composite index for queries that reference a prefix of the index columns starting from the left. An index on `(a, b, c)` can serve queries filtering on `a`, `(a, b)`, or `(a, b, c)`, but not on `b` alone or `(b, c)` alone.

```sql
CREATE INDEX idx_status_customer_date
    ON orders(status, customer_id, created_at);

-- Uses the index (prefix: status)
SELECT * FROM orders WHERE status = 'pending';

-- Uses the index (prefix: status, customer_id)
SELECT * FROM orders WHERE status = 'shipped' AND customer_id = 42;

-- Uses the index (full: status, customer_id, created_at)
SELECT * FROM orders WHERE status = 'shipped' AND customer_id = 42 AND created_at > '2025-01-01';

-- Does NOT use the index
SELECT * FROM orders WHERE customer_id = 42;
```

## Rule 1 - Equality Columns First

Place columns used in equality predicates (`=`, `IN`) before columns used in range predicates (`>`, `<`, `BETWEEN`, `LIKE 'val%'`).

```sql
-- Good: equality (status, customer_id) before range (created_at)
CREATE INDEX idx_good ON orders(status, customer_id, created_at);

-- Less optimal: range column in the middle stops index use for customer_id
CREATE INDEX idx_less_optimal ON orders(status, created_at, customer_id);
```

When a range predicate is encountered, MySQL stops using subsequent columns for filtering.

## Rule 2 - Highest Selectivity First Among Equality Columns

Among equality-only columns, put the most selective one first. This reduces the number of rows that need to be examined in subsequent steps.

```sql
-- If customer_id has higher cardinality than status, put it first
CREATE INDEX idx_customer_status ON orders(customer_id, status);
```

## Rule 3 - Sort Columns at the End

If your query has both `WHERE` equality filters and an `ORDER BY`, place the sort column after the equality columns so MySQL can satisfy the sort from the index without a filesort.

```sql
-- Query: WHERE status = 'pending' ORDER BY created_at
CREATE INDEX idx_status_date ON orders(status, created_at);

EXPLAIN SELECT id FROM orders
WHERE status = 'pending'
ORDER BY created_at\G
-- Extra: Using where; Using index  (no filesort)
```

## Rule 4 - Match the Most Frequent Queries

Build composite indexes around your actual query patterns. Use `EXPLAIN` and slow query log analysis to understand which columns appear in `WHERE`, `JOIN ON`, and `ORDER BY` clauses.

```sql
-- Analyze query patterns in the slow log using pt-query-digest
-- or check statement digests:
SELECT DIGEST_TEXT, COUNT_STAR, AVG_TIMER_WAIT
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'your_database'
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

## Testing Column Order Choices

```sql
-- Test option A
CREATE INDEX idx_option_a ON orders(status, customer_id, created_at);
EXPLAIN SELECT * FROM orders WHERE status = 'pending' AND customer_id = 42 ORDER BY created_at\G

-- Test option B
CREATE INDEX idx_option_b ON orders(customer_id, status, created_at);
EXPLAIN SELECT * FROM orders WHERE status = 'pending' AND customer_id = 42 ORDER BY created_at\G
```

Compare the `rows` estimate and `Extra` field. Less rows and no `Using filesort` indicates the better column order.

## Summary

Choose composite index column order by placing equality columns first (highest selectivity among them), followed by range columns, and sort columns last. Always verify your index design with `EXPLAIN` and `EXPLAIN ANALYZE`, and revisit column order when query patterns change significantly.
