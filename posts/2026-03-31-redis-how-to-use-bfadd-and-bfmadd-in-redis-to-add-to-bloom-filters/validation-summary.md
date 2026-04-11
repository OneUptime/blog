# Validation Summary: How to Use BF.ADD and BF.MADD in Redis to Add to Bloom Filters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisBloom module
- BF.ADD, BF.MADD, BF.RESERVE commands
- Python (redis-py client)
- Node.js (node-redis client)
- Docker (Redis Stack)

## Sources Consulted
- Redis official documentation for BF.ADD: https://redis.io/commands/bf.add/
- Redis official documentation for BF.MADD: https://redis.io/commands/bf.madd/
- Redis official documentation for BF.RESERVE: https://redis.io/commands/bf.reserve/
- RedisBloom module documentation

## Issues Found
1. **Incorrect complexity claim in Overview**: The overview stated "Both commands are O(k) where k is the number of hash functions," which is only accurate for BF.ADD. BF.MADD is O(k * n) where n is the number of items being added. The post's own Performance Characteristics table correctly listed O(k * n) for BF.MADD, contradicting the overview. Fixed the overview to state the correct complexity for each command individually.

## Review Notes
- The deduplication pipeline example uses a variable named `already_seen` to hold the BF.ADD return value, which is slightly misleading since BF.ADD returns 1 for newly added and 0 for already present. However, the logic (`if already_seen == 0: skip`) is correct.
- The default auto-creation values (capacity=100, error_rate=0.01) are consistent with RedisBloom's known defaults, though the official command reference pages do not explicitly state them.
- Python and Node.js code examples use correct idiomatic approaches (`execute_command` for redis-py, `sendCommand` for node-redis v4+).
- BF.RESERVE parameter order (key, error_rate, capacity) is correct throughout all examples.
