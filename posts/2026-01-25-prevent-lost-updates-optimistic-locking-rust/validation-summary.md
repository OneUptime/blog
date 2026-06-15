# Validation Summary: How to Prevent Lost Updates with Optimistic Locking in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- SQLx
- PostgreSQL
- Optimistic locking
- Tokio
- thiserror

## Sources Consulted
- SQLx PostgreSQL type mappings: https://docs.rs/sqlx/latest/sqlx/postgres/types/index.html
- SQLx `query_as!` macro documentation: https://docs.rs/sqlx/latest/sqlx/macro.query_as.html
- SQLx shared SQL type re-exports: https://docs.rs/sqlx/latest/sqlx/types/index.html
- PostgreSQL `UPDATE` documentation: https://www.postgresql.org/docs/current/sql-update.html
- PostgreSQL `RETURNING` documentation: https://www.postgresql.org/docs/current/dml-returning.html
- PostgreSQL explicit locking / `SELECT FOR UPDATE` documentation: https://www.postgresql.org/docs/current/explicit-locking.html

## Issues Found
- The PostgreSQL schema declared `price DECIMAL(10, 2)`, but the Rust examples mapped `price` to `f64`. SQLx maps Rust `f64` to PostgreSQL `DOUBLE PRECISION` / `FLOAT8`, while `NUMERIC` / `DECIMAL` maps to decimal types such as `rust_decimal::Decimal`. Updated the Rust examples to import and use `sqlx::types::Decimal` for `Product.price`, update function parameters, retry closure return types, and test literals.

## Review Notes
- The SQLx examples assume the necessary Cargo features are enabled, including `postgres`, `macros`, a Tokio runtime feature, and `rust_decimal` for `sqlx::types::Decimal`.
- The test snippet references helper functions such as `setup_test_db` and `create_test_product` that are intentionally not defined in the post.
