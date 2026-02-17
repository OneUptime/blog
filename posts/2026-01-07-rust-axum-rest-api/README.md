# How to Build Production-Ready REST APIs in Rust with Axum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, axum, REST API, Web Services, HTTP, Middleware, Error Handling, Graceful Shutdown

Description: Learn how to build production-ready REST APIs in Rust using Axum. This guide covers routing, middleware, error handling, validation, graceful shutdown, and best practices for production deployments.

---

> Rust's type system and performance make it ideal for building APIs, and Axum brings ergonomic, async-first web development to the ecosystem. This guide shows you how to build APIs that are not just functional, but production-ready.

Axum is built on top of Tokio and Tower, giving you access to a rich ecosystem of middleware and services. Its type-safe extractors and composable routing make building robust APIs a joy.

---

## Project Setup

Start with a well-structured Cargo.toml for a production API.

```toml
[package]
name = "api-server"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
tower = { version = "0.4", features = ["timeout", "limit"] }
tower-http = { version = "0.5", features = [
    "cors",
    "trace",
    "compression-gzip",
    "request-id",
    "timeout",
] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Validation
validator = { version = "0.16", features = ["derive"] }

# Error handling
thiserror = "1"
anyhow = "1"

# Observability
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }

# Utilities
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
```

---

## Application Structure

Organize your API with clear separation of concerns.

```
src/
├── main.rs           # Entry point
├── config.rs         # Configuration
├── routes/
│   ├── mod.rs
│   ├── health.rs
│   └── users.rs
├── handlers/
│   ├── mod.rs
│   └── users.rs
├── models/
│   ├── mod.rs
│   └── user.rs
├── middleware/
│   ├── mod.rs
│   └── auth.rs
├── error.rs          # Error types
└── state.rs          # Application state
```

---

## Main Application Entry Point

```rust
// src/main.rs
// Production-ready Axum application entry point

mod config;
mod error;
mod handlers;
mod middleware;
mod models;
mod routes;
mod state;

use axum::Router;
use std::net::SocketAddr;
use tokio::signal;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::state::AppState;

#[tokio::main]
async fn main() {
    // Initialize tracing for structured logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "api_server=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    // Load configuration
    let config = Config::from_env();

    // Create application state
    let state = AppState::new(&config).await;

    // Build router with all routes and middleware
    let app = build_router(state);

    // Start server with graceful shutdown
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    tracing::info!("Server shutdown complete");
}

/// Build the application router with all middleware
fn build_router(state: AppState) -> Router {
    Router::new()
        // Mount route modules
        .merge(routes::health::router())
        .merge(routes::users::router())
        // Apply middleware layers (order matters - bottom to top execution)
        .layer(CompressionLayer::new())
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &axum::http::Request<_>| {
                    let request_id = request
                        .headers()
                        .get("x-request-id")
                        .and_then(|v| v.to_str().ok())
                        .unwrap_or("unknown");

                    tracing::info_span!(
                        "http_request",
                        method = %request.method(),
                        uri = %request.uri(),
                        request_id = %request_id,
                    )
                })
        )
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(TimeoutLayer::new(std::time::Duration::from_secs(30)))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state)
}

/// Handle graceful shutdown signals
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Received Ctrl+C, starting graceful shutdown");
        }
        _ = terminate => {
            tracing::info!("Received SIGTERM, starting graceful shutdown");
        }
    }
}
```

---

## Application State

```rust
// src/state.rs
// Shared application state

use crate::config::Config;
use std::sync::Arc;

/// Shared application state accessible in handlers
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    // Add database pool, cache client, etc.
    // pub db: sqlx::PgPool,
    // pub redis: redis::Client,
}

impl AppState {
    pub async fn new(config: &Config) -> Self {
        // Initialize database connections, caches, etc.
        // let db = sqlx::PgPool::connect(&config.database_url).await.unwrap();

        Self {
            config: Arc::new(config.clone()),
        }
    }
}
```

---

## Configuration

```rust
// src/config.rs
// Application configuration from environment

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub environment: String,
    pub database_url: String,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            environment: std::env::var("ENVIRONMENT")
                .unwrap_or_else(|_| "development".to_string()),
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://localhost/app".to_string()),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "development-secret".to_string()),
        }
    }

    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }
}
```

---

## Error Handling

Implement consistent error responses across your API.

```rust
// src/error.rs
// Centralized error handling

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

/// Application error types
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Resource not found")]
    NotFound,

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal server error")]
    Internal(#[from] anyhow::Error),
}

/// JSON error response body
#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<serde_json::Value>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                "not_found",
                self.to_string(),
            ),
            AppError::Validation(msg) => (
                StatusCode::BAD_REQUEST,
                "validation_error",
                msg.clone(),
            ),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                self.to_string(),
            ),
            AppError::Forbidden => (
                StatusCode::FORBIDDEN,
                "forbidden",
                self.to_string(),
            ),
            AppError::Conflict(msg) => (
                StatusCode::CONFLICT,
                "conflict",
                msg.clone(),
            ),
            AppError::Internal(err) => {
                // Log internal errors but don't expose details
                tracing::error!(error = ?err, "Internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "An internal error occurred".to_string(),
                )
            }
        };

        let body = ErrorResponse {
            error: error_type.to_string(),
            message,
            details: None,
        };

        (status, Json(body)).into_response()
    }
}

/// Result type alias for handlers
pub type Result<T> = std::result::Result<T, AppError>;
```

---

## Routes and Handlers

### Health Check Route

```rust
// src/routes/health.rs
// Health check endpoints for Kubernetes probes

use axum::{routing::get, Json, Router};
use serde::Serialize;

pub fn router() -> Router<crate::state::AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/health/live", get(liveness))
        .route("/health/ready", get(readiness))
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

/// Basic health check
async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy",
        version: env!("CARGO_PKG_VERSION"),
    })
}

/// Kubernetes liveness probe
async fn liveness() -> &'static str {
    "OK"
}

/// Kubernetes readiness probe - check dependencies
async fn readiness(
    // State(state): State<crate::state::AppState>,
) -> Result<&'static str, &'static str> {
    // Check database connection
    // if state.db.acquire().await.is_err() {
    //     return Err("Database unavailable");
    // }

    Ok("OK")
}
```

### User Routes with CRUD Operations

```rust
// src/routes/users.rs
// User management routes

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use crate::handlers::users;

pub fn router() -> Router<crate::state::AppState> {
    Router::new()
        .route("/api/users", get(users::list).post(users::create))
        .route(
            "/api/users/:id",
            get(users::get)
                .put(users::update)
                .delete(users::delete),
        )
}
```

```rust
// src/handlers/users.rs
// User request handlers

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::{AppError, Result};
use crate::state::AppState;

/// User response model
#[derive(Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Create user request with validation
#[derive(Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,

    #[validate(length(min = 1, max = 100, message = "Name must be 1-100 characters"))]
    pub name: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
}

/// Update user request
#[derive(Deserialize, Validate)]
pub struct UpdateUserRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: Option<String>,

    #[validate(email)]
    pub email: Option<String>,
}

/// Pagination query parameters
#[derive(Deserialize)]
pub struct ListQuery {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_per_page")]
    pub per_page: u32,
}

fn default_page() -> u32 { 1 }
fn default_per_page() -> u32 { 20 }

/// List users with pagination
#[tracing::instrument(skip(state))]
pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<UserResponse>>> {
    tracing::debug!(page = query.page, per_page = query.per_page, "Listing users");

    // In production, query from database
    let users = vec![
        UserResponse {
            id: Uuid::new_v4(),
            email: "user@example.com".to_string(),
            name: "Example User".to_string(),
            created_at: chrono::Utc::now(),
        }
    ];

    Ok(Json(users))
}

/// Create a new user
#[tracing::instrument(skip(state, payload), fields(user.email = %payload.email))]
pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<UserResponse>)> {
    // Validate request
    payload.validate().map_err(|e| {
        AppError::Validation(e.to_string())
    })?;

    tracing::info!("Creating new user");

    // Check for existing user
    // if user_exists(&state.db, &payload.email).await? {
    //     return Err(AppError::Conflict("Email already registered".to_string()));
    // }

    // Hash password and create user
    let user = UserResponse {
        id: Uuid::new_v4(),
        email: payload.email,
        name: payload.name,
        created_at: chrono::Utc::now(),
    };

    tracing::info!(user.id = %user.id, "User created");

    Ok((StatusCode::CREATED, Json(user)))
}

/// Get user by ID
#[tracing::instrument(skip(state))]
pub async fn get(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<UserResponse>> {
    // Query user from database
    // let user = find_user(&state.db, id).await?.ok_or(AppError::NotFound)?;

    // Simulated response
    let user = UserResponse {
        id,
        email: "user@example.com".to_string(),
        name: "Example User".to_string(),
        created_at: chrono::Utc::now(),
    };

    Ok(Json(user))
}

/// Update user
#[tracing::instrument(skip(state, payload))]
pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateUserRequest>,
) -> Result<Json<UserResponse>> {
    payload.validate().map_err(|e| {
        AppError::Validation(e.to_string())
    })?;

    tracing::info!("Updating user");

    // Update in database
    let user = UserResponse {
        id,
        email: payload.email.unwrap_or_else(|| "user@example.com".to_string()),
        name: payload.name.unwrap_or_else(|| "Updated User".to_string()),
        created_at: chrono::Utc::now(),
    };

    Ok(Json(user))
}

/// Delete user
#[tracing::instrument(skip(state))]
pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode> {
    tracing::info!("Deleting user");

    // Delete from database
    // delete_user(&state.db, id).await?;

    Ok(StatusCode::NO_CONTENT)
}
```

---

## Request Validation Middleware

Create a custom extractor for validated JSON bodies.

```rust
// src/middleware/validated_json.rs
// Custom extractor with automatic validation

use axum::{
    async_trait,
    extract::{FromRequest, Request},
    http::StatusCode,
    Json,
};
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::error::AppError;

/// JSON extractor that automatically validates the payload
pub struct ValidatedJson<T>(pub T);

#[async_trait]
impl<St, T> FromRequest<St> for ValidatedJson<T>
where
    T: DeserializeOwned + Validate,
    St: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        // Extract JSON body
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e| AppError::Validation(e.to_string()))?;

        // Validate
        value.validate().map_err(|e| {
            let errors: Vec<String> = e
                .field_errors()
                .into_iter()
                .flat_map(|(field, errors)| {
                    errors.iter().map(move |e| {
                        format!("{}: {}", field, e.message.as_ref().map(|m| m.to_string()).unwrap_or_default())
                    })
                })
                .collect();
            AppError::Validation(errors.join(", "))
        })?;

        Ok(ValidatedJson(value))
    }
}
```

---

## Authentication Middleware

```rust
// src/middleware/auth.rs
// JWT authentication middleware

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::state::AppState;

/// JWT claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,        // Subject (user ID)
    pub exp: usize,       // Expiration time
    pub iat: usize,       // Issued at
    pub email: String,
}

/// Authenticated user extractor
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Extract Authorization header
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AppError::Unauthorized)?;

        // Decode and validate JWT
        let token_data = decode::<Claims>(
            bearer.token(),
            &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser {
            user_id: token_data.claims.sub,
            email: token_data.claims.email,
        })
    }
}

// Usage in handler:
// async fn protected_route(user: AuthUser) -> impl IntoResponse {
//     format!("Hello, {}!", user.email)
// }
```

---

## Rate Limiting

```rust
// src/middleware/rate_limit.rs
// Simple in-memory rate limiting

use axum::{
    extract::ConnectInfo,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;

/// Rate limiter state
pub struct RateLimiter {
    requests: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            requests: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window,
        }
    }

    pub async fn check(&self, key: &str) -> bool {
        let mut requests = self.requests.lock().await;
        let now = Instant::now();
        let cutoff = now - self.window;

        let entry = requests.entry(key.to_string()).or_default();

        // Remove old requests
        entry.retain(|&time| time > cutoff);

        if entry.len() >= self.max_requests {
            false
        } else {
            entry.push(now);
            true
        }
    }
}

/// Rate limiting middleware
pub async fn rate_limit_middleware<Bd>(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Bd>,
    next: Next<Bd>,
) -> Result<Response, StatusCode> {
    // In production, use a proper rate limiter like governor or Redis
    // This is a simplified example

    // Check rate limit by IP
    // if !rate_limiter.check(&addr.ip().to_string()).await {
    //     return Err(StatusCode::TOO_MANY_REQUESTS);
    // }

    Ok(next.run(request).await)
}
```

---

## Testing

```rust
// tests/api_tests.rs
// Integration tests for API endpoints

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;

#[tokio::test]
async fn test_health_check() {
    let app = build_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_create_user() {
    let app = build_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/users")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"email":"test@example.com","name":"Test","password":"password123"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn test_validation_error() {
    let app = build_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/users")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"email":"invalid","name":"","password":"short"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

async fn build_test_app() -> axum::Router {
    // Build app with test configuration
    todo!()
}
```

---

## Dockerfile for Production

```dockerfile
# Multi-stage build for minimal image size
FROM rust:1.75-slim as builder

WORKDIR /app
COPY . .

# Build release binary
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/api-server /usr/local/bin/

EXPOSE 3000

CMD ["api-server"]
```

---

## Best Practices Summary

1. **Use typed extractors** - Let the type system validate requests
2. **Centralize error handling** - Consistent error responses across endpoints
3. **Apply middleware wisely** - Order matters, security first
4. **Validate early** - Reject bad requests before processing
5. **Log at boundaries** - Request entry, exit, and errors
6. **Graceful shutdown** - Drain connections before stopping
7. **Health checks** - Separate liveness and readiness probes

---

*Ready to monitor your Rust API? [OneUptime](https://oneuptime.com) provides API monitoring with latency tracking and alerting.*

**Related Reading:**
- [How to Implement JWT Authentication in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-jwt-authentication/view)
- [How to Instrument Rust Applications with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-07-rust-opentelemetry-instrumentation/view)
