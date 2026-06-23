# Validation Summary: How to Create Minimal Docker Images for Rust Binaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Cargo release profiles
- Docker and Docker Buildx
- Docker multi-stage builds
- Alpine Linux and musl libc
- Static linking
- Distroless container images
- scratch container images
- reqwest, SQLx, and tonic TLS features
- Trivy image scanning
- Kubernetes securityContext

## Sources Consulted
- Rust release announcements: https://blog.rust-lang.org/releases/
- Rust official Docker image tags: https://github.com/docker-library/official-images/blob/master/library/rust
- Alpine Linux downloads and current release: https://www.alpinelinux.org/downloads/
- Alpine official Docker image tags: https://github.com/docker-library/official-images/blob/master/library/alpine
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker multi-platform builds documentation: https://docs.docker.com/build/building/multi-platform/
- Distroless README: https://github.com/GoogleContainerTools/distroless/blob/main/README.md
- Cargo profile documentation: https://doc.rust-lang.org/cargo/reference/profiles.html
- reqwest TLS and feature documentation: https://docs.rs/reqwest/latest/reqwest/tls/
- reqwest feature flags: https://docs.rs/crate/reqwest/latest/features
- SQLx runtime and TLS documentation: https://docs.rs/sqlx/latest/sqlx/
- tonic feature flags: https://docs.rs/crate/tonic/latest/features
- cross crate documentation: https://docs.rs/cross/

## Issues Found
- The post used outdated Rust 1.75 and Alpine 3.19 image tags. Updated examples to Rust 1.96 and Alpine 3.24, matching the current releases available on the review date.
- The image size comparison described scratch images as having no attack surface. Changed this to "Very low" because the application binary, copied certificates, and runtime configuration can still contain vulnerabilities.
- The scratch Dockerfile verified static linking with `ldd | grep "statically linked"`, which is not portable across libc implementations and can fail with "not a dynamic executable". Changed the Dockerfile verification to use `file` and added the `file` package to the builder image.
- The OpenSSL guidance stated that OpenSSL requires shared libraries. Changed the wording because OpenSSL can be statically linked with extra setup, but rustls is usually simpler for static Rust binaries.
- The reqwest, SQLx, and tonic examples used old crate versions and, for tonic, an outdated TLS feature name. Updated the examples to current versions and feature names.
- The Docker Buildx example claimed cross-compilation while pinning the build stage to `linux/amd64`, which would not produce the requested ARM64 binary. Changed it to build for `$TARGETPLATFORM`.
- The multi-architecture Dockerfile mapped target triples but did not install or configure the required cross-linkers for non-native musl targets. Reworked the example to use Buildx platform emulation by building inside the target platform image.
- The Trivy example implied scratch/distroless images guarantee zero vulnerabilities. Changed the wording to clarify that OS package findings may be zero, but application dependencies still need scanning.

## Review Notes
- The examples use placeholder binary name `myapp`; users must replace it with their actual Cargo package binary name.
- The size numbers remain approximate and will vary with Rust version, dependencies, CPU architecture, and whether debug symbols are stripped.
- Buildx platform emulation is correct and simple, but it can be slower than native multi-node builds or a fully configured cross-compilation toolchain.
