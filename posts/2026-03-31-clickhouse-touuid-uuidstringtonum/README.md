# How to Use toUUID() and UUIDStringToNum() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UUID, Type Conversion, Schema Design, Query

Description: Learn how toUUID() and UUIDStringToNum() convert UUID strings to native UUID and FixedString(16) types in ClickHouse for efficient storage and binary manipulation.

---

ClickHouse provides two functions for converting UUID strings into binary representations. `toUUID(str)` parses a UUID string into the native `UUID` type (two `UInt64` values internally). `UUIDStringToNum(str)` converts a UUID string into a `FixedString(16)` containing the raw 16 bytes in big-endian order. Both functions throw on invalid input; use `toUUIDOrNull()` or `toUUIDOrZero()` for safe variants. Understanding when to use each is important for storage optimization, cross-system UUID exchange, and binary-level comparisons.

## Basic Usage

```sql
-- Convert a UUID string to the native UUID type
SELECT toUUID('550e8400-e29b-41d4-a716-446655440000') AS native_uuid;
```

```text
native_uuid
550e8400-e29b-41d4-a716-446655440000
```

```sql
-- Convert to FixedString(16) bytes
SELECT UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000') AS raw_bytes,
       length(UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000')) AS byte_length;
```

```text
raw_bytes                          byte_length
U\x0e\x84\x00\xe2\x9bA\xd4...     16
```

## Difference Between toUUID() and UUIDStringToNum()

```sql
-- Side-by-side comparison of output types
SELECT
    toTypeName(toUUID('550e8400-e29b-41d4-a716-446655440000'))            AS touuid_type,
    toTypeName(UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000'))   AS stringtonum_type;
```

```text
touuid_type  stringtonum_type
UUID         FixedString(16)
```

Use `toUUID()` when you want a first-class UUID column. Use `UUIDStringToNum()` when you need the raw bytes for binary protocol exchange or hex manipulation.

## Safe Conversion with toUUIDOrNull()

```sql
-- Handle potentially invalid UUID strings gracefully
SELECT
    raw_id,
    toUUIDOrNull(raw_id) AS parsed_uuid,
    isNull(toUUIDOrNull(raw_id)) AS is_invalid
FROM (
    SELECT arrayJoin([
        '550e8400-e29b-41d4-a716-446655440000',
        'not-a-uuid',
        '00000000-0000-0000-0000-000000000000',
        'garbage'
    ]) AS raw_id
);
```

```text
raw_id                                parsed_uuid                           is_invalid
550e8400-e29b-41d4-a716-446655440000  550e8400-e29b-41d4-a716-446655440000  0
not-a-uuid                            NULL                                  1
00000000-0000-0000-0000-000000000000  00000000-0000-0000-0000-000000000000  0
garbage                               NULL                                  1
```

## Converting a String Column to UUID at Query Time

```sql
-- Filter by UUID even when stored as String
SELECT
    event_time,
    toUUID(correlation_id) AS corr_uuid,
    event_type
FROM events_raw
WHERE toUUID(correlation_id) = toUUID('550e8400-e29b-41d4-a716-446655440000');
```

For repeated filtering, migrate the column to `UUID` type to avoid per-row conversion.

## Migrating a String Column to UUID Type

```sql
-- Add a new UUID column and backfill from the string column
ALTER TABLE events ADD COLUMN id_uuid UUID DEFAULT toUUID(id_string);

-- Verify the migration
SELECT
    id_string,
    id_uuid,
    toString(id_uuid) = id_string AS match
FROM events
LIMIT 5;
```

## Extracting UUID Byte Segments with UUIDStringToNum()

`UUIDStringToNum()` exposes the raw bytes, enabling extraction of the time bits from a version 1 UUID.

```sql
-- Extract the version nibble and variant bits from raw UUID bytes
SELECT
    uuid_str,
    UUIDStringToNum(uuid_str)                           AS bytes,
    reinterpretAsUInt8(substring(
        UUIDStringToNum(uuid_str), 7, 1))               AS byte_7,
    bitShiftRight(
        reinterpretAsUInt8(substring(
            UUIDStringToNum(uuid_str), 7, 1)), 4)       AS version_nibble
FROM (
    SELECT arrayJoin([
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    ]) AS uuid_str
);
```

## Storing as FixedString(16) to Save Space

A `UUID` column uses 16 bytes. A `String` UUID uses 32 hex chars + hyphens = 36 bytes plus string overhead. `FixedString(16)` from `UUIDStringToNum()` is equivalent in size to `UUID`.

```sql
-- Table using FixedString(16) for UUID storage (cross-system binary exchange)
CREATE TABLE events_binary (
    id         FixedString(16),
    event_time DateTime,
    event_type String
) ENGINE = MergeTree ORDER BY (event_time, id);

-- Insert by converting UUID string to bytes
INSERT INTO events_binary (id, event_time, event_type)
SELECT
    UUIDStringToNum(toString(generateUUIDv4())) AS id,
    now()                             AS event_time,
    'click'                           AS event_type;

-- Read back by converting bytes to string
SELECT
    UUIDNumToString(id) AS uuid_string,
    event_time,
    event_type
FROM events_binary
LIMIT 5;
```

## Comparing UUIDs Across Systems

When a partner system sends UUIDs as raw bytes (e.g., from a Java `UUID.getMostSignificantBits()`), `UUIDStringToNum` lets you align both representations.

```sql
-- Match on raw bytes from an external system
SELECT e.*
FROM events e
WHERE UUIDStringToNum(toString(e.id)) = unhex('550e8400e29b41d4a716446655440000');
```

## Data Quality Check

```sql
-- Count how many rows have invalid UUIDs in a string column
SELECT
    count()                              AS total,
    countIf(toUUIDOrNull(raw_id) IS NULL) AS invalid_uuids,
    countIf(toUUIDOrNull(raw_id) IS NOT NULL) AS valid_uuids
FROM events_raw;
```

## Summary

`toUUID(str)` converts a UUID string to the native `UUID` type for first-class column storage and comparisons. `UUIDStringToNum(str)` converts to `FixedString(16)` raw bytes for binary protocol compatibility or low-level bit extraction. Use `toUUIDOrNull()` when input validity is uncertain. For new tables, always prefer the `UUID` column type over `String` for UUID fields - it is the same 16 bytes on disk but enables type-safe operations and cleaner query semantics.
