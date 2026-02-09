# How to Use Docker Wasm for Serverless Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, WebAssembly, Wasm, Serverless, Functions, FaaS, Cloud Native

Description: Deploy serverless functions using Docker and WebAssembly for near-instant cold starts and minimal resource usage.

---

Serverless functions promise instant scaling and pay-per-use billing, but traditional implementations have a well-known weakness: cold starts. When a function has not been invoked recently, the platform must spin up a new runtime instance. For container-based serverless (like AWS Lambda with container images), this can take several seconds. WebAssembly changes this completely.

Docker's Wasm support lets you build serverless functions that start in under 5 milliseconds. This guide shows you how to build, package, and deploy serverless functions using Docker and Wasm, with practical examples you can run locally or in production.

## Why Wasm for Serverless?

Cold start latency is the biggest complaint about serverless platforms. Here is why Wasm makes a difference:

- Wasm modules initialize in microseconds, not seconds
- Binary sizes stay under 10MB, reducing pull times
- Memory consumption is a fraction of container-based functions
- The Wasm sandbox provides isolation without a full OS kernel

For serverless workloads, where instances spin up and down constantly, these properties translate directly into better user experience and lower costs.

## Setting Up the Development Environment

You need Docker with Wasm support and a language toolchain that targets Wasm:

```bash
# Install Rust with the wasm32-wasi target for building functions
rustup target add wasm32-wasi

# Verify Docker Wasm support is available
docker info --format '{{.Runtimes}}'
```

Make sure you see a Wasm-compatible runtime listed (like `io.containerd.wasmtime.v1` or `io.containerd.wasmedge.v1`).

## Building Your First Serverless Function

Let's create an image resizing function. This is a common serverless use case:

```bash
# Create a new Rust project for the serverless function
cargo new --name image-resizer serverless-function
cd serverless-function
```

Define the dependencies:

```toml
# Cargo.toml - Dependencies for the image resizing serverless function
[package]
name = "image-resizer"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
base64 = "0.21"
```

Write the function handler:

```rust
// src/main.rs - Serverless function that processes image resize requests
use serde::{Deserialize, Serialize};
use std::io::{self, Read};

#[derive(Deserialize)]
struct ResizeRequest {
    image_data: String,  // base64-encoded image
    width: u32,
    height: u32,
    format: String,      // "png", "jpeg", "webp"
}

#[derive(Serialize)]
struct ResizeResponse {
    resized_data: String,
    original_size: usize,
    new_width: u32,
    new_height: u32,
    format: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

fn handle_request(body: &str) -> Result<String, String> {
    let request: ResizeRequest = serde_json::from_str(body)
        .map_err(|e| format!("Invalid request: {}", e))?;

    // Decode the base64 image data
    let image_bytes = base64::decode(&request.image_data)
        .map_err(|e| format!("Invalid base64: {}", e))?;

    let original_size = image_bytes.len();

    // In a real implementation, perform the resize operation here
    // For this example, we return metadata about what would happen
    let response = ResizeResponse {
        resized_data: request.image_data, // placeholder
        original_size,
        new_width: request.width,
        new_height: request.height,
        format: request.format,
    };

    serde_json::to_string(&response)
        .map_err(|e| format!("Serialization error: {}", e))
}

fn main() {
    // Read the request from stdin (WASI standard input)
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();

    match handle_request(&input) {
        Ok(response) => println!("{}", response),
        Err(e) => {
            let err = ErrorResponse { error: e };
            println!("{}", serde_json::to_string(&err).unwrap());
        }
    }
}
```

Build the function:

```bash
# Compile the serverless function to WebAssembly
cargo build --target wasm32-wasi --release

# Check the binary size - should be very small
ls -lh target/wasm32-wasi/release/image-resizer.wasm
```

## Packaging as a Docker Image

Create a minimal Docker image:

```dockerfile
# Dockerfile - Package the serverless function as a Wasm container
FROM scratch
COPY target/wasm32-wasi/release/image-resizer.wasm /handler.wasm
ENTRYPOINT ["/handler.wasm"]
```

Build and verify:

```bash
# Build the Wasm container image
docker buildx build --platform wasi/wasm -t image-resizer:latest --load .

# Check image size compared to a typical Lambda container
docker images image-resizer
# REPOSITORY      TAG      SIZE
# image-resizer   latest   1.8MB
```

## Building a Function Router

Serverless platforms need a router to dispatch requests to the right function. Here is a lightweight function router using Docker Compose:

```yaml
# docker-compose.yml - Serverless function platform with multiple functions
services:
  # Nginx-based function router
  router:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx-functions.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - image-resizer
      - text-processor
      - data-validator

  # Image resizing function
  image-resizer:
    image: image-resizer:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm

  # Text processing function
  text-processor:
    image: text-processor:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm

  # Data validation function
  data-validator:
    image: data-validator:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
```

Configure the router:

```nginx
# nginx-functions.conf - Route requests to the appropriate function
server {
    listen 80;

    location /functions/image-resize {
        proxy_pass http://image-resizer:80;
        proxy_set_header Content-Type application/json;
    }

    location /functions/text-process {
        proxy_pass http://text-processor:80;
        proxy_set_header Content-Type application/json;
    }

    location /functions/validate {
        proxy_pass http://data-validator:80;
        proxy_set_header Content-Type application/json;
    }

    location /health {
        return 200 '{"status": "ok"}';
        add_header Content-Type application/json;
    }
}
```

## Measuring Cold Start Performance

Cold start time is the key metric. Measure it accurately:

```bash
# Script to measure cold start time for a Wasm function
#!/bin/bash

# Remove any existing container
docker rm -f cold-start-test 2>/dev/null

# Measure the time from docker run to first response
START=$(date +%s%N)

docker run --rm \
  --name cold-start-test \
  --runtime=io.containerd.wasmtime.v1 \
  --platform wasi/wasm \
  image-resizer:latest

END=$(date +%s%N)

# Calculate elapsed time in milliseconds
ELAPSED=$(( (END - START) / 1000000 ))
echo "Cold start time: ${ELAPSED}ms"
```

For a more realistic test, measure HTTP response time including container creation:

```bash
# Benchmark function invocation latency with hyperfine
hyperfine --warmup 0 --runs 50 \
  'docker run --rm --runtime=io.containerd.wasmtime.v1 --platform wasi/wasm image-resizer:latest'
```

## Scale-to-Zero Pattern

Serverless means not running when idle. Implement scale-to-zero with a proxy that starts functions on demand:

```yaml
# docker-compose.yml - Scale-to-zero serverless setup
services:
  # Proxy that wakes up functions on demand
  function-proxy:
    image: traefik:v3.0
    ports:
      - "8080:80"
      - "8180:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/etc/traefik/traefik.yml

  image-resizer:
    image: image-resizer:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.resizer.rule=PathPrefix(`/resize`)"
    deploy:
      replicas: 0  # Start with zero instances
```

## Function Chaining

Complex workflows chain multiple functions together. Build a pipeline where one function's output feeds the next:

```bash
# Chain functions together: validate input, then process, then format output
curl -s http://localhost:8080/functions/validate \
  -d '{"data": "raw input"}' | \
curl -s http://localhost:8080/functions/text-process \
  -d @- | \
curl -s http://localhost:8080/functions/image-resize \
  -d @-
```

For more reliable chaining, use an event bus:

```yaml
# docker-compose.yml - Function chaining with NATS as the event bus
services:
  nats:
    image: nats:2-alpine
    ports:
      - "4222:4222"

  step-one:
    image: validate-function:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    environment:
      NATS_URL: "nats://nats:4222"
      INPUT_SUBJECT: "pipeline.start"
      OUTPUT_SUBJECT: "pipeline.validated"

  step-two:
    image: process-function:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    environment:
      NATS_URL: "nats://nats:4222"
      INPUT_SUBJECT: "pipeline.validated"
      OUTPUT_SUBJECT: "pipeline.complete"
```

## Monitoring Serverless Functions

Track function invocations, latency, and errors:

```yaml
# docker-compose.monitoring.yml - Observability for serverless functions
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

## Production Deployment Considerations

When moving Wasm serverless functions to production:

1. **Set memory limits** - Even lightweight Wasm functions should have explicit memory caps
2. **Configure timeouts** - Kill functions that run longer than expected
3. **Use read-only filesystems** - Serverless functions should be stateless
4. **Log to stdout** - Docker captures stdout logs automatically
5. **Version your functions** - Tag images with semantic versions, not just "latest"

```bash
# Run a production-ready serverless function with proper constraints
docker run -d \
  --name resizer-prod \
  --runtime=io.containerd.wasmtime.v1 \
  --platform wasi/wasm \
  --memory=64m \
  --read-only \
  --restart=no \
  --log-driver=json-file \
  --log-opt max-size=10m \
  image-resizer:v1.2.3
```

## Conclusion

Docker Wasm makes serverless functions practical without the complexity of managed platforms. You get sub-millisecond cold starts, tiny image sizes, and the ability to run the same functions locally and in production. The tooling is straightforward if you already know Docker. Start with a simple function, measure the cold start difference, and build from there.
