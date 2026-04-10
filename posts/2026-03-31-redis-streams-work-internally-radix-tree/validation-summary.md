# Validation Summary: How Redis Streams Work Internally (Radix Tree)

## Status
validated

## Post Type
Technical deep-dive / Internals explainer

## Technologies Covered
- Redis Streams
- Redis radix tree (rax) data structure
- Listpack encoding
- redis-py (Python Redis client)
- Redis CLI commands (XADD, XINFO, XTRIM, CONFIG GET)

## Sources Consulted
- Official Redis XADD documentation: https://redis.io/docs/latest/commands/xadd/
- Official Redis XINFO STREAM documentation: https://redis.io/docs/latest/commands/xinfo-stream/
- Official Redis XTRIM documentation: https://redis.io/docs/latest/commands/xtrim/
- Official Redis LRANGE documentation: https://redis.io/docs/latest/commands/lrange/
- Redis Streams internals (source code analysis): https://github.com/redis/redis/blob/unstable/src/t_stream.c
- Redis Internals - Streams: https://github.com/zpoint/Redis-Internals/blob/5.0/Object/streams/streams.md
- redis-py source and documentation: https://github.com/redis/redis-py

## Issues Found

1. **Radix tree key is the full stream ID, not just the millisecond timestamp.** The post stated "The millisecond timestamp is the key into the radix tree." In reality, the full 128-bit stream ID (milliseconds + sequence number) is encoded in big-endian as the radix tree key. Fixed to explain the full ID encoding and prefix compression.

2. **Entries are not grouped by shared millisecond timestamp.** The post claimed "Multiple entries with the same millisecond share the same radix tree node and are packed into one listpack" and "Each listpack macro-node stores a batch of entries that share the same millisecond timestamp." This is incorrect. Entries are packed into listpack nodes sequentially regardless of timestamp, bounded by `stream-node-max-bytes` and `stream-node-max-entries`. Entries with different millisecond timestamps routinely coexist in the same listpack node. Fixed the text and the radix tree diagram to reflect the actual grouping mechanism.

3. **Diagram showed truncated millisecond-only keys.** The original diagram used keys like `[1711880000]` (10-digit, suggesting millisecond-only grouping). Updated to show full stream IDs like `[1711880000000-0]` and entries from different milliseconds in the same listpack to accurately represent the structure.

4. **Redis List range query complexity was understated.** The comparison table listed Redis List range queries as O(N). The actual complexity of LRANGE is O(S+N), where S is the distance from the nearest end to the start offset. Fixed to O(S+N).

5. **Summary repeated the millisecond grouping misconception.** The summary stated entries share "the same millisecond timestamp" per block. Fixed to say "consecutive entries" and explain the prefix-sharing mechanism.

## Review Notes
- The memory-per-entry estimates in the comparison table (~50-100 bytes for streams, ~100-200 for lists, ~150-300 for sorted sets) are reasonable rough approximations but will vary significantly based on entry size and field count.
- The Python code example correctly uses redis-py APIs with hyphenated dictionary keys (e.g., `info["radix-tree-keys"]`), which matches the library's response parsing behavior.
- The `stream-node-max-bytes` (4096) and `stream-node-max-entries` (100) defaults are confirmed correct for Redis 7.x.
- The XTRIM `~` operator description is accurate — it allows trimming at listpack node boundaries for better performance.
