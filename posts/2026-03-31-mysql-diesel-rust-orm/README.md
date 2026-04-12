# How to Use MySQL with Diesel (Rust ORM)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Diesel, Rust, ORM, Database

Description: Learn how to set up Diesel ORM with MySQL in a Rust project, define schema and models, run migrations, and perform type-safe CRUD operations.

---

## Introduction

Diesel is a safe, extensible ORM and query builder for Rust. It generates SQL at compile time, guaranteeing type safety and catching query errors before your code runs. MySQL support requires the `mysql` feature flag and the `libmysqlclient` system library.

## Adding Dependencies

In `Cargo.toml`:

```toml
[dependencies]
diesel = { version = "2.1", features = ["mysql", "chrono", "numeric"] }
dotenvy = "0.15"
chrono = "0.4"
bigdecimal = "0.3"

[dev-dependencies]
diesel_migrations = "2.1"
```

## System Prerequisites

```bash
# Ubuntu/Debian
sudo apt install libmysqlclient-dev

# macOS (Intel)
brew install mysql-client
export PKG_CONFIG_PATH="/usr/local/opt/mysql-client/lib/pkgconfig"

# macOS (Apple Silicon)
brew install mysql-client
export PKG_CONFIG_PATH="/opt/homebrew/opt/mysql-client/lib/pkgconfig"
```

## Installing the Diesel CLI

```bash
cargo install diesel_cli --no-default-features --features mysql
```

## Setting Up Diesel

```bash
echo DATABASE_URL=mysql://root:password@localhost/mydb > .env
diesel setup
diesel migration generate create_products
```

## Writing the Migration

`migrations/{timestamp}_create_products/up.sql`:

```sql
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category_price (category_id, price),
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`migrations/{timestamp}_create_products/down.sql`:

```sql
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
```

```bash
diesel migration run
```

## Defining Models and Schema

Diesel generates `src/schema.rs` automatically. Define models in `src/models.rs`:

```rust
use diesel::prelude::*;
use crate::schema::products;

#[derive(Queryable, Selectable, Debug)]
#[diesel(table_name = products)]
pub struct Product {
    pub id: i32,
    pub category_id: i32,
    pub name: String,
    pub price: bigdecimal::BigDecimal,
    pub stock: i32,
    pub active: bool,
}

#[derive(Insertable)]
#[diesel(table_name = products)]
pub struct NewProduct<'a> {
    pub category_id: i32,
    pub name: &'a str,
    pub price: &'a bigdecimal::BigDecimal,
    pub stock: i32,
}
```

## CRUD Operations

```rust
use diesel::prelude::*;
use dotenvy::dotenv;
use std::env;

fn establish_connection() -> MysqlConnection {
    dotenv().ok();
    let url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    MysqlConnection::establish(&url).expect("Error connecting to MySQL")
}

fn main() {
    use crate::schema::products::dsl::*;

    let conn = &mut establish_connection();

    // Insert
    let new_product = NewProduct {
        category_id: 1,
        name: "Laptop",
        price: &"999.99".parse().unwrap(),
        stock: 50,
    };
    diesel::insert_into(products)
        .values(&new_product)
        .execute(conn)
        .expect("Error inserting product");

    // Select
    let results = products
        .filter(stock.gt(0))
        .order(price.asc())
        .limit(20)
        .select(Product::as_select())
        .load(conn)
        .expect("Error loading products");

    for p in &results {
        println!("{}: ${}", p.name, p.price);
    }

    // Update
    diesel::update(products.filter(stock.eq(0)))
        .set(active.eq(false))
        .execute(conn)
        .expect("Error updating products");
}
```

## Summary

Diesel's compile-time query verification makes MySQL interactions in Rust highly reliable. Define the schema through migrations, generate `schema.rs` with the Diesel CLI, and write type-safe queries using Diesel's DSL. The compiler catches type mismatches between Rust model fields and MySQL column types before the code ever runs, eliminating a whole class of runtime errors.
