# Validation Summary: How to Use SETBIT and GETBIT in Redis for Bit-Level Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SETBIT, GETBIT, BITCOUNT, BITOP, BITPOS commands)
- Redis Bitmaps (bit-level string operations)

## Sources Consulted
- Redis official documentation for SETBIT: https://redis.io/commands/setbit
- Redis official documentation for GETBIT: https://redis.io/commands/getbit
- Redis official documentation for BITCOUNT: https://redis.io/commands/bitcount
- Redis official documentation for BITOP: https://redis.io/commands/bitop
- Redis official documentation for BITPOS: https://redis.io/commands/bitpos
- Redis official documentation for STRLEN: https://redis.io/commands/strlen

## Issues Found
1. **Basic SETBIT and GETBIT example — missing DEL output**: The example had 6 commands (DEL, two SETBITs, three GETBITs) but only 5 output lines. The `DEL mybitmap` return value `(integer) 0` was missing. This was inconsistent with the "Checking the return value of SETBIT" example which correctly included the DEL output. Added the missing `(integer) 0` line for the DEL command.

2. **GETBIT on out-of-range offset example — missing DEL output**: The example had 2 commands (DEL sparse_bitmap, GETBIT sparse_bitmap 99999) but only 1 output line. The `DEL sparse_bitmap` return value `(integer) 0` was missing. Added the missing `(integer) 0` line for the DEL command.

## Review Notes
- All technical explanations about bit indexing (MSB-first from byte 0), SETBIT return semantics, GETBIT behavior on non-existent keys, and memory calculations are accurate.
- The memory efficiency claim of 125 KB for 1 million bits is correct (125,000 bytes using 1 KB = 1000 bytes convention), and the STRLEN output of 125000 for offset 999999 is verified (byte index = floor(999999/8) + 1 = 125000).
- The related commands table is accurate. Note that Redis 7.0+ added a BYTE|BIT option to BITCOUNT and BITPOS, but the basic syntax shown remains valid and correct.
- The mermaid diagram correctly illustrates bit ordering within bytes.
