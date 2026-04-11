# How to Use Redis with Actix-Web in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Actix-web, Rust

Description: Learn how to integrate Redis with Actix-Web in Rust for async caching, session storage, and pub/sub using the redis-rs crate with deadpool-redis connection pooling.

---

Actix-Web is a high-performance async web framework for Rust. Integrating Redis with Actix-Web using `deadpool-redis` provides an async connection pool that works natively with Tokio, enabling non-blocking Redis operations in route handlers.

## Add Dependencies

```toml
# Cargo.toml
[dependencies]
actix-web = "4"
deadpool-redis = { version = "0.15", features = ["rt_tokio_1"] }
redis = { version = "0.25", features = ["tokio-comp", "aio"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
```

## Create Async Connection Pool

```rust
// src/redis_pool.rs
use deadpool_redis::{Config, Pool, Runtime};

pub fn create_pool(redis_url: &str) -> Pool {
    let cfg = Config::from_url(redis_url);
    cfg.create_pool(Some(Runtime::Tokio1))
        .expect("Failed to create Redis pool")
}
```

## Set Up Actix-Web App

```rust
// src/main.rs
mod redis_pool;
mod handlers;

use actix_web::{web, App, HttpServer};
use redis_pool::create_pool;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = create_pool("redis://127.0.0.1:6379/");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/products/{id}", web::get().to(handlers::get_product))
            .route("/products/{id}/cache", web::delete().to(handlers::evict_product))
            .route("/counter/{name}/increment", web::post().to(handlers::increment))
            .route("/counter/{name}", web::get().to(handlers::get_counter))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Async Cache Handler

```rust
// src/handlers.rs
use actix_web::{web, HttpResponse, Responder};
use deadpool_redis::Pool;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub name: String,
}

pub async fn get_product(
    path: web::Path<String>,
    pool: web::Data<Pool>,
) -> impl Responder {
    let id = path.into_inner();
    let cache_key = format!("product:{}", id);

    let mut conn = match pool.get().await {
        Ok(c) => c,
        Err(_) => return HttpResponse::ServiceUnavailable().finish(),
    };

    // Try cache
    if let Ok(cached) = conn.get::<_, String>(&cache_key).await {
        return HttpResponse::Ok()
            .insert_header(("X-Cache", "HIT"))
            .json(serde_json::from_str::<Product>(&cached).unwrap());
    }

    // Simulate DB fetch
    let product = Product {
        id: id.clone(),
        name: format!("Widget {}", id),
    };

    let serialized = serde_json::to_string(&product).unwrap();
    let _: () = conn.set_ex(&cache_key, &serialized, 60u64).await.unwrap_or(());

    HttpResponse::Ok()
        .insert_header(("X-Cache", "MISS"))
        .json(product)
}

pub async fn evict_product(
    path: web::Path<String>,
    pool: web::Data<Pool>,
) -> impl Responder {
    let id = path.into_inner();
    let mut conn = pool.get().await.unwrap();
    let _: () = conn.del(format!("product:{}", id)).await.unwrap_or(());
    HttpResponse::Ok().body("Cache evicted")
}

pub async fn increment(
    path: web::Path<String>,
    pool: web::Data<Pool>,
) -> impl Responder {
    let name = path.into_inner();
    let mut conn = pool.get().await.unwrap();
    let count: i64 = conn.incr(format!("counter:{}", name), 1).await.unwrap_or(0);
    HttpResponse::Ok().body(count.to_string())
}

pub async fn get_counter(
    path: web::Path<String>,
    pool: web::Data<Pool>,
) -> impl Responder {
    let name = path.into_inner();
    let mut conn = pool.get().await.unwrap();
    let count: Option<i64> = conn.get(format!("counter:{}", name)).await.unwrap_or(None);
    HttpResponse::Ok().body(count.unwrap_or(0).to_string())
}
```

## Rate Limiting Middleware

```rust
use actix_web::middleware::Next;
use actix_web::{web, body::MessageBody, dev::{ServiceRequest, ServiceResponse}};
use deadpool_redis::Pool;
use redis::AsyncCommands;

pub async fn rate_limit(
    req: ServiceRequest,
    next: Next<impl MessageBody>,
) -> actix_web::Result<ServiceResponse<impl MessageBody>> {
    if let Some(pool) = req.app_data::<web::Data<Pool>>() {
        if let Ok(mut conn) = pool.get().await {
            let ip = req.peer_addr().map(|a| a.ip().to_string()).unwrap_or_default();
            let key = format!("rate:{}", ip);
            let count: i64 = conn.incr(&key, 1).await.unwrap_or(1);
            if count == 1 {
                let _: () = conn.expire(&key, 60).await.unwrap_or(());
            }
            if count > 100 {
                return Err(actix_web::error::ErrorTooManyRequests("Rate limit exceeded"));
            }
        }
    }
    next.call(req).await
}
```

## Summary

Actix-Web integrates with Redis via `deadpool-redis` for fully async connection pooling compatible with Tokio. The `AsyncCommands` trait provides non-blocking versions of all Redis commands. Sharing the pool via `web::Data` lets all route handlers access Redis without contention. This pattern enables high-throughput caching and rate limiting in production Actix-Web services.
