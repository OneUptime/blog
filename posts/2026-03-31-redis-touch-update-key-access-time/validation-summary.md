# Validation Summary: How to Use TOUCH in Redis to Update Key Access Time

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (TOUCH command, available since 3.2.1)
- Redis LRU eviction policies (allkeys-lru, volatile-lru)
- Redis CLI (--pipe mode)
- OBJECT IDLETIME command

## Sources Consulted
- Redis TOUCH command documentation — https://redis.io/docs/latest/commands/touch/
- Redis OBJECT IDLETIME command documentation — https://redis.io/docs/latest/commands/object-idletime/
- Redis GET command documentation — https://redis.io/docs/latest/commands/get/
- Redis key eviction reference — https://redis.io/docs/latest/develop/reference/eviction/
- Redis CLI documentation — https://redis.io/docs/latest/develop/tools/cli/
- Redis pipelining documentation — https://redis.io/docs/latest/develop/using-commands/pipelining/

## Issues Found
No technical issues found.

## Review Notes
- The `redis-cli --pipe` example works because the Redis server accepts inline command format, though `--pipe` mode is more commonly used with RESP protocol for mass insertion. This is a minor stylistic choice, not an error.
- The OBJECT IDLETIME example correctly demonstrates the access time reset pattern. Notably, OBJECT IDLETIME itself does not update the LRU clock (it uses the LOOKUP_NOTOUCH flag internally), which is why it can be used to observe idle time without side effects.
- Both GET and TOUCH do update the LRU clock — this is fundamental to Redis's LRU eviction. The `lookupKey()` function updates the access time on every key access unless explicitly bypassed with NOTOUCH flags.
- A single `TOUCH key1 key2 key3` call (already shown in Basic Usage) is more efficient than pipelining individual TOUCH commands, since it avoids per-command overhead entirely.
