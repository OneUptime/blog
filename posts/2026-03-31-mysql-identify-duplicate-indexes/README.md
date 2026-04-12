# How to Identify Duplicate Indexes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Optimization, Schema, Maintenance

Description: Learn how to find and remove duplicate and redundant indexes in MySQL using information_schema queries and pt-duplicate-key-checker to reduce write overhead.

---

## What Are Duplicate Indexes?

Duplicate indexes exist when two or more indexes on the same table begin with the same leading column(s). Since MySQL B-tree indexes support leftmost prefix lookups, one index can often satisfy all the queries that a redundant index would serve.

**Exact duplicates** are indexes on identical column sets:

```sql
-- Both cover the same column in the same order
CREATE INDEX idx_customer_a ON orders(customer_id);
CREATE INDEX idx_customer_b ON orders(customer_id);  -- exact duplicate
```

**Redundant prefixes** occur when one index is a prefix of another:

```sql
CREATE INDEX idx_customer ON orders(customer_id);
CREATE INDEX idx_customer_status ON orders(customer_id, status);
-- idx_customer is redundant because idx_customer_status covers all its queries
```

## Detecting Exact Duplicates via information_schema

```sql
SELECT
    a.TABLE_NAME,
    a.INDEX_NAME AS index_1,
    b.INDEX_NAME AS index_2,
    GROUP_CONCAT(a.COLUMN_NAME ORDER BY a.SEQ_IN_INDEX) AS columns
FROM information_schema.STATISTICS a
JOIN information_schema.STATISTICS b
    ON a.TABLE_SCHEMA = b.TABLE_SCHEMA
    AND a.TABLE_NAME  = b.TABLE_NAME
    AND a.SEQ_IN_INDEX = b.SEQ_IN_INDEX
    AND a.COLUMN_NAME  = b.COLUMN_NAME
    AND a.INDEX_NAME   < b.INDEX_NAME
WHERE a.TABLE_SCHEMA = 'your_database'
GROUP BY a.TABLE_NAME, a.INDEX_NAME, b.INDEX_NAME
HAVING COUNT(*) = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = a.TABLE_SCHEMA
      AND TABLE_NAME = a.TABLE_NAME
      AND INDEX_NAME = a.INDEX_NAME
)
AND COUNT(*) = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = b.TABLE_SCHEMA
      AND TABLE_NAME = b.TABLE_NAME
      AND INDEX_NAME = b.INDEX_NAME
)
ORDER BY a.TABLE_NAME;
```

## Detecting Prefix-Redundant Indexes

```sql
-- Find indexes where one is a leading-prefix of another
SELECT
    a.TABLE_NAME,
    a.INDEX_NAME AS narrow_index,
    b.INDEX_NAME AS wider_index
FROM information_schema.STATISTICS a
JOIN information_schema.STATISTICS b
    ON a.TABLE_SCHEMA = b.TABLE_SCHEMA
    AND a.TABLE_NAME  = b.TABLE_NAME
    AND a.COLUMN_NAME = b.COLUMN_NAME
    AND a.SEQ_IN_INDEX = b.SEQ_IN_INDEX
    AND a.INDEX_NAME  != b.INDEX_NAME
WHERE a.TABLE_SCHEMA = 'your_database'
GROUP BY a.TABLE_NAME, a.INDEX_NAME, b.INDEX_NAME
HAVING COUNT(*) = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = a.TABLE_SCHEMA
      AND TABLE_NAME = a.TABLE_NAME
      AND INDEX_NAME = a.INDEX_NAME
)
ORDER BY a.TABLE_NAME;
```

## Using pt-duplicate-key-checker

Percona Toolkit automates this analysis:

```bash
pt-duplicate-key-checker --host=localhost --user=root --password=secret --databases=your_database
```

```text
# ########################################################
# your_database.orders
# ########################################################
# idx_customer is a left-prefix of idx_customer_status
# To remove this duplicate index, execute:
ALTER TABLE `your_database`.`orders` DROP INDEX `idx_customer`;
```

## Removing a Redundant Index

Once identified, drop the narrower (redundant) index:

```sql
ALTER TABLE orders
    DROP INDEX idx_customer,
    ALGORITHM = INPLACE,
    LOCK = NONE;
```

The wider index `idx_customer_status(customer_id, status)` still satisfies all queries that used `idx_customer(customer_id)` thanks to the leftmost prefix rule.

## Important: Unique vs Non-Unique Overlap

Do not drop a unique index just because a non-unique index covers the same columns - the unique index also enforces a constraint that the non-unique index does not.

## Summary

Duplicate indexes waste storage and slow down writes without benefiting any read query. Find exact duplicates and prefix-redundant indexes through `information_schema.STATISTICS` queries or `pt-duplicate-key-checker`. Drop the narrower redundant index while keeping the wider one, and never drop a unique index solely because a non-unique index with the same columns exists.
