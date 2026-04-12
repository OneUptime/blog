# How to Delete Duplicate Rows in MySQL While Keeping One

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Duplicate, Data Cleanup, SQL, Database

Description: Learn multiple techniques to find and delete duplicate rows in MySQL while keeping one copy, using ROW_NUMBER(), self-joins, and temporary tables.

---

## The Duplicate Row Problem

Duplicate rows occur when a table lacks a unique constraint and the same data is inserted multiple times. Before adding constraints, you need to remove existing duplicates while keeping one canonical row per unique key.

## Sample Data with Duplicates

```sql
CREATE TABLE customers (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255),
  name  VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO customers (email, name) VALUES
  ('alice@example.com', 'Alice'),
  ('bob@example.com', 'Bob'),
  ('alice@example.com', 'Alice'),    -- duplicate
  ('carol@example.com', 'Carol'),
  ('bob@example.com', 'Bob Barker'), -- different name but same email
  ('alice@example.com', 'Alice');    -- another duplicate
```

## Method 1: Using ROW_NUMBER() - MySQL 8.0

The cleanest approach uses `ROW_NUMBER()` to rank duplicates and delete all but the lowest `id`:

```sql
DELETE FROM customers
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY email
        ORDER BY id ASC
      ) AS rn
    FROM customers
  ) ranked
  WHERE rn > 1
);
```

This keeps the row with the smallest `id` for each email (the first inserted row).

To keep the most recent row, change `ORDER BY id ASC` to `ORDER BY id DESC`:

```sql
DELETE FROM customers
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY email
        ORDER BY id DESC
      ) AS rn
    FROM customers
  ) ranked
  WHERE rn > 1
);
```

## Method 2: Self-Join DELETE

Works in MySQL 5.7 and 8.0:

```sql
DELETE c1
FROM customers c1
INNER JOIN customers c2
  ON c1.email = c2.email
  AND c1.id > c2.id;
```

This deletes all rows that have another row with the same `email` and a lower `id`. The row with the smallest `id` is kept.

## Method 3: DELETE with a Subquery

```sql
DELETE FROM customers
WHERE id NOT IN (
  SELECT min_id FROM (
    SELECT MIN(id) AS min_id
    FROM customers
    GROUP BY email
  ) AS keep_ids
);
```

This finds the minimum `id` per email and deletes everything else.

## Method 4: Using a Temporary Table

Best for very large tables where the above methods are too slow:

```sql
-- Step 1: Create a table with the rows to keep
CREATE TABLE customers_deduped AS
SELECT *
FROM customers
WHERE id IN (
  SELECT MIN(id)
  FROM customers
  GROUP BY email
);

-- Step 2: Verify counts
SELECT COUNT(*) FROM customers;         -- original
SELECT COUNT(*) FROM customers_deduped; -- deduplicated

-- Step 3: Swap tables
RENAME TABLE customers TO customers_old, customers_deduped TO customers;

-- Step 4: Verify and drop old table
SELECT COUNT(*) FROM customers;
DROP TABLE customers_old;
```

## Find Duplicates Before Deleting

Always verify duplicates before deleting:

```sql
-- Count duplicates per email
SELECT
  email,
  COUNT(*) AS cnt
FROM customers
GROUP BY email
HAVING cnt > 1
ORDER BY cnt DESC;
```

```sql
-- Show the actual duplicate rows
SELECT c1.*
FROM customers c1
INNER JOIN (
  SELECT email, MIN(id) AS min_id
  FROM customers
  GROUP BY email
  HAVING COUNT(*) > 1
) dups ON c1.email = dups.email AND c1.id != dups.min_id;
```

## Prevent Future Duplicates

After removing duplicates, add a unique constraint:

```sql
ALTER TABLE customers ADD UNIQUE INDEX idx_unique_email (email);
```

Or use `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE` in application inserts:

```sql
-- Insert, silently ignore if duplicate
INSERT IGNORE INTO customers (email, name) VALUES ('alice@example.com', 'Alice');

-- Insert or update
INSERT INTO customers (email, name)
VALUES ('alice@example.com', 'Alice Updated')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

## Summary

The most reliable way to delete duplicate rows in MySQL while keeping one is the `ROW_NUMBER()` window function approach in MySQL 8.0, or a self-join DELETE for MySQL 5.7. Always verify which rows will be deleted by running a SELECT first, and add a UNIQUE constraint after cleanup to prevent future duplicates.
