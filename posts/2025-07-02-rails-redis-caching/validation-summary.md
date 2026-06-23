# Validation Summary: How to Use Redis for Caching in Rails

## Status
validated

## Post Type
Tutorial / Guide (in-depth, code-heavy implementation guide)

## Technologies Covered
- Ruby on Rails (ActiveSupport caching, ActionController, ActionDispatch session middleware)
- Redis (server, CLI, INFO/CONFIG, sorted sets, SCAN, MEMORY USAGE)
- redis-rb gem (`redis`, `~> 5.0`)
- `connection_pool` gem
- `hiredis-client` gem
- `redis-session-store` gem
- ActiveSupport::Cache::RedisCacheStore
- Redis Sentinel (high availability)
- Fragment / Russian Doll caching (ERB views)
- Sidekiq / ActiveJob (referenced)

## Sources Consulted
- Rails Caching with Rails: An Overview guide — https://guides.rubyonrails.org/caching_with_rails.html (redis_cache_store options: `pool`, `compress`, `compress_threshold`, `race_condition_ttl`, `error_handler`, `namespace`, `expires_in`, `reconnect_attempts`)
- ActiveSupport::Cache::RedisCacheStore API docs — https://api.rubyonrails.org/classes/ActiveSupport/Cache/RedisCacheStore.html (exposes `#redis`, `fetch_multi`, `read_multi`)
- redis-rb gem README and CHANGELOG (v5) — https://github.com/redis/redis-rb (`exists` returns Integer, `exists?` returns Boolean; `multi` block returns array of results; `scan` returns `[cursor, keys]`)
- redis-session-store gem README — https://github.com/roidrage/redis-session-store (`redis:` block with `url`, `key_prefix`, `expire_after`; `serializer`, `on_redis_down` options)
- Redis command reference — https://redis.io/commands/ (ZADD, ZCARD, ZREMRANGEBYSCORE, SCAN, MEMORY USAGE, CONFIG GET, INFO fields)
- Redis maxmemory / eviction policies — https://redis.io/docs/manual/eviction/ (`allkeys-lru`)

## Issues Found
- **`CacheDebugger#diagnose` — incorrect Boolean/Integer comparison.** The code called `exists = redis.exists?(full_key)` and then set `diagnosis[:exists] = exists == 1`. In redis-rb 5.x, `exists?` returns a Boolean (`true`/`false`), not an Integer count (`exists` returns the count). Comparing a Boolean to `1` always yields `false`, so the diagnostic would report every key as missing — including keys that actually exist, which is the exact opposite of the method's intent. Fixed by assigning the Boolean result directly (`diagnosis[:exists] = redis.exists?(full_key)`) and adding a brief comment noting that `exists` is the integer-returning variant.

## Review Notes
- The `redis.multi do |multi| ... end => results` pattern uses Ruby 3.0+ one-line (rightward) pattern-matching assignment combined with redis-rb 5's pipelined `multi` (which returns an array of per-command results). This is correct and `results[1]` correctly reads the `ZCARD` result. Valid, though it assumes Ruby >= 3.0.
- The `redis_cache_store` option set (`pool`, `compress`, `compress_threshold`, `race_condition_ttl`, `expires_in`, `reconnect_attempts`, `error_handler` with the `method:/returning:/exception:` keyword signature, Sentinel via `url:`/`sentinels:`/`role:`) all match current Rails documentation.
- The `hiredis-client`, `~> 0.18` constraint is permissive (`>= 0.18, < 1.0`), so it will still resolve to the latest 0.x release; not an error.
- The `redis-session-store` config includes `pool_size`/`pool_timeout` inside the `redis:` block. The core options (`url`, `key_prefix`, `expire_after`, `serializer`, `on_redis_down`) are accurate; pooling support varies by gem version but the extra keys are not harmful. Left as-is.
- Mermaid diagrams are illustrative. A couple use multi-word subgraph titles referenced directly in edges (e.g. `Redis Advantages --> Rails Integration`); some Mermaid renderers handle this loosely. These are presentational and do not affect technical accuracy, so they were left unchanged.
- `cache_key_with_version` is overridden in the `Product` model; this is valid (ActiveRecord defines it), and the manual `updated_at` inclusion is redundant-but-harmless given Rails' default cache versioning.
- All Redis INFO field names referenced (`used_memory_human`, `mem_fragmentation_ratio`, `keyspace_hits`, `keyspace_misses`, `maxmemory_human`, `maxmemory_policy`, `evicted_keys`, `connected_clients`, `blocked_clients`) are valid INFO output keys.
