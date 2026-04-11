# Validation Summary: How Redis Handles Stream Trimming During Consumer Reads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Streams
- Redis CLI (`redis-cli`)
- Redis commands: XADD, XTRIM, XPENDING, XACK, XDEL, XLEN, XINFO

## Sources Consulted
- Redis official documentation for XACK: https://redis.io/docs/latest/commands/xack/
- Redis official documentation for XDEL: https://redis.io/docs/latest/commands/xdel/
- Redis official documentation for XTRIM: https://redis.io/docs/latest/commands/xtrim/
- Redis official documentation for XADD: https://redis.io/docs/latest/commands/xadd/

## Issues Found

1. **Incorrect code comment for MINID trimming**: The comment said "Trim to keep entries older than that ID" which is backwards. MINID *removes* entries with IDs less than the threshold and *keeps* the threshold ID and newer entries. Fixed to: "Trim entries older than that ID, keeping it and newer ones."

2. **Wrong XACK return value for orphaned messages**: The post claimed `XACK` returns 0 for orphaned (trimmed) message IDs. This is incorrect. XACK operates on the PEL (Pending Entries List), not the stream data. If a message was trimmed from the stream but still exists in the PEL, XACK successfully removes the PEL entry and returns 1. Fixed the example and explanation.

3. **Incorrect cleanup advice using XDEL**: The post recommended using `XDEL` to clean up orphaned PEL entries. XDEL only operates on stream data and has no effect on the PEL. The correct way to clean up orphaned PEL entries is to acknowledge them with `XACK`. Removed the incorrect XDEL suggestion and replaced with correct XACK guidance.

## Review Notes
- The XADD, XTRIM, and XPENDING command syntax is all correct.
- The explanation of approximate trimming with `~` and radix-tree node behavior is accurate.
- The MINID strategy for safe trimming is sound advice. MINID was introduced in Redis 6.2, which could be noted for users on older versions, but is standard in all current Redis releases.
