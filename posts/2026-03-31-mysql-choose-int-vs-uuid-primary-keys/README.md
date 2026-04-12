# How to Choose Between INT and UUID for Primary Keys in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Primary Key, UUID, Performance

Description: Compare INT auto-increment and UUID primary keys in MySQL across storage, index performance, and distributed system requirements.

---

Choosing between an integer auto-increment and a UUID for a primary key has significant implications for storage size, index performance, and system design. There is no universal right answer - the choice depends on your use case.

## INT AUTO_INCREMENT

```sql
CREATE TABLE orders (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer   VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
);
```

- Storage: 4 bytes (INT) or 8 bytes (BIGINT)
- Insertion: sequential, clustered index pages fill linearly
- Predictable: easy to read and debug
- Problem: reveals row count and insert rate to users

## UUID (Version 4)

```sql
CREATE TABLE orders (
    id       CHAR(36)     NOT NULL,
    customer VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
);

-- Or as BINARY(16) to save space
CREATE TABLE orders (
    id       BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
    customer VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
);
```

- Storage: 36 bytes as CHAR, 16 bytes as BINARY(16)
- Random insertion causes page splits and index fragmentation
- No central sequence - safe for distributed generation
- No information leakage

## The Page Split Problem

InnoDB stores rows in B-tree pages ordered by primary key. When you insert a UUID like `d3b07384-d113-41c8-b47d-a18...`, it lands in a random page position, splitting full pages. This causes:
- Write amplification
- Index fragmentation
- Higher I/O

With INT auto-increment, new rows always append to the last page.

## UUID v7 - The Best of Both Worlds

UUID v7 is time-ordered, combining randomness with monotonically increasing timestamps:

```sql
-- MySQL does not natively generate UUID v7; generate it in application code
-- As a workaround, UUID v1 with the swap_flag reorders time bytes for sequential storage:
SELECT BIN_TO_UUID(UUID_TO_BIN(UUID(), 1), 1) AS ordered_uuid;
```

The `swap_flag` parameter in `UUID_TO_BIN()` rearranges the time-low and time-high fields of a UUID v1 value so that the most significant time bits come first, producing a more sequential binary ordering. This is not the same as UUID v7 but provides a similar benefit within MySQL.

UUID v7 reduces page splits because the timestamp prefix keeps insertions mostly sequential.

## Benchmarking Comparison

```sql
-- Check index fragmentation after bulk inserts
SELECT
    table_name,
    data_length / 1024 / 1024        AS data_mb,
    index_length / 1024 / 1024       AS index_mb,
    data_free / 1024 / 1024          AS fragmented_mb
FROM information_schema.tables
WHERE table_schema = 'mydb'
  AND table_name IN ('orders_int', 'orders_uuid');
```

## When to Use Each

| Criteria | INT | UUID |
|---|---|---|
| Single-server app | Preferred | Acceptable |
| Distributed generation | Unsuitable | Required |
| URL exposure | Risky | Opaque |
| Join-heavy workload | Faster | Slower (larger key) |
| Storage budget | More efficient | Less efficient |

## Hybrid: Surrogate INT + Public UUID

```sql
CREATE TABLE orders (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id  BINARY(16)   NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
    customer   VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_public_id (public_id)
);
```

Use `id` for all internal joins (fast) and `public_id` for external API exposure (opaque).

## Summary

Use INT auto-increment for single-server applications where sequential keys are acceptable. Use UUID (stored as BINARY(16)) when you need distributed key generation or public-facing opaque identifiers. Consider UUID v7 for time-ordered UUIDs that avoid page fragmentation. The hybrid approach gives you internal performance with external opacity.
