# Validation Summary: How to Speed Up Docker Build for Rust Projects

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker and Dockerfile multi-stage builds
- Docker BuildKit cache mounts and secret mounts
- Rust and Cargo builds
- Cargo build cache behavior
- cargo-chef
- musl static linking
- sccache with S3-backed caching
- .dockerignore build context optimization

## Sources Consulted
- Docker Docs: Build cache invalidation - https://docs.docker.com/build/cache/invalidation/
- Docker Docs: Optimize cache usage in builds / cache mounts - https://docs.docker.com/build/cache/optimize/
- Docker Docs: Dockerfile reference for RUN cache mounts, secret mounts, COPY, and multi-stage COPY - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build your Rust image - https://docs.docker.com/guides/rust/build-images/
- Docker Official Image: rust - https://hub.docker.com/_/rust/
- The Cargo Book: Build cache - https://doc.rust-lang.org/cargo/reference/build-cache.html
- cargo-chef README - https://github.com/LukeMathWalker/cargo-chef
- sccache README and Rust usage docs - https://github.com/mozilla/sccache and https://github.com/mozilla/sccache/blob/main/docs/Rust.md
- sccache S3 storage docs - https://android.googlesource.com/toolchain/sccache/+/HEAD/docs/S3.md
- Rust blog: Updating Rust's Linux musl targets - https://blog.rust-lang.org/2023/05/09/Updating-musl-targets/

## Issues Found
- The Dockerfile examples pinned Rust to `rust:1.77`, which is outdated for examples that install current build tools. Current `sccache` source builds require a newer Rust toolchain, so the examples now use the current stable Rust image tags such as `rust:1`, `rust:1-slim`, and `rust:1-alpine`.
- The `cargo-chef` and `sccache` install commands omitted `--locked`. Updated them to `cargo install --locked ...`, matching the projects' documented installation commands and avoiding dependency-resolution drift.
- The sccache Dockerfile claimed AWS credentials were passed as build secrets but used `ARG`, which is not the same as a BuildKit secret mount. Replaced the build args with `RUN --mount=type=secret,...,env=...` and added the matching `docker build --secret` command.
- The sccache statistics command was in a separate `RUN` instruction. Combined it with the build command so it reports on the same sccache server invocation used during the build.
- The musl section said the binary requires "zero runtime dependencies" while the example still copies CA certificates for TLS. Reworded the claim to say musl avoids shared library dependencies and kept the CA certificate caveat explicit.

## Review Notes
- The examples intentionally use `myapp` and `myapp-server` as placeholders; real projects must adjust binary names, package names, features, and workspace members.
- The dummy build trick remains valid for simple binary crates, but `cargo-chef` is more robust for workspaces, build scripts, feature flags, and projects with multiple targets.
- Cache mount contents are performance caches and can be garbage-collected by Docker; builds should still work without assuming the cache is always present.
