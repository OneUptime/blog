# How to Use MongoDB with Rocket (Rust)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Rocket

Description: Build a type-safe REST API with Rust's Rocket framework and MongoDB using the official mongodb crate, with managed state and async route handlers.

---

## Rocket and MongoDB

Rocket is a Rust web framework that prioritizes correctness and developer experience. The official `mongodb` crate provides an async client that works naturally with Rocket's async runtime (Tokio). Together, they enable building a highly performant, type-safe API backed by MongoDB.

## Project Setup

In `Cargo.toml`:

```toml
[package]
name = "rocket-mongo"
version = "0.1.0"
edition = "2021"

[dependencies]
rocket = { version = "0.5", features = ["json"] }
mongodb = { version = "2.8", features = ["tokio-runtime"] }
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
bson = { version = "2.9", features = ["chrono-0_4"] }
futures = "0.3"
```

## Database Setup and Managed State

```rust
use mongodb::{Client, Collection, options::ClientOptions};

pub struct Db {
    pub client: Client,
    pub database: mongodb::Database,
}

impl Db {
    pub async fn connect(uri: &str) -> Self {
        let mut opts = ClientOptions::parse(uri).await.expect("Invalid URI");
        opts.app_name = Some("rocket-mongo".to_string());
        opts.max_pool_size = Some(20);

        let client = Client::with_options(opts).expect("Failed to create client");
        let database = client.database("rocketapp");

        Db { client, database }
    }

    pub fn collection<T>(&self, name: &str) -> Collection<T> {
        self.database.collection::<T>(name)
    }
}
```

## Data Model

```rust
use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub price: f64,
    pub category: String,
    pub in_stock: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateProduct {
    pub name: String,
    pub price: f64,
    pub category: String,
}
```

## Route Handlers

```rust
use rocket::{get, post, State, serde::json::Json};
use mongodb::bson::doc;
use futures::stream::TryStreamExt;

#[get("/products")]
pub async fn list_products(db: &State<Db>) -> Json<Vec<Product>> {
    let col: mongodb::Collection<Product> = db.collection("products");
    let cursor = col.find(None, None).await.expect("find failed");
    let products: Vec<Product> = cursor.try_collect().await.expect("collect failed");
    Json(products)
}

#[post("/products", data = "<input>")]
pub async fn create_product(
    db: &State<Db>,
    input: Json<CreateProduct>,
) -> Json<Product> {
    let product = Product {
        id: None,
        name: input.name.clone(),
        price: input.price,
        category: input.category.clone(),
        in_stock: true,
    };

    let col: mongodb::Collection<Product> = db.collection("products");
    let result = col.insert_one(product.clone(), None).await.expect("insert failed");

    let inserted = col.find_one(
        doc! { "_id": result.inserted_id },
        None,
    ).await.expect("find failed").expect("not found");

    Json(inserted)
}
```

## Main Application

```rust
#[macro_use] extern crate rocket;

mod db;
mod models;
mod routes;

use db::Db;

#[launch]
async fn rocket() -> _ {
    let uri = std::env::var("MONGO_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());

    let database = Db::connect(&uri).await;

    rocket::build()
        .manage(database)
        .mount("/api", routes![
            routes::list_products,
            routes::create_product,
        ])
}
```

## Running the Application

```bash
MONGO_URI="mongodb://localhost:27017" cargo run
```

## Summary

Rocket with MongoDB in Rust provides maximum performance and type safety. Use Rocket's managed state system to share the MongoDB client across async route handlers, define models with `serde` derive macros and BSON ObjectId support, and use the official `mongodb` crate's async API throughout. Rust's ownership model and the type system catch many MongoDB interaction bugs at compile time rather than runtime.
