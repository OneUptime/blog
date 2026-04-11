# Validation Summary: How to Use UNLINK Instead of DEL for Large Keys in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (UNLINK, DEL, HSCAN, HDEL, MEMORY USAGE, HLEN, LLEN, SCARD, ZCARD, INFO)
- Redis configuration (lazyfree options)
- Python redis client library
- Node.js ioredis client library
- Bash scripting for incremental key deletion

## Sources Consulted
- Redis UNLINK command documentation: https://redis.io/docs/latest/commands/unlink/
- Redis DEL command documentation: https://redis.io/docs/latest/commands/del/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis HSCAN command documentation: https://redis.io/docs/latest/commands/hscan/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis configuration documentation (lazyfree settings): https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- redis-py (Python Redis client) source code for `unlink` method
- ioredis (Node.js Redis client) source code for `unlink` command support

## Issues Found

### 1. Incorrect INFO section for lazyfree stats
- **What was wrong:** The post used `redis-cli INFO memory | grep lazyfree` to check lazyfree statistics. The `lazyfree_pending_objects` and `lazyfreed_objects` fields are in the Redis `stats` section, not the `memory` section. Running `INFO memory` and grepping for lazyfree would return no results.
- **What was changed:** Changed `INFO memory` to `INFO stats`.
- **Why:** The `stats` section of the Redis INFO output is where lazyfree counters are reported. Using `INFO memory` would produce empty output, making the example non-functional.

### 2. HSCAN script passes both field names and values to HDEL
- **What was wrong:** The incremental deletion script used `tail -n +2 | grep -v '^$'` to extract fields from HSCAN output. HSCAN returns alternating field-name/field-value pairs, so this captured both names and values. Passing values to HDEL as if they were field names is incorrect — HDEL silently ignores non-existent fields, so the script would "work" but wastes commands on non-existent field names.
- **What was changed:** Changed `tail -n +2 | grep -v '^$'` to `tail -n +2 | awk 'NR % 2 == 1'` to extract only odd-numbered lines (field names) from the HSCAN output.
- **Why:** HSCAN output after the cursor line alternates between field names (odd lines) and their values (even lines). Only field names should be passed to HDEL.

## Review Notes
- The lazyfree config section lists the four original lazyfree options. Redis 6.0+ added `lazyfree-lazy-user-del` (makes DEL behave like UNLINK) and Redis 6.2+ added `lazyfree-lazy-user-flush`. These are not mentioned but their omission is not an error — the post focuses on the original four server-side options.
- The `lazyfreed_objects` stat was added in a more recent Redis version (7.2+). Older Redis versions only report `lazyfree_pending_objects`. The post does not specify version requirements for this field.
- All code examples (Python redis-py and Node.js ioredis) are syntactically correct and use valid APIs.
- All Redis commands and their described behaviors are accurate per official documentation.
