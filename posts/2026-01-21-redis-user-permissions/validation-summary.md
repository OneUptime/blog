# Validation Summary: How to Store User Permissions in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis sets, TTLs, SCAN, Pub/Sub, and Lua scripting
- redis-py
- ioredis
- Express.js middleware
- RBAC and permission caching patterns

## Sources Consulted
- Redis SADD command documentation: https://redis.io/docs/latest/commands/sadd/
- Redis SMEMBERS command documentation: https://redis.io/docs/latest/commands/smembers/
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis API documentation: https://redis.github.io/ioredis/classes/Redis.html
- Express 5.x API documentation: https://expressjs.com/en/api/

## Issues Found
- The basic Python invalidation example used Redis `KEYS` in application code. Redis documents `KEYS` as a command that should be used with extreme care in production and recommends `SCAN` or sets for keyspace lookup. Changed the example to use `scan_iter`.
- The RBAC `define_role` method only deleted the parent-role set when new parent roles were provided. Redefining a role without parents after it previously had parents would leave stale inherited permissions. Changed it to always delete the parent key before optionally adding new parents.
- Resource-level permission tracking set a TTL on the per-resource permission key but not on the user's resource list or sharing set. This could leave stale resource or collaborator listings after permission keys expired. Added matching `expire` calls for those tracking sets.
- The wildcard permission checker only honored the `'*'` superuser permission when the requested permission contained exactly one colon. That contradicted the "Admin can do anything" behavior. Moved the `'*'` check before parsing the permission string.
- Removed an unused `datetime` import from the first Python snippet.

## Review Notes
All Python fenced snippets parse successfully with Python 3.12, and all JavaScript fenced snippets pass `node --check` with Node.js 22. The examples remain illustrative rather than production-complete; large systems would still need stronger invalidation semantics for role hierarchy changes, cache stampede handling, and database-backed source-of-truth updates.
