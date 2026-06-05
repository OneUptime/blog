# How to Build Portable Microservices with Docker and Wasm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, WebAssembly, WASM, Microservice, Portability, Container, Cloud Native

Description: Build truly portable microservices that run anywhere using Docker and WebAssembly with step-by-step examples.

---

Microservices promise flexibility, but in practice they tie you to specific operating systems, architectures, and runtime environments. A Go binary compiled for Linux amd64 will not run on ARM. A Python service depends on the right interpreter version and system libraries. Docker helps by packaging dependencies, but the images themselves remain platform-specific.

WebAssembly (Wasm) solves the portability problem at the binary level. A Wasm module runs identically on any platform that has a compatible Wasm runtime. Docker Desktop can run Wasm workloads side by side with containers through containerd shims, combining binary portability with Docker's container distribution workflow. As of 2026, Docker marks this Wasm workload feature as beta and deprecated in Docker Desktop, so check the current Docker support status before adopting it for production.

This guide shows you how to build microservices that are genuinely portable across clouds, architectures, and edge devices.

## The Portability Problem with Traditional Containers

Traditional Docker images contain a Linux userspace. Even "multi-arch" images are really separate images for each architecture, selected at pull time. This causes real friction:

- CI pipelines need cross-compilation or emulation for each target
- Registry storage multiplies with each supported architecture
- Base image vulnerabilities affect every service built on that base
- Image sizes range from 50MB to several gigabytes

Wasm reduces these issues. One Wasm binary can run on x86, ARM, RISC-V, or any architecture with a compatible Wasm runtime and the WASI interfaces your application uses.

## Project Setup

We will build a three-service microservice application: an API gateway, a user service, and an order service. Each compiles to Wasm and runs inside Docker.

```bash
# Create the project structure for our microservices

mkdir -p portable-microservices/{api-gateway,user-service,order-service}
cd portable-microservices
```

## Building the User Service

Start with a Rust-based user service:

```bash
# Initialize the user service as a Rust project
cd user-service
cargo init --name user-service
```

Add the necessary dependencies:

```toml
# Cargo.toml - Dependencies for the Wasm-compatible HTTP user service
[package]
name = "user-service"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

Implement a simple user handler:

```rust
// src/main.rs - Request handler core for a user service
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Clone, Serialize, Deserialize)]
struct User {
    id: u64,
    name: String,
    email: String,
}

static USERS: Mutex<Option<HashMap<u64, User>>> = Mutex::new(None);

fn init_store() {
    let mut store = USERS.lock().unwrap();
    if store.is_none() {
        let mut map = HashMap::new();
        map.insert(1, User {
            id: 1,
            name: "Alice Johnson".to_string(),
            email: "alice@example.com".to_string(),
        });
        map.insert(2, User {
            id: 2,
            name: "Bob Smith".to_string(),
            email: "bob@example.com".to_string(),
        });
        *store = Some(map);
    }
}

fn handle_request(path: &str, method: &str) -> (u16, String) {
    init_store();
    let store = USERS.lock().unwrap();
    let users = store.as_ref().unwrap();

    match (method, path) {
        ("GET", "/users") => {
            let list: Vec<&User> = users.values().collect();
            (200, serde_json::to_string(&list).unwrap())
        }
        ("GET", p) if p.starts_with("/users/") => {
            let id: u64 = p.trim_start_matches("/users/").parse().unwrap_or(0);
            match users.get(&id) {
                Some(user) => (200, serde_json::to_string(user).unwrap()),
                None => (404, r#"{"error": "user not found"}"#.to_string()),
            }
        }
        _ => (404, r#"{"error": "not found"}"#.to_string()),
    }
}

fn main() {
    // In a real Wasm HTTP service, wire handle_request into a runtime or
    // framework that supports WASI HTTP or runtime-specific server networking.
    println!("User service ready");
}
```

Build for the Wasm target:

```bash
# Compile the user service to WebAssembly
rustup target add wasm32-wasip1
cargo build --target wasm32-wasip1 --release
```

## Dockerizing the Wasm Microservices

Create a Dockerfile for each service. Because Wasm binaries are self-contained, every Dockerfile looks nearly identical:

```dockerfile
# Dockerfile - Package the user service as a Wasm container
FROM scratch
COPY target/wasm32-wasip1/release/user-service.wasm /user-service.wasm
ENTRYPOINT ["/user-service.wasm"]
```

Build it targeting the Wasm platform:

```bash
# Build the Docker image for the user service
docker buildx build \
  --platform wasi/wasm \
  -t user-service:latest \
  --load .
```

Repeat for the other services. The pattern stays the same, only the binary name changes.

## Multi-Service Docker Compose

Bring all three services together:

The Compose examples below assume each Wasm module actually starts an HTTP listener through a Docker-supported Wasm runtime or framework. The Rust snippet above only demonstrates the request-handling logic you would wire into that runtime layer.

```yaml
# docker-compose.yml - Portable microservices running on Wasm
services:
  api-gateway:
    image: api-gateway:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    ports:
      - "8080:80"
    depends_on:
      - user-service
      - order-service

  user-service:
    image: user-service:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    ports:
      - "8081:80"

  order-service:
    image: order-service:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    ports:
      - "8082:80"
```

Start the entire stack:

```bash
# Launch all three microservices
docker compose up -d
```

## Testing Portability Across Platforms

The real test of portability is running the same images on different architectures without rebuilding. Push to a registry and pull on a different machine:

```bash
# Tag and push to a registry
docker tag user-service:latest registry.example.com/user-service:v1
docker push registry.example.com/user-service:v1

# On an ARM device (Raspberry Pi, AWS Graviton, etc.)
docker pull registry.example.com/user-service:v1
docker run --runtime=io.containerd.wasmtime.v1 \
  --platform wasi/wasm \
  registry.example.com/user-service:v1
```

The same image, byte-for-byte identical, runs on both x86 and ARM when both hosts have a compatible Wasm runtime and the required Docker Wasm support enabled. No cross-compilation, no multi-arch builds, no platform-specific base images.

## Service Communication Patterns

Wasm microservices can communicate over familiar protocols such as HTTP and gRPC, but the details depend on the runtime and WASI version. WASI 0.2 defines component-model interfaces for HTTP and sockets; older WASI preview 1 modules often rely on runtime-specific networking support.

For synchronous HTTP communication between services:

```yaml
# docker-compose.yml - Services on a shared network for HTTP communication
services:
  api-gateway:
    image: api-gateway:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    environment:
      USER_SERVICE_URL: "http://user-service:80"
      ORDER_SERVICE_URL: "http://order-service:80"
    networks:
      - microservices

  user-service:
    image: user-service:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    networks:
      - microservices

  order-service:
    image: order-service:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    networks:
      - microservices

networks:
  microservices:
    driver: bridge
```

## Adding Traditional Services to the Mix

Not every service needs to be Wasm. Mix Wasm and traditional containers freely:

```yaml
# docker-compose.yml - Mixed Wasm and traditional container stack
services:
  user-service:
    image: user-service:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm

  # PostgreSQL remains a traditional container
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: microservices
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Redis for caching, also traditional
  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

## CI/CD Pipeline for Wasm Microservices

A GitHub Actions workflow that builds and pushes Wasm microservices:

```yaml
# .github/workflows/build-wasm.yml - CI pipeline for Wasm microservices
name: Build Wasm Microservices
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api-gateway, user-service, order-service]
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust and Wasm target
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-wasip1

      - name: Build Wasm binary
        working-directory: ./${{ matrix.service }}
        run: cargo build --target wasm32-wasip1 --release

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Build and push Wasm image
        uses: docker/build-push-action@v7
        with:
          context: ./${{ matrix.service }}
          platforms: wasi/wasm
          push: true
          tags: registry.example.com/${{ matrix.service }}:${{ github.sha }}
```

## Performance Characteristics

Wasm microservices can behave differently from traditional containers in production. The exact numbers depend heavily on the runtime, language, workload, and host, but small Wasm services often have a smaller footprint:

| Aspect | Traditional Container | Wasm Container |
|--------|----------------------|----------------|
| Startup time | Often hundreds of milliseconds to seconds | Often milliseconds for small modules |
| Memory per instance | Often tens to hundreds of MB | Often lower for small modules |
| Image size | Often tens of MB to 1 GB+ | Often a few MB for small modules |
| Architecture support | Per-build | Universal |
| Cold scaling | Depends on image size and runtime | Can be faster for small modules |

These characteristics can make Wasm microservices useful for auto-scaling workloads, especially where cold-start time and image size matter.

## Limitations to Consider

Wasm microservices are not a universal replacement:

- **File system access** is limited to explicitly granted directories through WASI
- **Network sockets** and HTTP depend on the WASI version and runtime support; WASI 0.2 defines networking interfaces, while preview 1 support is runtime-specific
- **Native libraries** (OpenSSL, image processing) need Wasm-compatible alternatives
- **Debugging tools** are less mature than traditional container debugging
- **Language support** varies - Rust and Go have the best Wasm toolchains

## Conclusion

Docker and Wasm together can deliver on the original promise of "build once, run anywhere" for microservices when your target environments provide compatible Wasm runtime support. The workflow feels familiar to anyone who already uses Docker. The key difference is that your images can be smaller, start faster, and run on multiple architectures without rebuilding. Start by converting one stateless service to Wasm, verify it works alongside your existing containers, and expand from there.
