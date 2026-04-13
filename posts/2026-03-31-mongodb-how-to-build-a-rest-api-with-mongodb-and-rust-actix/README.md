# How to Build a REST API with MongoDB and Rust (Actix)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Actix-web, REST API, Backend Development

Description: Learn how to build a high-performance async REST API with Rust, Actix-Web, and the official MongoDB Rust driver including CRUD operations and error handling.

---

## Project Setup

Add dependencies to `Cargo.toml`:

```toml
[dependencies]
actix-web = "4"
mongodb = { version = "2", features = ["tokio-runtime"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
futures = "0.3"
bson = { version = "2", features = ["chrono-0_4"] }
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"
```

## Data Models

```rust
// src/models.rs
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub created_at: Option<DateTime<Utc>>,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id.map(|id| id.to_hex()).unwrap_or_default(),
            name: u.name,
            email: u.email,
            created_at: u.created_at,
        }
    }
}
```

## Database Setup

```rust
// src/db.rs
use mongodb::{Client, Collection, IndexModel};
use mongodb::bson::doc;
use mongodb::options::{ClientOptions, IndexOptions};
use crate::models::User;

pub async fn create_mongo_client(uri: &str) -> mongodb::error::Result<Client> {
    let client_options = ClientOptions::parse(uri).await?;
    Client::with_options(client_options)
}

pub fn get_users_collection(client: &Client) -> Collection<User> {
    client.database("myapp").collection("users")
}

pub async fn create_indexes(col: &Collection<User>) -> mongodb::error::Result<()> {
    let index = IndexModel::builder()
        .keys(doc! { "email": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();
    col.create_index(index, None).await?;
    Ok(())
}
```

## Handlers

```rust
// src/handlers.rs
use actix_web::{web, HttpResponse, Responder};
use bson::{doc, oid::ObjectId};
use chrono::Utc;
use mongodb::Collection;
use crate::models::{User, CreateUserRequest, UserResponse};

pub async fn list_users(
    col: web::Data<Collection<User>>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let page: u64 = query.get("page").and_then(|p| p.parse().ok()).unwrap_or(1);
    let limit: i64 = query.get("limit").and_then(|l| l.parse().ok()).unwrap_or(20);
    let skip = ((page - 1) * limit as u64) as u64;

    let options = mongodb::options::FindOptions::builder()
        .skip(skip)
        .limit(limit)
        .build();

    match col.find(None, options).await {
        Ok(mut cursor) => {
            let mut users: Vec<UserResponse> = Vec::new();
            use futures::TryStreamExt;
            while let Ok(Some(user)) = cursor.try_next().await {
                users.push(UserResponse::from(user));
            }
            HttpResponse::Ok().json(users)
        }
        Err(e) => HttpResponse::InternalServerError().json(format!("{}", e)),
    }
}

pub async fn get_user(
    col: web::Data<Collection<User>>,
    path: web::Path<String>,
) -> impl Responder {
    let id_str = path.into_inner();
    let oid = match ObjectId::parse_str(&id_str) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json("Invalid ID format"),
    };

    match col.find_one(doc! { "_id": oid }, None).await {
        Ok(Some(user)) => HttpResponse::Ok().json(UserResponse::from(user)),
        Ok(None) => HttpResponse::NotFound().json("User not found"),
        Err(e) => HttpResponse::InternalServerError().json(format!("{}", e)),
    }
}

pub async fn create_user(
    col: web::Data<Collection<User>>,
    body: web::Json<CreateUserRequest>,
) -> impl Responder {
    let user = User {
        id: None,
        name: body.name.clone(),
        email: body.email.to_lowercase(),
        created_at: Some(Utc::now()),
    };

    match col.insert_one(user, None).await {
        Ok(result) => {
            let id = result.inserted_id.as_object_id().unwrap().to_hex();
            HttpResponse::Created().json(serde_json::json!({ "_id": id }))
        }
        Err(e) if e.to_string().contains("E11000") => {
            HttpResponse::Conflict().json("Email already exists")
        }
        Err(e) => HttpResponse::InternalServerError().json(format!("{}", e)),
    }
}

pub async fn delete_user(
    col: web::Data<Collection<User>>,
    path: web::Path<String>,
) -> impl Responder {
    let oid = match ObjectId::parse_str(&path.into_inner()) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json("Invalid ID format"),
    };

    match col.delete_one(doc! { "_id": oid }, None).await {
        Ok(r) if r.deleted_count == 0 => HttpResponse::NotFound().json("User not found"),
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => HttpResponse::InternalServerError().json(format!("{}", e)),
    }
}
```

## Main Entry Point

```rust
// src/main.rs
use actix_web::{web, App, HttpServer};
use dotenvy::dotenv;
use std::env;

mod db;
mod handlers;
mod models;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let uri = env::var("MONGODB_URI").unwrap_or_else(|_| "mongodb://localhost:27017".to_string());

    let client = db::create_mongo_client(&uri).await.expect("Failed to connect to MongoDB");
    let col = db::get_users_collection(&client);
    db::create_indexes(&col).await.expect("Failed to create indexes");

    let col_data = web::Data::new(col);

    HttpServer::new(move || {
        App::new()
            .app_data(col_data.clone())
            .route("/api/users", web::get().to(handlers::list_users))
            .route("/api/users", web::post().to(handlers::create_user))
            .route("/api/users/{id}", web::get().to(handlers::get_user))
            .route("/api/users/{id}", web::delete().to(handlers::delete_user))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

## Summary

Rust with Actix-Web and the official MongoDB driver delivers a high-performance async REST API. The key patterns are using `bson::oid::ObjectId` for ID handling, deriving `Serialize`/`Deserialize` on document models, and detecting duplicate key errors by checking the error message for `E11000` since MongoDB Rust driver wraps these as generic write errors.
