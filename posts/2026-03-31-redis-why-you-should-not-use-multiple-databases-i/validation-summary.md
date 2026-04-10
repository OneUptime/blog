# Validation Summary: Why You Should Not Use Multiple Databases in Redis

## Status
validated

## Post Type
Best Practice / Anti-Pattern Guide

## Technologies Covered
- Redis (SELECT, KEYS, COPY, MOVE, INFO keyspace, ACLs, Cluster mode)
- Node.js with ioredis client (keyPrefix, Cluster mode)
- Python with redis-py client
- redis-server CLI configuration

## Sources Consulted
- Redis SELECT command documentation: https://redis.io/docs/latest/commands/select/
- Redis COPY command documentation: https://redis.io/docs/latest/commands/copy/
- Redis MOVE command documentation: https://redis.io/docs/latest/commands/move/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- ioredis documentation for keyPrefix and Cluster options

## Issues Found

### Issue 1: Misleading ACL claim (Section 3)
- **What was wrong:** The heading "No Per-Database ACLs in Older Versions" and the text "Redis ACL rules in older versions applied at the instance level" implied that newer Redis versions have per-database ACLs. This is incorrect — Redis ACLs have always been per-instance in all versions, including Redis 7.x.
- **What was changed:** Updated the heading to "No Per-Database ACLs" (removing "in Older Versions") and revised the text to clarify that this is true across all Redis versions, including Redis 7.
- **Why:** The original wording could mislead readers into thinking upgrading Redis would give them per-database access control, which is not the case.

### Issue 2: Incorrect claim about cross-database operations (Section 4)
- **What was wrong:** The heading stated "Cross-Database Operations Are Impossible" and the text claimed "You cannot copy keys between databases without client-side workarounds." This is incorrect — Redis has `MOVE key db` (since Redis 1.0) and `COPY source destination [DB destination-db]` (since Redis 6.2) for moving/copying keys between databases.
- **What was changed:** Updated the heading to "Cross-Database Operations Are Limited" and revised the text and code example to acknowledge MOVE and COPY DB while noting that most other operations (Pub/Sub, Lua scripts, transactions) still don't work across database boundaries.
- **Why:** The original claim was factually wrong and could cause readers to implement unnecessary client-side workarounds when native commands exist.

## Review Notes
- The broader architectural advice in the post (preferring key namespacing or separate instances over SELECT) is sound and well-established in the Redis community.
- The ioredis `keyPrefix` example is correct and idiomatic.
- The Python wrapper class example is a reasonable pattern, though redis-py does not have a built-in keyPrefix equivalent like ioredis does.
- The `redis-server --maxmemory 4gb` syntax is valid — Redis accepts `kb`, `mb`, `gb` suffixes.
- The claim that KEYS * blocks the entire instance is correct since Redis uses single-threaded command processing, though the official docs phrase it as "may ruin performance" rather than explicitly saying "blocks."
