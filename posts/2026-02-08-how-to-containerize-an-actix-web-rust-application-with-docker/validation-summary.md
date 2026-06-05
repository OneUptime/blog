# Validation Summary: How to Containerize an Actix Web (Rust) Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Cargo
- Actix Web
- Docker
- Docker Compose
- Alpine Linux
- SQLx
- PostgreSQL
- cargo-chef
- cargo-watch

## Sources Consulted
- Actix Web Getting Started: https://actix.rs/docs/getting-started
- Actix Web Server documentation: https://actix.rs/docs/server
- Actix Web `HttpServer` API documentation: https://docs.rs/actix-web/latest/actix_web/struct.HttpServer.html
- Docker Rust image build guide: https://docs.docker.com/guides/rust/build-images/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Rust official image documentation: https://hub.docker.com/_/rust/
- Rust official Docker image source template: https://github.com/rust-lang/docker-rust/blob/master/Dockerfile-alpine.template
- Rust Reference, linkage and static/dynamic C runtimes: https://doc.rust-lang.org/reference/linkage.html
- SQLx crate documentation: https://docs.rs/sqlx/latest/sqlx/
- SQLx 0.7 feature documentation: https://docs.rs/crate/sqlx/0.7.0

## Issues Found
- The post stated that the final Rust binary is statically linked and runs without runtime dependencies. This was too broad because static C runtime linking depends on the build target and `crt-static` configuration. I changed the language to make the `scratch` path conditional on a static-compatible target such as musl and added `RUSTFLAGS="-C target-feature=+crt-static"` to the scratch-oriented Dockerfiles.
- The Docker Compose examples used `version: "3.8"`. Docker's current Compose Specification marks the top-level `version` property obsolete and only informative, so I removed it from both Compose snippets.
- The SQLx dependency used `runtime-tokio-rustls`, which SQLx 0.7 documents as soft-deprecated. I updated the example to SQLx 0.9 with separate `runtime-tokio` and `tls-rustls-aws-lc-rs` features, and updated the note to refer to Rustls TLS features instead of the deprecated combined feature.
- The post claimed `scratch` images are typically 5-10MB. That size is dependency- and binary-dependent, so I changed it to a less absolute statement.

## Review Notes
The main Actix Web example was checked with `cargo check` against the current `actix-web = "4"` release available to Cargo. Both Compose snippets were parsed with `docker compose config --quiet`. Pulling `rust:1.77-alpine` for an end-to-end Docker build was blocked by Docker Hub unauthenticated pull limits, so Docker verification used official documentation and local Compose parsing instead.
