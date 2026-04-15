# How to Build a Rust Microservice with ClickHouse Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rust, Microservice, Axum, Analytics

Description: Build a production-ready Rust microservice using Axum and ClickHouse to serve analytics queries over a REST API.

---

## Dependencies

```toml
[dependencies]
axum = "0.7"
clickhouse = "0.11"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.5", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

## Application State

```rust
use std::sync::Arc;
use clickhouse::Client;

#[derive(Clone)]
struct AppState {
    ch: Arc<Client>,
}
```

## Row Types

```rust
use clickhouse::Row;
use serde::{Deserialize, Serialize};

#[derive(Row, Deserialize, Serialize)]
struct TopEvent {
    event_name: String,
    cnt:        u64,
    avg_ms:     f64,
}
```

## Query Handler

```rust
use axum::{extract::{Query, State}, Json};
use std::collections::HashMap;

async fn top_events(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<TopEvent>>, String> {
    let days: u32 = params
        .get("days")
        .and_then(|v| v.parse().ok())
        .unwrap_or(7)
        .min(90);

    let rows = state.ch
        .query(
            "SELECT event_name, count() AS cnt, avg(duration_ms) AS avg_ms
             FROM events
             WHERE toDate(ts) >= today() - ?
             GROUP BY event_name
             ORDER BY cnt DESC
             LIMIT 20",
        )
        .bind(days)
        .fetch_all::<TopEvent>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(Json(rows))
}
```

## Router Setup

```rust
use axum::{Router, routing::get};
use tower_http::trace::TraceLayer;

fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/top-events", get(top_events))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
```

## Main Function

```rust
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let client = Client::default()
        .with_url(std::env::var("CLICKHOUSE_URL").unwrap_or("http://localhost:8123".into()))
        .with_database("analytics");

    let state = AppState { ch: Arc::new(client) };
    let app = build_router(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Listening on :3000");
    axum::serve(listener, app).await.unwrap();
}
```

## Health Check Endpoint

```rust
async fn health(State(state): State<AppState>) -> &'static str {
    state.ch.query("SELECT 1").fetch_one::<(u8,)>().await
        .map(|_| "ok")
        .unwrap_or("unhealthy")
}
```

Add `.route("/health", get(health))` to the router.

## Summary

A Rust microservice using Axum and the `clickhouse` crate combines high performance with type safety. Share a single ClickHouse client through Axum's `State` extractor, derive `Row` and `Serialize` on result types, and use `TraceLayer` for request logging with minimal runtime overhead.
