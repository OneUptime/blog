# Validation Summary: How to Build Connection Pools with bb8 and deadpool in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Tokio
- PostgreSQL
- tokio-postgres
- bb8
- bb8-postgres
- deadpool
- deadpool-postgres
- Axum

## Sources Consulted
- bb8 0.8.6 documentation: https://docs.rs/bb8/0.8.6/bb8/
- bb8 Builder documentation: https://docs.rs/bb8/0.8.6/bb8/struct.Builder.html
- bb8-postgres 0.8.1 documentation and source: https://docs.rs/bb8-postgres/0.8.1/bb8_postgres/
- deadpool-postgres 0.12.1 Config documentation: https://docs.rs/deadpool-postgres/0.12.1/deadpool_postgres/struct.Config.html
- deadpool-postgres 0.12.1 PoolConfig documentation: https://docs.rs/deadpool-postgres/0.12.1/deadpool_postgres/struct.PoolConfig.html
- deadpool-postgres 0.12.1 ManagerConfig documentation: https://docs.rs/deadpool-postgres/0.12.1/deadpool_postgres/struct.ManagerConfig.html
- deadpool-postgres 0.12.1 RecyclingMethod documentation: https://docs.rs/deadpool-postgres/0.12.1/deadpool_postgres/enum.RecyclingMethod.html
- deadpool managed pool documentation: https://docs.rs/deadpool/latest/deadpool/managed/
- Axum 0.7 documentation: https://docs.rs/axum/0.7/

## Issues Found
- The deadpool recycling example used `cfg.builder(NoTls)?.recycling_method(...)`, but `deadpool-postgres 0.12.1` does not provide a `recycling_method` method on `PoolBuilder`. Updated the example to set `cfg.manager = Some(ManagerConfig { recycling_method: RecyclingMethod::Verified })` and create the pool with `create_pool(Some(Runtime::Tokio1), NoTls)`.
- The deadpool recycling comments said `Fast` performs no validation. Official docs state it checks `Client::is_closed()`. Updated the comment.
- The deadpool recycling comments said `Clean` runs `DISCARD ALL`. Official docs state it runs a reset sequence similar to `DISCARD ALL` while preserving statement-cache behavior. Updated the comment.
- The bb8 health-check text implied custom PostgreSQL test queries could be configured in the shown builder path. `bb8-postgres` validates with a lightweight query through its `ManageConnection` implementation. Updated the comment to describe the adapter behavior accurately.
- The runtime-support comparison said bb8 supports "Any async". bb8's official docs describe it as tokio-based. Updated the comparison table.

## Review Notes
- Representative bb8, deadpool-postgres, retry-helper, and fixed recycling examples were compile-checked with `cargo check` against the versions named in the post: `bb8 0.8.6`, `bb8-postgres 0.8.1`, `deadpool-postgres 0.12.1`, `tokio-postgres 0.7.x`, Tokio 1, and Axum 0.7.
- Newer compatible crate releases exist, including `bb8 0.9.x`, `bb8-postgres 0.9.x`, `deadpool-postgres 0.14.x`, and Axum 0.8.x. The post remains accurate for the versions it specifies.
