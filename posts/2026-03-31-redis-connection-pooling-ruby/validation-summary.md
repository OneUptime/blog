# Validation Summary: How to Use Redis Connection Pooling in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-rb gem, ~> 5.0)
- Ruby
- connection_pool gem (~> 2.4)
- Puma web server
- Sidekiq background job processor
- Ruby on Rails (initializer pattern)

## Sources Consulted
- redis-rb GitHub repository README and source code (Monitor-based thread safety in 5.x) — https://github.com/redis/redis-rb
- connection_pool gem GitHub repository README and source code — https://github.com/mperham/connection_pool
- Puma documentation on clustered mode and forked worker processes — https://github.com/puma/puma
- Heroku Dev Center: Deploying Rails Applications with the Puma Web Server — https://devcenter.heroku.com/articles/deploying-rails-applications-with-the-puma-web-server
- Heroku Dev Center: Concurrency and Database Connections in Ruby with ActiveRecord — https://devcenter.heroku.com/articles/concurrency-and-database-connections
- Sidekiq 7.x configuration API and Sidekiq::Config class — https://github.com/sidekiq/sidekiq

## Issues Found

### 1. Incorrect thread-safety claim (intro paragraph)
- **What was wrong:** The post stated that sharing a single Redis instance is "unsafe because TCP connections are not thread-safe." In redis-rb 5.x, each `Redis` instance is thread-safe — the underlying connection is protected by a `Monitor` (reentrant mutex). The real issue is performance: only one thread can use the connection at a time, creating a bottleneck.
- **What was changed:** Rewrote the intro to correctly explain that redis-rb 5.x is thread-safe via a mutex, and that connection pooling is needed for concurrent throughput, not for safety.
- **Why:** The original statement would mislead readers into thinking shared Redis access causes data corruption or protocol errors, which is not the case in redis-rb 5.x.

### 2. Incorrect Puma pool sizing advice (Sizing the Pool section)
- **What was wrong:** The post said "If Puma runs 5 threads per worker and you have 3 workers, use `size: 15`." Since each Puma worker is a forked process with its own memory space, each worker gets its own independent connection pool. Setting `size: 15` per worker would allocate up to 45 total connections (15 per worker x 3 workers), not the intended 15.
- **What was changed:** Corrected to `size: 5` and explained that each forked worker gets its own pool, so 3 workers with `size: 5` results in up to 15 total connections to Redis.
- **Why:** The original advice would cause over-provisioning of Redis connections by a factor of 3x.

### 3. Fragile Sidekiq concurrency API usage (Sizing the Pool section)
- **What was wrong:** The code used `Sidekiq.default_configuration[:concurrency] rescue 10`. While `Sidekiq.default_configuration` exists in Sidekiq 7.x, hash-style access `[:concurrency]` is not the documented public API. The `rescue 10` fallback masked the fragility.
- **What was changed:** Replaced with `Sidekiq.default_configuration.concurrency`, which is the documented accessor on `Sidekiq::Config` and does not need a rescue clause.
- **Why:** Using the documented public API is more reliable and idiomatic.

## Review Notes
- The post uses `setex(key, seconds, value)` which works in redis-rb 5.x, but the modern idiomatic approach is `set(key, value, ex: seconds)`. Not changed since `setex` is still a valid, supported method.
- The post specifies `gem 'connection_pool', '~> 2.4'`. The latest major version is 3.x (requires Ruby >= 3.2). The 2.4 constraint is a reasonable conservative choice and the code uses keyword arguments that are compatible with both versions.
- The `ConnectionPool::TimeoutError`, `#size`, `#available`, and `#with(timeout:)` APIs were all verified as correct.
