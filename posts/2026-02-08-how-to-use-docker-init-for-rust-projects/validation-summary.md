# Validation Summary: How to Use docker init for Rust Projects

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Init
- Dockerfile multi-stage builds
- Docker BuildKit cache and bind mounts
- Docker Compose
- Docker Buildx multi-platform builds
- Rust and Cargo
- Actix Web
- musl static linking
- scratch and distroless container images
- cargo-chef
- cargo-watch

## Sources Consulted
- Docker Init CLI reference: https://docs.docker.com/reference/cli/docker/init/
- Docker Rust image build guide: https://docs.docker.com/guides/rust/build-images/
- Dockerfile reference for `RUN --mount`, bind mounts, and cache mounts: https://docs.docker.com/reference/dockerfile/
- Docker Buildx build reference for `--platform` and `--push`: https://docs.docker.com/reference/cli/docker/buildx/build/
- Actix Web getting started documentation: https://actix.rs/docs/getting-started/
- Cargo Book, `cargo generate-lockfile`: https://doc.rust-lang.org/cargo/commands/cargo-generate-lockfile.html
- Cargo Book, `cargo build` and `--locked`: https://doc.rust-lang.org/cargo/commands/cargo-build.html
- Rust 1.96.0 release announcement: https://blog.rust-lang.org/2026/05/28/Rust-1.96.0/
- cargo-chef README: https://github.com/LukeMathWalker/cargo-chef
- Google Distroless README: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The opening paragraph said Rust produces statically linked binaries. This is too broad because Rust can produce static binaries, but default Linux builds commonly depend on the selected target and runtime libraries. Changed it to "Rust can produce statically linked binaries."
- The Dockerfile examples used Rust 1.75, which is outdated for a 2026 post. Updated the Rust image tags to 1.96, matching the latest official Rust release available on June 4, 2026.
- The generated Dockerfile example omitted the Cargo git cache mount and did not use `--locked`. Added `/usr/local/cargo/git/db` and `cargo build --locked --release`, matching Docker's current Rust build guidance.
- The sample project flow did not create `Cargo.lock`, but the Dockerfile bind-mounted `Cargo.lock` and now builds with `--locked`. Added `cargo generate-lockfile` before running Docker commands.
- The musl/scratch Dockerfile did not install all build dependencies used by Docker's Rust guidance and did not explicitly add the musl target before building with `--target`. Added `clang`, `lld`, `git`, `ca-certificates`, and `rustup target add x86_64-unknown-linux-musl`.
- The cargo-chef install command did not use `--locked`. Updated it to `cargo install --locked cargo-chef`, matching cargo-chef's documented Dockerfile pattern.
- The development Compose example mounted only `src`, but the selected `build` stage uses BuildKit bind mounts for source and manifest files, so `Cargo.toml` and `Cargo.lock` would not be available to `cargo watch` at runtime. Added read-only mounts for both files.
- The cross-compilation section implied that adding the ARM target alone is enough. Clarified that hard-coded Rust targets must be changed per platform and showed compiling with `aarch64-unknown-linux-musl` for an ARM64 musl build.

## Review Notes
The Actix Web sample uses current Actix Web 4 APIs and is syntactically consistent with the official Actix server pattern. The distroless example is valid, but future revisions could mention `:debug` distroless tags for temporary shell access during troubleshooting.
