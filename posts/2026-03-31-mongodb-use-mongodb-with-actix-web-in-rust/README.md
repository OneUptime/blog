# How to Use MongoDB with Actix-Web in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Actix-web, REST, API

Description: Learn how to wire a MongoDB client into an Actix-Web application as shared application data and build a REST API with typed document handlers.

---

## Introduction

Actix-Web is one of the fastest web frameworks for Rust. Combining it with the MongoDB Rust driver gives you a high-performance, type-safe REST API backed by a flexible document store. The key pattern is sharing a single `mongodb::Client` through Actix's `web::Data` extractor.

## Dependencies

```toml
[dependencies]
actix-web = "4"
mongodb   = "3"
tokio     = { version = "1", features = ["full"] }
serde     = { version = "1", features = ["derive"] }
futures   = "0.3"
```

## Shared Application State

```rust
use actix_web::{web, App, HttpServer};
use mongodb::Client;

#[derive(Clone)]
struct AppState {
    db: Client,
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let client = Client::with_uri_str("mongodb://localhost:27017").await
        .expect("Failed to connect to MongoDB");

    let data = web::Data::new(AppState { db: client });

    HttpServer::new(move || {
        App::new()
            .app_data(data.clone())
            .route("/products",     web::get().to(list_products))
            .route("/products",     web::post().to(create_product))
            .route("/products/{id}", web::get().to(get_product))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

## Request and Response Types

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
struct CreateProductRequest {
    name:     String,
    price:    f64,
    category: String,
}
```

## Handler Functions

```rust
use actix_web::{web, HttpResponse, Responder};
use futures::stream::TryStreamExt;
use mongodb::bson::doc;

async fn list_products(state: web::Data<AppState>) -> impl Responder {
    let col = state.db.database("shop").collection::<Product>("products");
    match col.find(doc! {}).await {
        Ok(mut cursor) => {
            let mut products = vec![];
            while let Ok(Some(p)) = cursor.try_next().await {
                products.push(p);
            }
            HttpResponse::Ok().json(products)
        }
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn create_product(
    state: web::Data<AppState>,
    body:  web::Json<CreateProductRequest>,
) -> impl Responder {
    let col = state.db.database("shop").collection::<Product>("products");
    let product = Product {
        id:       None,
        name:     body.name.clone(),
        price:    body.price,
        category: body.category.clone(),
    };
    match col.insert_one(product).await {
        Ok(r)  => HttpResponse::Created().json(r.inserted_id.to_string()),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn get_product(
    state: web::Data<AppState>,
    path:  web::Path<String>,
) -> impl Responder {
    let id  = ObjectId::parse_str(path.into_inner()).unwrap();
    let col = state.db.database("shop").collection::<Product>("products");
    match col.find_one(doc! { "_id": id }).await {
        Ok(Some(p)) => HttpResponse::Ok().json(p),
        Ok(None)    => HttpResponse::NotFound().finish(),
        Err(e)      => HttpResponse::InternalServerError().body(e.to_string()),
    }
}
```

## Summary

Sharing a `mongodb::Client` through `web::Data<AppState>` in Actix-Web gives all handlers access to the database without global state. Handlers extract the client, access the appropriate collection with a typed generic parameter, and return `HttpResponse` variants. The client's internal connection pool handles concurrent requests efficiently.
