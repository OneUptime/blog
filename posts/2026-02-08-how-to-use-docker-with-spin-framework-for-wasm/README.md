# How to Use Docker with Spin Framework for Wasm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, WebAssembly, WASM, Spin Framework, Fermyon, Container, Cloud Native

Description: Learn how to build and run WebAssembly applications using the Spin framework inside Docker containers with practical examples.

---

WebAssembly (Wasm) is reshaping how we think about portable application runtimes, and Docker has experimented with this shift. The Spin framework, built by Fermyon, provides a developer-friendly way to create Wasm-based microservices. Combined with Docker Desktop's beta Wasm runtime support, you get a useful stack for building lightweight, secure, and fast applications.

This guide walks you through setting up Docker with the Spin framework, from initial configuration to deploying a working application.

## What Is the Spin Framework?

Spin is an open-source framework for building and running event-driven microservice applications with WebAssembly components. Unlike traditional container workloads that bundle an entire OS layer, Spin applications compile down to small Wasm binaries that start in milliseconds.

Key benefits of Spin include:

- Millisecond cold start times
- Small binary sizes (often under 5 MB)
- Language flexibility (Rust, Go, JavaScript, Python, and more)
- Built-in support for HTTP triggers, Redis triggers, and key-value stores
- Strong sandboxing inherited from the Wasm security model

## Prerequisites

Before getting started, make sure you have the following installed:

- A current Docker Desktop version with Wasm workloads enabled
- Spin CLI (version 3.x)
- Rust toolchain (if writing Spin apps in Rust)
- Rust `wasm32-wasip1` target for Rust Spin components

Install the Spin CLI with this command:

```bash
# Install the latest Spin CLI from Fermyon

curl -fsSL https://spinframework.dev/downloads/install.sh | bash
sudo mv spin /usr/local/bin/
rustup target add wasm32-wasip1
```

## Enabling Docker Wasm Support

Docker Desktop ships with beta Wasm runtime support through containerd shims, but Docker documents this feature as deprecated and no longer actively maintained. For local experimentation, enable it in Docker Desktop settings.

```bash
# Verify Docker supports the Wasm runtime
docker info | grep -i wasm
```

If the output is empty, open Docker Desktop, navigate to Settings > General, enable "Use containerd for pulling and storing images", then go to Settings > Features in Development and enable Wasm workloads.

On Docker Engine, you can also configure the Docker daemon directly by adding this to `/etc/docker/daemon.json`:

```json
{
  "features": {
    "containerd-snapshotter": true
  }
}
```

After making changes, restart Docker:

```bash
# Restart Docker daemon to apply Wasm runtime changes
sudo systemctl restart docker
```

## Creating a Spin Application

Let's create a simple HTTP-triggered Spin application in Rust.

```bash
# Scaffold a new Spin HTTP application using the Rust template
spin new -t http-rust my-spin-app
cd my-spin-app
```

This generates a project structure with a `spin.toml` manifest and a Rust source file. Open the generated handler:

```rust
// src/lib.rs - A simple Spin HTTP handler that returns a JSON greeting
use spin_sdk::http::{IntoResponse, Request, Response};
use spin_sdk::http_component;

#[http_component]
async fn handle_request(req: Request) -> anyhow::Result<impl IntoResponse> {
    let uri = req.uri().to_string();
    Ok(Response::builder()
        .status(200)
        .header("content-type", "application/json")
        .body(format!(r#"{{"message": "Hello from Spin!", "path": "{}"}}"#, uri))
        .build())
}
```

Build the application targeting Wasm:

```bash
# Compile the Spin app to a WebAssembly binary
spin build
```

This produces a `.wasm` file in the `target/wasm32-wasip1/release/` directory.

## Packaging Spin Apps as Docker Images

Docker Desktop can run Wasm workloads through containerd shims, but you still need a container image to distribute them. Create a Dockerfile for your Spin application:

```dockerfile
# Dockerfile - Package a Spin Wasm application for Docker
FROM scratch

# Copy the Spin manifest and compiled Wasm binary
COPY spin.toml /spin.toml
COPY target/wasm32-wasip1/release/my_spin_app.wasm /my_spin_app.wasm

# The Spin shim starts the application from the Spin manifest
ENTRYPOINT ["/spin.toml"]

# Expose the default Spin HTTP port
EXPOSE 80
```

Build the image with the Wasm platform flag:

```bash
# Build a Docker image targeting the wasi/wasm platform
docker buildx build --platform wasi/wasm -t my-spin-app:latest .
```

## Running the Spin Container

Run the container using the Spin shim runtime:

```bash
# Run the Spin Wasm container with the spin shim
docker run -d \
  --name spin-demo \
  --runtime=io.containerd.spin.v2 \
  --platform wasi/wasm \
  -p 3000:80 \
  my-spin-app:latest
```

Test the running application:

```bash
# Send a test request to the Spin application
curl http://localhost:3000/hello
# Expected output: {"message": "Hello from Spin!", "path": "/hello"}
```

## Using Docker Compose with Spin

For multi-service setups, Docker Compose works with Wasm containers:

```yaml
# docker-compose.yml - Run Spin alongside traditional containers
services:
  spin-api:
    image: my-spin-app:latest
    runtime: io.containerd.spin.v2
    platform: wasi/wasm
    ports:
      - "3000:80"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - spin-api
```

This setup puts a traditional Nginx reverse proxy in front of your Spin application, with Redis available for caching or session storage.

## Connecting Spin to External Services

Spin supports outbound HTTP and Redis connections. Configure them in `spin.toml`:

```toml
# spin.toml - Configure allowed outbound connections
spin_manifest_version = 2

[application]
name = "my-spin-app"
version = "0.1.0"

[[trigger.http]]
route = "/..."
component = "my-spin-app"

[component.my-spin-app]
source = "target/wasm32-wasip1/release/my_spin_app.wasm"
allowed_outbound_hosts = ["redis://redis:6379", "https://api.example.com"]

[component.my-spin-app.build]
command = "cargo build --target wasm32-wasip1 --release"
```

## Performance Comparison

Spin Wasm containers differ from traditional containers in meaningful ways:

| Metric | Traditional Container | Spin Wasm Container |
|--------|----------------------|---------------------|
| Cold start | 500ms - 5s | 1 - 10ms |
| Image size | 50MB - 500MB | 1MB - 10MB |
| Memory usage | 50MB - 200MB | 5MB - 20MB |
| Isolation | Linux namespaces | Wasm sandbox |

These numbers make Spin particularly well-suited for serverless workloads, API gateways, and edge deployments where startup speed and resource efficiency matter.

## Debugging Spin Containers

When things go wrong, check the container logs first:

```bash
# View logs from the Spin container
docker logs spin-demo

# Follow logs in real-time for debugging
docker logs -f spin-demo
```

For deeper inspection, you can export the Wasm binary or run the application locally with Spin:

```bash
# Copy the Wasm binary out of the container for inspection
docker cp spin-demo:/my_spin_app.wasm ./debug_copy.wasm

# Test the Spin application locally outside Docker from the project directory
spin up
```

## Multi-Architecture Builds

Push Spin images that work across different Wasm runtimes:

```bash
# Create a multi-platform buildx builder
docker buildx create --name wasm-builder --use

# Build and push for the wasi/wasm platform
docker buildx build \
  --platform wasi/wasm \
  --push \
  -t registry.example.com/my-spin-app:latest .
```

## Production Tips

When using Spin Wasm containers in environments with a supported Spin runtime, keep these practices in mind:

1. **Pin your runtime version** - Wasm shim versions change rapidly. Lock the runtime in your deployment manifests.
2. **Use health checks** - Add HTTP health endpoints to your Spin app and configure Docker health checks.
3. **Limit outbound connections** - The `allowed_outbound_hosts` field in `spin.toml` acts as a firewall. Use it deliberately.
4. **Monitor resource usage** - Even though Wasm containers are lightweight, monitor them through Docker stats or your observability platform.

```bash
# Check resource usage for the running Spin container
docker stats spin-demo --no-stream
```

## Conclusion

Docker's Wasm support combined with the Spin framework opens up a practical path for building fast, portable microservices. The workflow mirrors traditional Docker development closely enough that existing CI/CD pipelines need only minor adjustments. You build, package, and deploy Spin apps just like regular containers, but with dramatically better startup times and smaller footprints.

Start with a simple HTTP handler, get comfortable with the `spin.toml` configuration, and expand from there. The Spin ecosystem is growing quickly, while Docker Desktop's Wasm workload feature remains useful mainly for local experimentation because Docker has deprecated it.
