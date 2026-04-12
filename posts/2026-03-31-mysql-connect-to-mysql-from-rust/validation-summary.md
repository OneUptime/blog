# Validation Summary: How to Connect to MySQL from Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- MySQL
- sqlx crate (v0.8) — async MySQL driver with compile-time query verification
- mysql crate (v25) — synchronous MySQL driver
- Tokio async runtime
- dotenvy (previously dotenv) for environment variable loading

## Sources Consulted
- sqlx crate documentation on docs.rs: https://docs.rs/sqlx/0.8
- sqlx `query_as!` macro documentation (confirms `FromRow` is not used by the macro)
- sqlx `MySqlPoolOptions` / `PoolOptions` API docs
- mysql crate documentation on docs.rs: https://docs.rs/mysql/25
- RUSTSEC-2021-0141 advisory for the `dotenv` crate
- dotenvy crate on crates.io: https://crates.io/crates/dotenvy

## Issues Found

1. **Unnecessary `#[derive(sqlx::FromRow)]` on struct used with `query_as!` macro**
   - **What was wrong:** The `Product` struct derived `sqlx::FromRow`, but it was used exclusively with the `query_as!` macro. The `query_as!` macro does not use `FromRow` — it performs its own compile-time column-to-field mapping. The `FromRow` trait is only needed with the runtime function `query_as()` (without the `!`). The derive was superfluous and misleading.
   - **What was changed:** Removed `sqlx::FromRow` from the derive, leaving `#[derive(Debug)]`.
   - **Why:** Prevents readers from incorrectly believing `FromRow` is required for `query_as!`.

2. **Unmaintained `dotenv` crate with security advisory**
   - **What was wrong:** The dependencies listed `dotenv = "0.15"`. The `dotenv` crate has not been updated since 2020 and has a security advisory (RUSTSEC-2021-0141). The community-standard replacement is `dotenvy`.
   - **What was changed:** Replaced `dotenv = "0.15"` with `dotenvy = "0.15"` in the Cargo.toml snippet.
   - **Why:** `dotenvy` is the actively maintained fork with the same API, and using the unmaintained `dotenv` would trigger `cargo audit` warnings.

## Review Notes
- The `mysql` crate is pinned to version 25. Version 26 may be available; the APIs demonstrated should be compatible, but the post may benefit from a version bump in the future.
- The compile-time verification section correctly notes that `DATABASE_URL` must be set at build time, but does not mention `cargo sqlx prepare` for offline mode. This is a common workflow but not an inaccuracy — just an omission readers may want to explore.
- All sqlx API calls (`MySqlPoolOptions::new()`, `max_connections()`, `connect()`, `query_scalar()`, `query!`, `query_as!`, `pool.begin()`, `execute(&mut *tx)`, `tx.commit()`, `result.last_insert_id()`) are correct for sqlx 0.8.
- All mysql crate API calls (`Pool::new()`, `get_conn()`, `conn.query()` with tuple destructuring) are correct for mysql 25.
