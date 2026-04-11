# Validation Summary: How to Use Redis with Hanami in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ruby
- Hanami 2.x (web framework)
- Redis (via the `redis` gem)
- ConnectionPool (`connection_pool` gem)
- Sidekiq (background jobs)

## Sources Consulted
- Hanami 2.x Guides — Providers and Dependency Injection: https://guides.hanamirb.org/v2.1/app/providers/
- dry-auto_inject documentation (powers Hanami's `Deps` mixin): https://dry-rb.org/gems/dry-auto_inject/
- redis-rb gem changelog and API docs: https://github.com/redis/redis-rb
- ConnectionPool gem documentation: https://github.com/mperham/connection_pool
- Sidekiq configuration docs: https://github.com/sidekiq/sidekiq/wiki/Using-Redis

## Issues Found

### 1. Incorrect dependency injection accessor name (line 61)
- **What was wrong:** `include Deps['redis.pool']` generates an accessor method named `pool` (the last segment after the dot), but the code referenced `redis_pool` on lines 65 and 75. This would raise a `NoMethodError` at runtime.
- **What was changed:** Updated to `include Deps[redis_pool: 'redis.pool']`, which uses dry-auto_inject's alias syntax to explicitly map the container key `redis.pool` to the method name `redis_pool`.
- **Why:** Hanami's `Deps` mixin (built on dry-auto_inject) derives accessor names from the last segment of a dot-separated key. To use a custom accessor name, the alias hash syntax is required.

### 2. Deprecated `setex` command (line 75)
- **What was wrong:** The code used `r.setex(cache_key, 120, json)`, which has been deprecated in the `redis` gem since version 5.0 (released 2022).
- **What was changed:** Updated to `r.set(cache_key, json, ex: 120)`, which uses the current API with the `ex:` keyword argument.
- **Why:** The `redis` gem 5.0+ deprecated single-purpose commands like `setex`, `setnx`, and `psetex` in favor of the unified `set` command with keyword arguments.

## Review Notes
- The rate limiting example uses two separate Redis commands (`INCR` then `EXPIRE`) which has a minor race condition — if the process crashes between the two calls, the key could persist without a TTL. A Lua script or `MULTI`/`EXEC` block would be more robust, but this is acceptable for a tutorial example.
- The Sidekiq provider hardcodes port 6379 in the URL while the Redis provider reads from `REDIS_PORT`. This is an inconsistency but not a technical error.
- The Sidekiq provider does not pass `REDIS_PASSWORD`, so it would fail to connect if Redis requires authentication. Again, a completeness concern rather than a correctness error.
