# How to Use FixedString Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, FixedString, String

Description: Learn how to use FixedString(N) in ClickHouse for fixed-length byte strings, including null-padding behavior, storage efficiency, and when to prefer it over String.

---

When you know exactly how many bytes a string value will always occupy - an MD5 hash, a country code, a fixed-format identifier - ClickHouse's FixedString(N) type is more efficient than the variable-length String type. FixedString stores exactly N bytes per value, padding shorter inputs with null bytes and rejecting inputs longer than N. This predictable layout enables faster comparisons and more compact storage for truly fixed-length data.

## What Is FixedString(N)?

FixedString(N) stores a string of exactly N bytes. The value N must be a positive integer. If you insert a string shorter than N bytes, it is right-padded with null bytes (`\0`) to reach length N. If you insert a string longer than N bytes, ClickHouse raises an error.

This is different from SQL's `CHAR(N)`, which pads with spaces. ClickHouse pads with null bytes, which affects comparisons and display.

## Creating Tables with FixedString Columns

```sql
CREATE TABLE file_checksums
(
    file_id      UInt64,
    file_path    String,
    md5_hash     FixedString(16),   -- MD5 is always 16 raw bytes
    sha256_hash  FixedString(32),   -- SHA-256 is always 32 raw bytes
    country_code FixedString(2),    -- ISO 3166-1 alpha-2 codes
    currency     FixedString(3),    -- ISO 4217 currency codes
    created_at   DateTime
)
ENGINE = MergeTree()
ORDER BY file_id;
```

## Inserting FixedString Data

When inserting string literals, ensure the value is exactly N bytes (or fewer - it will be padded).

```sql
INSERT INTO file_checksums
    (file_id, file_path, md5_hash, sha256_hash, country_code, currency, created_at) VALUES
(1, '/data/report.csv',
    unhex('d41d8cd98f00b204e9800998ecf8427e'),
    unhex('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    'US', 'USD', '2026-03-31 10:00:00'),
(2, '/data/backup.tar',
    unhex('7215ee9c7d9dc229d2921a40e899ec5f'),
    unhex('4e07408562bedb8b60ce05c1decb3e14de88bf3cc2a4e9ad2e6b5a8c0c7e6a4f'),
    'GB', 'GBP', '2026-03-31 11:00:00');
```

## Null-Padding Behavior

When a value shorter than N is inserted, it gets padded with null bytes on the right.

```sql
-- Inserting a 1-byte value into FixedString(3) pads with 2 null bytes
CREATE TABLE padding_demo
(
    id   UInt32,
    code FixedString(3)
)
ENGINE = Memory;

INSERT INTO padding_demo VALUES (1, 'A'), (2, 'AB'), (3, 'ABC');

SELECT
    id,
    code,
    length(code)         AS stored_length,  -- Always 3
    hex(code)            AS hex_value        -- Shows null byte padding
FROM padding_demo;
-- Row 1: hex = '410000' (A + two null bytes)
-- Row 2: hex = '414200' (AB + one null byte)
-- Row 3: hex = '414243' (ABC, no padding needed)
```

## Comparing FixedString Values

Equality operators (`=`, `==`, `equals`) ignore null byte padding when comparing FixedString to string literals, so a short literal matches its padded stored form. `LIKE`, however, treats null bytes as significant characters, so patterns must account for them.

```sql
-- Equality ignores null padding: this matches the row stored as 'A\0\0'
SELECT *
FROM padding_demo
WHERE code = 'A';

-- LIKE treats null bytes literally, so you must include them in the pattern
SELECT *
FROM padding_demo
WHERE code LIKE 'A\0\0';   -- Matches only row 1

-- To strip trailing null bytes explicitly, pass '\0' as the trim characters
SELECT *
FROM padding_demo
WHERE trimRight(code, '\0') = 'A';
```

## Hex Encoding for Binary Hashes

Binary hashes stored in FixedString are not human-readable directly. Use `hex()` to convert for display and `unhex()` to convert for storage.

```sql
SELECT
    file_id,
    file_path,
    hex(md5_hash)    AS md5_hex,
    hex(sha256_hash) AS sha256_hex
FROM file_checksums;
```

## FixedString vs String: When to Use Each

Use FixedString(N) when:
- The value is always exactly N bytes (binary hashes, fixed codes)
- You want predictable storage layout for columnar compression
- You are storing raw binary data (digests, fixed binary identifiers)

Use String when:
- The value length varies across rows
- You are storing human-readable text of unpredictable length
- Null-byte padding semantics would cause comparison bugs

```sql
-- Good use of FixedString: ISO country codes always 2 characters
CREATE TABLE geo_data
(
    ip        UInt32,
    country   FixedString(2),
    region    String           -- Region names vary in length
)
ENGINE = MergeTree()
ORDER BY ip;
```

## Storage Efficiency

For columns where every value is the same length, FixedString avoids the per-value length prefix that String requires. This reduces storage slightly and makes block layouts more predictable for the columnar compression engine.

```sql
-- Storing MD5 hashes: FixedString(32) for hex string representation
CREATE TABLE audit_log
(
    event_id      UInt64,
    entity_type   LowCardinality(String),
    entity_id     UInt64,
    checksum      FixedString(32),   -- 32-char hex MD5
    recorded_at   DateTime
)
ENGINE = MergeTree()
ORDER BY (entity_type, entity_id, event_id);
```

## Summary

FixedString(N) is the right choice when your data has a guaranteed fixed byte length - binary hashes, ISO codes, fixed-format identifiers, and similar values. Values shorter than N are padded with null bytes, which affects equality comparisons and requires care when mixing FixedString with String values. For everything else where lengths vary, use String. The storage and comparison performance benefits of FixedString are most pronounced in high-cardinality columns where every row carries a full N-byte payload.
