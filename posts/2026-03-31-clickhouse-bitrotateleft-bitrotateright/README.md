# How to Use bitRotateLeft() and bitRotateRight() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitwise, bitRotateLeft, bitRotateRight, Bit Operation, Integer

Description: Learn how to use bitRotateLeft() and bitRotateRight() in ClickHouse to perform circular bit rotation on integers for hashing, encoding, and data transformation.

---

ClickHouse provides `bitRotateLeft()` and `bitRotateRight()` for circular bit rotation on integer values. Unlike bit shifting (which discards overflow bits), bit rotation wraps the overflow bits back to the other end of the integer.

## Function Signatures

```sql
bitRotateLeft(a, b)  -> same type as a
bitRotateRight(a, b) -> same type as a
```

- `a` is the value to rotate (Int8/16/32/64 or UInt8/16/32/64).
- `b` is the number of positions to rotate.

## Basic Examples

```sql
SELECT
    bitRotateLeft(toUInt8(0b00001111), 2)  AS rotl_result,
    bitRotateRight(toUInt8(0b00001111), 2) AS rotr_result
```

```text
rotl_result  rotr_result
-----------  -----------
60           195
```

For `bitRotateLeft(0b00001111, 2)`: `0b00001111` becomes `0b00111100` = 60.
For `bitRotateRight(0b00001111, 2)`: `0b00001111` becomes `0b11000011` = 195.

## Understanding Rotation vs Shift

```sql
SELECT
    bitShiftLeft(toUInt8(192), 2)   AS shift_left,   -- drops overflow bits
    bitRotateLeft(toUInt8(192), 2)  AS rotate_left   -- wraps overflow bits
```

```text
shift_left  rotate_left
----------  -----------
0           3
```

With `192 = 0b11000000`, shifting left by 2 drops the two 1-bits and gives 0. Rotation wraps them to the right, giving `0b00000011 = 3`.

## Hashing and Checksum Applications

Bit rotation is used in many hash algorithms (such as MurmurHash, xxHash, SipHash, and SHA-1) to improve bit diffusion:

```sql
SELECT
    user_id,
    bitXor(
        bitRotateLeft(toUInt64(user_id), 17),
        toUInt64(session_hash)
    ) AS combined_hash
FROM user_sessions
LIMIT 10
```

## Custom Integer Encoding

Rotate integer fields to obfuscate sequential IDs before storing them in external systems:

```sql
SELECT
    order_id,
    bitRotateLeft(toUInt32(order_id), 11) AS encoded_id
FROM orders
LIMIT 5
```

Decode by rotating in the opposite direction:

```sql
SELECT
    encoded_id,
    bitRotateRight(toUInt32(encoded_id), 11) AS original_id
FROM encoded_orders
LIMIT 5
```

## Using in Aggregation

```sql
SELECT
    toDate(event_time) AS day,
    groupBitXor(bitRotateLeft(toUInt64(user_id), 13)) AS daily_fingerprint
FROM user_events
GROUP BY day
ORDER BY day DESC
LIMIT 30
```

This creates a daily fingerprint by XOR-ing rotated user IDs, a simple technique for change detection.

## Working with Different Integer Widths

The rotation wraps within the bit width of the input type:

```sql
SELECT
    bitRotateLeft(toUInt16(1), 15) AS rotl_uint16,  -- 32768 (bit 15 set)
    bitRotateLeft(toUInt32(1), 31) AS rotl_uint32   -- 2147483648 (bit 31 set)
```

The wrap-around happens at 8, 16, 32, or 64 bits depending on the input type.

## Summary

`bitRotateLeft()` and `bitRotateRight()` perform circular bit rotation in ClickHouse, preserving all bits by wrapping overflow bits back to the opposite end. They are useful in hash computation, lightweight ID obfuscation, and any algorithm that requires bit diffusion without data loss. Unlike bit shifts, rotations are fully reversible by rotating in the opposite direction.
