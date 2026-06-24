# How to Set Up a Rust Development Environment with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Rust, Development, Cargo, Systems Programming

Description: Build a complete Rust development environment with cargo-watch, debugging support, and dependency caching using Docker and Portainer.

## Introduction

Rust development in Docker can be challenging due to long compile times, but with proper layer caching and cargo-watch for incremental rebuilds, it becomes manageable. This guide covers setting up a Rust development environment with sccache for compiler caching and supporting services.

## Step 1: Create the Rust Development Dockerfile

```dockerfile
# Dockerfile.dev - Rust development environment

FROM rust:1-slim-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    pkg-config \
    libssl-dev \
    libpq-dev \
    protobuf-compiler \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Install Rust development tools
RUN cargo install \
    cargo-watch \
    cargo-edit \
    cargo-audit \
    cargo-outdated \
    cargo-tarpaulin && \
    cargo install diesel_cli --no-default-features --features postgres && \
    cargo install sea-orm-cli && \
    cargo install sqlx-cli --version 0.8.6 --no-default-features --features native-tls,postgres && \
    cargo install sccache

# Set sccache as the compiler cache
ENV RUSTC_WRAPPER=sccache
ENV SCCACHE_DIR=/sccache

# Install Rust components
RUN rustup component add \
    rust-src \
    rustfmt \
    clippy \
    rust-analyzer

WORKDIR /app

# Copy Cargo files for dependency pre-download
COPY Cargo.toml Cargo.lock ./

# Create dummy source to pre-compile dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo build && \
    rm src/main.rs

# Application
EXPOSE 8080
```

## Step 2: Deploy Rust Stack in Portainer

```yaml
# docker-compose.yml - Rust Development Stack
networks:
  rust_dev:
    driver: bridge

volumes:
  cargo_registry:
  cargo_git:
  sccache_data:
  postgres_data:
  redis_data:

services:
  # Rust application with cargo-watch
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: rust_app
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - RUST_LOG=debug
      - RUST_BACKTRACE=1
      - DATABASE_URL=postgres://devuser:devpassword@postgres:5432/devdb
      - REDIS_URL=redis://redis:6379
      # sccache cache directory
      - SCCACHE_DIR=/sccache
    volumes:
      # Mount source code
      - .:/app
      # Cache Cargo registry (avoid re-downloading)
      - cargo_registry:/usr/local/cargo/registry
      - cargo_git:/usr/local/cargo/git
      # sccache for compilation caching
      - sccache_data:/sccache
    # cargo-watch for hot-rebuild
    command: cargo watch -x run
    # Required by cargo-tarpaulin when collecting coverage inside Docker
    cap_add:
      - SYS_PTRACE
    security_opt:
      - seccomp=unconfined
    networks:
      - rust_dev
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: rust_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=devdb
      - POSTGRES_USER=devuser
      - POSTGRES_PASSWORD=devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser -d devdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - rust_dev

  # Redis
  redis:
    image: redis:7-alpine
    container_name: rust_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - rust_dev
```

## Step 3: Example Rust Web Application with Axum

```toml
# Cargo.toml
[package]
name = "my-api"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework
axum = { version = "0.8", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.6", features = ["trace", "cors"] }

# Database
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Async Redis
redis = { version = "1", features = ["tokio-comp"] }

# Tracing
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Error handling
anyhow = "1"
thiserror = "2"

# Environment variables
dotenvy = "0.15"
```

```rust
// src/main.rs - Axum application
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();

    // Connect to database
    let database_url = std::env::var("DATABASE_URL")?;
    let pool = PgPool::connect(&database_url).await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;

    let state = Arc::new(AppState { db: pool });

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health_check))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("Listening on port 8080");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn root() -> Json<Value> {
    Json(json!({ "message": "Hello from Rust!" }))
}

async fn health_check(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    let db_ok = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();

    if db_ok {
        (StatusCode::OK, Json(json!({ "status": "healthy" })))
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(json!({ "status": "unhealthy" })))
    }
}
```

## Step 4: Database Migrations with SQLx

```bash
# Create migration
docker exec rust_app sqlx migrate add -r create_users_table

# Run migrations
docker exec rust_app sqlx migrate run

# Revert migrations
docker exec rust_app sqlx migrate revert

# Generate SQLx prepare files for offline compilation
docker exec rust_app cargo sqlx prepare
```

## Step 5: Running Tests

```bash
# Run all tests
docker exec rust_app cargo test

# Run with output
docker exec rust_app cargo test -- --nocapture

# Run specific test
docker exec rust_app cargo test test_user_creation

# Run with coverage (cargo-tarpaulin)
docker exec rust_app cargo tarpaulin --out Html

# Check for security vulnerabilities
docker exec rust_app cargo audit

# Check for outdated dependencies
docker exec rust_app cargo outdated
```

## Step 6: Multi-Stage Production Dockerfile

```dockerfile
# Dockerfile - Production build (minimal image)
FROM rust:1-bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release
RUN rm src/main.rs

COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

# Final stage - distroless or scratch
FROM gcr.io/distroless/cc-debian12

COPY --from=builder /app/target/release/my-api /app/my-api

EXPOSE 8080
CMD ["/app/my-api"]
```

## Conclusion

Your Rust development environment is containerized and managed through Portainer. cargo-watch provides automatic rebuilds on file changes, sccache reduces compilation times by caching compiled artifacts, and SQLx handles type-safe database queries with compile-time verification. Portainer makes it easy to monitor logs, view resource usage, and restart the development container. The production Dockerfile produces a tiny binary running in a minimal distroless image.
