# Validation Summary: How to Use MySQL with Diesel (Rust ORM)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Diesel ORM 2.1
- MySQL
- BigDecimal (numeric precision)
- Homebrew (macOS dependency management)
- Cargo / Diesel CLI

## Sources Consulted
- Diesel 2.1.0 `Numeric` SQL type documentation: https://docs.rs/diesel/2.1.0/diesel/sql_types/struct.Numeric.html
- Diesel 2.1.0 crate feature flags: https://docs.rs/crate/diesel/2.1.0/features
- Homebrew mysql-client formula: https://formulae.brew.sh/formula/mysql-client

## Issues Found

1. **Missing `numeric` feature flag in Diesel dependency**: The `Cargo.toml` listed `features = ["mysql", "chrono"]` but the model uses `bigdecimal::BigDecimal` for the `price` field (mapped from MySQL `DECIMAL(10,2)`). Diesel 2.1 requires the `bigdecimal` feature (or the `numeric` umbrella feature which includes it) to provide `FromSql<Numeric, Mysql>` and `ToSql<Numeric, Mysql>` implementations for `BigDecimal`. Added `"numeric"` to the features list.

2. **Missing `bigdecimal` crate dependency**: The model code references `bigdecimal::BigDecimal` directly, but the `bigdecimal` crate was not listed in `Cargo.toml` dependencies. Diesel does not re-export this type. Added `bigdecimal = "0.3"` (Diesel 2.1 requires `bigdecimal >= 0.0.13, < 0.4.0`).

3. **Select query would fail to compile**: The `Product` struct has 6 fields (omitting `created_at`) but the query `products.filter(...).load::<Product>(conn)` selects all 7 columns from the table. In Diesel 2.x, the `Queryable` impl generated for `Product` expects only the 6 columns matching its fields, so this type mismatch causes a compile error. Fixed by adding `.select(Product::as_select())` before `.load()`, which leverages the `Selectable` derive already present on the struct.

4. **macOS Homebrew path only valid for Intel Macs**: The `PKG_CONFIG_PATH` was set to `/usr/local/opt/mysql-client/lib/pkgconfig`, which is the Homebrew prefix for Intel Macs only. On Apple Silicon Macs (M1+), the correct path is `/opt/homebrew/opt/mysql-client/lib/pkgconfig`. Added both variants with architecture labels.

## Review Notes
- The `chrono` feature and `chrono` crate dependency are included but not used in the model code (the `created_at` column is intentionally omitted from the Rust struct). This is not wrong but is unnecessary for this tutorial.
- The `diesel_migrations` crate is listed in `[dev-dependencies]` but is never referenced in the tutorial code. It would be needed for embedded/programmatic migrations but the post uses the Diesel CLI instead.
- The `bigdecimal` version constraint (`< 0.4.0`) is dictated by Diesel 2.1's internal dependency. If Diesel is upgraded in the future, the compatible `bigdecimal` version may change.
