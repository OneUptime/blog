# How to Use reinterpretAsString() and reinterpretAsUInt64() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Casting, reinterpret, Binary, SQL

Description: Learn how to use reinterpretAsString() and reinterpretAsUInt64() in ClickHouse for low-level binary reinterpretation without value conversion.

---

## Overview

ClickHouse's `reinterpretAs*()` functions reinterpret the binary representation of a value as a different type, without performing any numeric conversion. This is distinct from `CAST()`, which converts the value semantically. These functions are used for binary hashing, fingerprinting, and low-level data manipulation.

## reinterpretAsString()

`reinterpretAsString(value)` takes any scalar type and returns its raw binary bytes as a String:

```sql
SELECT reinterpretAsString(toUInt64(255)) AS binary_str
-- '\xff' (little-endian; trailing null bytes are dropped)
```

```sql
SELECT reinterpretAsString(toFloat32(1.0)) AS float_bytes
-- Raw 4-byte IEEE 754 representation
```

This is useful for building binary keys or computing binary hashes from numeric values.

## reinterpretAsUInt64()

`reinterpretAsUInt64(str)` takes a String (up to 8 bytes) and reinterprets those bytes as a UInt64:

```sql
SELECT reinterpretAsUInt64('ABCDEFGH') AS uint64_val
-- 5208208757389214273 (bytes interpreted as little-endian UInt64)
```

Round-trip example:

```sql
SELECT
    toUInt64(12345)                       AS original,
    reinterpretAsUInt64(reinterpretAsString(toUInt64(12345))) AS round_trip
-- Both: 12345
```

## Full Family of reinterpretAs*() Functions

ClickHouse provides the full set:

```sql
SELECT reinterpretAsUInt8(str),   reinterpretAsInt8(str)
SELECT reinterpretAsUInt16(str),  reinterpretAsInt16(str)
SELECT reinterpretAsUInt32(str),  reinterpretAsInt32(str)
SELECT reinterpretAsUInt64(str),  reinterpretAsInt64(str)
SELECT reinterpretAsFloat32(str), reinterpretAsFloat64(str)
SELECT reinterpretAsUUID(str)
```

## Practical Use Case - Hashing UUIDs to UInt64

Reinterpreting UUID bytes as two UInt64 values for compact storage or comparison. Use `UUIDStringToNum()` to get the 16-byte binary form of the UUID, then substring and reinterpret:

```sql
SELECT
    toUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8') AS uuid,
    reinterpretAsUInt64(substring(UUIDStringToNum('6ba7b810-9dad-11d1-80b4-00c04fd430c8'), 1, 8)) AS first_8_bytes
```

## Using reinterpretAsUUID

Convert a 16-byte binary string to a UUID:

```sql
SELECT reinterpretAsUUID(toFixedString('\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10', 16)) AS uuid_val
```

## Binary Key Construction

Build composite binary keys for deduplication:

```sql
SELECT
    cityHash64(
        reinterpretAsString(user_id),
        reinterpretAsString(event_type_id)
    ) AS composite_key
FROM events
```

## Comparison with CAST

Note the fundamental difference:

```sql
-- CAST converts the value semantically
SELECT CAST(65 AS String)          -- '65' (string representation of number)

-- reinterpretAsString reinterprets the raw bytes
SELECT reinterpretAsString(toUInt8(65)) -- 'A' (byte 0x41 = ASCII 'A')
```

Use `CAST` for type conversions where you need the correct numeric or string value. Use `reinterpretAs*` when you need to work with the underlying binary representation.

## Warning - Endianness

ClickHouse uses little-endian byte order for reinterpretation of numeric types. When interoperating with systems that use big-endian (network byte order), you may need to `reverse()` the raw bytes or use `byteSwap()` to adjust.

```sql
SELECT byteSwap(reinterpretAsUInt64(some_binary_field)) AS big_endian_val
FROM raw_data
```

## Summary

`reinterpretAsString()` exposes the raw bytes of any scalar value as a String, and `reinterpretAsUInt64()` (and its siblings) reinterprets up to 8 bytes of a String as a numeric type. These are low-level functions for binary fingerprinting, UUID handling, and compact key construction - distinct from semantic type casting performed by `CAST()`.
