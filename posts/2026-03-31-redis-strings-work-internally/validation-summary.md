# Validation Summary: How Redis Strings Work Internally and When to Use Them

## Status
validated

## Post Type
Technical explainer / Reference guide

## Technologies Covered
- Redis (string data type, internal encodings)
- SDS (Simple Dynamic String) — Redis's internal string representation
- Redis CLI commands: SET, OBJECT ENCODING, INCR, MEMORY USAGE

## Sources Consulted
- Redis SDS source code (sds.h) — struct field order for sdshdr8/16/32/64: https://github.com/redis/redis/blob/unstable/src/sds.h
- Redis documentation on OBJECT ENCODING: https://redis.io/commands/object-encoding/
- Redis documentation on SET command (NX/PX flags): https://redis.io/commands/set/
- Redis documentation on MEMORY USAGE: https://redis.io/commands/memory-usage/
- Redis source code for shared integer pool (OBJ_SHARED_INTEGERS = 10000, covering 0–9999): https://github.com/redis/redis/blob/unstable/src/server.h

## Issues Found
1. **SDS struct diagram field order was incorrect.** The diagram showed `flags | len | alloc | buf[] | \0`, but the actual Redis SDS struct layout (sdshdr8 and all variants) is `len | alloc | flags | buf[] | \0`. The `flags` field is placed immediately before `buf[]` by design — Redis locates the flags via `buf[-1]`, which relies on this adjacency. Fixed the diagram to show the correct field order.

## Review Notes
- The 44-byte embstr threshold is correct for Redis 3.2+ (it was 39 bytes in Redis 3.0 and earlier). The post does not specify a version; this is fine since 44 bytes has been stable for many years and applies to all currently supported Redis versions.
- The shared integer pool range (0–9999) is correct — defined by `OBJ_SHARED_INTEGERS = 10000` in the Redis source.
- The ~64 byte per-key overhead is a reasonable approximation that varies by platform and Redis version but is a commonly cited and acceptable ballpark figure.
- All Redis CLI commands and their flags (SET NX PX, OBJECT ENCODING, INCR, MEMORY USAGE) are syntactically correct and current.
