# How to Use Axum Web Framework for APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Axum, Web Framework, REST API, Tower, Tokio

Description: A practical guide to building web APIs with Axum, the Tokio-native web framework built on Tower.

---

If you have been looking for a web framework in Rust that feels both ergonomic and performant, Axum deserves your attention. Developed by the Tokio team, Axum builds on top of Tower and Hyper, giving you access to a rich ecosystem of middleware while keeping the API clean and type-safe.

This guide walks you through building production-ready APIs with Axum. We will cover everything from basic routing to WebSocket support, with practical examples you can adapt for your own projects.

## Why Axum?

Before diving into code, let's understand what makes Axum stand out:

- **No macros for routing** - Routes are just function compositions, making them easy to reason about
- **Type-safe extractors** - Request data is parsed and validated at compile time
- **Tower integration** - Access to a massive ecosystem of middleware for timeouts, rate limiting, compression, and more
- **First-class async** - Built on Tokio, the most widely used async runtime in Rust

## Setting Up Your Project

Start by creating a new Rust project and adding the necessary dependencies.

```bash
cargo new axum-api
cd axum-api
```

Add these dependencies to your Cargo.toml:

```toml
[package]
name = "axum-api"
version = "0.1.0"
edition = "2021"

[dependencies]
# Axum web framework
axum = { version = "0.7", features = ["ws"] }
# Async runtime
tokio = { version = "1.0", features = ["full"] }
# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
# Tower middleware ecosystem
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }
# Tracing for logs
tracing = "0.1"
tracing-subscriber = "0.3"
```

## Basic Application Structure

Let's create a minimal Axum server to understand the fundamentals.

```rust
// Import the core types we need from axum
use axum::{routing::get, Router};

#[tokio::main]
async fn main() {
    // Initialize tracing for request logging
    tracing_subscriber::fmt::init();

    // Build our router with a single route
    let app = Router::new()
        .route("/", get(root_handler));

    // Create a TCP listener on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("Server running on http://localhost:3000");

    // Start serving requests
    axum::serve(listener, app).await.unwrap();
}

// Handler functions are just async functions that return something
// implementing IntoResponse
async fn root_handler() -> &'static str {
    "Hello from Axum!"
}
```

Run this with `cargo run` and visit `http://localhost:3000` to see your first Axum response.

## Routing and HTTP Methods

Axum makes it straightforward to define routes for different HTTP methods and URL patterns.

```rust
use axum::{
    routing::{get, post, put, delete},
    Router,
};

// Build a router with RESTful routes for a users resource
fn build_router() -> Router {
    Router::new()
        // Basic routes
        .route("/", get(index))
        // Nested path with multiple methods
        .route("/users", get(list_users).post(create_user))
        // Path parameters use :param_name syntax
        .route("/users/:id", get(get_user).put(update_user).delete(delete_user))
        // You can nest routers for better organization
        .nest("/api/v1", api_routes())
}

// Separate router for API routes - keeps main router clean
fn api_routes() -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/status", get(status))
}

async fn index() -> &'static str {
    "API Root"
}

async fn health_check() -> &'static str {
    "OK"
}

async fn status() -> &'static str {
    "Running"
}
```

## Extractors - Parsing Request Data

Extractors are where Axum really shines. They let you pull data from requests in a type-safe way. If extraction fails, Axum automatically returns an appropriate error response.

### Path Parameters

Extract values directly from the URL path.

```rust
use axum::extract::Path;

// Single path parameter - the type must match what you expect
async fn get_user(Path(user_id): Path<u64>) -> String {
    format!("Fetching user with ID: {}", user_id)
}

// Multiple path parameters using a tuple
// Route: /users/:user_id/posts/:post_id
async fn get_user_post(
    Path((user_id, post_id)): Path<(u64, u64)>
) -> String {
    format!("User {} - Post {}", user_id, post_id)
}
```

### Query Parameters

Parse URL query strings into typed structs.

```rust
use axum::extract::Query;
use serde::Deserialize;

// Define a struct for your query parameters
// Fields are optional by default with Option<T>
#[derive(Deserialize)]
struct Pagination {
    page: Option<u32>,
    per_page: Option<u32>,
    sort_by: Option<String>,
}

// Request: GET /users?page=1&per_page=20&sort_by=name
async fn list_users(Query(pagination): Query<Pagination>) -> String {
    let page = pagination.page.unwrap_or(1);
    let per_page = pagination.per_page.unwrap_or(10);
    
    format!(
        "Listing users - page: {}, per_page: {}, sort: {:?}",
        page, per_page, pagination.sort_by
    )
}
```

### JSON Request Bodies

Deserialize JSON payloads into Rust structs.

```rust
use axum::Json;
use serde::{Deserialize, Serialize};

// Input struct for creating a user
#[derive(Deserialize)]
struct CreateUserRequest {
    name: String,
    email: String,
    age: Option<u8>,
}

// Output struct for responses
#[derive(Serialize)]
struct UserResponse {
    id: u64,
    name: String,
    email: String,
}

// The Json extractor handles both parsing requests and serializing responses
async fn create_user(
    Json(payload): Json<CreateUserRequest>
) -> Json<UserResponse> {
    // In a real app, you would save to a database here
    let user = UserResponse {
        id: 1,
        name: payload.name,
        email: payload.email,
    };
    
    Json(user)
}
```

### Combining Multiple Extractors

You can use multiple extractors in the same handler. Order matters - put extractors that consume the body last.

```rust
use axum::{
    extract::{Path, Query, State},
    Json,
};

// Combine path, query, state, and body extractors
async fn complex_handler(
    State(db): State<DatabasePool>,      // Shared state first
    Path(id): Path<u64>,                   // Path params
    Query(params): Query<Pagination>,      // Query params
    Json(body): Json<CreateUserRequest>,   // Body last (consumes request)
) -> Json<UserResponse> {
    // All your data is now available and type-safe
    todo!()
}
```

## State Management

Most APIs need shared state like database connections or configuration. Axum handles this through the State extractor.

```rust
use axum::{extract::State, routing::get, Router};
use std::sync::Arc;

// Define your application state
struct AppState {
    db_pool: DatabasePool,
    config: AppConfig,
}

// We wrap in Arc for cheap cloning across handlers
type SharedState = Arc<AppState>;

#[tokio::main]
async fn main() {
    // Create shared state
    let state = Arc::new(AppState {
        db_pool: create_pool().await,
        config: load_config(),
    });

    // Attach state to the router - all handlers can now access it
    let app = Router::new()
        .route("/users", get(list_users))
        .route("/config", get(get_config))
        .with_state(state);

    // ... start server
}

// Extract state in handlers
async fn list_users(State(state): State<SharedState>) -> String {
    // Access the database pool
    let count = state.db_pool.count_users().await;
    format!("Total users: {}", count)
}

async fn get_config(State(state): State<SharedState>) -> String {
    format!("App version: {}", state.config.version)
}
```

## Middleware with Tower

Axum integrates seamlessly with Tower, giving you access to a powerful middleware system. Here are some common patterns.

### Adding CORS Support

```rust
use axum::Router;
use tower_http::cors::{Any, CorsLayer};

fn build_router() -> Router {
    // Configure CORS policy
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/data", get(get_data))
        // Apply CORS to all routes
        .layer(cors)
}
```

### Request Tracing

```rust
use axum::Router;
use tower_http::trace::TraceLayer;

fn build_router() -> Router {
    Router::new()
        .route("/", get(index))
        // Add tracing for all requests - logs method, path, status, latency
        .layer(TraceLayer::new_for_http())
}
```

### Custom Middleware

Create your own middleware for cross-cutting concerns like authentication.

```rust
use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::{self, Next},
    response::Response,
    Router,
};

// Middleware function signature: takes request and next, returns response
async fn auth_middleware(
    request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // Check for authorization header
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    match auth_header {
        Some(token) if token.starts_with("Bearer ") => {
            // Token exists, proceed to handler
            Ok(next.run(request).await)
        }
        _ => {
            // No valid token, reject request
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

fn protected_routes() -> Router {
    Router::new()
        .route("/admin", get(admin_handler))
        .route("/dashboard", get(dashboard_handler))
        // Apply auth middleware only to these routes
        .layer(middleware::from_fn(auth_middleware))
}
```

## Error Handling

Proper error handling separates amateur APIs from production-ready ones. Axum gives you flexibility in how you handle errors.

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

// Define your own error type
enum ApiError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
}

// Implement IntoResponse to convert errors to HTTP responses
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        // Return a JSON error response
        let body = Json(json!({
            "error": message,
            "status": status.as_u16()
        }));

        (status, body).into_response()
    }
}

// Now handlers can return Result with your error type
async fn get_user(Path(id): Path<u64>) -> Result<Json<UserResponse>, ApiError> {
    // Simulate database lookup
    if id == 0 {
        return Err(ApiError::BadRequest("ID cannot be zero".to_string()));
    }

    // User not found
    if id > 1000 {
        return Err(ApiError::NotFound(format!("User {} not found", id)));
    }

    Ok(Json(UserResponse {
        id,
        name: "John".to_string(),
        email: "john@example.com".to_string(),
    }))
}
```

## WebSocket Support

Axum has built-in WebSocket support for real-time communication.

```rust
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};

fn build_router() -> Router {
    Router::new()
        // WebSocket endpoint
        .route("/ws", get(ws_handler))
}

// The upgrade extractor handles the HTTP upgrade handshake
async fn ws_handler(ws: WebSocketUpgrade) -> Response {
    // Accept the upgrade and pass to our socket handler
    ws.on_upgrade(handle_socket)
}

// This function handles the actual WebSocket connection
async fn handle_socket(mut socket: WebSocket) {
    // Send a welcome message
    if socket
        .send(Message::Text("Welcome to the WebSocket!".to_string()))
        .await
        .is_err()
    {
        return; // Client disconnected
    }

    // Echo messages back to the client
    while let Some(msg) = socket.recv().await {
        let msg = match msg {
            Ok(msg) => msg,
            Err(_) => return, // Connection error
        };

        match msg {
            Message::Text(text) => {
                // Echo the message back with a prefix
                let response = format!("You said: {}", text);
                if socket.send(Message::Text(response)).await.is_err() {
                    return;
                }
            }
            Message::Close(_) => return,
            _ => {} // Ignore other message types
        }
    }
}
```

## Putting It All Together

Here is a complete example combining everything we covered:

```rust
use axum::{
    extract::{Path, Query, State, ws::{WebSocket, WebSocketUpgrade}},
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

// Application state
struct AppState {
    app_name: String,
}

type SharedState = Arc<AppState>;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState {
        app_name: "My Axum API".to_string(),
    });

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user))
        .route("/ws", get(ws_handler))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("Listening on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

async fn root(State(state): State<SharedState>) -> String {
    format!("Welcome to {}", state.app_name)
}

async fn health() -> &'static str {
    "OK"
}

// ... include handlers from previous examples
```

## Performance Tips

A few things to keep in mind when building production Axum APIs:

1. **Use connection pooling** - Libraries like `sqlx` or `deadpool` manage database connections efficiently
2. **Enable release optimizations** - Compile with `--release` for significant performance gains
3. **Add compression** - Use `tower-http`'s `CompressionLayer` for gzip/brotli responses
4. **Set timeouts** - Use `tower`'s `TimeoutLayer` to prevent slow clients from hogging resources
5. **Implement graceful shutdown** - Handle SIGTERM to finish in-flight requests before stopping

## Wrapping Up

Axum strikes a balance between simplicity and power that is hard to find in other frameworks. The type-safe extractors catch errors at compile time, Tower integration gives you battle-tested middleware, and the Tokio foundation ensures your API can handle serious load.

The examples in this guide should give you a solid starting point. From here, explore the Axum documentation for more advanced patterns like streaming responses, server-sent events, and file uploads.

Start small, add complexity as needed, and let the Rust compiler guide you toward correct code.

---

*Monitor Axum APIs with [OneUptime](https://oneuptime.com) - track response times and error rates.*
