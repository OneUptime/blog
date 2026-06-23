# Validation Summary: How to Write Integration Tests for Rust APIs with Testcontainers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Tokio
- Axum
- SQLx
- PostgreSQL
- Redis / redis-rs
- Testcontainers for Rust
- testcontainers-modules
- Docker
- reqwest

## Sources Consulted
- Testcontainers for Rust documentation: https://docs.rs/testcontainers/0.27.3
- Testcontainers for Rust quickstart and community modules: https://rust.testcontainers.org/quickstart/community_modules/
- testcontainers-modules crate documentation: https://docs.rs/testcontainers-modules/0.15.0
- testcontainers-modules PostgreSQL module documentation/source: https://docs.rs/testcontainers-modules/0.15.0/testcontainers_modules/postgres/struct.Postgres.html
- testcontainers-modules Redis module documentation/source: https://docs.rs/testcontainers-modules/0.15.0/testcontainers_modules/redis/struct.Redis.html
- redis-rs crate documentation: https://docs.rs/redis/1.2.4
- SQLx crate documentation: https://docs.rs/sqlx/0.9.0
- Axum crate documentation: https://docs.rs/axum/0.8.9
- reqwest crate documentation: https://docs.rs/reqwest/0.13.4

## Issues Found
- The dependency versions were outdated for the current 2026 Rust ecosystem. Updated Axum from 0.7 to 0.8, SQLx from 0.7 to 0.9, redis-rs from 0.24 to 1.2, testcontainers-modules from 0.3 to 0.15, and reqwest from 0.11 to 0.13.
- The Testcontainers examples used the old `clients::Cli`, `Container<'a, T>`, `RunnableImage`, and `docker.run(...)` API. Updated examples to use the current `AsyncRunner`, `ContainerAsync`, and `.start().await` API exposed by `testcontainers-modules`.
- Container host and port lookup examples assumed synchronous `get_host_port_ipv4` calls and hard-coded `localhost`. Updated them to use async `get_host()` and `get_host_port_ipv4(...).await` calls.
- The Redis async connection example used `get_multiplexed_tokio_connection`, which was replaced in current redis-rs releases. Updated it to `get_multiplexed_async_connection`.
- The Redis `query_async` turbofish used the older two-parameter form. Updated it to the current one-parameter form, `query_async::<()>`.
- The parallel transaction helper started a transaction but executed the test closure against the pool, so rollback would not isolate the inserted data. Replaced the helper usage with direct execution against `&mut *tx` followed by rollback.
- The schema isolation example set `search_path` on a pooled connection, which would not reliably apply to all later pool queries. Updated it to build an isolated pool with `PgPoolOptions::after_connect` and run migrations against that pool.
- The custom container configuration examples used obsolete `RunnableImage` and tuple-style `with_env_var` calls. Updated them to use the PostgreSQL module's current builder methods, including `with_db_name`, `with_user`, `with_password`, `with_host_auth`, and `with_init_sql`.
- The best-practices table still recommended reusing a Docker client, which no longer matched the updated runner-based examples. Changed that row to recommend reusing test helpers.

## Review Notes
The examples still assume an application-specific `myapi` crate, routes, models, migrations, and schema, so they are illustrative rather than directly compilable as a standalone project. The SQLx `query!` and `query_as!` macros require a live database or prepared offline metadata at compile time, which is expected SQLx behavior.
