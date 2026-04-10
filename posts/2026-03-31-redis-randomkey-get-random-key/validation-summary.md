# Validation Summary: How to Use RANDOMKEY in Redis to Get a Random Key

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (RANDOMKEY command)
- Bash scripting (redis-cli usage)
- Mermaid diagrams (flowchart)

## Sources Consulted
- Official Redis RANDOMKEY documentation: https://redis.io/docs/latest/commands/randomkey/
- Redis key expiration behavior documentation: https://redis.io/docs/latest/develop/use/keyspace/
- Redis HSET, LPUSH, SET, ZRANGE command documentation for syntax verification

## Issues Found
1. **Expired keys section wording (line 117)**: The original text stated "RANDOMKEY may return a key that has just expired but has not yet been evicted," implying RANDOMKEY does not check for expiry. In modern Redis, RANDOMKEY internally checks whether a randomly selected key is expired and retries if so. The real concern is a race condition: RANDOMKEY returns a valid key that then expires before the client's next command reaches the server. Fixed the wording to describe the race condition accurately while preserving the same practical advice.

2. **Shell script comment (line 95)**: The comment said "show their type and size" but the script only displays the key name and type, not size. Fixed the comment to say "show their type."

## Review Notes
- The official Redis docs list RANDOMKEY complexity as O(1) without qualification. The blog's characterization as "O(1) average complexity" with a note about retries for expired keys is a reasonable and more informative description of the actual implementation behavior.
- The ZRANGE syntax with WITHSCORES used in the mermaid diagram is the modern syntax available since Redis 6.2+. This is correct for current Redis versions.
- Multi-field HSET (used in examples) requires Redis 4.0+. This is correct for current Redis versions.
- On Redis replicas, expired keys may not be lazily deleted by RANDOMKEY (only the master performs lazy deletion). The blog does not mention this replica-specific edge case, which is acceptable for a general tutorial.
