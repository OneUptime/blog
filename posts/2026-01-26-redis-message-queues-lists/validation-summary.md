# Validation Summary: How to Build Message Queues with Redis Lists

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Lists
- Redis blocking list commands
- Redis sorted sets
- Redis Lua scripting
- redis-py
- Python
- Background workers and task queues

## Sources Consulted
- Redis Lists documentation: https://redis.io/docs/latest/develop/data-types/lists/
- Redis BRPOP command documentation: https://redis.io/docs/latest/commands/brpop/
- Redis BLMOVE command documentation: https://redis.io/docs/latest/commands/blmove/
- Redis RPOPLPUSH command documentation: https://redis.io/docs/latest/commands/rpoplpush/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The post used `RPOPLPUSH` / `BRPOPLPUSH` for new reliable queue code. Redis documents `RPOPLPUSH` as deprecated as of Redis 6.2.0 and recommends `LMOVE`; the blocking replacement is `BLMOVE`. Updated the description, section title, diagram, code, and conclusion to use `BLMOVE`.
- The Python examples used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated examples to import `timezone` and use `datetime.now(timezone.utc)`.
- The delayed queue Lua script used `ZRANGEBYSCORE`, which Redis documents as deprecated as of Redis 6.2.0. Updated it to `ZRANGE ... BYSCORE`.
- The reliable queue metadata update removed and re-added processing messages in two separate Redis commands, which could lose a message if a worker crashed between commands. Replaced that sequence with a Lua script so the update is atomic.
- The reliable queue failure path removed a processing message and requeued it with separate commands. Replaced that with a Lua script so requeueing is atomic.
- The priority queue wording implied strict priority in all cases. Clarified that priority is applied when multiple queues have messages ready, matching Redis `BRPOP` key-order behavior.
- Later Python snippets relied on imports from earlier snippets. Added the required imports to make the priority queue, delayed queue, and monitor snippets syntactically self-contained.
- The `peek()` comment said `LRANGE` returned messages from right to left. Adjusted the comment to describe the actual list-order behavior for the selected range.

## Review Notes
The Python snippets were syntax-checked after edits. Runtime execution against Redis was not performed because `redis-py` is not installed in the local environment.
