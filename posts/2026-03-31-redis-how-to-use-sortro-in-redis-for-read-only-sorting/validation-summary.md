# Validation Summary: How to Use SORT_RO in Redis for Read-Only Sorting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (7.0+)
- Redis SORT_RO command
- Redis SORT command (for comparison)
- Python redis-py client library

## Sources Consulted
- Redis official documentation for SORT_RO: https://redis.io/commands/sort_ro/
- Redis official documentation for SORT: https://redis.io/commands/sort/
- redis-py documentation for sort_ro method: https://redis-py.readthedocs.io/

## Issues Found
- **Incorrect claim about sorted set support**: In the "Sorting a Set" section, the original text stated "`SORT_RO` works on regular sets (not sorted sets) by treating the members as sortable values." This was misleading because `SORT_RO` does work on sorted sets — the Redis documentation explicitly states it operates on lists, sets, and sorted sets. The post's own description at the top correctly mentions sorted sets. Fixed the sentence to clarify that the example uses a regular set, without implying SORT_RO cannot be used on sorted sets.

## Review Notes
- The comparison table states SORT is "not safe on replicas." This is a simplification — SORT without STORE is technically read-only and works on replicas, but SORT_RO is explicitly flagged as read-only in Redis's command table, making it unambiguously safe. The simplification is acceptable for tutorial purposes.
- The Python example correctly uses `sort_ro()` from redis-py, which was added alongside Redis 7.0 support.
- All CLI examples use correct Redis command syntax and produce accurate expected outputs.
