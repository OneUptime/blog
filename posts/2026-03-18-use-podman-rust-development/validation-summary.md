# Validation Summary: How to Use Podman for Rust Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rust
- Cargo
- Containerfiles / Dockerfile syntax
- Docker Official Rust images
- Actix Web
- Axum
- Docker Compose / Compose Specification
- PostgreSQL
- GDB

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman `build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `compose` documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- Podman `--security-opt` documentation: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- Docker Official Rust image documentation and supported tags: https://hub.docker.com/_/rust
- Official `rust:1-slim-bookworm` Dockerfile: https://github.com/rust-lang/docker-rust/blob/dd106de2954f52f336c3d2c1326ae778c51830f3/stable/bookworm/slim/Dockerfile
- Official `rust:1-alpine3.23` Dockerfile: https://github.com/rust-lang/docker-rust/blob/dd106de2954f52f336c3d2c1326ae778c51830f3/stable/alpine3.23/Dockerfile
- Rust 1.95.0 release announcement: https://blog.rust-lang.org/2026/04/16/Rust-1.95.0/
- Cargo `cargo init` documentation: https://doc.rust-lang.org/cargo/commands/cargo-init.html
- Cargo home documentation: https://doc.rust-lang.org/cargo/guide/cargo-home.html
- Cargo build cache documentation: https://doc.rust-lang.org/cargo/reference/build-cache.html
- Cargo tests guide: https://doc.rust-lang.org/cargo/guide/tests.html
- Rust Reference, linkage and musl static-linking behavior: https://doc.rust-lang.org/stable/reference/linkage.html
- Rust target support for `aarch64-unknown-linux-musl`: https://doc.rust-lang.org/rustc/platform-support/aarch64-unknown-linux-musl.html
- Actix Web docs: https://docs.rs/actix-web/latest/actix_web/
- Actix Web `Logger` docs: https://docs.rs/actix-web/latest/actix_web/middleware/struct.Logger.html
- Axum `serve` docs: https://docs.rs/axum/latest/axum/fn.serve.html
- Docker Compose `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post pinned Rust container examples to `1.77`, which was badly outdated by the validation date. I updated the examples to current official moving tags (`1-bookworm`, `1-slim-bookworm`, `1-alpine3.23`) validated against the current Rust 1.95.0 release and Docker Official Image tags.
- The original text said the Alpine variant "produces fully static binaries," which is too absolute. I corrected it to explain that the Alpine images use musl and a musl-based default Rust target, which is useful for static binaries but not a blanket guarantee for every application and dependency set.
- The dependency-cache section was incomplete and partly inaccurate. It claimed the registry cache stored compiled metadata, and it omitted Cargo's git dependency cache. I corrected the explanation and added `cargo-git` mounts for `/usr/local/cargo/git`, which is part of Cargo home in official docs.
- The dev-image run example did not actually mount all the caches it claimed to use, and it only mounted `src`, which would hide `Cargo.toml` changes from the container. I changed it to mount the full project plus the registry, git, and target caches.
- The Actix live-reload command was missing `-w /app`, so `cargo watch` would not run in the project directory. I added the working directory flag and the missing Cargo git cache mount.
- The Axum example used `axum = "0.7"` while the current official docs are for the 0.8 series. I updated it to `axum = "0.8"` and verified the example compiles with the current API.
- The Compose snippet used a top-level `version: "3.8"` field, which is now obsolete in the Compose Specification and produces a warning. I removed that field.
- I aligned the modernized builder image to `rust:1-slim-bookworm` so it matches the `debian:bookworm-slim` runtime stage and avoids a glibc mismatch between build and runtime images.

## Review Notes
- The Actix and Axum snippets were compiled locally during review using current crates to confirm they still build. Podman itself was not installed in the review environment, so Podman-specific command validation was done against official Podman documentation.
- `podman compose` is a thin wrapper around an external compose provider according to Podman docs. The YAML in the post is valid, but readers still need a compose provider installed if they want to run it with `podman compose`.
- The `scratch` runtime example is technically valid for musl-linked binaries, but applications that need extra runtime assets such as CA certificates may still need to copy those assets into the final image or use a slightly less minimal runtime image.
