# Validation Summary: How to Use Redis for Rails Rate Limiting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Ruby on Rails
- rack-attack gem (Rack::Attack)
- Rack middleware
- Rails cache store (redis_cache_store)

## Sources Consulted
- rack-attack GitHub README and source code: https://github.com/rack/rack-attack
- rack-attack Fail2Ban / Allow2Ban source: https://github.com/rack/rack-attack/blob/main/lib/rack/attack/fail2ban.rb
- Rails ActiveSupport::Cache::RedisCacheStore API docs: https://api.rubyonrails.org/classes/ActiveSupport/Cache/RedisCacheStore.html
- Rails PR #33254 (expires_in support for increment/decrement): https://github.com/rails/rails/pull/33254

## Issues Found

### 1. Missing `Rack::Attack.` prefix on DSL method calls
**What was wrong:** The `throttle(...)` calls in the "Basic Throttle Rules" section and the `blocklist(...)` call in the "Blocking Repeated Failed Logins" section were called without the `Rack::Attack.` class prefix. These are class methods on `Rack::Attack` and will raise `NoMethodError` when called at the top level of an initializer file.
**What was changed:** Added `Rack::Attack.` prefix to all three `throttle(...)` calls and the `blocklist(...)` call.

### 2. Broken Allow2Ban + track pattern for brute-force blocking
**What was wrong:** The code used `Rack::Attack.track` to count login attempts and then tried to read `req.env["rack.attack.match_data"]` inside a `blocklist` with `Allow2Ban`. This cannot work because rack-attack evaluates blocklists *before* tracks (evaluation order: safelists -> blocklists -> throttles -> tracks). The track data is never populated when the blocklist runs.
**What was changed:** Replaced the entire track+Allow2Ban pattern with a single `Rack::Attack::Fail2Ban.filter` call inside the blocklist. The Fail2Ban block directly checks if the request is a POST to the login endpoint. After 20 such requests in 15 minutes, the IP is banned for 1 hour. This is the standard rack-attack pattern for brute-force protection.

### 3. Race condition in manual rate limiting
**What was wrong:** The code called `Rails.cache.write(key, count, expires_in: period) if count == 1` after `Rails.cache.increment(key, 1, expires_in: period)`. This creates a race condition: two concurrent requests could both call `increment` (getting 1 and 2), and then the first request's `write` overwrites the counter back to 1, losing the second request's increment. The `write` call is also unnecessary because `Rails.cache.increment` with `redis_cache_store` already handles TTL atomically via `INCRBY` + `EXPIRE NX` in a pipeline (Rails 6+).
**What was changed:** Removed the redundant `Rails.cache.write` line.

## Review Notes
- The `throttled_responder` API is correct for rack-attack 6.x. The older `throttled_response` (receiving an env hash) is deprecated.
- The manual rate limiting section notes "use Redis directly" but actually uses `Rails.cache`, which is an abstraction over Redis. This is not technically wrong (it does use Redis under the hood) but could be slightly misleading. Not changed since it's a minor stylistic point.
- The post assumes Rails 6+ for `expires_in` support in `increment` with `redis_cache_store`. This is not explicitly stated but is reasonable given current Rails versions.
