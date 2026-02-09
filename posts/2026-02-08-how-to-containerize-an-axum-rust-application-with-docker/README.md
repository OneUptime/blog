# How to Containerize an Axum (Rust) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Axum, Rust, Containerization, Backend, DevOps, Tokio, Async

Description: Step-by-step guide to containerizing Axum web applications in Rust with Docker for production-grade deployments

---

Axum is a web framework from the Tokio team that takes full advantage of Rust's type system and the Tokio async runtime. It uses extractors for request parsing, integrates tightly with Tower middleware, and produces extremely fast, type-safe APIs. Since Axum compiles to a static Rust binary, Docker images built around it are tiny and start almost instantly. This guide covers containerizing an Axum application from project setup through production deployment.

## Prerequisites

You need:

- Rust 1.75+ (with cargo)
- Docker Engine 20.10+
- Familiarity with async Rust

## Creating an Axum Project

Set up a new Rust project:

```bash
cargo new my-axum-app
cd my-axum-app
```

Update `Cargo.toml` with dependencies:

```toml
[package]
name = "my-axum-app"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tower-http = { version = "0.5", features = ["cors", "trace"] }
```

Create the main application:

```rust
// src/main.rs - Axum application
use axum::{
    extract::Path,
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Serialize)]
struct Message {
    message: String,
}

#[derive(Serialize)]
struct Health {
    status: String,
}

#[tokio::main]
async fn main() {
    // Initialize structured logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "my_axum_app=info,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/api/v1/users/:id", get(get_user))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid number");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn root() -> Json<Message> {
    Json(Message {
        message: "Hello from Axum!".to_string(),
    })
}

async fn health() -> Json<Health> {
    Json(Health {
        status: "ok".to_string(),
    })
}

async fn get_user(Path(id): Path<String>) -> Json<serde_json::Value> {
    Json(serde_json::json!({ "id": id }))
}
```

Test it:

```bash
cargo run
curl http://localhost:8080
```

## The Dockerfile

This Dockerfile uses the dependency caching trick and multi-stage builds for an optimized result:

```dockerfile
# Stage 1: Build the application
FROM rust:1.77-alpine AS build

# Install build dependencies for static linking
RUN apk add --no-cache musl-dev

WORKDIR /app

# Cache dependencies by building a dummy project first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy real source and rebuild
COPY src ./src
RUN touch src/main.rs
RUN cargo build --release

# Stage 2: Minimal production image
FROM scratch

# Copy CA certificates for HTTPS
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the compiled binary
COPY --from=build /app/target/release/my-axum-app /server

EXPOSE 8080

ENTRYPOINT ["/server"]
```

## Alpine Production Variant

For debugging and monitoring tools:

```dockerfile
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/target/release/my-axum-app /server

USER appuser
EXPOSE 8080
ENTRYPOINT ["/server"]
```

## The .dockerignore File

```
target
.git
.gitignore
*.md
.vscode
.env
```

Always exclude the `target` directory. It can easily grow to several gigabytes.

## Building and Running

```bash
# Build (first build compiles all dependencies, subsequent builds are faster)
docker build -t my-axum-app:latest .

# Run
docker run -d -p 8080:8080 --name axum-app my-axum-app:latest

# Test
curl http://localhost:8080
curl http://localhost:8080/health

# Image size check
docker images my-axum-app
```

Expect 5-12MB on `scratch`. Axum's minimal dependency footprint keeps the binary small.

## Docker Compose with Database

A production-like setup with PostgreSQL:

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DATABASE_URL=postgresql://axum:secret@postgres:5432/axumdb
      - RUST_LOG=info
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: axum
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: axumdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U axum"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## State Management with Axum

Axum uses extractors to share state across handlers. This is how you share a database pool:

```rust
// src/main.rs - Shared state with database pool
use axum::{extract::State, Router, routing::get, Json};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;

// Application state shared across all handlers
struct AppState {
    db: sqlx::PgPool,
}

#[tokio::main]
async fn main() {
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    let state = Arc::new(AppState { db: pool });

    let app = Router::new()
        .route("/health", get(health))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    // Verify database connectivity
    match sqlx::query("SELECT 1").execute(&state.db).await {
        Ok(_) => Json(serde_json::json!({ "status": "ok", "database": "connected" })),
        Err(_) => Json(serde_json::json!({ "status": "degraded", "database": "disconnected" })),
    }
}
```

## Graceful Shutdown

Axum with Tokio supports graceful shutdown through signal handling:

```rust
// src/main.rs - Graceful shutdown
use tokio::signal;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(root));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();

    // Serve with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    tracing::info!("Server shut down gracefully");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
    };

    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to listen for SIGTERM")
            .recv()
            .await;
    };

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received");
}
```

This ensures Docker stop signals are handled cleanly, giving in-flight requests time to complete.

## Tower Middleware in Docker

Axum's integration with Tower gives you access to a rich middleware ecosystem. Here are useful ones for containerized deployments:

```rust
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
    timeout::TimeoutLayer,
    compression::CompressionLayer,
};
use std::time::Duration;

let app = Router::new()
    .route("/", get(root))
    // Log all requests (outputs to stdout for Docker)
    .layer(TraceLayer::new_for_http())
    // Compress responses
    .layer(CompressionLayer::new())
    // Set request timeout
    .layer(TimeoutLayer::new(Duration::from_secs(30)))
    // Enable CORS
    .layer(CorsLayer::permissive());
```

## Development Workflow

For development with auto-reload:

```dockerfile
# Dockerfile.dev
FROM rust:1.77-alpine
RUN apk add --no-cache musl-dev
RUN cargo install cargo-watch
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["cargo", "watch", "-x", "run"]
```

```yaml
# docker-compose.dev.yml
version: "3.8"

services:
  api-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - .:/app
      - cargo-cache:/usr/local/cargo/registry
      - target-cache:/app/target
    environment:
      - RUST_LOG=debug
      - PORT=8080

volumes:
  cargo-cache:
  target-cache:
```

Volume caching for the cargo registry and target directory makes subsequent builds much faster.

## Conclusion

Axum produces some of the leanest Docker images possible thanks to Rust's static binary compilation. The framework's tight integration with Tokio and Tower gives you production-grade features like graceful shutdown, request tracing, and timeouts out of the box. Use the dependency caching trick in the Dockerfile to speed up builds, choose between `scratch` and Alpine for your production stage, and leverage Docker Compose for database connectivity. Axum's type-safe extractors and Tower middleware make it easy to build reliable, containerized APIs that perform exceptionally well.
