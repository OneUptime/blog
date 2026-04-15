# How to Use UInt8, UInt16, UInt32, UInt64 Data Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Integer, UInt8, UInt16, UInt32, UInt64

Description: Learn how to use unsigned integer types in ClickHouse - UInt8, UInt16, UInt32, and UInt64 - with storage sizes, value ranges, and practical examples.

---

ClickHouse provides several unsigned integer types (UInt8, UInt16, UInt32, UInt64, UInt128, and UInt256). The four most commonly used - UInt8, UInt16, UInt32, and UInt64 - cover a wide spectrum of use cases, from small flags and status codes to massive counters and identifiers. Choosing the right unsigned integer type reduces storage overhead and improves query performance. This post covers each type, its value range, when to use it, and how to work with it in practice.

## Overview of Unsigned Integer Types

ClickHouse unsigned integer types store only non-negative whole numbers. Because they do not need to reserve a bit for sign, they can represent twice the positive range of their signed counterparts at the same storage size.

| Type   | Storage | Min Value | Max Value              |
|--------|---------|-----------|------------------------|
| UInt8  | 1 byte  | 0         | 255                    |
| UInt16 | 2 bytes | 0         | 65,535                 |
| UInt32 | 4 bytes | 0         | 4,294,967,295          |
| UInt64 | 8 bytes | 0         | 18,446,744,073,709,551,615 |

## Declaring Columns with Unsigned Integer Types

Use unsigned integer types when creating tables to match the natural domain of the data.

```sql
CREATE TABLE user_activity
(
    user_id     UInt64,
    age         UInt8,
    login_count UInt32,
    department  UInt16
)
ENGINE = MergeTree()
ORDER BY user_id;
```

## Inserting Data

```sql
INSERT INTO user_activity (user_id, age, login_count, department) VALUES
(1000000000001, 28, 1452, 3),
(1000000000002, 35, 892,  7),
(1000000000003, 19, 12,   1);
```

## Value Range Enforcement

ClickHouse enforces value range constraints at insert time. Inserting a value outside the allowed range will either raise an error or wrap around depending on settings.

```sql
-- This will cause an error because 300 exceeds UInt8 max of 255
INSERT INTO user_activity (user_id, age, login_count, department) VALUES
(999, 300, 1, 1);
```

## When to Use Each Type

### UInt8

Use UInt8 for boolean-like values, small enumerations, or percentages (0-100). It stores only 1 byte per row, making it ideal for flag columns.

```sql
CREATE TABLE feature_flags
(
    flag_id     UInt32,
    flag_name   String,
    is_enabled  UInt8,   -- 0 or 1
    priority    UInt8    -- 1-10 scale
)
ENGINE = MergeTree()
ORDER BY flag_id;
```

### UInt16

Use UInt16 for port numbers (0-65535), small counters, or category IDs with up to 65,535 distinct values.

```sql
CREATE TABLE network_connections
(
    connection_id UInt64,
    source_port   UInt16,
    dest_port     UInt16,
    packet_count  UInt16
)
ENGINE = MergeTree()
ORDER BY connection_id;
```

### UInt32

Use UInt32 for Unix timestamps before 2106, IPv4 addresses stored as integers, and general-purpose counters that won't exceed ~4 billion.

```sql
CREATE TABLE page_views
(
    view_id    UInt64,
    page_id    UInt32,
    view_count UInt32,
    ip_address UInt32
)
ENGINE = MergeTree()
ORDER BY view_id;
```

### UInt64

Use UInt64 for high-cardinality identifiers, very large counters, and any value that could exceed 4 billion.

```sql
CREATE TABLE events
(
    event_id   UInt64,
    session_id UInt64,
    timestamp  UInt64,   -- Unix timestamp in milliseconds
    bytes_sent UInt64
)
ENGINE = MergeTree()
ORDER BY event_id;
```

## Arithmetic and Aggregation

Unsigned integer columns work naturally with ClickHouse aggregation functions.

```sql
SELECT
    department,
    avg(age)           AS avg_age,
    sum(login_count)   AS total_logins,
    max(login_count)   AS max_logins,
    count()            AS user_count
FROM user_activity
GROUP BY department
ORDER BY department;
```

## Type Casting

You can cast between unsigned integer types using the `CAST` function or shorthand type functions.

```sql
SELECT
    CAST(255, 'UInt8')   AS max_uint8,
    toUInt16(1000)       AS as_uint16,
    toUInt32(4000000000) AS as_uint32,
    toUInt64('18446744073709551615') AS max_uint64;
```

## Overflow Behavior

When using arithmetic that may overflow, be aware that ClickHouse wraps by default in some operations.

```sql
-- Check for potential overflow before inserting
SELECT
    user_id,
    login_count,
    login_count > 4000000000 AS near_uint32_overflow
FROM events_staging
WHERE login_count > 4000000000;
```

## Summary

UInt8, UInt16, UInt32, and UInt64 are the building blocks for storing non-negative integers in ClickHouse. Matching the type to the data domain - using UInt8 for flags, UInt16 for ports, UInt32 for standard IDs, and UInt64 for high-cardinality keys - keeps storage compact and queries fast. Always validate that input values fall within the type's range before ingestion to avoid unexpected errors or data corruption.
