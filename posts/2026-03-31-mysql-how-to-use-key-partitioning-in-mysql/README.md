# How to Use KEY Partitioning in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partitioning, Key Partitioning, Database Design

Description: Learn how to use KEY partitioning in MySQL to distribute table rows evenly across partitions using MySQL's internal hashing function.

---

## What Is KEY Partitioning

KEY partitioning is similar to HASH partitioning but uses MySQL's internal hashing function instead of a user-defined expression. KEY partitioning:

- Works with any column type (not just integers)
- Can use the primary key or unique key by default
- Distributes data evenly across partitions

## Syntax

```sql
PARTITION BY KEY ([column_list])
PARTITIONS N;
```

If you omit the column list, MySQL uses the primary key. If there is no primary key, MySQL uses the first unique key.

## Creating a KEY Partitioned Table

```sql
CREATE TABLE user_sessions (
  session_id CHAR(36)   NOT NULL,
  user_id    INT        NOT NULL,
  created_at DATETIME   NOT NULL,
  data       TEXT,
  PRIMARY KEY (session_id)
)
PARTITION BY KEY (session_id)
PARTITIONS 8;
```

MySQL applies an internal hash to `session_id` and routes each row to one of 8 partitions.

## Using the Primary Key Automatically

When you omit the column list, MySQL uses the primary key:

```sql
CREATE TABLE events (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  event_type VARCHAR(50) NOT NULL,
  payload    JSON,
  ts         DATETIME    NOT NULL,
  PRIMARY KEY (id)
)
PARTITION BY KEY()
PARTITIONS 16;
```

## KEY vs HASH Partitioning

| Feature | KEY | HASH |
|---|---|---|
| Column types | Any | Integer expressions only |
| Hash function | MySQL's internal hashing function | User expression modulo N |
| Default key | Uses primary key | Requires explicit expression |
| Typical use | String or UUID primary keys | Integer-based sharding |

## LINEAR KEY Partitioning

LINEAR KEY uses a different algorithm for distributing rows. It is faster for adding/removing partitions but distributes data less evenly:

```sql
CREATE TABLE events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  ts DATETIME NOT NULL,
  data TEXT,
  PRIMARY KEY (id)
)
PARTITION BY LINEAR KEY (id)
PARTITIONS 8;
```

Use LINEAR KEY when you frequently add or remove partitions and can tolerate slight unevenness.

## Checking Partition Distribution

After loading data, check row distribution:

```sql
SELECT PARTITION_NAME, TABLE_ROWS
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME   = 'user_sessions'
ORDER BY PARTITION_NAME;
```

```text
+----------------+------------+
| PARTITION_NAME | TABLE_ROWS |
+----------------+------------+
| p0             |     125432 |
| p1             |     124891 |
| p2             |     126012 |
| p3             |     125299 |
| p4             |     125100 |
| p5             |     124750 |
| p6             |     125688 |
| p7             |     125328 |
+----------------+------------+
```

Even distribution is expected with KEY partitioning.

## Adding Partitions

```sql
ALTER TABLE user_sessions ADD PARTITION PARTITIONS 4;
-- Table now has 12 partitions; existing data is redistributed
```

## Coalescing Partitions (Reducing Count)

```sql
ALTER TABLE user_sessions COALESCE PARTITION 4;
-- Reduces from 12 to 8 partitions; data is redistributed
```

## When to Use KEY Partitioning

- Primary key is a UUID or string (HASH requires integer)
- You want automatic even distribution without writing a hash expression
- Partitioning a table by its natural primary key for parallel I/O

## Summary

KEY partitioning uses MySQL's internal hash function to distribute rows evenly across partitions, and uniquely supports string and date columns without requiring an integer expression. It defaults to the primary key when no column is specified. Use it when you need even distribution and your partition column is not an integer.
