# Validation Summary: How to Use BITOP in Redis for Bitwise Operations on Strings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (BITOP, SETBIT, BITCOUNT, BITPOS, EXPIRE commands)
- Redis Bitmaps / Bitwise operations

## Sources Consulted
- Official Redis BITOP documentation: https://redis.io/docs/latest/commands/bitop/
- Official Redis SETBIT documentation: https://redis.io/docs/latest/commands/setbit/
- Official Redis BITCOUNT documentation: https://redis.io/docs/latest/commands/bitcount/

## Issues Found
No technical issues found.

All code examples were verified by tracing through the bitwise operations manually:
- **Setup**: SETBIT commands correctly set bits 1, 2, 4 for Monday; 1, 3, 4 for Tuesday; 2, 3, 4 for Wednesday.
- **AND example**: `01101000 AND 01011000 AND 00111000` = `00001000` — only bit 4 is set, so BITCOUNT = 1 (user 4). Correct.
- **OR example**: `01101000 OR 01011000 OR 00111000` = `01111000` — bits 1, 2, 3, 4 are set, so BITCOUNT = 4. Correct.
- **XOR example**: `01101000 XOR 01011000` = `00110000` — bits 2 and 3 are set (user 2 mon-only, user 3 tue-only). Correct.
- **NOT example**: Syntax is correct (single source key). The caveat about flipped unused bits is accurate and helpful.
- **Weekly pipeline**: EXPIRE 604800 = 7 days in seconds. Correct.
- **Mermaid diagram**: Bitwise AND and OR operations shown are arithmetically correct.
- **Syntax and behavior**: Matches official Redis documentation — byte-by-byte processing, zero-padding of shorter keys, result length equals longest input, NOT is unary, returns destination string length in bytes, O(N) complexity.

## Review Notes
- Redis 8.2 introduced additional BITOP operations (DIFF, DIFF1, ANDOR, ONE) not covered in this post. The post accurately covers the classic four operations (AND, OR, XOR, NOT) available since Redis 2.6.0, which is appropriate for its scope.
- The official Redis documentation recommends running BITOP on a replica rather than the master for large inputs to avoid blocking, which could be a useful addition in the future.
