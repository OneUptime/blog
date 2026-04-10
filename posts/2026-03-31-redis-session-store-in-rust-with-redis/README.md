# How to Build a Session Store in Rust with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Session, Authentication, Axum

Description: Learn how to build a Redis-backed session store in Rust using Axum and the redis crate to handle user sessions with TTL and secure token generation.

---

Redis is the standard choice for session storage: fast lookups, automatic key expiry, and no persistent storage overhead. This guide builds a session store in Rust using Axum and the `redis` crate.

## Setup

```toml
[dependencies]
axum = "0.7"
axum-extra = { version = "0.9", features = ["typed-header"] }
redis = { version = "0.25", features = ["tokio-comp"] }
deadpool-redis = { version = "0.15", features = ["rt_tokio_1"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
anyhow = "1"
tower-http = { version = "0.5", features = ["trace"] }
```

## Session Data Model

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Session {
    pub user_id: u64,
    pub username: String,
    pub created_at: u64,
}
```

## Session Store Implementation

```rust
use redis::AsyncCommands;
use std::sync::Arc;

const SESSION_TTL: u64 = 3600; // 1 hour

pub struct SessionStore {
    pool: deadpool_redis::Pool,
}

impl SessionStore {
    pub fn new(pool: deadpool_redis::Pool) -> Arc<Self> {
        Arc::new(Self { pool })
    }

    pub async fn create(&self, session: &Session) -> anyhow::Result<String> {
        let token = uuid::Uuid::new_v4().to_string();
        let key = format!("session:{token}");
        let json = serde_json::to_string(session)?;

        let mut con = self.pool.get().await?;
        con.set_ex(&key, &json, SESSION_TTL).await?;

        Ok(token)
    }

    pub async fn get(&self, token: &str) -> anyhow::Result<Option<Session>> {
        let key = format!("session:{token}");
        let mut con = self.pool.get().await?;

        let json: Option<String> = con.get(&key).await?;
        match json {
            Some(j) => Ok(Some(serde_json::from_str(&j)?)),
            None => Ok(None),
        }
    }

    pub async fn delete(&self, token: &str) -> anyhow::Result<()> {
        let mut con = self.pool.get().await?;
        con.del(format!("session:{token}")).await?;
        Ok(())
    }

    pub async fn refresh(&self, token: &str) -> anyhow::Result<bool> {
        let key = format!("session:{token}");
        let mut con = self.pool.get().await?;
        let renewed: bool = con.expire(&key, SESSION_TTL as i64).await?;
        Ok(renewed)
    }
}
```

## Axum Handler Integration

```rust
use axum::{extract::State, http::StatusCode, Json};
use axum_extra::TypedHeader;
use axum_extra::headers::{Authorization, authorization::Bearer};
use std::sync::Arc;

#[derive(serde::Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

async fn login(
    State(store): State<Arc<SessionStore>>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Validate credentials (simplified)
    if req.password != "secret" {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let session = Session {
        user_id: 1,
        username: req.username,
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };

    let token = store.create(&session).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "token": token })))
}

async fn logout(
    State(store): State<Arc<SessionStore>>,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
) -> StatusCode {
    store.delete(auth.token()).await.ok();
    StatusCode::NO_CONTENT
}
```

## Session Key Naming Conventions

Use consistent prefixes and consider namespacing per application:

```text
session:{uuid}               - individual session
session:user:{user_id}:*     - list sessions for a user (requires SCAN)
```

To invalidate all sessions for a user, store a set of session tokens keyed by user ID alongside each session.

## Summary

A Redis-backed session store in Rust pairs the `redis` crate with `deadpool-redis` for connection pooling and Axum for the HTTP layer. Store sessions as JSON strings with `SET EX`, retrieve them on each request, and call `DEL` on logout. Use `EXPIRE` refresh on each request to implement sliding expiry.
