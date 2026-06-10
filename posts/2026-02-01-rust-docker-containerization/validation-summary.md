# Validation Summary: How to Use Rust with Docker for Containerization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (1.75)
- Actix-web (web framework)
- Tokio (async runtime, signal handling)
- Docker / Dockerfile (multi-stage builds, scratch, alpine)
- musl libc / `x86_64-unknown-linux-musl` target
- Docker Compose (v3.8 schema)
- PostgreSQL (compose service example)
- Debian (bookworm-slim base image)
- Alpine Linux (3.19)

## Sources Consulted
- The Rust Reference — Linkage: https://doc.rust-lang.org/reference/linkage.html
- The rustc book — Codegen Options: https://doc.rust-lang.org/rustc/codegen-options/index.html
- Rust Edition Guide — musl support for fully static binaries: https://doc.rust-lang.org/edition-guide/rust-2018/platform-and-target-support/musl-support-for-fully-static-binaries.html
- Actix-web documentation: https://actix.rs/docs/
- Tokio signal docs: https://docs.rs/tokio/latest/tokio/signal/
- Docker Hub `rust` image: https://hub.docker.com/_/rust
- Dockerfile reference — HEALTHCHECK: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Compose specification: https://docs.docker.com/compose/compose-file/
- Alpine packages (musl-dev, openssl-libs-static, pkgconfig): https://pkgs.alpinelinux.org/

## Issues Found
1. **Incorrect RUSTFLAGS for static linking (musl section).** The original snippet set `ENV RUSTFLAGS='-C target-feature=-crt-static'` with a comment claiming this produces a static binary. The minus sign in `-crt-static` actually *disables* static CRT linkage, which would cause the resulting binary to dynamically link against musl libc. That binary would then fail to start in the `FROM scratch` runtime stage because no `libc.so` is present. Per the Rust Reference, the `x86_64-unknown-linux-musl` target already statically links the C runtime by default, so the flag was both wrong and unnecessary. Fix: removed the `ENV RUSTFLAGS=...` line and updated the adjacent comment to note that the musl target produces a fully static binary by default. This restores the example to a working state without changing the surrounding flow.

## Review Notes
- The dependency-caching pattern using a dummy `main.rs` plus `touch src/main.rs` is a well-known approach and works for the simple single-binary case shown. For more complex setups (workspaces, multiple binaries, lib + bin), `cargo-chef` is more robust — worth a mention if the post is ever expanded, but not incorrect as written.
- `version: '3.8'` at the top of the Compose files is now considered obsolete by the Compose spec (Compose v2 ignores it and emits a deprecation warning), but it remains functional and is still widely used in tutorials. Not a correctness issue.
- The shutdown signal helper using `tokio::signal::unix::signal(SignalKind::terminate())` requires the `signal` Tokio feature (and is Unix-only). Both assumptions are reasonable for a containerized Linux deployment but were not called out explicitly in the post.
- The note "we use the full Rust image here" above `FROM rust:1.75-slim` is slightly inconsistent (the `-slim` variant is *not* the full image), but this is a stylistic nit, not a technical error, so it was left as-is per the review rules.
- Image-size estimates (1GB → 80–100MB → 10–20MB) are reasonable order-of-magnitude figures for the example app and align with common community results.
