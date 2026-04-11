# Validation Summary: How to Estimate Redis Memory for Sets Workload

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (sets, intset encoding, listpack encoding, hashtable encoding)
- Python (estimation script)
- Bash / redis-cli commands

## Sources Consulted
- Redis official documentation on SET data type and encodings (https://redis.io/docs/data-types/sets/)
- Redis official documentation on OBJECT ENCODING command (https://redis.io/commands/object-encoding/)
- Redis official documentation on MEMORY USAGE command (https://redis.io/commands/memory-usage/)
- Redis source code for intset implementation (encoding field sizes: int16=2, int32=4, int64=8 bytes)
- Redis 7.2 release notes for listpack encoding support for sets (set-max-listpack-entries config)
- Redis official documentation on CONFIG SET (https://redis.io/commands/config-set/)

## Issues Found

1. **Section heading said "Two Encodings" but three are discussed**: The heading "Two Encodings for Sets" was incorrect because the post discusses three encodings: intset, listpack, and hashtable. Changed to "Three Encodings for Sets".

2. **Intset formula example exceeded default threshold**: The intset memory formula example used "1000 integer members" but the default `set-max-intset-entries` is 512, meaning 1000 members would NOT use intset encoding with default settings. Changed to "500 integer members: 16 + (500 * 8) = ~4,016 bytes" to stay within the threshold.

3. **Incorrect computed output in Example 2**: The comment for the second Python example claimed `'total_mb': 383.1` but the actual computed result is `383.0` (401,600,000 / 1,048,576 = 382.996, which rounds to 383.0). Fixed the expected output.

4. **Practical measurement created 1000-member "intset" test**: The bash command `seq 1 1000` created 1000 integer members for a key named "test:intset", but with the default threshold of 512, this set would be encoded as a hashtable, not an intset. Changed to `seq 1 500` to correctly demonstrate intset encoding.

## Review Notes
- The post does not specify which Redis version it targets. The listpack encoding for sets and the `set-max-listpack-entries` config were introduced in Redis 7.2. Users on older Redis versions will not have listpack encoding for sets.
- The intset memory formula assumes 64-bit integers (8 bytes each). Redis intset uses variable encoding (2 bytes for int16, 4 bytes for int32, 8 bytes for int64), so actual memory for sets with only small integers could be lower than estimated.
- Memory overhead estimates (base bytes, per-member bytes) are reasonable approximations but will vary based on Redis version, memory allocator (jemalloc vs libc), and platform. The post correctly advises using `MEMORY USAGE` to validate estimates.
