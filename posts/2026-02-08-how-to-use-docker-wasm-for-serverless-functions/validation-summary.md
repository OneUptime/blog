# Validation Summary: How to Use Docker Wasm for Serverless Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Desktop Wasm workloads
- Docker Buildx
- Docker Compose
- WebAssembly / WASI
- Rust
- Nginx
- Traefik
- NATS
- Prometheus
- Grafana

## Sources Consulted
- Docker Docs: Wasm workloads, https://docs.docker.com/desktop/features/wasm/
- Docker Docs: docker buildx build reference, https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Compose services reference, https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose deploy specification, https://docs.docker.com/reference/compose-file/deploy/
- Rust Blog: Changes to Rust's WASI targets, https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- The rustc book: wasm32-wasip1 target, https://doc.rust-lang.org/rustc/platform-support/wasm32-wasip1.html
- Traefik Docs: Docker provider, https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- Local CLI checks: `docker buildx build --help`, `docker run --help`, `docker compose config -q`, `rustup target list`

## Issues Found
- The post used the removed Rust `wasm32-wasi` target. Updated setup, build, and Dockerfile paths to `wasm32-wasip1`, which is the current WASI preview 1 target.
- The post presented Docker Desktop Wasm support as production-ready and actively supported. Added a caveat that Docker Desktop Wasm workloads are beta and deprecated by Docker.
- Startup and size claims were too absolute, including guaranteed under-5ms and sub-millisecond cold starts. Reworded them to describe likely benefits while noting runtime, host, image store, and workload dependence.
- The HTTP router example proxied directly to one-shot WASI functions that read stdin and do not listen on port 80. Updated the example to route through HTTP adapter services that invoke the Wasm function containers.
- The router Compose example had stale `depends_on` entries after introducing adapters. Updated them to match the adapter service names.
- The image size example used a fixed value. Replaced it with a less brittle placeholder because actual size depends on build settings and dependency versions.
- The benchmarking text claimed to measure HTTP latency, but the command measured container startup and one-shot invocation latency. Corrected the description.
- The scale-to-zero example implied Traefik can start a Compose service from zero replicas by itself. Reworded it to require a controller or adapter and removed the misleading `deploy.replicas: 0` example.
- The NATS chaining example implied standard Rust WASI preview 1 networking works out of the box. Added a note that event-bus functions need a runtime or SDK with required networking support.
- The production `docker run -d` example was inaccurate for a one-shot stdin function because it would exit immediately. Changed it to a constrained `docker run --rm` invocation.

## Review Notes
The Rust function example was compiled successfully with `base64` 0.22 and `wasm32-wasip1`. The updated Compose snippets were validated with `docker compose config -q`. The adapter and controller images remain conceptual placeholders; a future revision could provide a concrete adapter implementation.
