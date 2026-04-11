# Validation Summary: How to Use GETRANGE and SETRANGE in Redis for Substring Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (GETRANGE and SETRANGE string commands)

## Sources Consulted
- Redis official documentation for GETRANGE: https://redis.io/docs/latest/commands/getrange/
- Redis official documentation for SETRANGE: https://redis.io/docs/latest/commands/setrange/
- Redis official documentation for string type: https://redis.io/docs/latest/develop/data-types/strings/

## Issues Found

### 1. Incorrect SETRANGE return value in "Combining GETRANGE and SETRANGE" example
- **What was wrong:** The output for `SETRANGE log:entry 11 "WARN "` showed `(integer) 26`, but the string `"2026-03-31 ERROR: disk full"` is 27 bytes long. Since `SETRANGE` with `"WARN "` (5 bytes) at offset 11 overwrites bytes 11-15 without changing the total length, the return value should be `(integer) 27`.
- **What was changed:** Corrected `(integer) 26` to `(integer) 27` in the output block.
- **Why:** SETRANGE returns the length of the string after modification. The string is 27 bytes and the in-place edit does not change its length.

## Review Notes
- The "Combining" example omits the `OK` output from the initial `SET` command while other SETRANGE examples include it. This is a minor stylistic inconsistency but not a technical error, as blog examples commonly omit setup command outputs for brevity.
- The use case mention of "bit arrays beyond BITSET resolution" could be slightly confusing since there is no Redis command called `BITSET` (the individual bit commands are `SETBIT`/`GETBIT`). However, "BITSET" reads naturally as referring to the general bit-set data structure concept, so this is not incorrect.
- All other examples were manually verified by counting byte offsets and confirmed correct: GETRANGE extractions, negative offset handling, SETRANGE overwrites, shorter replacement behavior, and zero-padding behavior.
