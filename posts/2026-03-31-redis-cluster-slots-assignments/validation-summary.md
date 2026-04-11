# Validation Summary: How to Use CLUSTER SLOTS in Redis to Get Slot Assignments

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis Cluster
- CLUSTER SLOTS command
- CLUSTER SHARDS command (Redis 7.0+)
- CLUSTER KEYSLOT command
- redis-py (Python Redis client)

## Sources Consulted
- Redis official documentation for CLUSTER SLOTS: https://redis.io/commands/cluster-slots/
- Redis official documentation for CLUSTER SHARDS: https://redis.io/commands/cluster-shards/
- Redis official documentation for CLUSTER KEYSLOT: https://redis.io/commands/cluster-keyslot/
- Redis Cluster specification (slot ranges, 16384 hash slots): https://redis.io/docs/reference/cluster-spec/
- redis-py documentation for execute_command: https://redis-py.readthedocs.io/

## Issues Found

1. **Unused `redis-cli` pipe in scripting example**: The bash script piped `redis-cli -p 7001 CLUSTER SLOTS` output into `python3`, but the Python code ignored stdin entirely and created its own Redis connection via `redis-py`. Removed the unused `redis-cli` pipe so the script runs Python directly.

2. **Invalid `redis-py` API call**: `r.cluster('SLOTS')` is not a valid method in `redis-py`. Changed to `r.execute_command('CLUSTER', 'SLOTS')`, which is the correct way to issue arbitrary Redis commands via the redis-py client.

3. **Unused `import sys`**: Removed the unused `sys` import from the Python script.

## Review Notes
- The sample node IDs in the output examples contain non-hexadecimal characters (e.g., g, h, j, k) and some are 38 characters instead of the standard 40-character hex format used by Redis. Since these are clearly illustrative placeholders and the post does not claim they are real IDs, this was left as-is.
- The slot ranges in the sample output (0-5460, 5461-10922, 10923-16383) correctly cover all 16384 Redis Cluster hash slots.
- The deprecation notice for CLUSTER SLOTS in Redis 7.0 and the recommendation to use CLUSTER SHARDS are accurate.
- The comparison table between CLUSTER SLOTS and CLUSTER SHARDS is accurate (CLUSTER SLOTS available since Redis 3.0, CLUSTER SHARDS since 7.0).
- The mermaid flowchart correctly depicts the client-side routing table lifecycle including MOVED response handling.
