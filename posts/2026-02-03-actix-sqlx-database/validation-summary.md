# Validation Summary: How to Use Actix with SQLx for Database Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Actix Web 4
- SQLx 0.7 (with PostgreSQL)
- PostgreSQL
- Tokio
- serde / serde_json
- chrono
- uuid
- dotenv
- thiserror
- sqlx-cli (migrations + offline query metadata)

## Sources Consulted
- SQLx 0.7 `sqlx-cli` README (install instructions): https://github.com/launchbadge/sqlx/blob/v0.7.4/sqlx-cli/README.md
- SQLx 0.7 `PoolOptions` source (default values): https://github.com/launchbadge/sqlx/blob/v0.7.4/sqlx-core/src/pool/options.rs
- SQLx 0.7 `PoolOptions` docs: https://docs.rs/sqlx/0.7/sqlx/pool/struct.PoolOptions.html
- SQLx 0.7 migration and `query!` / `query_as!` macro semantics (sqlx 0.7 crate docs)
- Actix Web 4 `web::Data`, `ResponseError`, `web::scope`, route configuration (actix-web 4 docs)
- PostgreSQL SQLSTATE codes — `23505` for unique_violation: https://www.postgresql.org/docs/current/errcodes-appendix.html
- SQLx 0.7 transaction executor semantics (`&mut *tx` against `Transaction`) — SQLx 0.7 changelog / docs

## Issues Found
1. **`sqlx-cli` install command missing TLS feature.** The post originally used `cargo install sqlx-cli --no-default-features --features postgres`. In sqlx-cli 0.7 the `sqlx` dependency requires a TLS-enabled runtime feature (`runtime-tokio-native-tls` or `runtime-tokio-rustls`, exposed via the `native-tls` / `rustls` features on sqlx-cli). Without one, the build fails. Updated to `cargo install sqlx-cli --no-default-features --features native-tls,postgres`, which matches the install command shown in the official sqlx-cli 0.7 README.

## Review Notes
- The pool default values shown in the "Key pool settings to tune" table (`max_connections` 10, `min_connections` 0, `idle_timeout` 10 min, `acquire_timeout` 30s) match the SQLx 0.7 `PoolOptions::new()` defaults verified in the source. Correct.
- The `Cargo.toml` snippet includes `actix-rt = "2"` as a top-level dependency. This is harmless — `actix-web = "4"` already pulls in `actix-rt` and exposes `#[actix_web::main]`, so the extra entry is not required. Leaving it does not break anything, so no edit was made.
- `dotenv = "0.15"` works but the `dotenv` crate is unmaintained; the actively maintained fork is `dotenvy`. This is a maintenance concern, not a correctness bug, so the post was left as-is.
- `thiserror = "1"` is listed as a dependency but never actually used in the example code (the `AppError` enum is implemented manually with `impl fmt::Display` and `impl From`). Unused but not incorrect.
- The `query!` / `query_as!` macros require a live `DATABASE_URL` or a committed `.sqlx` offline cache at compile time. This is described correctly in the "Compile-Time Query Checking" section.
- Transaction usage with `.execute(&mut *tx)` is the correct pattern for SQLx 0.7+, where `Transaction` derefs to the underlying connection and `&mut PgConnection` implements `Executor`.
- The PostgreSQL SQLSTATE check for `23505` (unique_violation) is correct.
- `sqlx::query("SELECT 1").execute(pool.get_ref())` in the health check uses the non-macro `query`, which is appropriate since no compile-time validation is desired for a trivial connectivity probe.
- The `runtime-tokio` feature alone (without a `tls-*` feature) is valid in SQLx 0.7 for non-TLS local PostgreSQL connections, so the `Cargo.toml` snippet is fine for the local-dev example shown.
