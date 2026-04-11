# Validation Summary: How to Use COPY in Redis to Copy a Key

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (6.2+)
- Redis COPY command
- Redis key management (SET, GET, HSET, HGETALL, ZADD, ZRANGE, EXPIRE, TTL)
- Redis multi-database support (DB option)

## Sources Consulted
- Official Redis COPY command documentation: https://redis.io/docs/latest/commands/copy/
- Official Redis RESTORE command documentation: https://redis.io/docs/latest/commands/restore/
- Official Redis DUMP command documentation: https://redis.io/docs/latest/commands/dump/
- Redis source code (`src/db.c`, `copyCommand` and `keyMetaOnCopy` functions) for TTL behavior verification

## Issues Found

### Issue 1: Incorrect claim that COPY does not transfer TTL (Critical)
- **What was wrong:** The post stated "COPY does not transfer TTL" and showed an example where the copied key had `TTL` returning `-1` (no expiration). The summary also stated "Note that TTL is not copied to the destination."
- **What was changed:** Corrected the section title to "COPY preserves TTL", updated the example output to show the destination inheriting a TTL value close to the source's, and updated the explanatory text to state that the copy inherits the source's remaining TTL. The summary was updated to say "The destination key inherits the source's remaining TTL."
- **Why:** The Redis source code (`keyMetaOnCopy()` in `db.c`) confirms that COPY transfers the expiration metadata from source to destination. The destination key receives the same remaining TTL as the source at the time of the copy.

### Issue 2: DUMP+RESTORE comparison table row slightly inaccurate (Minor)
- **What was wrong:** The comparison table stated DUMP+RESTORE requires "Must not exist" for the destination, without noting that RESTORE supports a REPLACE option (available since Redis 3.0.0).
- **What was changed:** Updated to "Yes (unless REPLACE)" to be consistent with how the COPY row is described and to accurately reflect RESTORE's capabilities.
- **Why:** The RESTORE command has supported the REPLACE modifier since Redis 3.0.0, which allows overwriting an existing destination key.

## Review Notes
- The syntax, parameter descriptions, and all other code examples (basic COPY, COPY with REPLACE, hash copy, sorted set copy, cross-database copy) are technically correct.
- The mermaid flowchart accurately represents COPY behavior with and without REPLACE.
- The use cases described are practical and appropriate for the COPY command.
- The ZRANGE output correctly shows members sorted by score in ascending order with WITHSCORES format.
