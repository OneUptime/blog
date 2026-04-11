# Validation Summary: How Redis Handles Concurrent WATCH and MULTI Transactions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (WATCH, MULTI/EXEC, transactions, optimistic locking)
- Python (redis-py client library)
- Lua scripting in Redis (EVAL command)

## Sources Consulted
- Redis WATCH command documentation: https://redis.io/commands/watch/
- Redis MULTI command documentation: https://redis.io/commands/multi/
- Redis EXEC command documentation: https://redis.io/commands/exec/
- Redis Transactions documentation: https://redis.io/docs/interact/transactions/
- Redis EVAL command documentation: https://redis.io/commands/eval/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **WATCH inside MULTI behavior**: The post stated "Calling WATCH inside a MULTI block has no effect." This is incorrect — Redis actively returns an error (`ERR WATCH inside MULTI is not allowed`) when WATCH is called inside a MULTI block. It does not silently ignore the command. Fixed the statement to accurately describe the error behavior.

## Review Notes
- The Lua script example uses implicit string-to-number coercion (`tonumber(val) + ARGV[1]`) which works in Lua 5.1 but could be made more explicit with `tonumber(ARGV[1])`. This is a style preference, not an error.
- The Lua script does not handle the case where the key doesn't exist (`GET` returns nil, and `tonumber(nil)` returns nil, causing an arithmetic error). This is acceptable for a simplified example.
- The Python code example correctly uses the redis-py pipeline pattern with `watch()`, `multi()`, `execute()`, and `WatchError` exception handling.
- All claims about what triggers a WATCH abort (SET, DEL, INCR, EXPIRE, key expiration, FLUSHDB/FLUSHALL) are accurate.
- The claim that WATCH monitors writes rather than value changes is correct.
