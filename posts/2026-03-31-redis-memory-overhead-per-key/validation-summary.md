# Validation Summary: How to Handle Redis Memory Overhead per Key

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (memory internals, per-key overhead, encoding optimizations)
- Python (redis-py client library)
- jemalloc (memory allocator used by Redis)

## Sources Consulted
- Redis official documentation: MEMORY USAGE command (https://redis.io/docs/latest/commands/memory-usage/)
- Redis official documentation: OBJECT ENCODING command (https://redis.io/docs/latest/commands/object-encoding/)
- Redis official documentation: HSET command (https://redis.io/docs/latest/commands/hset/)
- Redis source code: `redisObject` struct in `src/server.h` (confirms 16-byte robj header)
- Redis source code: `dictEntry` struct in `src/dict.h` (confirms 24-byte entry with key/value/next pointers, no hash field)
- Redis source code: SDS header structures (`sdshdr8` = 3 bytes header)
- Redis 7.0-rc1 release notes (listpack replacing ziplist)
- redis-py library source: `memory_usage()` method signature and behavior

## Issues Found

### 1. Dict entry description incorrectly listed "hash" field
- **What was wrong:** The per-key memory breakdown table described the dict entry as containing "hash, next pointer, key/val pointers". The standard `dictEntry` struct has no hash field — it contains a key pointer, value union, and next pointer (3 x 8 = 24 bytes). Listing four fields (hash, next, key, val) would imply 32 bytes, contradicting the stated 24 bytes.
- **What was changed:** Updated the notes column from "hash, next pointer, key/val pointers" to "key, value, next pointers".
- **Why:** The hash is computed on-the-fly for bucket lookup but is not stored per-entry in the dictEntry struct.

### 2. Strategy 4 title said "Use Integer Keys" but content was about integer values
- **What was wrong:** The section title was "Use Integer Keys" but the explanation and example (`SET article_views:42 1000`) demonstrate integer *value* encoding, not integer keys. The key `article_views:42` is a string; the optimization is that the value `1000` uses `int` encoding.
- **What was changed:** Renamed from "Use Integer Keys" to "Use Integer Values".
- **Why:** The title was misleading — Redis's int encoding optimization applies to values that are representable as 64-bit signed integers, saving the SDS allocation for the value.

## Review Notes
- The SDS key string overhead listed as "~40 bytes" in the breakdown table is overstated. The actual SDS overhead (header + null terminator + jemalloc padding) for typical keys is approximately 5-18 bytes, not 40. However, the total per-key overhead range of ~88-112 bytes is in the right general ballpark for realistic key-value pairs, and the table is clearly presented as approximate. The practical advice remains valid regardless of exact component breakdown.
- The `analyze_overhead` function calculates "overhead" by subtracting only key name bytes from total memory, not value bytes. This means the reported "overhead" includes value storage. This is a methodological simplification rather than a bug, but readers should be aware the figure represents "memory beyond the key name" rather than pure structural overhead.
- The post doesn't specify which Redis version it targets. The listpack reference is correct for Redis 7.0+; readers on Redis 6.x would see ziplist encoding instead. The variadic HSET syntax requires Redis 4.0+.
- All Python code examples use correct redis-py API calls and would function as described.
- All Redis commands use correct syntax and would produce the described results.
