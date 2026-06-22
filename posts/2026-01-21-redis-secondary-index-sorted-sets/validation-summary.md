# Validation Summary: How to Build a Secondary Index with Redis Sorted Sets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Sorted Sets, Sets, Hashes, Strings, and geospatial commands
- Redis CLI commands
- Python with redis-py
- Node.js with node-redis
- Secondary indexing patterns

## Sources Consulted
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis GEORADIUS command documentation: https://redis.io/docs/latest/commands/georadius/
- Redis GEOSEARCH command documentation: https://redis.io/docs/latest/commands/geosearch/
- Redis GEOADD command documentation: https://redis.io/docs/latest/commands/geoadd/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- node-redis guide: https://redis.io/docs/latest/develop/clients/nodejs/
- node-redis sendCommand documentation: https://github.com/redis/node-redis/blob/master/docs/clustering.md

## Issues Found
- The post used `ZRANGEBYSCORE` and `ZREVRANGEBYSCORE` examples for new code. Redis marks these commands deprecated as of Redis 6.2. Updated CLI and code examples to use `ZRANGE ... BYSCORE` with `REV` where needed.
- The post referenced `ZRANGEBYLEX` for lexicographic lookup. Updated the explanation and Python prefix lookup to use `ZRANGE ... BYLEX`.
- The Node.js descending range query passed `REV` through a `zRangeByScore` call, which does not map to valid `ZRANGEBYSCORE` syntax. Replaced score range reads with `sendCommand()` calls that issue valid `ZRANGE ... BYSCORE` commands.
- The geospatial example used `GEORADIUS`, which Redis marks deprecated as of Redis 6.2. Replaced it with redis-py's `geosearch()` API.
- The sorted-set performance bullet oversimplified all operations as O(log N). Updated it to distinguish write/remove complexity from range read complexity.
- The index maintenance snippet did not update string indexes and did not correctly handle list-valued tag fields during updates. Added string index maintenance and list-aware tag removal/addition.

## Review Notes
- The examples are educational secondary-index patterns, not a complete production indexing framework. Future improvements could include conflict handling for supposedly unique string indexes, stale-key cleanup during full index rebuilds, and parsing JSON-encoded hash values before rebuilding tag indexes.
- Python and JavaScript code blocks were syntax-checked after edits. Runtime integration was not executed because no Redis server or client dependencies were available in the workspace.
