# How to Use MongoDB with Axum in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Axum, REST, State

Description: Learn how to integrate a MongoDB client into an Axum web application using shared state and typed extractors to build async REST endpoints.

---

## Introduction

Axum is a lightweight async web framework built on top of Tokio and Tower. It uses extractors for dependency injection, making it easy to share a MongoDB client across all route handlers through `axum::extract::State`.

## Dependencies

```toml
[dependencies]
axum     = "0.7"
mongodb  = "3"
tokio    = { version = "1", features = ["full"] }
serde    = { version = "1", features = ["derive"] }
serde_json = "1"
futures  = "0.3"
```

## Application State

```rust
use axum::{Router, routing::{get, post}, extract::State};
use mongodb::Client;
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    mongo: Arc<Client>,
}

#[tokio::main]
async fn main() {
    let client = Client::with_uri_str("mongodb://localhost:27017")
        .await
        .expect("Failed to connect");

    let state = AppState { mongo: Arc::new(client) };

    let app = Router::new()
        .route("/products",      get(list_products).post(create_product))
        .route("/products/:id",  get(get_product))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## Document Model

```rust
use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;

#[derive(Debug, Serialize, Deserialize)]
struct Product {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id:       Option<ObjectId>,
    name:     String,
    price:    f64,
    category: String,
}

#[derive(Deserialize)]
struct NewProduct {
    name:     String,
    price:    f64,
    category: String,
}
```

## Route Handlers

```rust
use axum::{Json, extract::Path, http::StatusCode};
use futures::stream::TryStreamExt;
use mongodb::bson::doc;

async fn list_products(State(state): State<AppState>) -> Json<Vec<Product>> {
    let col = state.mongo.database("shop").collection::<Product>("products");
    let mut cursor = col.find(doc! {}).await.unwrap();
    let mut products = vec![];
    while let Some(p) = cursor.try_next().await.unwrap() {
        products.push(p);
    }
    Json(products)
}

async fn create_product(
    State(state): State<AppState>,
    Json(body):   Json<NewProduct>,
) -> (StatusCode, Json<String>) {
    let col = state.mongo.database("shop").collection::<Product>("products");
    let p   = Product { id: None, name: body.name, price: body.price, category: body.category };
    let res = col.insert_one(p).await.unwrap();
    (StatusCode::CREATED, Json(res.inserted_id.to_string()))
}

async fn get_product(
    State(state): State<AppState>,
    Path(id):     Path<String>,
) -> Result<Json<Product>, StatusCode> {
    let oid = ObjectId::parse_str(&id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let col = state.mongo.database("shop").collection::<Product>("products");
    col.find_one(doc! { "_id": oid }).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}
```

## Summary

Axum's `State` extractor gives handlers clean access to the `mongodb::Client` wrapped in `Arc`. Typed collection generics and Serde-derived structs eliminate manual document parsing. The `Result`-based return type in handlers integrates naturally with Axum's response system, making error propagation straightforward.
