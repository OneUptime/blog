# Validation Summary: How to Use PFMERGE in Redis to Merge HyperLogLog Structures

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- HyperLogLog (probabilistic data structure)
- PFMERGE command
- PFADD command
- PFCOUNT command

## Sources Consulted
- Redis PFMERGE official documentation: https://redis.io/docs/latest/commands/pfmerge/
- Redis PFCOUNT official documentation: https://redis.io/docs/latest/commands/pfcount/
- Redis HyperLogLog data type documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/

## Issues Found

1. **Incorrect unique user count in region merge example (line 69)**: The blog stated "Returns approximately 7 unique users globally" but the actual union of {user:100, user:101, user:102} (us), {user:200, user:201, user:101} (eu), and {user:300, user:100} (apac) is {user:100, user:101, user:102, user:200, user:201, user:300} = 6 unique users, not 7. Fixed to "approximately 6".

2. **Incorrect destkey behavior description (line 35)**: The blog stated "If `destkey` already exists, it is overwritten." According to official Redis documentation, if the destination variable exists, it is treated as one of the source sets and its cardinality is included in the merged result. This is a meaningful distinction — existing data in the destination key contributes to the union rather than being discarded. Fixed to accurately reflect this behavior.

## Review Notes
- The mermaid diagram correctly shows 6 unique users from the union of three days' data.
- The weekly merge example correctly counts 11 unique users (user:1 through user:11).
- The incremental merge example on line 82 (`PFMERGE visitors:week-current visitors:week-current visitors:2026-03-27`) lists the destination key as both dest and source. Given the corrected destkey behavior (dest is automatically treated as a source), listing it twice is redundant but harmless — Redis handles this correctly.
- The ~12 KB memory claim for HyperLogLog is accurate per official Redis documentation.
- The comparison between PFMERGE and multi-key PFCOUNT is accurate: both estimate union cardinality, but PFMERGE persists the result.
