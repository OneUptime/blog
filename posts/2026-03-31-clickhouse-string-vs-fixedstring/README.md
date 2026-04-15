# How to Choose Between String and FixedString in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, String, FixedString, Performance

Description: A practical guide comparing ClickHouse's String and FixedString types - storage differences, when FixedString wins, and a decision guide.

---

ClickHouse provides two string types: `String` for variable-length data and `FixedString(N)` for fixed-length byte strings of exactly N bytes. Choosing the right one affects storage efficiency, compression ratios, and query performance. This post walks through the storage model for each, identifies the cases where `FixedString` genuinely outperforms `String`, and provides a practical decision guide for common use cases like hashes, codes, and identifiers.

## String: Variable-Length Storage

`String` stores arbitrary-length byte sequences. Internally, each value is stored with a length prefix, allowing values of different sizes within the same column. There is no maximum length limit.

```sql
CREATE TABLE string_example
(
    id      UInt64,
    name    String,
    email   String,
    bio     String
)
ENGINE = MergeTree()
ORDER BY id;
```

`String` uses LZ4 compression by default (like all ClickHouse columns), and the variable-length nature means the column data includes implicit length information per row.

## FixedString: Fixed-Length Storage

`FixedString(N)` stores exactly N bytes per value. Values shorter than N are padded with null bytes (`\0`). Values longer than N cause an error on insert. All values occupy the same storage width, which allows more predictable memory access patterns.

```sql
CREATE TABLE fixedstring_example
(
    id          UInt64,
    md5_hash    FixedString(32),   -- 32 hex chars
    sha256_hash FixedString(64),   -- 64 hex chars
    country_code FixedString(2),   -- ISO 3166-1 alpha-2
    currency    FixedString(3)     -- ISO 4217
)
ENGINE = MergeTree()
ORDER BY id;
```

## Storage Size Comparison

| Type | Storage per value | Notes |
|---|---|---|
| `String` | varint (length) + N bytes (data) | 1 byte overhead for strings up to 127 bytes, grows for longer strings |
| `FixedString(N)` | exactly N bytes | Fixed, no length prefix overhead |

For short, fixed-length strings, `FixedString` eliminates the per-value overhead. For a column of 2-character country codes stored as `String`, each value costs 3 bytes (1-byte varint length + 2 chars). As `FixedString(2)`, it costs 2 bytes - a 33% saving before compression.

```sql
-- Compare actual storage sizes
SELECT
    column,
    sum(data_uncompressed_bytes)  AS uncompressed,
    sum(data_compressed_bytes)    AS compressed,
    round(sum(data_compressed_bytes) / sum(data_uncompressed_bytes), 3) AS ratio
FROM system.parts_columns
WHERE table IN ('string_example', 'fixedstring_example')
GROUP BY column
ORDER BY column;
```

## When FixedString is the Better Choice

### Cryptographic Hashes

Hash values have a well-defined, fixed length. Storing MD5 as `FixedString(16)` (binary) or `FixedString(32)` (hex) is more efficient than `String`:

```sql
CREATE TABLE content_dedup
(
    content_id  UInt64,
    md5_binary  FixedString(16),   -- 16-byte raw MD5
    sha1_binary FixedString(20),   -- 20-byte raw SHA-1
    sha256_hex  FixedString(64)    -- 64-char hex SHA-256
)
ENGINE = MergeTree()
ORDER BY md5_binary;

-- Insert using hash functions
INSERT INTO content_dedup
SELECT
    number,
    MD5(toString(number)),
    SHA1(toString(number)),
    hex(SHA256(toString(number)))
FROM numbers(1000);
```

### Country Codes, Currency Codes, Status Codes

Short codes with a fixed, known width are ideal for `FixedString`:

```sql
CREATE TABLE transactions
(
    tx_id        UInt64,
    amount       Decimal64(2),
    currency     FixedString(3),    -- USD, EUR, GBP
    country      FixedString(2),    -- US, GB, DE
    status_code  FixedString(4)     -- PEND, COMP, FAIL, REFN
)
ENGINE = MergeTree()
ORDER BY tx_id;
```

### IPv4/IPv6 Addresses in Binary Form

Binary IP representations have fixed lengths and benefit from `FixedString`:

```sql
CREATE TABLE access_log
(
    log_time   DateTime,
    ipv4_bin   FixedString(4),    -- 4-byte raw IPv4
    ipv6_bin   FixedString(16)    -- 16-byte raw IPv6
)
ENGINE = MergeTree()
ORDER BY log_time;

-- Store IPs in binary form for efficient storage
INSERT INTO access_log VALUES
    (now(), reinterpretAsFixedString(IPv4StringToNum('192.168.1.1')), unhex('00000000000000000000FFFFC0A80101')::FixedString(16));
```

## When String is the Better Choice

Use `String` when:
- Values have variable length (names, descriptions, URLs, log messages).
- The maximum length is not predictable or bounded.
- You need to store Unicode strings with multi-byte characters where byte length is not fixed.
- Values may be empty (FixedString stores empty as N null bytes, not zero bytes).

```sql
-- These should always be String
CREATE TABLE user_profiles
(
    user_id      UInt64,
    username     String,    -- variable length
    display_name String,    -- variable length
    bio          String,    -- variable, can be long
    avatar_url   String     -- URLs are variable
)
ENGINE = MergeTree()
ORDER BY user_id;
```

## Compression Behavior

`FixedString` columns often compress extremely well because the fixed structure allows LZ4 and ZSTD to find repetitive patterns more efficiently. For low-cardinality short strings like country codes, compression ratios can be 10:1 or better.

```sql
-- Test compression ratios for different codecs
CREATE TABLE codec_comparison
(
    id           UInt64,
    country_str  String         CODEC(ZSTD(1)),
    country_fix  FixedString(2) CODEC(ZSTD(1))
)
ENGINE = MergeTree()
ORDER BY id;
```

## Padding Gotchas

`FixedString` values shorter than N are padded with null bytes on the right. This affects comparisons and output:

```sql
-- Padding affects equality checks
SELECT toFixedString('US', 4) = toFixedString('US', 4);  -- true
SELECT toFixedString('US', 2) = toFixedString('US', 4);  -- ERROR: types differ

-- Trim null padding when displaying
SELECT trimRight(country_code, '\0') AS trimmed_code
FROM transactions;
```

## Decision Guide

Use this quick reference when choosing:

| Use Case | Recommended Type |
|---|---|
| MD5, SHA-1, SHA-256 hash (hex) | `FixedString(32/40/64)` |
| MD5, SHA-1, SHA-256 hash (binary) | `FixedString(16/20/32)` |
| ISO country code (2-letter) | `FixedString(2)` |
| ISO currency code (3-letter) | `FixedString(3)` |
| Fixed-width status/type codes | `FixedString(N)` |
| Names, descriptions, URLs | `String` |
| UUIDs (prefer UUID type) | `UUID` type |
| Log messages, JSON payloads | `String` |
| IPs (prefer IPv4/IPv6 type) | `IPv4` / `IPv6` type |

## Summary

Choose `FixedString(N)` when your data always occupies exactly N bytes - cryptographic hashes, ISO codes, and fixed-width identifiers are the classic cases. For everything else, `String`'s flexibility and lack of padding surprises make it the safer default. The storage savings from `FixedString` on short fixed-width columns are real but modest; the stronger argument is eliminating length-prefix overhead and enabling better compression through uniform value size.
