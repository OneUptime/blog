# How to Use Podman for Rust Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Rust, Container, Development, Systems Programming

Description: A hands-on guide to using Podman for Rust development, covering cargo workflows, dependency caching, web development with Actix and Axum, debugging, and building minimal production images.

---

> Podman gives Rust developers a consistent Linux build environment without installing toolchains locally, and Rust's static binaries make for some of the smallest production container images possible.

Rust's compile times and large dependency trees make environment consistency especially important. A different version of a system library, a missing linker, or a slightly different glibc version can turn a clean build into an hour of debugging. Containers eliminate these variables. Podman is a good match for Rust developers because it shares the same philosophy: do the job well, without unnecessary background processes or elevated privileges.

This guide covers everything from running Rust code inside a Podman container to building production-grade images that are just a few megabytes.

---

## Choosing a Rust Base Image

The official Rust images include the compiler, cargo, and common build tools:

```bash
# Full image - Debian-based, includes gcc, linker, and common libraries

podman pull docker.io/library/rust:1-bookworm

# Slim image - smaller Debian base
podman pull docker.io/library/rust:1-slim-bookworm

# Alpine image - smallest, uses musl instead of glibc
podman pull docker.io/library/rust:1-alpine3.23
```

For development, `rust:1-slim-bookworm` works well. The Alpine variant uses musl libc, and its default Rust target is musl-based, which is useful for static binaries but can behave differently from glibc in edge cases.

## Running Rust Code in a Container

```bash
# Compile and run a Rust file
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/rust:1-slim-bookworm \
  bash -c "rustc main.rs && ./main"

# Start an interactive shell with Rust tools available
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/rust:1-slim-bookworm \
  bash
```

## Setting Up a Cargo Project

Create a new Cargo project inside a container:

```bash
# Initialize a new Rust project
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/rust:1-slim-bookworm \
  cargo init myproject
```

## Caching Dependencies for Faster Builds

Rust's compile times are a real concern, and re-downloading and recompiling dependencies on every container start makes it worse. Use named volumes to cache the Cargo registry, Cargo's git dependencies, and the build artifacts.

```bash
# Create volumes for Cargo caches
podman volume create cargo-registry
podman volume create cargo-git
podman volume create cargo-target

# Run with caches mounted
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -v cargo-git:/usr/local/cargo/git \
  -v cargo-target:/app/target \
  -w /app \
  docker.io/library/rust:1-slim-bookworm \
  cargo build
```

The `cargo-registry` volume stores registry index data and downloaded crates. The `cargo-git` volume stores git-based dependencies. The `cargo-target` volume stores the compiled artifacts. Together, these make incremental builds inside containers nearly as fast as native builds.

## Creating a Development Containerfile

```dockerfile
FROM docker.io/library/rust:1-slim-bookworm

# Install system dependencies and development tools
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install cargo-watch for automatic recompilation
RUN cargo install cargo-watch

WORKDIR /app

# Copy manifest files first for dependency caching
COPY Cargo.toml Cargo.lock* ./

# Create a dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build
RUN rm -rf src

# Copy actual source code
COPY . .

EXPOSE 8080

# Use cargo-watch for live reloading
CMD ["cargo", "watch", "-x", "run"]
```

The trick with the dummy `main.rs` is important. It lets Podman cache the dependency compilation layer. When you change your actual source code but not `Cargo.toml`, the dependencies are not recompiled.

Build and run:

```bash
# Build the dev image
podman build -t rust-dev .

# Run with source mounted and caches
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -v cargo-git:/usr/local/cargo/git \
  -v cargo-target:/app/target \
  -w /app \
  -p 8080:8080 \
  rust-dev
```

## Developing a Web Application with Actix Web

Create a simple Actix Web server. Add to `Cargo.toml`:

```toml
[package]
name = "myapp"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

Create `src/main.rs`:

```rust
// src/main.rs
use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
}

#[derive(Serialize)]
struct HelloResponse {
    message: String,
}

async fn hello() -> HttpResponse {
    HttpResponse::Ok().json(HelloResponse {
        message: "Hello from Actix Web inside Podman".to_string(),
    })
}

async fn health() -> HttpResponse {
    HttpResponse::Ok().json(HealthResponse {
        status: "healthy".to_string(),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting server on port 8080");

    HttpServer::new(|| {
        App::new()
            .wrap(middleware::Logger::default())
            .route("/", web::get().to(hello))
            .route("/health", web::get().to(health))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

Run with cargo-watch for live reloading:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -v cargo-git:/usr/local/cargo/git \
  -v cargo-target:/app/target \
  -w /app \
  -p 8080:8080 \
  docker.io/library/rust:1-slim-bookworm \
  bash -c "cargo install cargo-watch && cargo watch -x run"
```

## Developing with Axum

Axum is another popular Rust web framework. The container setup is identical since it is all just Cargo dependencies. Add to `Cargo.toml`:

```toml
[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Create `src/main.rs`:

```rust
use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct Message {
    text: String,
}

async fn hello() -> Json<Message> {
    Json(Message {
        text: "Hello from Axum inside Podman".to_string(),
    })
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(hello));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .unwrap();

    println!("Listening on port 8080");
    axum::serve(listener, app).await.unwrap();
}
```

## Multi-Container Setup with a Database

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - .:/app:Z
      - cargo-registry:/usr/local/cargo/registry
      - cargo-git:/usr/local/cargo/git
      - cargo-target:/app/target
    environment:
      DATABASE_URL: postgres://rustuser:rustpass@db:5432/rustdb
    depends_on:
      - db

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_USER: rustuser
      POSTGRES_PASSWORD: rustpass
      POSTGRES_DB: rustdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  cargo-registry:
  cargo-git:
  cargo-target:
  pgdata:
```

## Running Tests

```bash
# Run all tests
podman run --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -v cargo-git:/usr/local/cargo/git \
  -v cargo-target:/app/target \
  -w /app \
  docker.io/library/rust:1-slim-bookworm \
  cargo test

# Run tests with output
podman run --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -v cargo-git:/usr/local/cargo/git \
  -v cargo-target:/app/target \
  -w /app \
  docker.io/library/rust:1-slim-bookworm \
  cargo test -- --nocapture

# Run a specific test
podman run --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -v cargo-git:/usr/local/cargo/git \
  -v cargo-target:/app/target \
  -w /app \
  docker.io/library/rust:1-slim-bookworm \
  cargo test test_hello_endpoint
```

## Debugging Rust in a Container

For debugging with GDB or LLDB:

```bash
# Install GDB and run with debug symbols
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -v cargo-git:/usr/local/cargo/git \
  -v cargo-target:/app/target \
  -w /app \
  --security-opt=seccomp=unconfined \
  docker.io/library/rust:1-bookworm \
  bash -c "apt-get update && apt-get install -y gdb && cargo build && gdb target/debug/myapp"
```

## Building a Minimal Production Image

Rust shines here. A statically linked Rust binary can run in a `scratch` container with no operating system at all.

```dockerfile
# Stage 1: Build the release binary
FROM docker.io/library/rust:1-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Build the actual application
COPY . .
RUN touch src/main.rs && cargo build --release

# Stage 2: Minimal runtime image
FROM docker.io/library/debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash appuser
USER appuser

COPY --from=builder /app/target/release/myapp /usr/local/bin/myapp

EXPOSE 8080

CMD ["myapp"]
```

For an even smaller image using a fully static binary with musl:

```dockerfile
FROM docker.io/library/rust:1-alpine3.23 AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY . .
RUN cargo build --release

FROM scratch
COPY --from=builder /app/target/release/myapp /myapp
EXPOSE 8080
ENTRYPOINT ["/myapp"]
```

Build it:

```bash
podman build -t my-rust-app:prod -f Containerfile.prod .

# Check the image size
podman images my-rust-app:prod

# Run it
podman run --rm -p 8080:8080 my-rust-app:prod
```

## Conclusion

Podman handles Rust development workflows cleanly once you set up proper caching. The main cache directories to persist are the Cargo registry, Cargo's git directory, and the target directory. With those cached, incremental builds inside containers are fast. Use `cargo-watch` for live reloading during development, and take advantage of Rust's static compilation for tiny production images. The combination of Rust's zero-cost abstractions and Podman's daemonless container runtime gives you minimal overhead at every layer of the stack.
