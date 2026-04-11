# Validation Summary: How to Use Redis with Actix-Web in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Actix-Web 4
- Redis (via redis-rs crate 0.25)
- deadpool-redis 0.15 (async connection pooling)
- Tokio async runtime
- serde / serde_json for serialization

## Sources Consulted
- deadpool-redis Config docs: https://docs.rs/deadpool-redis/latest/deadpool_redis/struct.Config.html
- redis-rs AsyncCommands trait docs: https://docs.rs/redis/latest/redis/trait.AsyncCommands.html
- actix-web middleware docs: https://docs.rs/actix-web/latest/actix_web/middleware/index.html
- actix-web ServiceRequest docs: https://docs.rs/actix-web/latest/actix_web/dev/struct.ServiceRequest.html
- actix-web from_fn middleware docs: https://docs.rs/actix-web/latest/actix_web/middleware/fn.from_fn.html

## Issues Found

### 1. Missing imports in rate limiting middleware code block
- **What was wrong:** The rate limiting middleware code block used `web::Data<Pool>`, `conn.incr()`, and `conn.expire()` without importing `actix_web::web`, `deadpool_redis::Pool`, or `redis::AsyncCommands`. The code would not compile as written.
- **What was changed:** Added `use actix_web::web;` (merged into existing actix_web import), `use deadpool_redis::Pool;`, and `use redis::AsyncCommands;` to the imports.

### 2. Rate limiter key included client port number
- **What was wrong:** `req.peer_addr().map(|a| a.to_string())` converts the full `SocketAddr` (IP:port) to a string. Since each TCP connection uses a different ephemeral port, the rate limiter would create separate counters per connection rather than per IP address, making it ineffective.
- **What was changed:** Changed `a.to_string()` to `a.ip().to_string()` to extract only the IP address for the rate limit key.

## Review Notes
- The dependency versions (deadpool-redis 0.15, redis 0.25) are older but the APIs shown are correct for those versions. Current versions are deadpool-redis 0.23+ and redis 1.x. The code should work with the specified versions.
- The `from_fn` middleware registration pattern (e.g., `.wrap(middleware::from_fn(rate_limit))`) is not shown in the main app setup, but this is acceptable as the middleware section demonstrates the implementation pattern.
- Error handling in handlers uses `.unwrap()` in several places (e.g., `pool.get().await.unwrap()`), which would panic on Redis connection failures. Production code should handle these errors gracefully. This is acceptable for a tutorial.
