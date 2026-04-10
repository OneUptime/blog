# How to Use Redis with Rocket in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rocket, Rust

Description: Learn how to integrate Redis with the Rocket web framework in Rust for caching, session storage, and counters using the redis-rs crate with connection pooling.

---

Rocket is a web framework for Rust that prioritizes type safety and ease of use. Integrating Redis with Rocket using the `redis` crate and `r2d2-redis` connection pool enables caching, session storage, and rate limiting in type-safe Rust code.

## Add Dependencies

```toml
# Cargo.toml
[dependencies]
rocket = { version = "0.5", features = ["json"] }
redis = { version = "0.25", features = ["r2d2"] }
r2d2 = "0.8"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## Create a Redis Connection Pool

```rust
// src/redis_pool.rs
use redis::Client;
use r2d2::{Pool, PooledConnection};

pub type RedisPool = Pool<Client>;
pub type RedisConn = PooledConnection<Client>;

pub fn create_pool(redis_url: &str) -> RedisPool {
    let client = Client::open(redis_url)
        .expect("Failed to create Redis client");

    Pool::builder()
        .max_size(20)
        .build(client)
        .expect("Failed to build Redis connection pool")
}
```

## Attach Pool to Rocket State

```rust
// src/main.rs
mod redis_pool;

use rocket::{launch, routes, State};
use redis_pool::{RedisPool, create_pool};

#[launch]
fn rocket() -> _ {
    let pool = create_pool("redis://127.0.0.1:6379/");

    rocket::build()
        .manage(pool)
        .mount("/", routes![
            get_product,
            set_product,
            increment_counter,
            get_counter,
        ])
}
```

## Cache a Product

```rust
use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use redis::Commands;

#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
struct Product {
    id: String,
    name: String,
}

#[rocket::get("/products/<id>")]
fn get_product(id: &str, pool: &State<RedisPool>) -> Option<Json<Product>> {
    let mut conn = pool.get().ok()?;
    let cache_key = format!("product:{}", id);

    // Try cache first
    if let Ok(cached) = conn.get::<_, String>(&cache_key) {
        if let Ok(product) = serde_json::from_str::<Product>(&cached) {
            return Some(Json(product));
        }
    }

    // Simulate DB fetch
    let product = Product {
        id: id.to_string(),
        name: format!("Widget {}", id),
    };

    let serialized = serde_json::to_string(&product).ok()?;
    let _: () = conn.set_ex(&cache_key, &serialized, 60).ok()?;

    Some(Json(product))
}

#[rocket::delete("/products/<id>/cache")]
fn set_product(id: &str, pool: &State<RedisPool>) -> &'static str {
    if let Ok(mut conn) = pool.get() {
        let _: () = conn.del(format!("product:{}", id)).unwrap_or(());
    }
    "Cache evicted"
}
```

## Atomic Counter

```rust
#[rocket::post("/counter/<name>/increment")]
fn increment_counter(name: &str, pool: &State<RedisPool>) -> String {
    match pool.get() {
        Ok(mut conn) => {
            match conn.incr::<_, _, i64>(format!("counter:{}", name), 1) {
                Ok(count) => count.to_string(),
                Err(e) => format!("Error: {}", e),
            }
        }
        Err(e) => format!("Pool error: {}", e),
    }
}

#[rocket::get("/counter/<name>")]
fn get_counter(name: &str, pool: &State<RedisPool>) -> String {
    match pool.get() {
        Ok(mut conn) => {
            match conn.get::<_, Option<i64>>(format!("counter:{}", name)) {
                Ok(Some(count)) => count.to_string(),
                Ok(None) => "0".to_string(),
                Err(e) => format!("Error: {}", e),
            }
        }
        Err(e) => format!("Pool error: {}", e),
    }
}
```

## Rate Limiting with Redis

```rust
#[rocket::get("/api/data")]
fn rate_limited_endpoint(
    client_ip: std::net::IpAddr,
    pool: &State<RedisPool>
) -> Result<&'static str, rocket::http::Status> {
    let mut conn = pool.get().map_err(|_| rocket::http::Status::ServiceUnavailable)?;
    let key = format!("rate_limit:{}", client_ip);

    let count: i64 = conn.incr(&key, 1).unwrap_or(1);
    if count == 1 {
        let _: () = conn.expire(&key, 60).unwrap_or(());
    }

    if count > 100 {
        Err(rocket::http::Status::TooManyRequests)
    } else {
        Ok("OK")
    }
}
```

## Summary

Rocket integrates with Redis using the `redis` crate and `r2d2-redis` connection pool managed through Rocket's state system. Connection pool is injected via `&State<RedisPool>` in route handlers. The `Commands` trait provides type-safe access to Redis operations like `set_ex`, `incr`, and `del`. This pattern enables efficient caching and rate limiting in production Rocket applications.
