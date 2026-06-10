# Validation Summary: How to Deploy Rust Applications to Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (cargo, release profiles)
- musl libc (static linking, x86_64-unknown-linux-musl target)
- Docker (multi-stage builds, scratch and alpine base images)
- Axum 0.7+ (HTTP server framework)
- Tokio (async runtime, signal handling)
- tracing / tracing-subscriber (structured logging)
- Kubernetes (liveness/readiness probes, resource requests/limits)
- GitHub Actions (CI/CD workflow)
- Docker buildx and the docker/* action ecosystem
- reqwest with rustls-tls
- Swatinem/rust-cache for cargo caching

## Sources Consulted
- Cargo Reference - Profiles: https://doc.rust-lang.org/cargo/reference/profiles.html (verified opt-level, lto, codegen-units, panic, strip values)
- Rustup target documentation: https://rust-lang.github.io/rustup/cross-compilation.html
- Axum documentation: https://docs.rs/axum/latest/axum/ (verified axum::serve and with_graceful_shutdown API for 0.7+)
- Tokio signal documentation: https://docs.rs/tokio/latest/tokio/signal/ (verified ctrl_c and unix::SignalKind::terminate)
- tracing-subscriber documentation: https://docs.rs/tracing-subscriber/ (verified EnvFilter, fmt::layer features)
- Docker Hub - rust image: https://hub.docker.com/_/rust (verified rust:1.75-alpine exists)
- Kubernetes probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- GitHub Actions marketplace (verified action versions: actions/checkout@v4, Swatinem/rust-cache@v2, docker/setup-buildx-action@v3, docker/login-action@v3, docker/metadata-action@v5, docker/build-push-action@v5)
- reqwest features: https://docs.rs/reqwest/ (verified rustls-tls feature flag)

## Issues Found
No technical issues found.

## Review Notes
- The Dockerfile's dependency caching pattern (using `cargo init` to create a dummy package, then overwriting Cargo.toml) is a common idiom but depends on the package name being "app" so the binary path and the `rm ... deps/app*` glob line up. Users with a different package name need to adapt both paths. This is implicitly a generic template, which is acceptable.
- `rust:1.75-alpine` is a perfectly valid image but Rust has progressed significantly since 1.75 (released Dec 2023). Users may want to pin to a more recent stable. Not a technical error.
- `reqwest = "0.11"` is the previous major version (current is 0.12). The 0.11 line still works and still has the `rustls-tls` feature, so the example is correct as written.
- The `tracing` example imports `warn`, `error`, and `Level` but doesn't use them in the snippet. This is harmless example code; a real compile would emit unused-import warnings, but the intent is clearly to show what is typically imported.
- The readiness handler pattern `get(move || readiness(app_state.clone()))` is valid (closure is `Fn + Clone + Send + 'static` thanks to `Arc::clone`), but the idiomatic axum 0.7+ approach is `State` extractor with `.with_state(...)`. Both work; this is a style choice, not a correctness issue.
- `cargo-chef` is generally a more robust alternative to the manual dummy-source dependency caching trick for production Dockerfiles. Not mentioned in the post, but worth knowing as a future improvement.
