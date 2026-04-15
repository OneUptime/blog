# How to Use toFixedString() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, FixedString, Storage Optimization, Hash

Description: Learn how to use toFixedString() in ClickHouse to convert strings to fixed-width FixedString(n) for memory-efficient storage of hashes and codes.

---

`toFixedString(str, n)` converts a `String` to `FixedString(n)`, which stores exactly `n` bytes. If the input string is shorter than `n`, it is padded with null bytes (`\0`). If it is longer, an exception is thrown. `FixedString` is more memory-efficient than `String` for data with a known, fixed width - such as hash digests, country codes, currency codes, and UUIDs.

## Basic Usage

```sql
-- Convert a string to FixedString(5)
SELECT toFixedString('hello', 5) AS fixed_str;
SELECT length(toFixedString('hello', 5)) AS byte_length;  -- returns 5

-- Shorter strings are padded with null bytes
SELECT toFixedString('hi', 5) AS padded;
SELECT hex(toFixedString('hi', 5)) AS padded_hex;
-- Returns: '6869000000' (h=68, i=69, then 3 null bytes)
```

## Storing Hash Digests as FixedString

Hash digests have a fixed known length. Storing them as `FixedString` instead of `String` saves memory because `String` has per-value overhead.

```sql
-- Store MD5 hex digest (32 chars) as FixedString(32)
SELECT
    document_id,
    toFixedString(hex(MD5(content)), 32) AS md5_fixed
FROM documents
LIMIT 5;

-- Store SHA256 hex digest (64 chars) as FixedString(64)
SELECT
    file_id,
    toFixedString(hex(SHA256(file_content)), 64) AS sha256_fixed
FROM files
LIMIT 5;
```

## Table Definition with FixedString

Define columns as `FixedString(n)` in a table when the values always have the same width.

```sql
CREATE TABLE content_index
(
    doc_id     UInt64,
    content    String,
    md5_hash   FixedString(16),   -- raw 16-byte MD5 binary
    sha256_hex FixedString(64),   -- 64-character SHA256 hex string
    lang_code  FixedString(2),    -- ISO 639-1 language code (e.g., 'en', 'fr')
    country    FixedString(2)     -- ISO 3166-1 alpha-2 country code
)
ENGINE = MergeTree()
ORDER BY (doc_id);

-- Insert with toFixedString conversion
INSERT INTO content_index
SELECT
    doc_id,
    content,
    MD5(content),
    toFixedString(hex(SHA256(content)), 64),
    toFixedString(lang_code, 2),
    toFixedString(country_code, 2)
FROM source_documents;
```

## Country and Currency Codes

ISO country codes (2 characters) and currency codes (3 characters) are perfect candidates for `FixedString`.

```sql
-- Convert variable-length string codes to fixed-length
SELECT
    user_id,
    toFixedString(country_code, 2)  AS country_fs,
    toFixedString(currency_code, 3) AS currency_fs
FROM users
LIMIT 10;
```

## Comparing FixedString Values

`FixedString` comparison works correctly for equality and ordering.

```sql
-- Exact match on FixedString column
SELECT *
FROM content_index
WHERE lang_code = toFixedString('en', 2)
LIMIT 10;

-- Or compare directly using a string literal
SELECT *
FROM content_index
WHERE lang_code = 'en'
LIMIT 10;
```

## Converting Back to String

Use `toString()` to convert a `FixedString` back to a `String`. The trailing null bytes are automatically stripped during conversion.

```sql
-- Converting FixedString back to String strips null padding
SELECT
    toFixedString('hi', 5)                AS fixed,
    toString(toFixedString('hi', 5))      AS back_to_str,
    length(toFixedString('hi', 5))        AS fixed_len,    -- returns 5
    length(toString(toFixedString('hi', 5))) AS str_len;   -- returns 2
```

## UUID Storage as FixedString

UUIDs (128 bits) can be stored as `FixedString(16)` (raw bytes) or as the native `UUID` type.

```sql
-- Store UUID bytes as FixedString(16)
SELECT
    generateUUIDv4() AS uuid_native,
    toFixedString(toString(generateUUIDv4()), 36) AS uuid_as_fixed_str;
-- Use the native UUID type for better semantics
```

## Checking Input Length

If the input string is longer than `n`, `toFixedString` throws an error. Check length first.

```sql
-- Safe conversion: only apply when length matches
SELECT
    code,
    if(length(code) = 2, toFixedString(code, 2), NULL) AS safe_fixed
FROM raw_codes
LIMIT 10;
```

## Summary

`toFixedString(str, n)` converts a String to `FixedString(n)`, which stores exactly `n` bytes (padding shorter strings with null bytes). Use it for columns with fixed-width values like hash digests, ISO codes, and identifiers to reduce per-value overhead compared to `String`. The most common use cases are storing MD5/SHA256 hex digests, 2-character country codes, and 3-character currency codes. Always ensure the input length matches or is shorter than `n` to avoid exceptions.
