# How to Insert Multiple Rows in a Single INSERT Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Insert, Performance, Bulk, Query

Description: Learn how to insert multiple rows in a single MySQL INSERT statement to reduce round-trips and dramatically improve data loading performance.

---

## Why Insert Multiple Rows at Once

Every SQL statement sent to MySQL involves a round-trip over the network or inter-process communication. When inserting thousands of records one row at a time, that overhead accumulates quickly. MySQL supports inserting multiple rows in a single `INSERT` statement, which batches the work into one parse, one lock acquisition, and one transaction commit.

## Basic Multi-Row INSERT Syntax

The syntax extends the standard `INSERT INTO ... VALUES` form by appending additional value tuples separated by commas:

```sql
INSERT INTO products (name, price, stock)
VALUES
  ('Widget A', 9.99, 100),
  ('Widget B', 14.99, 50),
  ('Widget C', 4.99, 200);
```

MySQL processes all three rows in a single statement. The column list applies to every tuple, so the number of values in each tuple must match the number of columns listed.

## Performance Comparison

To illustrate the difference, consider inserting 1,000 rows. With individual statements:

```sql
INSERT INTO logs (event, created_at) VALUES ('login', NOW());
INSERT INTO logs (event, created_at) VALUES ('login', NOW());
-- ... 998 more statements
```

With a single multi-row INSERT:

```sql
INSERT INTO logs (event, created_at) VALUES
  ('login', '2026-01-01 10:00:00'),
  ('login', '2026-01-01 10:00:01'),
  -- ... 998 more tuples
  ('login', '2026-01-01 10:16:39');
```

Benchmarks consistently show multi-row inserts completing 5-10x faster than equivalent single-row loops for the same data volume.

## Combining with ON DUPLICATE KEY UPDATE

Multi-row inserts work seamlessly with `ON DUPLICATE KEY UPDATE` to implement upsert logic:

```sql
INSERT INTO inventory (sku, quantity)
VALUES
  ('ABC-001', 50),
  ('ABC-002', 30),
  ('ABC-003', 75) AS new_values
ON DUPLICATE KEY UPDATE
  quantity = new_values.quantity;
```

This inserts new SKUs or updates the quantity for existing ones, all in one atomic statement.

## Handling Errors Mid-Batch

By default, MySQL stops on the first error in a multi-row insert. Use `INSERT IGNORE` to skip problematic rows silently:

```sql
INSERT IGNORE INTO emails (address)
VALUES
  ('alice@example.com'),
  ('duplicate@example.com'),  -- already exists, skipped
  ('bob@example.com');
```

## Practical Limit on Batch Size

MySQL imposes a `max_allowed_packet` limit (default 64 MB) on the size of a single statement. For very large datasets, split your multi-row insert into batches of 500-1,000 rows:

```python
import mysql.connector

rows = [('item_%d' % i, i * 1.5) for i in range(10000)]
batch_size = 500

conn = mysql.connector.connect(host='localhost', user='root', database='shop')
cursor = conn.cursor()

for i in range(0, len(rows), batch_size):
    batch = rows[i:i + batch_size]
    placeholders = ', '.join(['(%s, %s)'] * len(batch))
    flat_values = [val for row in batch for val in row]
    cursor.execute(
        f'INSERT INTO products (name, price) VALUES {placeholders}',
        flat_values
    )

conn.commit()
cursor.close()
conn.close()
```

## Verifying the Insert

After a multi-row insert, `ROW_COUNT()` returns the total number of rows affected:

```sql
SELECT ROW_COUNT();
```

For an insert of three rows with no duplicates, this returns `3`.

## Summary

Multi-row `INSERT` statements in MySQL reduce network round-trips, minimize transaction overhead, and can be 5-10x faster than single-row loops. Combine them with `ON DUPLICATE KEY UPDATE` for upsert behavior, use `INSERT IGNORE` to skip duplicates gracefully, and batch large datasets to stay within the `max_allowed_packet` limit.
