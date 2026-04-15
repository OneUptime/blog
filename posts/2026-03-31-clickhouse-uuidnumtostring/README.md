# How to Use UUIDNumToString() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UUID, Type Conversion, Binary, Query

Description: Learn how UUIDNumToString() converts a FixedString(16) binary UUID back to a human-readable UUID string in ClickHouse for display, export, and cross-system interoperability.

---

`UUIDNumToString(fixed_string)` is the inverse of `UUIDStringToNum()`. It takes a `FixedString(16)` containing raw 16-byte UUID data and returns the canonical hyphenated UUID string in the form `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. This function is essential when data arrives or is stored as binary UUIDs - common in systems like Java, Go, or MySQL that store UUIDs in binary columns - and you need to display or export them as human-readable strings.

## Basic Usage

```sql
-- Round-trip: string -> bytes -> string
SELECT
    UUIDNumToString(
        UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000')
    ) AS recovered_string;
```

```text
recovered_string
550e8400-e29b-41d4-a716-446655440000
```

## Understanding the Input Type

`UUIDNumToString()` requires exactly `FixedString(16)`. Passing a `String` of length 16 or a `UUID` type directly will fail or produce unexpected results.

```sql
-- Correct usage: FixedString(16) from UUIDStringToNum
SELECT
    toTypeName(UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000'))            AS input_type,
    UUIDNumToString(UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000'))       AS result,
    toTypeName(UUIDNumToString(UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000'))) AS result_type;
```

```text
input_type      result                                result_type
FixedString(16) 550e8400-e29b-41d4-a716-446655440000  String
```

## Reading Binary UUIDs from a Table

```sql
-- Table storing UUIDs as raw bytes (e.g., imported from MySQL or Java)
CREATE TABLE events_binary (
    id         FixedString(16),
    event_time DateTime,
    event_type LowCardinality(String)
) ENGINE = MergeTree ORDER BY (event_time, id);

-- Insert binary UUIDs
INSERT INTO events_binary (id, event_time, event_type)
SELECT
    UUIDStringToNum(generateUUIDv4()) AS id,
    now() - rand() % 86400            AS event_time,
    ['click','view','submit'][rand() % 3 + 1] AS event_type
FROM numbers(10);

-- Display as human-readable UUIDs
SELECT
    UUIDNumToString(id) AS uuid_string,
    event_time,
    event_type
FROM events_binary
ORDER BY event_time DESC
LIMIT 5;
```

## Filtering Binary UUIDs

When UUIDs are stored as `FixedString(16)`, filter them by first converting your UUID string to bytes.

```sql
-- Find a specific event by its binary UUID
SELECT
    UUIDNumToString(id) AS uuid_string,
    event_time,
    event_type
FROM events_binary
WHERE id = UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000');
```

## Exporting Binary UUIDs as Strings

```sql
-- Export a table with binary UUIDs as a CSV with string UUIDs
SELECT
    UUIDNumToString(id) AS id,
    toString(event_time) AS event_time,
    event_type
FROM events_binary
FORMAT CSV;
```

## Converting a FixedString(16) Column to a UUID Column

If you want to migrate from `FixedString(16)` to the native `UUID` type:

```sql
-- Add UUID column and populate from binary column
ALTER TABLE events_binary
    ADD COLUMN id_uuid UUID MATERIALIZED toUUID(UUIDNumToString(id));

-- Backfill existing rows (MATERIALIZED only applies to new inserts)
ALTER TABLE events_binary
    MATERIALIZE COLUMN id_uuid;

-- Verify
SELECT
    UUIDNumToString(id) AS binary_as_string,
    toString(id_uuid)   AS uuid_col_string,
    binary_as_string = toString(id_uuid) AS matches
FROM events_binary
LIMIT 5;
```

## Using unhex() as an Alternative Input

If the UUID bytes arrive as a hex string without hyphens, use `unhex()` to produce a 16-byte binary string suitable for `UUIDNumToString()`.

```sql
-- Convert compact hex UUID (no hyphens) to string form
SELECT
    UUIDNumToString(unhex('550e8400e29b41d4a716446655440000')) AS uuid_string;
```

```text
uuid_string
550e8400-e29b-41d4-a716-446655440000
```

## Hex Dump for Debugging

Combine `UUIDNumToString()` with `hex()` to inspect both representations side by side during debugging.

```sql
SELECT
    hex(id)             AS hex_dump,
    UUIDNumToString(id) AS uuid_string
FROM events_binary
LIMIT 3;
```

```text
hex_dump                          uuid_string
550E8400E29B41D4A716446655440000  550e8400-e29b-41d4-a716-446655440000
...
```

## Summary

`UUIDNumToString(fixed_string)` converts a `FixedString(16)` binary UUID to the canonical hyphenated UUID string. Use it to display or export binary-stored UUIDs, to filter rows by comparing against `UUIDStringToNum()`-converted literals, and to migrate `FixedString(16)` columns to the native `UUID` type. It pairs with `UUIDStringToNum()` to form a complete round-trip conversion, and with `unhex()` when binary data arrives as compact hex strings rather than standard UUID notation.
