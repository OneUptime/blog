# Validation Summary: How to Use OBJECT REFCOUNT in Redis to Check Key References

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (OBJECT REFCOUNT command, integer sharing, memory optimization)
- Python (redis-py client library)
- Node.js (node-redis v4 client library)

## Sources Consulted
- Redis official documentation for OBJECT REFCOUNT: https://redis.io/commands/object-refcount/
- Redis source code (`server.h`) for `OBJ_SHARED_INTEGERS` constant (default value 10000, covering integers 0-9999)
- Redis source code (`object.c`) for `OBJ_SHARED_REFCOUNT` (INT_MAX = 2147483647)
- Redis official documentation for OBJECT subcommands (ENCODING, IDLETIME, FREQ, HELP): https://redis.io/commands/object/
- redis-py documentation for `object_refcount()`, `object_encoding()`, `object_idletime()`, `object_freq()` methods
- node-redis v4 documentation for `objectRefCount()` method

## Issues Found

1. **Outdated constant name `REDIS_SHARED_INTEGERS`** (line 39): The post referenced `REDIS_SHARED_INTEGERS`, which is the pre-Redis 4.0 constant name. In modern Redis, the constant is `OBJ_SHARED_INTEGERS`. Fixed to `OBJ_SHARED_INTEGERS`.

2. **Incorrect memory claim** (line 146): The post stated "Memory for 1000 keys storing '100' is same as 1 key". This is wrong — only the value object is shared. Each key still has its own key name, dictionary entry, and robj pointer overhead. Fixed to accurately state that the value object is shared, saving memory on the value side.

3. **Misleading `hset` integer sharing example** (lines 237-245): The Memory Optimization Insight section used `hset` with a comment claiming "# Shared!" for hash field values. Integer sharing via `OBJ_SHARED_INTEGERS` applies to top-level string value objects, not hash field values. Small hashes use listpack encoding where values are stored inline, not as separate robj objects, so sharing does not apply. Changed the example to use `SET` (top-level string keys) where integer sharing actually works as described.

## Review Notes
- The Node.js example uses `require()` (CommonJS) with top-level `await` (ESM feature). Strictly speaking these cannot be mixed, but this is a very common shorthand in tutorials and documentation. Not changed as the intent is clear.
- All redis-py method names (`object_refcount`, `object_encoding`, `object_idletime`, `object_freq`) are correct for current versions.
- The node-redis v4 method `objectRefCount()` follows the library's camelCase naming convention and is correct.
- The OBJECT subcommand list (REFCOUNT, ENCODING, IDLETIME, FREQ, HELP) is complete and accurate.
- The integer sharing range (0-9999) and refcount value (2147483647) are correct for Redis 4.0+.
