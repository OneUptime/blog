# Validation Summary: How to Connect Redis with Ruby using redis-rb

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server)
- Ruby
- redis-rb gem (v5.x)
- connection_pool gem
- Redis Sentinel
- Redis Pub/Sub
- Redis Lua scripting
- Rails integration

## Sources Consulted
- redis-rb official documentation: https://rubydoc.info/gems/redis/Redis
- redis-rb GitHub repository: https://github.com/redis/redis-rb
- Redis::Commands::Strings (setnx return type): https://www.rubydoc.info/github/redis/redis-rb/Redis/Commands/Strings
- Redis::Commands::SortedSets (zrevrange options): https://rubydoc.info/gems/redis/Redis/Commands/SortedSets
- Redis#watch method documentation: https://www.rubydoc.info/github/redis/redis-rb/Redis:watch
- connection_pool gem: https://github.com/mperham/connection_pool
- Ruby language semantics for `break` inside nested blocks

## Issues Found

1. **`setnx` returns boolean, not integer (line 96):**
   - **What was wrong:** The code compared `acquired == 1` after calling `redis.setnx`. In redis-rb, `setnx` returns `true`/`false` (boolean), not `1`/`0` (integer). The condition `acquired == 1` would never be true, so the `expire` call would never execute, resulting in a lock without a TTL.
   - **What was changed:** Changed `if acquired == 1` to `if acquired`.
   - **Why:** redis-rb converts the Redis protocol integer response to a Ruby boolean for `setnx`.

2. **`break` inside `watch` block does not exit the outer `loop` (lines 182-197):**
   - **What was wrong:** The `break if result` statement was inside the `redis.watch` block, which is nested inside a `loop` block. In Ruby, `break` inside a block passed to a regular method (like `redis.watch`) causes that method to return — it does not exit the enclosing `loop`. This meant the loop would never terminate, even on a successful transaction.
   - **What was changed:** Moved the `redis.multi` call to be the last expression in the `watch` block (so its return value becomes the block's return value), captured the `watch` block's return value in `result` at the loop level, and moved `break if result` outside the `watch` block to properly exit the loop.
   - **Why:** `redis.watch` with a block returns the block's return value. By capturing this at the loop level, `break if result` correctly exits the `loop` on success (when `multi` returns an array of results) and continues the loop on WATCH failure (when `multi` returns `nil`).

## Review Notes
- `ZREVRANGE` was deprecated in Redis 6.2 in favor of `ZRANGE ... REV`. The redis-rb gem still supports the `zrevrange` method for backward compatibility, but future versions of the gem or Redis server may remove it. Authors may want to update to `zrange('leaderboard', 0, 2, rev: true, with_scores: true)` in a future revision.
- The `setnx` + `expire` pattern for locks is inherently non-atomic. A crash between the two calls leaves a lock without a TTL. The post could mention `redis.set('lock:resource', '1', nx: true, ex: 30)` as the atomic alternative, but this is a design choice rather than a correctness error.
- The Pub/Sub example uses `sleep 0.1` to wait for the subscriber thread to connect, which is a race condition in practice. This is acceptable for a tutorial example but worth noting.
