# How to Connect to MongoDB from Rust Using the Official Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Driver, Connection, Async

Description: Learn how to add the official MongoDB Rust driver to your project, create a client, and verify connectivity using async Rust with Tokio.

---

## Introduction

The official MongoDB Rust driver (`mongodb` crate) provides an async-first API built on top of Tokio. It supports all core MongoDB features including CRUD, aggregation, transactions, and change streams. The driver uses BSON under the hood and integrates with Serde for serialization.

## Adding Dependencies

```toml
[dependencies]
mongodb = "3"
tokio   = { version = "1", features = ["full"] }
serde   = { version = "1", features = ["derive"] }
```

## Creating a Client

```rust
use mongodb::{Client, options::ClientOptions};

#[tokio::main]
async fn main() -> mongodb::error::Result<()> {
    // Parse the connection string
    let client_options = ClientOptions::parse(
        "mongodb://localhost:27017"
    ).await?;

    // Create the client
    let client = Client::with_options(client_options)?;

    println!("Connected to MongoDB");
    Ok(())
}
```

## Connection Options

```rust
use mongodb::options::{ClientOptions, Credential};
use std::time::Duration;

let mut options = ClientOptions::parse(
    "mongodb://localhost:27017"
).await?;

options.app_name        = Some("myapp".to_string());
options.max_pool_size   = Some(20);
options.min_pool_size   = Some(5);
options.connect_timeout = Some(Duration::from_secs(10));
options.credential      = Some(
    Credential::builder()
        .username("appuser".to_string())
        .password("secret".to_string())
        .source("admin".to_string())
        .build()
);

let client = Client::with_options(options)?;
```

## Connecting to MongoDB Atlas

```rust
let client = Client::with_uri_str(
    "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
).await?;
```

## Verifying Connectivity

```rust
use mongodb::bson::doc;

client
    .database("admin")
    .run_command(doc! { "ping": 1 })
    .await?;

println!("Pinged deployment successfully");
```

## Accessing Databases and Collections

```rust
use mongodb::Collection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Product {
    name:  String,
    price: f64,
}

let db         = client.database("shop");
let collection: Collection<Product> = db.collection("products");

println!("Using collection: {}", collection.name());
```

## Client Re-use

The `Client` is cheap to clone and internally manages a connection pool. Create it once at startup and share it via `Arc` or application state:

```rust
use std::sync::Arc;

let shared_client = Arc::new(client);
```

## Summary

The MongoDB Rust driver requires adding the `mongodb` and `tokio` crates, parsing a connection URI into `ClientOptions`, and calling `Client::with_options`. The async client manages a connection pool automatically. Use `run_command(ping)` to verify connectivity at startup, and share a single `Client` instance across your application for efficient resource use.
