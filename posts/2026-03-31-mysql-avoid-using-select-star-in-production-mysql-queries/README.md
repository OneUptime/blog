# How to Avoid Using SELECT * in Production MySQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Performance, Best Practice, Index

Description: Learn why SELECT * hurts MySQL performance in production and how to replace it with explicit column lists that enable covering indexes and reduce network overhead.

---

`SELECT *` is convenient during development but harmful in production. It sends unnecessary data over the network, prevents the query optimizer from using covering indexes, and makes application code fragile when the schema changes.

## The Performance Cost of SELECT *

When you select all columns, MySQL must read the full row from the clustered index. When you select a subset of columns that matches an index, MySQL can use a covering index and never touch the row data:

```sql
-- Table has an index: INDEX idx_status_date (status, created_at, id, total)

-- SELECT * requires a full row read from the primary key
EXPLAIN SELECT * FROM orders WHERE status = 'pending';

-- Explicit columns match the covering index - no row read needed
EXPLAIN SELECT id, total, created_at FROM orders WHERE status = 'pending';
```

Run `EXPLAIN` on both queries. The covering index version shows `Using index` in the Extra column, indicating MySQL served the query entirely from the index without touching the table.

## The Fragility Problem

If you `SELECT *` into a struct or tuple in application code, adding a column to the table can break the mapping silently or cause unexpected behavior:

```python
# Fragile: positional tuple unpacking breaks if columns are reordered
row = cursor.fetchone()
order_id, customer_id, total = row  # breaks when a column is inserted before total

# Robust: explicit column names
cursor.execute("SELECT id, customer_id, total FROM orders WHERE status = %s", ('pending',))
for order_id, customer_id, total in cursor.fetchall():
    process_order(order_id, customer_id, total)
```

## Network Overhead at Scale

On a table with 50 columns, fetching 5 columns of interest via `SELECT *` transfers 10x more data than necessary. At high query rates this adds meaningful latency:

```sql
-- Measure the data volume difference
SELECT id, status, total FROM orders LIMIT 1000;
SELECT * FROM orders LIMIT 1000;
```

The second query's result set is significantly larger, increasing the time spent in network transfer.

## Legitimate Uses of SELECT *

`SELECT *` is acceptable in a few contexts:

```sql
-- Interactive exploration in a MySQL client
SELECT * FROM orders WHERE id = 42;

-- Checking row existence (though SELECT 1 is preferred)
SELECT EXISTS(SELECT * FROM orders WHERE id = 42);

-- COUNT(*) - the asterisk here means "count rows", not "fetch all columns"
SELECT COUNT(*) FROM orders WHERE status = 'pending';
```

## Enforcing Explicit Columns in Code Review

Add a linting rule to your SQL review checklist. In Python projects, tools like `sqlfluff` can detect `SELECT *`:

```bash
pip install sqlfluff
sqlfluff lint --dialect mysql queries/

# .sqlfluff config to enforce no star
[sqlfluff:rules:L044]
force_enable = True
```

## Summary

Replacing `SELECT *` with explicit column lists is a low-effort change with measurable benefits: enabling covering indexes reduces InnoDB row reads, transferring only required columns reduces network bandwidth, and named columns make application code resilient to schema changes. Reserve `SELECT *` for interactive queries and development exploration, never for production application code.
