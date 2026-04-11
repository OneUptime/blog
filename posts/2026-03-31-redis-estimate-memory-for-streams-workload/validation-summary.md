# Validation Summary: How to Estimate Redis Memory for Streams Workload

## Status
validated

## Post Type
Tutorial / Capacity Planning Guide

## Technologies Covered
- Redis Streams (introduced in Redis 5.0)
- Redis CLI (`redis-cli`)
- Redis commands: XADD, XTRIM, XLEN, MEMORY USAGE, CONFIG GET
- Python (estimation script)

## Sources Consulted
- Redis Streams documentation: https://redis.io/docs/data-types/streams/
- Redis XADD command reference: https://redis.io/commands/xadd/
- Redis XTRIM command reference: https://redis.io/commands/xtrim/
- Redis MEMORY USAGE command reference: https://redis.io/commands/memory-usage/
- Redis stream-node-max-entries configuration: https://redis.io/docs/management/config/
- Redis internals: radix tree and listpack encoding for streams

## Issues Found

1. **Incorrect expected output in Python script comment (line 95, 105)**:
   - The inline comment describing the function call said "4 fields of 15 bytes each" but the actual arguments specify `avg_field_name_bytes=10` and `avg_field_value_bytes=15` (25 bytes per field, not 15). Fixed to: "4 fields (10-byte names, 15-byte values)".
   - The expected output comment showed `'bytes_per_stream': 1123600` but the correct result is `1123664` (64 + 100*32 + 10000*112 + 2*200 = 1,123,664).
   - The expected output showed `'total_mb': 1071.7` but the correct result is `1071.6`.
   - The expected output was missing the `total_gb` key that the function actually returns. Added `'total_gb': 1.046`.

## Review Notes
- The memory overhead numbers (64 bytes radix tree, 32 bytes per node, 12 bytes per entry) are reasonable approximations for capacity planning but will vary by Redis version and exact entry contents. The post appropriately frames these as approximates with `~`.
- The post references "listpack nodes" which is correct for Redis 7.0+. Prior to 7.0, streams used ziplist encoding internally. Since the post doesn't target a specific version, this is acceptable for modern Redis.
- The `stream-node-max-entries` default of 100 is correct across Redis versions.
- All Redis CLI commands (XADD, XTRIM, XLEN, MEMORY USAGE, CONFIG GET) use correct syntax.
- The approximate trimming (`~`) explanation is accurate.
- The Streams vs Lists comparison is a rough approximation; real-world results will vary depending on entry structure, but the general claim is reasonable.
