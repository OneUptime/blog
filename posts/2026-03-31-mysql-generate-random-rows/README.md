# How to Generate Random Rows from a Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Random, Query, Sampling, Performance

Description: Retrieve random rows from a MySQL table efficiently using multiple techniques - from ORDER BY RAND() for small tables to keyset sampling for large ones.

---

## The Simple Approach - ORDER BY RAND()

The most straightforward method for selecting random rows:

```sql
SELECT * FROM products ORDER BY RAND() LIMIT 10;
```

This works but is **slow for large tables** because MySQL assigns a random value to every row, sorts the entire result set, then returns N rows. For a table with 1 million rows, this scans and sorts 1 million rows to get 10.

Use `ORDER BY RAND()` only when:
- The table has fewer than ~10,000 rows
- Performance is not a concern

## Efficient Method 1 - Random Offset

Calculate a random offset and fetch rows from that position:

```sql
SET @offset = FLOOR(RAND() * (SELECT COUNT(*) FROM products));
PREPARE stmt FROM 'SELECT * FROM products LIMIT 10 OFFSET ?';
EXECUTE stmt USING @offset;
DEALLOCATE PREPARE stmt;
```

This is faster but has a limitation: it returns consecutive rows starting from the random offset, not truly independent random rows.

## Efficient Method 2 - Random ID Range

Works well for tables with numeric primary keys that are mostly contiguous:

```sql
SELECT *
FROM products
WHERE id >= FLOOR(RAND() * (SELECT MAX(id) FROM products))
ORDER BY id
LIMIT 10;
```

If there are gaps in IDs, you may get fewer than 10 rows. Handle this by requesting more rows than needed:

```sql
(SELECT *
 FROM products
 WHERE id >= FLOOR(RAND() * (SELECT MAX(id) FROM products))
 ORDER BY id
 LIMIT 10)
UNION ALL
(SELECT * FROM products ORDER BY id LIMIT 10)
LIMIT 10;
```

## Efficient Method 3 - JOIN-Based Random Selection

More reliable for tables with gaps:

```sql
SELECT p.*
FROM products p
JOIN (
  SELECT id FROM products
  ORDER BY RAND()
  LIMIT 10
) r ON p.id = r.id;
```

The inner subquery only pulls `id` values (small), then joins back for full rows. This is faster than `ORDER BY RAND()` on the full table but still requires sorting IDs.

## Efficient Method 4 - Single Random Row via ID Range

For a single random row very efficiently:

```sql
SELECT *
FROM products
WHERE id > (
  SELECT FLOOR(MIN(id) + RAND() * (MAX(id) - MIN(id)))
  FROM products
)
ORDER BY id
LIMIT 1;
```

## Efficient Method 5 - Indexed Random Key Column

If your table has a UUID column or you can add a `rand_key` column:

```sql
ALTER TABLE products ADD COLUMN rand_key FLOAT DEFAULT (RAND());
CREATE INDEX idx_rand_key ON products (rand_key);

-- Random sampling
SELECT * FROM products
WHERE rand_key >= RAND()
ORDER BY rand_key
LIMIT 10;
```

Periodically re-randomize the column:

```sql
UPDATE products SET rand_key = RAND();
```

## Benchmarking the Approaches

```sql
-- Time the simple approach
SET @start = NOW(6);
SELECT COUNT(*) FROM (SELECT * FROM large_table ORDER BY RAND() LIMIT 100) t;
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) AS microseconds;

-- Time the ID range approach
SET @start = NOW(6);
SELECT COUNT(*) FROM large_table WHERE id >= FLOOR(RAND() * (SELECT MAX(id) FROM large_table)) LIMIT 100;
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) AS microseconds;
```

## Summary

For small MySQL tables `ORDER BY RAND()` is fine. For tables above 10,000 rows, use the ID-range method or the `rand_key` indexed column approach. The JOIN-based method provides a balance of correctness and performance by limiting the sort to just the primary key column. Choose based on your tolerance for skewed distribution versus query performance requirements.
