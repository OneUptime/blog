# How to Connect to MySQL from Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Rust, Driver, Connection, SQLx

Description: Learn how to connect to a MySQL database from Rust using the sqlx crate for async queries and the mysql crate for synchronous access.

---

## Overview

Rust has two popular MySQL drivers:

| Crate | Style | Best For |
|-------|-------|----------|
| `sqlx` | Async, compile-time verified | Tokio-based async applications |
| `mysql` | Synchronous | CLI tools, scripts |

This guide covers both, with emphasis on `sqlx` for modern async Rust.

## Using sqlx

### Adding Dependencies

```toml
[dependencies]
sqlx    = { version = "0.8", features = ["mysql", "runtime-tokio", "chrono"] }
tokio   = { version = "1",   features = ["full"] }
dotenvy = "0.15"
```

### Connecting with a Pool

```rust
use sqlx::mysql::MySqlPoolOptions;

#[tokio::main]
async fn main() -> Result<(), sqlx::Error> {
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    // Example: mysql://app_user:secret@localhost/shop

    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    println!("Connected to MySQL");

    let version: String = sqlx::query_scalar("SELECT VERSION()")
        .fetch_one(&pool)
        .await?;
    println!("MySQL version: {version}");

    Ok(())
}
```

### Querying with Compile-Time Verification

```rust
#[derive(Debug)]
struct Product {
    id:    i32,
    name:  String,
    price: f64,
}

let products: Vec<Product> = sqlx::query_as!(
    Product,
    "SELECT id, name, price FROM products WHERE price < ?",
    50.0_f64
)
.fetch_all(&pool)
.await?;

for p in &products {
    println!("{}: ${:.2}", p.name, p.price);
}
```

### Inserting Data

```rust
let result = sqlx::query!(
    "INSERT INTO orders (customer_id, total) VALUES (?, ?)",
    42_i32,
    99.99_f64
)
.execute(&pool)
.await?;

println!("Inserted order ID: {}", result.last_insert_id());
```

### Transactions

```rust
let mut tx = pool.begin().await?;

sqlx::query!("UPDATE stock SET qty = qty - 1 WHERE id = ?", 7_i32)
    .execute(&mut *tx)
    .await?;

sqlx::query!("INSERT INTO order_items (item_id) VALUES (?)", 7_i32)
    .execute(&mut *tx)
    .await?;

tx.commit().await?;
```

## Using the mysql Crate (Synchronous)

```toml
[dependencies]
mysql = "25"
```

```rust
use mysql::*;
use mysql::prelude::*;

let url  = "mysql://app_user:secret@localhost:3306/shop";
let pool = Pool::new(url)?;
let mut conn = pool.get_conn()?;

let products: Vec<(i32, String, f64)> = conn
    .query("SELECT id, name, price FROM products WHERE price < 50")?;

for (id, name, price) in products {
    println!("{id}  {name}  {price:.2}");
}
```

## Summary

Use `sqlx` with `MySqlPoolOptions` for async Rust applications built on Tokio. The `query!` and `query_as!` macros verify SQL syntax and types at compile time when a live database is available during build (`DATABASE_URL` env var). Use the synchronous `mysql` crate for scripts and CLI tools that do not need async. Always load the `DATABASE_URL` from environment variables and never hardcode credentials.
