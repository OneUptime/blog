# How to Use docker init for Rust Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Init, Rust, Containerization, DevOps, Systems Programming, Multi-Stage Builds

Description: Learn how to use docker init with Rust projects for optimized multi-stage builds that produce minimal container images from compiled binaries.

---

Rust produces statically linked binaries, which makes it ideal for containerization. Your final Docker image can contain nothing but the compiled binary and a minimal base, sometimes as small as 5-10 MB. The `docker init` command detects Rust projects and generates a multi-stage Dockerfile that compiles your application in one stage and copies just the binary to a minimal runtime image.

This guide covers using docker init with Rust projects and optimizing the build for both development speed and production image size.

## Setting Up a Sample Rust Project

Create a basic Rust web application using Actix-web:

```bash
# Create a new Rust project
cargo new rust-docker-demo && cd rust-docker-demo
```

Add dependencies to Cargo.toml:

```toml
# Cargo.toml
[package]
name = "rust-docker-demo"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

Create the web server:

```rust
// src/main.rs - A simple Actix-web server with health and API endpoints
use actix_web::{web, App, HttpServer, HttpResponse};
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
}

#[derive(Serialize)]
struct Item {
    id: u32,
    name: String,
    price: f64,
}

async fn health() -> HttpResponse {
    HttpResponse::Ok().json(HealthResponse {
        status: "healthy".to_string(),
    })
}

async fn list_items() -> HttpResponse {
    let items = vec![
        Item { id: 1, name: "Widget".to_string(), price: 9.99 },
        Item { id: 2, name: "Gadget".to_string(), price: 24.99 },
    ];
    HttpResponse::Ok().json(items)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);
    println!("Starting server on {}", addr);

    HttpServer::new(|| {
        App::new()
            .route("/health", web::get().to(health))
            .route("/api/items", web::get().to(list_items))
    })
    .bind(&addr)?
    .run()
    .await
}
```

## Running docker init

With the project in place, run docker init:

```bash
docker init
```

Docker init detects the Cargo.toml and identifies the project as Rust:

```
? What application platform does your project use? Rust
? What port does your server listen on? 8080
```

## Understanding the Generated Dockerfile

The Dockerfile docker init generates for Rust uses a multi-stage build that separates compilation from the runtime image:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage - compile the Rust binary
ARG RUST_VERSION=1.75
FROM rust:${RUST_VERSION}-slim-bookworm as build
WORKDIR /app

# Build the application with cargo
# The cache mount speeds up subsequent builds by caching compiled dependencies
RUN --mount=type=bind,source=src,target=src \
    --mount=type=bind,source=Cargo.toml,target=Cargo.toml \
    --mount=type=bind,source=Cargo.lock,target=Cargo.lock \
    --mount=type=cache,target=/app/target/ \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
    cargo build --release && \
    cp ./target/release/rust-docker-demo /bin/server

# Runtime stage - minimal image with just the binary
FROM debian:bookworm-slim as final

# Install minimal runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser
USER appuser

# Copy the compiled binary from the build stage
COPY --from=build /bin/server /bin/

EXPOSE 8080
CMD ["/bin/server"]
```

The key innovation here is the cache mounts. Rust compilation is notoriously slow because it compiles every dependency. The cache mount for `/app/target/` preserves compiled dependencies between builds, so only changed code gets recompiled. The registry cache avoids re-downloading crates.

## Using Scratch or Distroless Base Images

Rust can produce fully static binaries, which means your final image does not need a Linux distribution at all. Modify the build to use musl for static linking:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage with musl for static linking
FROM rust:1.75-alpine as build
WORKDIR /app

# Install musl-dev for static compilation
RUN apk add --no-cache musl-dev

RUN --mount=type=bind,source=src,target=src \
    --mount=type=bind,source=Cargo.toml,target=Cargo.toml \
    --mount=type=bind,source=Cargo.lock,target=Cargo.lock \
    --mount=type=cache,target=/app/target/ \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
    cargo build --release --target x86_64-unknown-linux-musl && \
    cp ./target/x86_64-unknown-linux-musl/release/rust-docker-demo /bin/server

# Use scratch for the smallest possible image
FROM scratch as final

# Copy CA certificates for HTTPS support
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the statically linked binary
COPY --from=build /bin/server /bin/

EXPOSE 8080
CMD ["/bin/server"]
```

This produces an image that contains only your binary and CA certificates, typically under 10 MB. The tradeoff is that you cannot shell into the container for debugging. For production services where size and security matter, this is worth it.

For a middle ground, use Google's distroless image:

```dockerfile
# Distroless runtime - no shell, but includes basic runtime libraries
FROM gcr.io/distroless/cc-debian12 as final
COPY --from=build /bin/server /bin/
EXPOSE 8080
CMD ["/bin/server"]
```

## Speeding Up Builds with cargo-chef

Rust compilation speed is the biggest pain point when working with Docker. The cache mounts help, but `cargo-chef` takes it further by creating a dedicated dependency-caching layer:

```dockerfile
# syntax=docker/dockerfile:1

FROM rust:1.75-slim-bookworm as chef
RUN cargo install cargo-chef
WORKDIR /app

# Plan stage - figure out which dependencies need compiling
FROM chef as planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Build stage - compile dependencies first (cached), then the app
FROM chef as builder
COPY --from=planner /app/recipe.json recipe.json

# This step compiles only dependencies and is cached
RUN cargo chef cook --release --recipe-path recipe.json

# Now copy source and compile the application
COPY . .
RUN cargo build --release && \
    cp ./target/release/rust-docker-demo /bin/server

# Runtime stage
FROM debian:bookworm-slim as final
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser
USER appuser

COPY --from=builder /bin/server /bin/
EXPOSE 8080
CMD ["/bin/server"]
```

With cargo-chef, changing your application code does not recompile dependencies. Only the final `cargo build` step runs, saving minutes on each rebuild.

## Development compose.yaml

For local development, mount your source code and use cargo-watch for automatic recompilation:

```yaml
# compose.yaml - Development configuration
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: build  # Use the build stage for development
    ports:
      - "8080:8080"
    volumes:
      - ./src:/app/src  # Mount source for hot recompilation
    command: cargo watch -x run
    environment:
      - RUST_LOG=debug
      - PORT=8080
```

Install cargo-watch in your build stage for this to work:

```dockerfile
# Add to the build stage
RUN cargo install cargo-watch
```

## Optimizing the .dockerignore

Keep the build context clean for faster builds:

```
# Build artifacts (compiled inside the container)
target

# Version control
.git
.gitignore

# IDE
.vscode
.idea

# Docker files
Dockerfile
compose.yaml
.dockerignore

# Documentation
*.md
```

Excluding the `target` directory is critical. It can be gigabytes in size and would slow down every build significantly.

## Building and Testing

```bash
# Build the production image
docker build -t my-rust-app:latest .

# Check the image size (should be very small)
docker images my-rust-app

# Run the container
docker run -p 8080:8080 my-rust-app:latest

# Test the endpoints
curl http://localhost:8080/health
curl http://localhost:8080/api/items
```

## Cross-Compilation for Different Architectures

Rust supports cross-compilation, which is useful for building ARM images on x86 machines:

```bash
# Build for both AMD64 and ARM64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag my-rust-app:latest \
  --push \
  .
```

For cross-compilation to work, add the ARM target in your build stage:

```dockerfile
# Add ARM target support
RUN rustup target add aarch64-unknown-linux-musl
```

Docker init provides a solid starting point for Rust containerization. The generated multi-stage build with cache mounts handles the most common case well. From there, consider cargo-chef for faster builds, musl for static linking, and scratch base images for minimal production containers. Rust's compilation model pairs naturally with Docker's layer caching, and once your build pipeline is tuned, iterating on containerized Rust applications becomes fast and predictable.
