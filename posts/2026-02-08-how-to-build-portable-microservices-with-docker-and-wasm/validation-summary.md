# Validation Summary: How to Build Portable Microservices with Docker and Wasm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Docker Desktop Wasm workloads
- Docker Buildx
- Docker Compose
- containerd Wasm shims / Wasmtime runtime
- WebAssembly
- WASI preview 1 and WASI 0.2
- Rust
- GitHub Actions

## Sources Consulted
- Docker Docs: Wasm workloads, including Docker Desktop beta/deprecation status, `--platform=wasi/wasm`, Compose `platform`/`runtime`, and Buildx packaging examples: https://docs.docker.com/desktop/features/wasm/
- Docker Docs: Alternative container runtimes and Wasmtime containerd shim setup: https://docs.docker.com/engine/daemon/alternative-runtimes/
- Rustc Book: `wasm32-wasip1` target support and build command: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Rust Blog: rename/removal timeline for `wasm32-wasi` in favor of `wasm32-wasip1`: https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- WASI.dev: WASI 0.1 vs WASI 0.2 modules/components and HTTP/socket interface availability: https://wasi.dev/interfaces
- Docker Build Push Action repository for current major version: https://github.com/docker/build-push-action
- Docker Setup Buildx Action repository for current major version: https://github.com/docker/setup-buildx-action

## Issues Found
- The post used the removed Rust target `wasm32-wasi`. Updated the build commands, GitHub Actions target, and Dockerfile output path to `wasm32-wasip1`, which is the current Rust WASI preview 1 target.
- The post described the Rust sample as an HTTP CRUD service, but the code only defines request-handling logic and does not bind an HTTP listener. Reworded the code comment and added a Compose caveat that real HTTP services need a runtime or framework with WASI HTTP or server networking support.
- The post implied generic WASI networking support for HTTP and gRPC. Updated the explanation to distinguish WASI 0.2 HTTP/socket interfaces from runtime-specific networking support for older WASI preview 1 modules.
- The post described Docker Wasm support too strongly. Added Docker Desktop's current beta/deprecated status and clarified that compatibility requires Docker Wasm support and a compatible runtime.
- The performance table used overly precise universal numbers. Reworded the table as typical relative behavior for small modules and made the auto-scaling claim less absolute.
- Updated GitHub Actions examples from older Docker action major versions to current major versions (`docker/setup-buildx-action@v4` and `docker/build-push-action@v7`).

## Review Notes
- The revised Rust snippet was checked locally with `cargo check --target wasm32-wasip1`; it compiles successfully and only emits expected dead-code warnings because the sample handler is not wired into a server runtime.
- The Docker Compose snippets validate syntactically with the installed Docker Compose CLI, but actually running them requires Docker Desktop Wasm support or an installed Wasm containerd shim.
