# How to Build a Fast HTTP Router with Axum in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Axum, HTTP, Router, Web Framework

Description: Learn how to build a high-performance HTTP router in Rust using Axum, from basic routing to advanced patterns like middleware, extractors, and nested routes.

---

If you have been following the Rust web ecosystem, you have probably heard of Axum. Built by the Tokio team, Axum is a web framework that prioritizes ergonomics without sacrificing performance. It sits on top of Hyper and Tower, which means you get battle-tested HTTP handling and a rich middleware ecosystem out of the box.

What makes Axum stand out is its type-safe approach to routing. Instead of runtime errors when extracting path parameters or query strings, the compiler catches mistakes before your code ever runs. This alone saves hours of debugging.

Let me walk you through building a production-ready HTTP router with Axum.

## Getting Started

First, set up a new Rust project and add the necessary dependencies:

```bash
cargo new axum-router
cd axum-router
```

Update your `Cargo.toml`:

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

## Basic Router Setup

Here is a minimal Axum application with a few routes:

```rust
use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // Initialize tracing for request logging
    tracing_subscriber::fmt::init();

    // Build the router with routes
    let app = Router::new()
        .route("/", get(root_handler))
        .route("/health", get(health_check));

    // Bind to address and serve
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// Handler functions return anything that implements IntoResponse
async fn root_handler() -> &'static str {
    "Welcome to the Axum router!"
}

async fn health_check() -> &'static str {
    "OK"
}
```

## Path Parameters and Type-Safe Extraction

Axum shines when extracting data from requests. Path parameters are type-checked at compile time:

```rust
use axum::{
    extract::Path,
    routing::get,
    Router,
};

async fn get_user(Path(user_id): Path<u64>) -> String {
    format!("Fetching user with ID: {}", user_id)
}

// Multiple path parameters
async fn get_user_post(
    Path((user_id, post_id)): Path<(u64, u64)>
) -> String {
    format!("User {} - Post {}", user_id, post_id)
}

let app = Router::new()
    .route("/users/:user_id", get(get_user))
    .route("/users/:user_id/posts/:post_id", get(get_user_post));
```

For structured path parameters, use a struct with serde:

```rust
use serde::Deserialize;

#[derive(Deserialize)]
struct PostParams {
    user_id: u64,
    post_id: u64,
}

async fn get_post(Path(params): Path<PostParams>) -> String {
    format!("User {} - Post {}", params.user_id, params.post_id)
}
```

## Query Parameters

Query strings work the same way - define a struct and let Axum handle the parsing:

```rust
use axum::extract::Query;
use serde::Deserialize;

#[derive(Deserialize)]
struct Pagination {
    page: Option<u32>,
    limit: Option<u32>,
}

async fn list_items(Query(pagination): Query<Pagination>) -> String {
    let page = pagination.page.unwrap_or(1);
    let limit = pagination.limit.unwrap_or(20);
    format!("Listing items - page: {}, limit: {}", page, limit)
}
```

## JSON Request and Response Bodies

Handling JSON is straightforward with the `Json` extractor:

```rust
use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct CreateUser {
    username: String,
    email: String,
}

#[derive(Serialize)]
struct User {
    id: u64,
    username: String,
    email: String,
}

async fn create_user(
    Json(payload): Json<CreateUser>
) -> impl IntoResponse {
    // In a real app, you would save to a database here
    let user = User {
        id: 1,
        username: payload.username,
        email: payload.email,
    };

    // Return JSON with a 201 status code
    (StatusCode::CREATED, Json(user))
}
```

## Nested Routes and API Versioning

Real applications need organized route structures. Axum lets you nest routers:

```rust
use axum::Router;

fn user_routes() -> Router {
    Router::new()
        .route("/", get(list_users).post(create_user))
        .route("/:id", get(get_user).put(update_user).delete(delete_user))
}

fn post_routes() -> Router {
    Router::new()
        .route("/", get(list_posts).post(create_post))
        .route("/:id", get(get_post))
}

fn api_v1_routes() -> Router {
    Router::new()
        .nest("/users", user_routes())
        .nest("/posts", post_routes())
}

let app = Router::new()
    .nest("/api/v1", api_v1_routes())
    .route("/health", get(health_check));
```

This creates endpoints like `/api/v1/users`, `/api/v1/users/:id`, `/api/v1/posts`, and so on.

## Adding State

Most applications need shared state - database pools, configuration, caches. Axum handles this cleanly:

```rust
use axum::{
    extract::State,
    routing::get,
    Router,
};
use std::sync::Arc;

// Define your application state
struct AppState {
    db_pool: DatabasePool,
    config: AppConfig,
}

async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<u64>,
) -> String {
    // Access state.db_pool here
    format!("Getting user {} from database", user_id)
}

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState {
        db_pool: create_pool().await,
        config: load_config(),
    });

    let app = Router::new()
        .route("/users/:id", get(get_user))
        .with_state(state);

    // ... serve the app
}
```

## Middleware with Tower

Axum uses Tower for middleware. Here is how to add common middleware layers:

```rust
use axum::{
    Router,
    middleware,
    extract::Request,
    response::Response,
};
use tower_http::{
    cors::{CorsLayer, Any},
    trace::TraceLayer,
};
use std::time::Duration;

// Custom middleware function
async fn logging_middleware(
    request: Request,
    next: middleware::Next,
) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();

    let start = std::time::Instant::now();
    let response = next.run(request).await;
    let duration = start.elapsed();

    tracing::info!(
        method = %method,
        uri = %uri,
        status = %response.status(),
        duration_ms = %duration.as_millis(),
        "Request completed"
    );

    response
}

let app = Router::new()
    .route("/", get(root_handler))
    .layer(middleware::from_fn(logging_middleware))
    .layer(
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    )
    .layer(TraceLayer::new_for_http());
```

## Error Handling

Proper error handling separates toy projects from production code. Create a custom error type:

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

// Define application errors
enum AppError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
}

// Convert errors to HTTP responses
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(json!({
            "error": message
        }));

        (status, body).into_response()
    }
}

// Use Result in handlers
async fn get_user(Path(user_id): Path<u64>) -> Result<Json<User>, AppError> {
    let user = find_user(user_id)
        .await
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", user_id)))?;

    Ok(Json(user))
}
```

## Complete Example

Here is a complete example putting everything together:

```rust
use axum::{
    extract::{Path, Query, State, Json},
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::trace::TraceLayer;

#[derive(Clone)]
struct AppState {
    // Your database pool, config, etc.
}

#[derive(Deserialize)]
struct ListParams {
    page: Option<u32>,
    limit: Option<u32>,
}

#[derive(Serialize)]
struct Item {
    id: u64,
    name: String,
}

async fn list_items(
    State(_state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Json<Vec<Item>> {
    let _page = params.page.unwrap_or(1);
    let _limit = params.limit.unwrap_or(20);

    // Fetch from database in a real app
    Json(vec![
        Item { id: 1, name: "Item 1".into() },
        Item { id: 2, name: "Item 2".into() },
    ])
}

async fn get_item(Path(id): Path<u64>) -> impl IntoResponse {
    Json(Item { id, name: format!("Item {}", id) })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState {});

    let app = Router::new()
        .route("/items", get(list_items))
        .route("/items/:id", get(get_item))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("Listening on http://0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}
```

## Performance Considerations

Axum is fast because it avoids unnecessary allocations and leverages Rust's zero-cost abstractions. A few tips to keep it that way:

1. Use `Arc` for shared state instead of cloning data
2. Prefer `&str` over `String` in responses when possible
3. Stream large responses instead of buffering them in memory
4. Use connection pooling for database connections

Benchmarks consistently show Axum handling hundreds of thousands of requests per second on modest hardware. The framework itself adds minimal overhead - most of your latency will come from your business logic and database calls.

## Summary

Axum gives you a type-safe, performant foundation for building HTTP services in Rust. The combination of compile-time guarantees and Tower's middleware ecosystem means you can build reliable services without the runtime surprises common in dynamic languages.

Start simple, add complexity as needed, and let the compiler guide you. That is the Rust way, and Axum embraces it fully.
