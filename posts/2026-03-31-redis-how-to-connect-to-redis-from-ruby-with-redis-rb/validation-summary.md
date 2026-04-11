# Validation Summary: How to Connect to Redis from Ruby with redis-rb

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (in-memory data store)
- Ruby (programming language)
- redis-rb gem (Ruby Redis client, versions 4.x/5.x)

## Sources Consulted
- redis-rb gem source code on GitHub (https://github.com/redis/redis-rb) — method signatures in `lib/redis/commands/lists.rb`, `lib/redis/commands/sets.rb`, `lib/redis/commands/sorted_sets.rb`, `lib/redis/commands/strings.rb`, `lib/redis/commands/hashes.rb`
- Redis official command reference (https://redis.io/commands/)

## Issues Found
1. **`rpush` called with variadic arguments instead of array** (line 127): `redis.rpush('tasks', 'task:1', 'task:2', 'task:3')` would raise `ArgumentError: wrong number of arguments (given 4, expected 2)`. The `rpush` method signature is `rpush(key, value)` where `value` must be a single String or an Array of Strings. Fixed to `redis.rpush('tasks', ['task:1', 'task:2', 'task:3'])`.

## Review Notes
- The `require 'json'` in the Hash Operations section is imported but never used. Not a bug, but unnecessary.
- `zrevrange` and `zrangebyscore` are still present in redis-rb but the underlying Redis server commands were deprecated in Redis 6.2 in favor of `ZRANGE ... REV` and `ZRANGE ... BYSCORE` respectively. The gem still supports them for backward compatibility.
- `setex` is similarly a legacy command; the modern equivalent is `set` with the `ex:` option (which the post also demonstrates). Both forms are correct.
- The `sadd` method uses `*members` (splat) in redis-rb, so the variadic calls in the post (e.g., `redis.sadd('key', 'a', 'b', 'c')`) are valid. This differs from `rpush`/`lpush` which use a fixed 2-argument signature.
- The pipelining example uses the block parameter form (`|pipe|`) which is the correct modern pattern for redis-rb 5.x. In redis-rb 4.x, calling methods directly on the `redis` object inside the block also worked.
