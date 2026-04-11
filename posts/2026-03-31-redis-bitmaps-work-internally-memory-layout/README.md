# How Redis Bitmaps Work Internally and Memory Layout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bitmap, String, Internal, Memory

Description: Understand how Redis bitmaps are stored as SDS strings, how memory is allocated by bit offset, and when bitmaps are the most space-efficient data structure.

---

Redis does not have a dedicated bitmap type. Bitmaps are simply Redis strings accessed via bit-level commands (`SETBIT`, `GETBIT`, `BITCOUNT`, `BITPOS`). Understanding the memory layout helps you use bitmaps efficiently.

## Bitmaps as SDS Strings

A Redis bitmap is a regular string value where each character represents 8 bits. The bit at offset `n` lives in the byte at position `n / 8`, at bit position `n % 8` within that byte (most significant bit first).

```bash
SETBIT user:flags 0 1   # Set bit 0 (byte 0, bit 7)
SETBIT user:flags 7 1   # Set bit 7 (byte 0, bit 0)
SETBIT user:flags 8 1   # Set bit 8 (byte 1, bit 7)

STRLEN user:flags       # Returns: 2 (two bytes allocated)
```

## Memory Allocation by Offset

Redis allocates just enough bytes to hold the highest-set bit offset. Setting bit 1000000 allocates ~125KB immediately, regardless of how many bits are actually set:

```bash
SETBIT sparse 1000000 1
STRLEN sparse     # Returns: 125001 bytes
MEMORY USAGE sparse   # ~125 KB
```

This is important: **sparse bitmaps with high bit offsets waste memory**. For sparse use cases, sorted sets or hashes may be more efficient.

## Dense Bitmap Use Case: Daily Active Users

Bitmaps shine for dense boolean flags. Tracking whether each of 1 million users was active today costs only 125KB:

```bash
# User 123456 was active today
SETBIT active:2024-01-15 123456 1

# Check activity
GETBIT active:2024-01-15 123456   # Returns: 1

# Count active users
BITCOUNT active:2024-01-15        # Returns: number of set bits

# Memory usage: ceil(1000000 / 8) = 125000 bytes = 125 KB
```

Compare to storing user IDs in a set: 1 million string entries would cost far more.

## BITCOUNT Internals

`BITCOUNT` uses a population count algorithm (popcount/Hamming weight). On x86_64, Redis leverages the `POPCNT` CPU instruction, making it extremely fast:

```bash
BITCOUNT active:2024-01-15              # Count all set bits
BITCOUNT active:2024-01-15 0 999       # Count bits in bytes 0-999 (first 8000 bits)
BITCOUNT active:2024-01-15 0 -1 BIT    # Redis 7.0+ - count by bit range
```

## Bitwise Operations Across Bitmaps

```bash
# Find users active on both days (AND)
BITOP AND active:both active:2024-01-15 active:2024-01-16
BITCOUNT active:both

# Find users active on either day (OR)
BITOP OR active:either active:2024-01-15 active:2024-01-16

# Find users whose activity changed between days (symmetric difference)
BITOP XOR active:changed active:2024-01-15 active:2024-01-16
```

## Memory Layout Diagram

```text
SETBIT flags 0 1   # bit 0 = MSB of byte 0
SETBIT flags 7 1   # bit 7 = LSB of byte 0
SETBIT flags 8 1   # bit 8 = MSB of byte 1

Memory layout (byte 0, byte 1):
  Byte 0: 10000001  (bits 0 and 7 set)
  Byte 1: 10000000  (bit 8 set)
```

## When Bitmaps Beat Other Data Structures

| Use case | Bitmap memory | Sorted set memory |
|----------|--------------|-------------------|
| 1M users, dense (>10% active) | 125 KB | 50+ MB |
| 1M users, sparse (<0.1% active) | 125 KB | 5 KB |

For dense flags on compact integer IDs, bitmaps win. For sparse data or non-integer IDs, sorted sets or sets are better.

## Summary

Redis bitmaps are SDS strings accessed with bit-level commands. Memory is allocated contiguously up to the highest bit offset, making bitmaps ideal for dense boolean flags on integer IDs but wasteful for sparse high-offset use cases. `BITCOUNT` uses hardware popcount instructions for fast cardinality queries, and `BITOP` enables set-like operations across multiple bitmaps.
