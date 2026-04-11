# Validation Summary: How Redis Hashes Work Internally (Hashtable and Listpack)

## Status
validated

## Post Type
Tutorial / Technical Deep Dive

## Technologies Covered
- Redis (7.0+ with listpack encoding)
- Redis CLI commands (HSET, OBJECT ENCODING, CONFIG GET/SET, MEMORY USAGE, DEBUG OBJECT, HINCRBY, HINCRBYFLOAT)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation on hash data type: https://redis.io/docs/data-types/hashes/
- Redis source code for listpack implementation (listpack.c, listpack.h) — confirms header format: `<total_bytes (uint32)><num_elements (uint16)><entries><EOF 0xFF>`
- Redis source code for dict/hashtable implementation (dict.c) — confirms separate chaining with incremental rehashing
- Redis configuration documentation for `hash-max-listpack-entries` (default 128) and `hash-max-listpack-value` (default 64): https://redis.io/docs/management/config/
- Redis OBJECT ENCODING documentation: https://redis.io/commands/object-encoding/
- Redis MEMORY USAGE documentation: https://redis.io/commands/memory-usage/

## Issues Found

1. **Listpack structure diagram missing `num_elements` field**: The diagram showed `[total_bytes][field0][value0]...[0xFF]` but the actual listpack binary format includes a `num_elements` (2-byte unsigned integer) header field after `total_bytes`. Fixed to `[total_bytes][num_elements][field0][value0]...[0xFF]`. This is important since the post is specifically about Redis internals.

2. **Incorrect hash collision resolution terminology**: The post described the hashtable as using "open chaining" — this is not standard terminology and conflates "open hashing" (synonym for separate chaining) with "open addressing" (a different technique entirely). Redis uses **separate chaining** (each bucket has a linked list of entries). Fixed "open chaining" to "separate chaining".

## Review Notes
- The post correctly focuses on Redis 7.0+ behavior where listpack replaced the older ziplist encoding. Readers using Redis 6.x or earlier will see `ziplist` encoding and `hash-max-ziplist-entries`/`hash-max-ziplist-value` config parameters instead. The post does not mention this version boundary, but this is acceptable given the current Redis landscape.
- The ~64 byte per-key overhead estimate for string keys is a reasonable approximation; actual overhead varies by key/value size and Redis version.
- The `DEBUG OBJECT` command shown requires the `enable-debug-command` config to be set to `yes` in Redis 7.0+ (it is disabled by default for security). This is not mentioned in the post but is a minor operational detail.
- All Python code examples use correct modern redis-py API patterns.
- All Redis CLI commands use correct syntax.
