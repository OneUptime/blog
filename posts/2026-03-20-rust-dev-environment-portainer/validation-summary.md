# Validation Summary: How to Set Up a Rust Development Environment with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Cargo
- Docker Compose
- Portainer stacks
- cargo-watch
- Axum
- Tokio
- serde_json
- tracing and tracing-subscriber
- Alpine Linux packages
- sccache

## Sources Consulted
- Docker Compose file reference and version/name top-level elements: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Rust official image documentation and tag metadata: https://hub.docker.com/_/rust/ and https://registry.hub.docker.com/v2/repositories/library/rust/tags/1.95.0-alpine
- Rust 1.95.0 release announcement: https://blog.rust-lang.org/2026/04/16/Rust-1.95.0/
- cargo-watch documentation: https://github.com/watchexec/cargo-watch and https://docs.rs/crate/cargo-watch/latest
- Cargo Book, `cargo install`, profiles, and build cache: https://doc.rust-lang.org/stable/cargo/commands/cargo-install.html, https://doc.rust-lang.org/cargo/reference/profiles.html, and https://doc.rust-lang.org/cargo/reference/build-cache.html
- Axum documentation: https://docs.rs/crate/axum/0.8.9 and https://docs.rs/axum/latest/axum/struct.Router.html
- Tokio `TcpListener` documentation: https://docs.rs/tokio/latest/tokio/net/struct.TcpListener.html
- serde_json and tracing-subscriber documentation: https://docs.rs/serde_json/latest/serde_json/macro.json.html and https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/fn.init.html
- Alpine Linux package index for `musl-dev` and `pkgconf` / `pkgconfig`: https://pkgs.alpinelinux.org/package/edge/main/x86/musl-dev and https://pkgs.alpinelinux.org/package/edge/main/x86/pkgconf
- sccache documentation: https://github.com/mozilla/sccache and https://doc.rust-lang.org/cargo/reference/build-cache.html

## Issues Found
- Removed the obsolete top-level `version: "3.8"` field from the Compose snippet. Docker Compose now treats this field as backward-compatible metadata and warns that it is obsolete.
- Updated the Docker image from `rust:1.77-alpine` to `rust:1.95.0-alpine`. Rust 1.95.0 is the current stable release on the validation date, and the Docker Hub tag exists.
- Changed `cargo install cargo-watch` to `cargo install cargo-watch --locked`, matching cargo-watch's documented source install command and avoiding unexpected dependency resolution changes.
- Updated `axum = "0.7"` to `axum = "0.8"`. The example code compiles against Axum 0.8.9 and uses current APIs.
- Corrected the build-time optimization wording. The original text said the snippet used a faster linker, but it only set normal dev-profile optimization and debug-info options.
- Clarified the `sccache` sentence so it says to use `sccache` as a compiler cache with `RUSTC_WRAPPER=sccache` and a persisted cache directory.

## Review Notes
- Verified the Rust example with `cargo check` using `axum = "0.8"`, Tokio 1.x, serde_json 1.x, tracing 0.1, and tracing-subscriber 0.3.
- cargo-watch is still usable, but its project documentation says it is on life support and recommends Bacon or Watchexec for new workflows.
- The relative `./app:/app` bind mount assumes the `app` directory is present in the Compose project context available to Portainer.
