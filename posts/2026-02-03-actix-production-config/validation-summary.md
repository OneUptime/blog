# Validation Summary: How to Configure Actix for Production

## Status
validated

## Post Type
Tutorial / Production deployment guide

## Technologies Covered
- Rust (edition 2021)
- Actix Web 4.x
- Rustls 0.23 / rustls-pemfile 2
- Tokio (async runtime, signal handling)
- tracing / tracing-subscriber / tracing-actix-web
- Docker (multi-stage build, debian:bookworm-slim runtime)
- Kubernetes (liveness/readiness probes, SIGTERM handling)
- Linux sysctl/ulimit tuning

## Sources Consulted
- Actix Web `HttpServer` API docs: https://docs.rs/actix-web/4/actix_web/struct.HttpServer.html
- Actix Web feature flags / rustls integration: https://docs.rs/actix-web/latest/actix_web/struct.HttpServer.html#method.bind_rustls_0_23
- `rustls-pemfile` v2 API: https://docs.rs/rustls-pemfile/2/rustls_pemfile/
- `rustls` 0.23 `ServerConfig` builder API: https://docs.rs/rustls/0.23/rustls/
- `tracing` `Span::record` and `Value` trait: https://docs.rs/tracing/0.1/tracing/
- `tracing-actix-web` 0.7 `TracingLogger`: https://docs.rs/tracing-actix-web/0.7/tracing_actix_web/
- Tokio signal handling docs: https://docs.rs/tokio/1/tokio/signal/
- Kubernetes probe configuration reference: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- debian:bookworm-slim package contents (curl not preinstalled).

## Issues Found

1. **Cargo.toml: missing `rustls-0_23` feature on `actix-web`.** The post enabled the feature on `actix-tls` instead, but `HttpServer::bind_rustls_0_23` is gated behind the `rustls-0_23` feature on `actix-web` itself. Without it the TLS example would not compile. Fixed by moving the feature onto `actix-web` and removing the unnecessary direct `actix-tls` dependency (it is a transitive dep of `actix-web`).

2. **Cargo.toml: missing `num_cpus` dependency.** Multiple code samples call `num_cpus::get`, but the crate was not listed in `[dependencies]`. Added `num_cpus = "1"`.

3. **Cargo.toml: redundant `signal` feature on tokio.** `tokio`'s `"full"` feature already includes `"signal"`. The redundant flag was removed (cosmetic, not a functional bug).

4. **Worker settings table: incorrect `client_request_timeout` default.** The table claimed the default was 60s. Per the official `HttpServer` docs, the actual default is 5 seconds (5000ms). Fixed to `5s`.

5. **Dockerfile: HEALTHCHECK uses curl, but curl is not installed.** The runtime image is `debian:bookworm-slim`, which does not ship with `curl`. Only `ca-certificates` was being installed. Added `curl` to the `apt-get install` line so the `HEALTHCHECK CMD curl -f ...` actually works.

## Review Notes

- The documented default for `max_connections` is "25k" (the underlying constant is 25,600). The post says 25,000 — close enough to the documented "25k" rounded figure that it was left as-is.
- `actix-rt = "2"` is technically redundant since `actix-web` re-exports the runtime via `#[actix_web::main]`. It is harmless and was left untouched.
- The simple `Worker Configuration` example does not guard against `WORKERS=0`, while the final `Putting It All Together` example correctly filters with `.filter(|&n| n > 0)`. The Dockerfile sets `ENV WORKERS=0` as a sentinel for "use default", which only works with the full example. This is a stylistic inconsistency between the snippets, not a hard error, and was left as-is.
- The "dummy main.rs" Cargo dependency-caching trick in the Dockerfile is functional but fragile; consider `cargo-chef` for a more robust pattern in future revisions.
- `rust:1.75-bookworm` is fine for Actix Web 4 (MSRV is well below 1.75), but will become outdated; pin to a more recent toolchain in future updates if needed.
- `tracing::Span::current().record("user_id", &user_id)` with `user_id: String` compiles because `tracing` provides `impl Value for String`.
