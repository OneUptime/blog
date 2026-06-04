# How to Use Docker Desktop Wasm Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Desktop, WebAssembly, WASM, WASI, Container, WasmEdge

Description: Run WebAssembly workloads alongside traditional containers using Docker Desktop's built-in Wasm runtime support.

---

WebAssembly (Wasm) is expanding beyond the browser. Docker Desktop supports running Wasm workloads alongside traditional Linux containers, letting you use the same `docker run` commands and Compose files you already know. This Docker Desktop feature is currently beta and Docker's documentation says it is deprecated and will be removed in a future release, so use it for experimentation rather than new production designs. Wasm modules start faster, use less memory, and provide stronger sandboxing than traditional containers, making them attractive for specific workloads like serverless functions, edge computing, and lightweight microservices.

This guide covers enabling Wasm support in Docker Desktop, building and running Wasm containers, and understanding when Wasm makes sense versus traditional containers.

## What Is Wasm in Docker?

WebAssembly System Interface (WASI) allows Wasm modules to interact with the host operating system in a sandboxed way. Docker Desktop integrates Wasm runtimes (like WasmEdge and Spin) as alternative container runtimes. Instead of running a full Linux userspace, your application compiles to a .wasm binary and runs in a lightweight Wasm runtime.

The key differences from regular containers:

- **Startup time**: Wasm modules start in milliseconds, not seconds
- **Memory**: A Wasm container uses a fraction of the memory of a Linux container
- **Portability**: The same .wasm binary runs on any architecture without rebuilding
- **Security**: Wasm's sandbox provides capability-based security by default

## Enabling Wasm Support in Docker Desktop

Open Docker Desktop, go to Settings > General, and enable "Use containerd for pulling and storing images" if it is not already enabled. Then go to Settings > Features in development and enable "Enable Wasm."

Docker Desktop installs the Wasm containerd shims that allow running Wasm workloads through the standard Docker interface.

Verify the setup is working.

```bash
# Check that the Wasm runtime is available

docker info | grep -i wasm

# Run a test Wasm container
docker run --rm --runtime=io.containerd.wasmedge.v1 --platform=wasi/wasm \
  secondstate/rust-example-hello:latest
```

If you see the example's hello output, Wasm support is working correctly.

## Building Your First Wasm Container

Let's build a simple Rust application that compiles to Wasm and runs in Docker.

First, set up a Rust project that targets WASI.

```bash
# Install the WASI target for Rust
rustup target add wasm32-wasip1

# Create a new project
cargo new hello-wasm
cd hello-wasm
```

Write a simple application.

```rust
// src/main.rs - A simple WASI application
use std::env;

fn main() {
    // Read environment variables (supported by WASI)
    let name = env::var("GREETING_NAME").unwrap_or_else(|_| "World".to_string());
    println!("Hello, {}!", name);

    // File system access (within the sandbox)
    if let Ok(contents) = std::fs::read_to_string("/data/config.txt") {
        println!("Config: {}", contents);
    }

    // Simple computation example
    let result: u64 = (1..=100).sum();
    println!("Sum of 1 to 100: {}", result);
}
```

Compile to Wasm.

```bash
# Compile the Rust project to a WASI target
cargo build --target wasm32-wasip1 --release

# The output binary is at target/wasm32-wasip1/release/hello-wasm.wasm
ls -la target/wasm32-wasip1/release/hello-wasm.wasm
```

Create a Dockerfile for the Wasm module.

```dockerfile
# Dockerfile - Package a Wasm binary as a Docker image
FROM scratch

# Copy the compiled Wasm binary into the image
COPY target/wasm32-wasip1/release/hello-wasm.wasm /hello-wasm.wasm

# Set the entrypoint to the Wasm binary
ENTRYPOINT ["/hello-wasm.wasm"]
```

Build and run the Wasm container.

```bash
# Build the Wasm container image
docker buildx build --platform wasi/wasm -t hello-wasm:latest .

# Run with the WasmEdge runtime
docker run --rm \
  --runtime=io.containerd.wasmedge.v1 \
  --platform=wasi/wasm \
  -e GREETING_NAME=Docker \
  hello-wasm:latest
```

## Running a Wasm Web Server

Wasm containers can serve HTTP traffic when the runtime and application are built for the WASI networking support they need. The standard Rust `wasm32-wasip1` target does not make every Linux networking crate work automatically, so use a Wasm-ready server example or a framework that explicitly supports your target runtime.

```bash
# Run a prebuilt WasmEdge HTTP server example
docker run -d --name wasm-web \
  --runtime=io.containerd.wasmedge.v1 \
  --platform=wasi/wasm \
  -p 8080:8080 \
  secondstate/rust-example-server:latest

# Test the endpoint
curl http://localhost:8080/
```

## Mixing Wasm and Linux Containers in Compose

Docker Compose lets you run Wasm and traditional containers side by side.

```yaml
# docker-compose.yml - Mixed Wasm and Linux container stack
services:
  # Traditional Linux container for the database
  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Wasm container for the API service
  api:
    image: secondstate/rust-example-server:latest
    runtime: io.containerd.wasmedge.v1
    platform: wasi/wasm
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://app:secret@database:5432/myapp
    depends_on:
      - database

  # Traditional Linux container for the frontend
  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api

volumes:
  pgdata:
```

```bash
# Start the mixed stack
docker compose up -d

# Verify all services are running
docker compose ps
```

## Performance Comparison

Compare startup time and memory usage between Wasm and Linux containers.

```bash
# Measure startup time for a Wasm container
time docker run --rm \
  --runtime=io.containerd.wasmedge.v1 \
  --platform=wasi/wasm \
  hello-wasm:latest

# Measure startup time for an equivalent Linux container
time docker run --rm alpine echo "Hello, World!"

# Compare image sizes
docker images hello-wasm
docker images alpine
```

Wasm containers typically show:
- 10-100x faster cold start compared to Linux containers
- 5-10x lower memory usage for equivalent workloads
- Significantly smaller image sizes (often under 1 MB)

## Wasm with Docker Scout

You can scan Wasm container images with Docker Scout just like regular images.

```bash
# Scan a Wasm image for vulnerabilities
docker scout cves hello-wasm:latest

# Compare Wasm image with recommendations
docker scout recommendations hello-wasm:latest
```

Since Wasm images typically build from `scratch` with no OS packages, they have a much smaller attack surface than traditional Linux-based images.

## Limitations and Considerations

Wasm in Docker is powerful but has constraints you should understand before adopting it.

**WASI support is still evolving.** Not all system calls are available. Basic file I/O is supported, but networking support depends on the runtime and libraries you use, and the standard Rust `wasm32-wasip1` target does not support native thread spawning. Features like GPU access, raw sockets, and some advanced filesystem operations are not yet supported.

**Not all languages compile to WASI equally well.** Rust, C, C++, Go (with TinyGo), and AssemblyScript have good support. Python and JavaScript support exists but requires more effort.

**Debugging tools are less mature.** You cannot `docker exec` into a Wasm container the same way you would with a Linux container. Logging and observability require a different approach.

**Ecosystem compatibility.** Your Wasm modules cannot use Docker volumes with full POSIX semantics. Some network features behave differently from Linux containers.

## When to Use Wasm Containers

Wasm containers make the most sense for:

- **Edge computing** where fast startup and small footprint matter
- **Serverless functions** that need millisecond cold start times
- **Security-sensitive workloads** that benefit from Wasm's sandbox model
- **Multi-architecture deployment** where you want one binary for all platforms
- **Lightweight microservices** that do not need a full Linux userspace

Stick with traditional Linux containers when you need:

- Full OS compatibility (system packages, shell access)
- GPU or hardware device access
- Mature debugging and profiling tools
- Broad language and framework support

Docker Desktop's Wasm support bridges the gap between traditional containers and the emerging Wasm ecosystem. You can start experimenting with Wasm for appropriate workloads while keeping your existing container infrastructure in place.
