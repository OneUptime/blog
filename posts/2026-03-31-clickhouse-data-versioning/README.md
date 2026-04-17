# How to Implement Data Versioning in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Versioning, ReplacingMergeTree, Deduplication, Analytics

Description: Learn how to implement data versioning in ClickHouse using ReplacingMergeTree to track changes and maintain the latest version of each record.

---

## Why Data Versioning in ClickHouse?

ClickHouse is optimized for append-heavy workloads. While it does support `ALTER TABLE ... UPDATE` via mutations, these are heavyweight asynchronous operations and are not intended for frequent row-level updates the way you might use UPDATE in PostgreSQL. Data versioning lets you write new versions of records as new rows, then use merge-time deduplication to expose only the latest version.

## Using ReplacingMergeTree

ReplacingMergeTree is the primary engine for versioned data. It deduplicates rows with the same sorting key (ORDER BY), keeping only the row with the highest version value:

```sql
CREATE TABLE user_profiles (
    user_id     UInt64,
    name        String,
    email       String,
    plan        LowCardinality(String),
    version     UInt64,
    updated_at  DateTime
) ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;
```

## Inserting Versioned Rows

Each update is a new INSERT with a higher version number:

```sql
-- Initial record
INSERT INTO user_profiles VALUES (1, 'Alice', 'alice@example.com', 'free', 1, now());

-- Update: Alice upgrades to pro plan
INSERT INTO user_profiles VALUES (1, 'Alice', 'alice@example.com', 'pro', 2, now());
```

## Querying the Latest Version

Use FINAL to force deduplication at query time:

```sql
SELECT user_id, name, email, plan
FROM user_profiles FINAL
WHERE user_id = 1;
```

Or use a subquery for better performance on large tables:

```sql
SELECT user_id, name, email, plan
FROM (
    SELECT *, row_number() OVER (PARTITION BY user_id ORDER BY version DESC) AS rn
    FROM user_profiles
)
WHERE rn = 1;
```

## Using Timestamps as Versions

Use Unix timestamps or DateTime for version values when data arrives from external systems:

```sql
CREATE TABLE product_catalog (
    product_id  UInt64,
    name        String,
    price       Decimal(10, 2),
    version     DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(version)
ORDER BY product_id;
```

## Viewing Full Version History

Since all versions are stored until background merges, query history before merges:

```sql
SELECT user_id, plan, version, updated_at
FROM user_profiles
WHERE user_id = 1
ORDER BY version;
```

After a background merge completes, only the latest version is retained on disk. Note that FINAL does not trigger a physical merge — it performs a virtual merge at query time so the result reflects only the latest version, while older rows remain on disk until background merges consolidate them.

## CollapsingMergeTree for Explicit Cancellation

For use cases where you need to explicitly cancel a previous version:

```sql
CREATE TABLE orders_versioned (
    order_id    UInt64,
    amount      Decimal(10, 2),
    sign        Int8,
    version     UInt64
) ENGINE = CollapsingMergeTree(sign)
ORDER BY order_id;

-- Insert original
INSERT INTO orders_versioned VALUES (100, 99.99, 1, 1);
-- Cancel and reinsert with new amount
INSERT INTO orders_versioned VALUES (100, 99.99, -1, 1);
INSERT INTO orders_versioned VALUES (100, 149.99, 1, 2);
```

## Summary

Data versioning in ClickHouse is best implemented with ReplacingMergeTree, which deduplicates by sorting key (ORDER BY) keeping the highest version at merge time. Use FINAL for consistent latest-version reads, insert new rows for every change, and consider CollapsingMergeTree when you need explicit cancellation semantics for financial or inventory use cases.
