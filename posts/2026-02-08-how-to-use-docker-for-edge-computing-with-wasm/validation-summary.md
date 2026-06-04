# Validation Summary: How to Use Docker for Edge Computing with Wasm

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Docker Engine and Docker Desktop
- Docker containerd image store
- containerd Wasm shims / runwasi
- Wasmtime
- WebAssembly and WASI
- Rust
- Docker Buildx
- Docker Compose
- Docker Registry
- Docker networking, Swarm, volumes, restart policies, resource limits, and stats
- Prometheus node-exporter

## Sources Consulted
- Docker Docs: Wasm workloads - https://docs.docker.com/desktop/features/wasm/
- Docker Docs: containerd image store with Docker Engine - https://docs.docker.com/engine/storage/containerd/
- Docker Docs: Alternative container runtimes / Wasmtime shim - https://docs.docker.com/engine/daemon/alternative-runtimes/
- Docker Docs: Docker Compose Wasm workload example - https://docs.docker.com/desktop/features/wasm/
- Docker Docs: docker container run reference - https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: docker container stats reference - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: docker network create reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Docker Swarm init and join references - https://docs.docker.com/reference/cli/docker/swarm/init/
- The rustc book: wasm32-wasip1 target - https://doc.rust-lang.org/rustc/platform-support/wasm32-wasip1.html
- Rust target docs: wasm32_wasip1 target rename notes - https://doc.rust-lang.org/stable/nightly-rustc/rustc_target/spec/targets/wasm32_wasip1/index.html
- containerd/runwasi project documentation - https://github.com/containerd/runwasi

## Issues Found
- The post described Docker Wasm support as native and production-ready without caveats. Updated the wording to state that Docker runs Wasm workloads through containerd shims and noted that Docker Desktop's Wasm workloads feature is beta, deprecated, and no longer actively maintained.
- The Docker Engine `daemon.json` snippet incorrectly registered containerd shims using the runc-style `path` runtime configuration. Replaced it with the documented `containerd-snapshotter` setting and added the documented pattern of installing `containerd-shim-wasmtime-v1` on the Docker daemon host's `PATH`.
- The `daemon.json` snippet contained a JavaScript-style comment inside a `json` fenced block, which would make the copied file invalid JSON. Removed the inline comment.
- The Rust sample moved `reading.device_id` in the temperature alert branch and then reused it in the humidity alert branch, which would fail to compile when both branches are present. Changed the first use to `reading.device_id.clone()`.
- The Rust commands and Dockerfile used the old `wasm32-wasi` target name. Updated them to `wasm32-wasip1`, the current Rust target name for WASI preview 1.
- The update section claimed Wasm containers start in milliseconds and downtime is negligible. Softened this to "can start in milliseconds" and "can be very small" to avoid an unconditional performance guarantee.
- The conclusion said the workflow already works well for production edge deployments. Updated it to recommend validating the runtime choice carefully before production use because Docker's Wasm tooling is still maturing and Docker Desktop's Wasm workload support is deprecated.

## Review Notes
The remaining Docker CLI, Compose, registry, networking, Swarm, volume, restart policy, and `docker stats` examples match documented command shapes. Actual runtime behavior for Wasm workloads still depends on the installed shim, Docker Engine/Desktop version, host architecture, and WASI capabilities exposed by that shim.
