# Validation Summary: How Redis Bitmaps Work Internally and Memory Layout

## Status
validated

## Post Type
Technical Reference / Guide

## Technologies Covered
- Redis (bitmaps, strings, SDS)
- Redis bit-level commands: SETBIT, GETBIT, BITCOUNT, BITPOS, BITOP
- Redis MEMORY USAGE and STRLEN commands
- Redis 7.0+ BIT range option for BITCOUNT

## Sources Consulted
- Redis official documentation for SETBIT: https://redis.io/docs/latest/commands/setbit/
- Redis official documentation for BITCOUNT: https://redis.io/docs/latest/commands/bitcount/
- Redis official documentation for BITOP: https://redis.io/docs/latest/commands/bitop/
- Redis official documentation for STRLEN: https://redis.io/docs/latest/commands/strlen/
- Redis official documentation on bitmaps data type: https://redis.io/docs/latest/develop/data-types/bitmaps/

## Issues Found
1. **Incorrect BITOP XOR comment**: The comment said "Find users active on day1 but NOT day2 (XOR then mask)" but `BITOP XOR` produces the symmetric difference (bits set in exactly one of the two operands), not the set difference (day1 minus day2). The set difference would require `BITOP NOT` followed by `BITOP AND`. Changed the comment to "Find users whose activity changed between days (symmetric difference)" which accurately describes what XOR computes. The key name `active:changed` already matched this correct interpretation.

## Review Notes
- The bit position description ("bit position n % 8 within that byte, most significant bit first") and the inline comments in the first code block use different conventions for referring to bit positions within a byte. The text counts from the MSB (position 0 = MSB), while the comments use standard hardware notation (bit 7 = MSB, bit 0 = LSB). Both are individually correct, but readers may find the inconsistency confusing. Not changed since both are technically accurate.
- The comparison table's "5 KB" estimate for a sorted set with <0.1% of 1M users is on the low side — actual memory depends on encoding (listpack vs skiplist) and entry size. The qualitative point (sorted sets are better for sparse data) is correct.
- The BIT option for BITCOUNT was correctly noted as Redis 7.0+, confirmed by the official changelog.
