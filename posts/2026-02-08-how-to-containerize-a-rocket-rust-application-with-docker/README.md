# How to Containerize a Rocket (Rust) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Rocket, Rust, Containerization, Backend, DevOps, Web Framework

Description: Learn how to containerize Rocket framework applications in Rust with Docker using multi-stage builds and production optimization

---

Rocket is a Rust web framework that prioritizes developer ergonomics. It uses Rust's type system and procedural macros to provide compile-time route validation, automatic request parsing, and clear error messages. Rocket v0.5 brought async support and removed the nightly Rust requirement, making it production-ready for a wider audience. Docker containerization with Rocket follows the same principles as other Rust frameworks but has a few framework-specific considerations around configuration. This guide covers them all.

## Prerequisites

You need:

- Rust 1.75+ (stable)
- Docker Engine 20.10+
- Cargo installed

## Creating a Rocket Project

Set up a new project:

```bash
cargo new my-rocket-app
cd my-rocket-app
```

Update `Cargo.toml`:

```toml
[package]
name = "my-rocket-app"
version = "0.1.0"
edition = "2021"

[dependencies]
rocket = { version = "0.5", features = ["json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Create the application:

```rust
// src/main.rs - Rocket application
#[macro_use]
extern crate rocket;

use rocket::serde::json::Json;
use serde::Serialize;

#[derive(Serialize)]
struct Message {
    message: String,
}

#[derive(Serialize)]
struct Health {
    status: String,
}

#[get("/")]
fn index() -> Json<Message> {
    Json(Message {
        message: "Hello from Rocket!".to_string(),
    })
}

#[get("/health")]
fn health() -> Json<Health> {
    Json(Health {
        status: "ok".to_string(),
    })
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/", routes![index, health])
}
```

Test locally:

```bash
cargo run
curl http://localhost:8000
```

## Rocket Configuration for Docker

Rocket reads its configuration from a `Rocket.toml` file or environment variables. By default, it binds to `127.0.0.1`, which is not accessible from outside the container. You must change this.

Create a `Rocket.toml` with proper bindings:

```toml
# Rocket.toml - Configuration for different environments

[default]
address = "0.0.0.0"
port = 8000

[release]
address = "0.0.0.0"
port = 8000
log_level = "normal"
```

Alternatively, set the binding through environment variables (which Docker makes easy):

```bash
ROCKET_ADDRESS=0.0.0.0
ROCKET_PORT=8000
ROCKET_PROFILE=release
```

This is a critical step. If you forget it, your container starts successfully but returns connection refused from the host.

## The Dockerfile

This multi-stage Dockerfile uses the dependency caching pattern:

```dockerfile
# Stage 1: Build
FROM rust:1.77-alpine AS build

RUN apk add --no-cache musl-dev

WORKDIR /app

# Cache dependencies with a dummy build
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Build the real application
COPY src ./src
COPY Rocket.toml ./
RUN touch src/main.rs
RUN cargo build --release

# Stage 2: Minimal production image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the binary and configuration
COPY --from=build /app/target/release/my-rocket-app /server
COPY --from=build /app/Rocket.toml /Rocket.toml

USER appuser
EXPOSE 8000

# Set Rocket to release profile
ENV ROCKET_PROFILE=release

ENTRYPOINT ["/server"]
```

Note that Rocket needs the `Rocket.toml` file at runtime (unless you use environment variables exclusively). That is why we copy it into the production stage.

## Using Scratch Instead of Alpine

If you prefer the smallest possible image and do not need `Rocket.toml`:

```dockerfile
FROM scratch

COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /app/target/release/my-rocket-app /server

EXPOSE 8000

# Configure Rocket entirely through environment variables
ENV ROCKET_ADDRESS=0.0.0.0
ENV ROCKET_PORT=8000
ENV ROCKET_PROFILE=release

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

## Building and Running

```bash
# Build the image
docker build -t my-rocket-app:latest .

# Run the container
docker run -d -p 8000:8000 --name rocket-app my-rocket-app:latest

# Test
curl http://localhost:8000
curl http://localhost:8000/health

# Check image size
docker images my-rocket-app
```

## Docker Compose with PostgreSQL

Rocket supports database connections through the `rocket_db_pools` crate.

Add to `Cargo.toml`:

```toml
[dependencies]
rocket_db_pools = { version = "0.2", features = ["sqlx_postgres"] }
```

Docker Compose configuration:

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ROCKET_PROFILE=release
      - ROCKET_ADDRESS=0.0.0.0
      - ROCKET_PORT=8000
      - ROCKET_DATABASES={mydb={url="postgresql://rocket:secret@postgres:5432/rocketdb"}}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: rocket
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: rocketdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rocket"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

Notice the `ROCKET_DATABASES` environment variable syntax. Rocket parses TOML-like configuration from environment variables.

## Database Integration Code

Set up the database pool in your Rocket application:

```rust
// src/main.rs - Rocket with database pool
#[macro_use]
extern crate rocket;

use rocket::serde::json::Json;
use rocket_db_pools::{Database, Connection, sqlx};
use serde::Serialize;

#[derive(Database)]
#[database("mydb")]
struct MyDb(sqlx::PgPool);

#[derive(Serialize)]
struct User {
    id: i32,
    name: String,
}

#[get("/users")]
async fn list_users(mut db: Connection<MyDb>) -> Json<Vec<User>> {
    let users = sqlx::query_as!(User, "SELECT id, name FROM users")
        .fetch_all(&mut **db)
        .await
        .unwrap_or_default();

    Json(users)
}

#[get("/health")]
async fn health(mut db: Connection<MyDb>) -> Json<serde_json::Value> {
    match sqlx::query("SELECT 1").execute(&mut **db).await {
        Ok(_) => Json(serde_json::json!({"status": "ok", "database": "connected"})),
        Err(_) => Json(serde_json::json!({"status": "degraded", "database": "error"})),
    }
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(MyDb::init())
        .mount("/", routes![list_users, health])
}
```

## Rocket Fairings in Docker

Rocket uses "fairings" (similar to middleware in other frameworks) for cross-cutting concerns. Here is a fairing that adds CORS headers:

```rust
// src/cors.rs - CORS fairing
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
use rocket::{Request, Response};

pub struct Cors;

#[rocket::async_trait]
impl Fairing for Cors {
    fn info(&self) -> Info {
        Info {
            name: "CORS Headers",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _req: &'r Request<'_>, res: &mut Response<'r>) {
        res.set_header(Header::new("Access-Control-Allow-Origin", "*"));
        res.set_header(Header::new("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"));
        res.set_header(Header::new("Access-Control-Allow-Headers", "Content-Type, Authorization"));
    }
}
```

Attach it to your Rocket instance:

```rust
#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(Cors)
        .mount("/", routes![index, health])
}
```

## Graceful Shutdown

Rocket v0.5 handles shutdown gracefully by default. When it receives SIGTERM, it stops accepting new connections, finishes in-flight requests, and exits. You can configure the grace period and mercy period:

```toml
# Rocket.toml
[release]
shutdown.ctrlc = true
shutdown.grace = 5
shutdown.mercy = 5
```

Or through environment variables:

```bash
ROCKET_SHUTDOWN_GRACE=5
ROCKET_SHUTDOWN_MERCY=5
```

## Development Workflow

For development with hot reload:

```dockerfile
# Dockerfile.dev
FROM rust:1.77-alpine
RUN apk add --no-cache musl-dev
RUN cargo install cargo-watch
WORKDIR /app
COPY . .
EXPOSE 8000
ENV ROCKET_PROFILE=debug
CMD ["cargo", "watch", "-x", "run"]
```

```yaml
version: "3.8"

services:
  api-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - .:/app
      - cargo-cache:/usr/local/cargo/registry
      - target-cache:/app/target
    environment:
      - ROCKET_PROFILE=debug
      - ROCKET_ADDRESS=0.0.0.0
      - RUST_LOG=debug

volumes:
  cargo-cache:
  target-cache:
```

## Conclusion

Rocket brings a polished developer experience to Rust web development, and Docker gives it a portable deployment story. The key Rocket-specific detail is configuration: make sure the server binds to `0.0.0.0` either through `Rocket.toml` or environment variables. Use the dependency caching pattern in your Dockerfile for faster rebuilds, and choose between `scratch` and Alpine for your production image. Rocket's built-in graceful shutdown, database pool integration, and fairing system work smoothly inside containers, giving you a complete framework for building and deploying production Rust web services.
