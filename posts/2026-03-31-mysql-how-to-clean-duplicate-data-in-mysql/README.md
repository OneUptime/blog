# How to Clean Duplicate Data in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Duplicate, Data Cleaning, Query, Index

Description: Learn how to identify and remove duplicate rows in MySQL using ROW_NUMBER(), self-joins, and temporary tables while preserving the original record.

---

## Why Duplicates Exist

Duplicates creep in through bulk imports, missing unique constraints, or race conditions. Before removing them, identify what constitutes a duplicate for your data set.

## Finding Duplicate Rows

Use `GROUP BY` with `HAVING` to detect duplicates:

```sql
SELECT email, COUNT(*) AS occurrences
FROM users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;
```

For full-row duplicates, group by every column you want to compare:

```sql
SELECT first_name, last_name, email, COUNT(*) AS cnt
FROM users
GROUP BY first_name, last_name, email
HAVING cnt > 1;
```

## Using ROW_NUMBER() to Mark Duplicates

In MySQL 8.0+, use `ROW_NUMBER()` to rank duplicates and keep only the first occurrence:

```sql
SELECT id, email, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
FROM users;
```

Rows with `rn > 1` are duplicates. Delete them:

```sql
DELETE u
FROM users u
JOIN (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
  FROM users
) ranked ON u.id = ranked.id
WHERE ranked.rn > 1;
```

## Using a Temporary Table Approach

For older MySQL versions or large tables, a temporary table approach is safer:

```sql
-- Step 1: Create a table with unique rows
CREATE TABLE users_clean AS
SELECT MIN(id) AS id, first_name, last_name, email
FROM users
GROUP BY first_name, last_name, email;

-- Step 2: Verify the count is correct
SELECT COUNT(*) FROM users_clean;

-- Step 3: Swap tables
RENAME TABLE users TO users_backup, users_clean TO users;
```

## Using Self-Join to Delete Duplicates

Delete the higher ID when two rows share the same email:

```sql
DELETE u1
FROM users u1
JOIN users u2
  ON u1.email = u2.email
  AND u1.id > u2.id;
```

This keeps the lowest ID (oldest record) for each email.

## Preventing Future Duplicates

After cleaning, add a unique constraint to prevent recurrence:

```sql
ALTER TABLE users ADD UNIQUE INDEX idx_unique_email (email);
```

For compound uniqueness:

```sql
ALTER TABLE orders ADD UNIQUE INDEX idx_unique_order (customer_id, product_id, order_date);
```

## Bulk Import Deduplication

When importing data, use `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE` to handle duplicates at insert time:

```sql
INSERT IGNORE INTO users (first_name, last_name, email)
VALUES ('Alice', 'Smith', 'alice@example.com');

-- Or update existing:
INSERT INTO users (first_name, last_name, email)
VALUES ('Alice', 'Smith', 'alice@example.com') AS new
ON DUPLICATE KEY UPDATE first_name = new.first_name;
```

## Summary

Clean duplicate data in MySQL by first identifying duplicates with `GROUP BY ... HAVING`, then removing them using `ROW_NUMBER()` with a `DELETE ... JOIN` in MySQL 8.0+, or a temporary table swap for older versions. Always add unique indexes after cleanup to prevent duplicates from reappearing.
