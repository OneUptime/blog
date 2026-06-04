# How to Use Docker Wasm for Serverless Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, WebAssembly, WASM, Serverless, Function, FaaS, Cloud Native

Description: Deploy serverless functions using Docker and WebAssembly for near-instant cold starts and minimal resource usage.

---

Serverless functions promise instant scaling and pay-per-use billing, but traditional implementations have a well-known weakness: cold starts. When a function has not been invoked recently, the platform must spin up a new runtime instance. For container-based serverless (like AWS Lambda with container images), this can take several seconds in some cases. WebAssembly can reduce that overhead significantly.

Docker's Wasm support lets you package lightweight functions that can start much faster than full OS containers, although exact startup time depends on the runtime, host, image store, and workload. Docker Desktop Wasm workloads are currently a beta feature and are deprecated by Docker, so treat this as a local experimentation pattern or validate your production runtime carefully. This guide shows you how to build, package, and run serverless-style functions using Docker and Wasm, with practical examples you can run locally or adapt for a dedicated Wasm platform.

## Why Wasm for Serverless?

Cold start latency is the biggest complaint about serverless platforms. Here is why Wasm makes a difference:

- Wasm modules can initialize in milliseconds or less, depending on the runtime and workload
- Binary sizes can stay small, reducing pull times
- Memory consumption is a fraction of container-based functions
- The Wasm sandbox provides isolation without a full OS kernel

For serverless workloads, where instances spin up and down constantly, these properties translate directly into better user experience and lower costs.

## Setting Up the Development Environment

You need Docker with Wasm support and a language toolchain that targets Wasm:

```bash
# Install Rust with the WASI preview 1 target for building functions

rustup target add wasm32-wasip1

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
base64 = "0.22"
```

Write the function handler:

```rust
// src/main.rs - Serverless function that processes image resize requests
use base64::Engine;
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
    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(&request.image_data)
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
cargo build --target wasm32-wasip1 --release

# Check the binary size - should be very small
ls -lh target/wasm32-wasip1/release/image-resizer.wasm
```

## Packaging as a Docker Image

Create a minimal Docker image:

```dockerfile
# Dockerfile - Package the serverless function as a Wasm container
FROM scratch
COPY target/wasm32-wasip1/release/image-resizer.wasm /handler.wasm
ENTRYPOINT ["/handler.wasm"]
```

Build and verify:

```bash
# Build the Wasm container image
docker buildx build --platform wasi/wasm -t image-resizer:latest --load .

# Check image size compared to a typical Lambda container
docker images image-resizer
# REPOSITORY      TAG      SIZE
# image-resizer   latest   <a few MB or less>
```

## Building a Function Router

Serverless platforms need a router to dispatch requests to the right function. The function above is a one-shot WASI process that reads from stdin, so HTTP routing requires an adapter service that accepts HTTP requests and invokes the Wasm function container. Here is a lightweight router using Docker Compose:

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
      - image-resizer-adapter
      - text-processor-adapter
      - data-validator-adapter

  # HTTP adapter for the image resizing function
  image-resizer-adapter:
    image: function-adapter:latest
    environment:
      FUNCTION_IMAGE: image-resizer:latest
      FUNCTION_RUNTIME: io.containerd.wasmtime.v1
      FUNCTION_PLATFORM: wasi/wasm
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  # HTTP adapter for the text processing function
  text-processor-adapter:
    image: function-adapter:latest
    environment:
      FUNCTION_IMAGE: text-processor:latest
      FUNCTION_RUNTIME: io.containerd.wasmtime.v1
      FUNCTION_PLATFORM: wasi/wasm
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  # HTTP adapter for the data validation function
  data-validator-adapter:
    image: function-adapter:latest
    environment:
      FUNCTION_IMAGE: data-validator:latest
      FUNCTION_RUNTIME: io.containerd.wasmtime.v1
      FUNCTION_PLATFORM: wasi/wasm
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

Configure the router:

```nginx
# nginx-functions.conf - Route requests to the appropriate function
server {
    listen 80;

    location /functions/image-resize {
        proxy_pass http://image-resizer-adapter:8080;
        proxy_set_header Content-Type application/json;
    }

    location /functions/text-process {
        proxy_pass http://text-processor-adapter:8080;
        proxy_set_header Content-Type application/json;
    }

    location /functions/validate {
        proxy_pass http://data-validator-adapter:8080;
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

For a more realistic test of this one-shot function model, measure process startup and invocation latency including container creation:

```bash
# Benchmark function invocation latency with hyperfine
hyperfine --warmup 0 --runs 50 \
  'docker run --rm --runtime=io.containerd.wasmtime.v1 --platform wasi/wasm image-resizer:latest'
```

## Scale-to-Zero Pattern

Serverless means not running when idle. Docker Compose and Traefik can route to running containers, but Traefik does not scale a Compose service from zero by itself. Implement scale-to-zero with a small controller or adapter that receives the request and starts a one-shot function container on demand:

```yaml
# docker-compose.yml - Scale-to-zero serverless setup
services:
  # Proxy that routes requests to the controller
  function-proxy:
    image: traefik:v3.0
    ports:
      - "8080:80"
      - "8180:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/etc/traefik/traefik.yml

  image-resizer-controller:
    image: function-controller:latest
    environment:
      FUNCTION_IMAGE: image-resizer:latest
      FUNCTION_RUNTIME: io.containerd.wasmtime.v1
      FUNCTION_PLATFORM: wasi/wasm
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.resizer.rule=PathPrefix(`/resize`)"
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

For more reliable chaining, use an event bus. Standard WASI preview 1 programs do not get TCP networking from Rust's standard library, so these functions need a runtime or SDK with the networking support required by your event bus:

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
# Run a constrained serverless function invocation
docker run --rm \
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

Docker Wasm can make serverless-style functions practical without the complexity of managed platforms. You get fast starts, tiny image sizes, and the ability to run the same functions locally and on compatible Wasm runtimes. The tooling is straightforward if you already know Docker, but Docker Desktop's Wasm workload support is deprecated, so validate the runtime path before choosing it for production. Start with a simple function, measure the cold start difference, and build from there.
