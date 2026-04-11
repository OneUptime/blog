# Validation Summary: How to Use CLIENT NO-EVICT in Redis to Protect Connections

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (7.0+)
- Python (redis-py library)
- Node.js (node-redis library)

## Sources Consulted
- Redis official documentation for CLIENT NO-EVICT: https://redis.io/docs/latest/commands/client-no-evict/
- Redis official documentation for CLIENT LIST (flag definitions): https://redis.io/docs/latest/commands/client-list/
- Redis official documentation for CLIENT NO-TOUCH: https://redis.io/docs/latest/commands/client-no-touch/
- Redis official documentation for MEMORY DOCTOR: https://redis.io/docs/latest/commands/memory-doctor/
- redis-py source code (redis/commands/core.py): https://github.com/redis/redis-py
- node-redis source code (CLIENT_NO-EVICT.ts): https://github.com/redis/node-redis

## Issues Found

### Issue 1: Incorrect CLIENT LIST flag for no-evict
- **What was wrong:** The post stated that the `N` flag in CLIENT LIST/CLIENT INFO output indicates no-evict is set (`flags=N`). In reality, `N` means "no specific flag set" (the default). The correct flag for a client excluded from eviction is `e`.
- **What was changed:** Updated the CLIENT INFO and CLIENT LIST example output from `flags=N` to `flags=e`, and changed the parenthetical explanation to "(e indicates the client is excluded from eviction)".
- **Why:** Per the official CLIENT LIST documentation, `e` is the flag meaning "the client is excluded from the client eviction mechanism."

### Issue 2: Node.js clientNoEvict() takes a boolean, not a string
- **What was wrong:** The Node.js example used `client.clientNoEvict('ON')` and `client.clientNoEvict('OFF')` with string arguments. The node-redis library's `clientNoEvict()` method accepts a boolean (`true`/`false`), not a string.
- **What was changed:** Updated `clientNoEvict('ON')` to `clientNoEvict(true)` and `clientNoEvict('OFF')` to `clientNoEvict(false)`.
- **Why:** Per the node-redis source code (`CLIENT_NO-EVICT.ts`), the `parseCommand` function signature is `parseCommand(parser: CommandParser, value: boolean)`.

## Review Notes
- CLIENT NO-TOUCH was introduced in Redis 7.2.0, not 7.0 like CLIENT NO-EVICT. The blog post does not explicitly claim they were introduced together, so no change was needed, but readers should be aware of the version difference.
- The Python redis-py `client_no_evict()` method correctly takes a string argument ('ON'/'OFF'), which the post uses correctly.
- All other Redis commands, configuration options, and technical explanations were verified as accurate.
