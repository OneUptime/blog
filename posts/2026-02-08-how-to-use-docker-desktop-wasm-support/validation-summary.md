# Validation Summary: How to Use Docker Desktop Wasm Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Desktop
- Docker CLI and Buildx
- Docker Compose
- WebAssembly
- WASI / `wasm32-wasip1`
- WasmEdge
- Rust
- Docker Scout

## Sources Consulted
- Docker Docs: Wasm workloads - https://docs.docker.com/desktop/features/wasm/
- Docker Docs: containerd image store - https://docs.docker.com/desktop/features/containerd/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Docker Compose CLI reference - https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: Docker Scout CLI reference - https://docs.docker.com/reference/cli/docker/scout/
- Docker Docs: docker scout cves CLI reference - https://docs.docker.com/reference/cli/docker/scout/cves/
- Rust `wasm32-wasip1` target documentation - https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- WasmEdge Docker + WASM guide - https://wasmedge.org/docs/start/build-and-run/docker_wasm
- WasmEdge Docker quick start - https://wasmedge.org/docs/start/getting-started/quick_start_docker/

## Issues Found
- Docker Desktop Wasm workloads are currently documented as beta and deprecated for future removal. Added this caveat near the start so readers do not treat the feature as a stable production path.
- The Docker Desktop setup path was inaccurate. The containerd image store setting is under Settings > General, while "Enable Wasm" is under Settings > Features in development. Updated the instructions.
- The verification text required the exact output "Hello, world!", but official examples and WasmEdge examples differ in their displayed hello text. Changed it to check for the example's hello output.
- The Rust `warp` web-server example did not compile for `wasm32-wasip1`; local `cargo check --target wasm32-wasip1` failed through `socket2`, which does not support that target. Replaced the section with a prebuilt WasmEdge HTTP server image example.
- The Compose example referenced the removed local `wasm-server:latest` image. Updated it to use `secondstate/rust-example-server:latest`.
- The limitations section said networking, file I/O, and threading work generally. Rust's official `wasm32-wasip1` documentation says not all of `std` works and native thread spawning returns an error. Reworded the limitation to distinguish basic file I/O from runtime/library-dependent networking and unsupported native thread spawning.

## Review Notes
The remaining performance claims are broadly consistent with WasmEdge's Docker guidance, but they are workload-dependent and should be treated as illustrative rather than guaranteed benchmarks.
