# How to Containerize an Actix Web (Rust) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Actix Web, Rust, Containerization, Backend, DevOps, Performance

Description: A complete guide to containerizing Rust Actix Web applications with Docker using multi-stage builds and minimal images

---

Actix Web is one of the fastest web frameworks available in any language. Built on Rust's actor framework, it delivers outstanding throughput and low latency. Docker containerization for Rust applications follows a distinctive pattern because Rust compiles to native machine code. The build stage is heavy, but the production stage can be incredibly small. This guide covers the full process of containerizing an Actix Web application.

## Prerequisites

You need:

- Rust 1.75+ (with cargo)
- Docker Engine 20.10+
- Basic Rust knowledge

## Creating an Actix Web Project

Scaffold a new Rust project:

```bash
cargo new my-actix-app
cd my-actix-app
```

Add Actix Web to your `Cargo.toml`:

```toml
[package]
name = "my-actix-app"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
env_logger = "0.11"
log = "0.4"
tokio = { version = "1", features = ["full"] }
```

Create the main application:

```rust
// src/main.rs - Actix Web application
use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use serde::Serialize;
use std::env;

#[derive(Serialize)]
struct MessageResponse {
    message: String,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
}

async fn hello() -> HttpResponse {
    HttpResponse::Ok().json(MessageResponse {
        message: "Hello from Actix Web!".to_string(),
    })
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging (outputs to stdout for Docker)
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a number");

    log::info!("Starting server on port {}", port);

    HttpServer::new(|| {
        App::new()
            .wrap(middleware::Logger::default())
            .route("/", web::get().to(hello))
            .route("/health", web::get().to(health_check))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
```

Test locally:

```bash
cargo run
curl http://localhost:8080
```

## Understanding the Rust Docker Build

Rust compilation is resource-intensive. A typical build downloads and compiles all dependencies from source. This means the Docker build stage needs the full Rust toolchain and can take several minutes on the first build. However, the final binary is statically linked and runs without any runtime dependencies.

Docker layer caching helps enormously. By structuring the Dockerfile correctly, dependency compilation only repeats when `Cargo.toml` or `Cargo.lock` changes.

## The Dockerfile

This multi-stage Dockerfile uses a caching trick to speed up builds:

```dockerfile
# Stage 1: Build the Rust application
FROM rust:1.77-alpine AS build

# Install musl-dev for static linking
RUN apk add --no-cache musl-dev

WORKDIR /app

# Create a dummy project to cache dependencies
# This trick avoids recompiling all dependencies when only source code changes
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy the actual source code
COPY src ./src

# Touch main.rs to invalidate the binary cache (but not dependencies)
RUN touch src/main.rs

# Build the real application
RUN cargo build --release

# Stage 2: Minimal production image
FROM scratch

# Copy the compiled binary
COPY --from=build /app/target/release/my-actix-app /server

EXPOSE 8080

ENTRYPOINT ["/server"]
```

The dummy project trick is key. It compiles all dependencies in a separate layer, so subsequent builds only recompile your application code.

## Alpine-Based Production Image

If you need shell access or additional tools:

```dockerfile
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/target/release/my-actix-app /server

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

The `target` directory is critical to exclude. Rust's build artifacts can be several gigabytes.

## Building and Running

```bash
# Build the image (first build takes longer due to dependency compilation)
docker build -t my-actix-app:latest .

# Run the container
docker run -d -p 8080:8080 --name actix-app my-actix-app:latest

# Test the API
curl http://localhost:8080
curl http://localhost:8080/health

# Check image size
docker images my-actix-app
```

A Rust Actix Web binary on `scratch` typically produces images of 5-10MB. That is remarkably small.

## Docker Compose with PostgreSQL

A full stack with database connectivity:

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
      - DATABASE_URL=postgresql://actix:secret@postgres:5432/actixdb
      - RUST_LOG=info
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: actix
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: actixdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U actix"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Database Integration with SQLx

SQLx is a popular async Rust database library that works well with Actix Web.

Add to `Cargo.toml`:

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres"] }
```

Database connection pool setup:

```rust
// src/main.rs - With database connection pool
use actix_web::{web, App, HttpServer};
use sqlx::postgres::PgPoolOptions;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    // Create a connection pool from the DATABASE_URL environment variable
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    log::info!("Database connected successfully");

    HttpServer::new(move || {
        App::new()
            // Share the pool across all handlers
            .app_data(web::Data::new(pool.clone()))
            .route("/", web::get().to(hello))
            .route("/health", web::get().to(health_check))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
```

**Note**: When using SQLx with Docker, you may need to use the `runtime-tokio-rustls` feature instead of `runtime-tokio-native-tls` to avoid requiring OpenSSL in the production image.

## Graceful Shutdown

Actix Web handles SIGTERM gracefully by default. The `HttpServer` will stop accepting new connections and wait for in-flight requests to complete. You can customize the shutdown timeout:

```rust
HttpServer::new(|| {
    App::new()
        .route("/", web::get().to(hello))
})
.bind(("0.0.0.0", 8080))?
.shutdown_timeout(30)  // Wait up to 30 seconds for active connections
.run()
.await
```

## Build Speed Optimization

Rust builds inside Docker can be slow. Here are strategies to speed them up:

Use cargo-chef for better dependency caching:

```dockerfile
# Stage 1: Plan the build
FROM rust:1.77-alpine AS planner
RUN cargo install cargo-chef
WORKDIR /app
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 2: Cache dependencies
FROM rust:1.77-alpine AS cacher
RUN apk add --no-cache musl-dev
RUN cargo install cargo-chef
WORKDIR /app
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# Stage 3: Build the application
FROM rust:1.77-alpine AS build
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY --from=cacher /app/target target
COPY --from=cacher /usr/local/cargo /usr/local/cargo
COPY . .
RUN cargo build --release

# Stage 4: Production
FROM scratch
COPY --from=build /app/target/release/my-actix-app /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

`cargo-chef` analyzes your dependency tree and creates a "recipe" that allows Docker to cache the dependency compilation layer more effectively.

## Development Workflow

For development, use `cargo-watch` for automatic rebuilding:

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

Development Compose file:

```yaml
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

volumes:
  cargo-cache:
  target-cache:
```

Caching the `cargo` registry and `target` directory in named volumes speeds up rebuilds significantly.

## Conclusion

Actix Web produces some of the smallest and fastest Docker containers you can build. Rust's static compilation eliminates runtime dependencies, and the `scratch` base image keeps the final container around 5-10MB. The trade-off is build time, which is mitigated by careful layer caching and tools like `cargo-chef`. Add database connectivity with SQLx, handle configuration through environment variables, and leverage Actix Web's built-in graceful shutdown for production readiness. The combination of Rust's safety guarantees and Docker's deployment consistency makes for a robust production setup.
