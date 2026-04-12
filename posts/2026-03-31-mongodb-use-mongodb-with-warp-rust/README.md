# How to Use MongoDB with Warp (Rust)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Warp

Description: Build a composable REST API with Rust's Warp framework and MongoDB, using filter chains, shared state, and async MongoDB queries with full type safety.

---

## Warp and MongoDB

Warp is a Rust web framework built around composable filters. Each route is a combination of filters that extract request data, pass it to handlers, and return responses. This functional style pairs well with MongoDB's async driver, creating a highly concurrent API server.

## Project Setup

`Cargo.toml`:

```toml
[package]
name = "warp-mongo"
version = "0.1.0"
edition = "2021"

[dependencies]
warp = "0.3"
mongodb = { version = "2.8", features = ["tokio-runtime"] }
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
bson = { version = "2.9" }
futures = "0.3"
```

## Shared State

Warp passes state through filters using `warp::any().map(...)`:

```rust
use mongodb::{Client, Database};

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
}

pub async fn create_state() -> AppState {
    let uri = std::env::var("MONGO_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());

    let client = Client::with_uri_str(&uri)
        .await
        .expect("Failed to connect");

    AppState {
        db: client.database("warpapp"),
    }
}

pub fn with_state(state: AppState) -> impl warp::Filter<Extract = (AppState,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || state.clone())
}
```

## Model

```rust
use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Article {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub body: String,
    pub author: String,
    pub published: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateArticle {
    pub title: String,
    pub body: String,
    pub author: String,
}
```

## Route Filters and Handlers

```rust
use warp::Filter;
use mongodb::bson::doc;
use futures::stream::TryStreamExt;

pub fn routes(state: AppState) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let list = warp::path!("articles")
        .and(warp::get())
        .and(with_state(state.clone()))
        .and_then(list_articles);

    let create = warp::path!("articles")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_state(state.clone()))
        .and_then(create_article);

    list.or(create)
}

async fn list_articles(state: AppState) -> Result<impl warp::Reply, warp::Rejection> {
    let col = state.db.collection::<Article>("articles");
    let cursor = col.find(doc! {"published": true}, None)
        .await
        .map_err(|_| warp::reject::reject())?;

    let articles: Vec<Article> = cursor.try_collect()
        .await
        .map_err(|_| warp::reject::reject())?;

    Ok(warp::reply::json(&articles))
}

async fn create_article(
    input: CreateArticle,
    state: AppState,
) -> Result<impl warp::Reply, warp::Rejection> {
    let article = Article {
        id: None,
        title: input.title,
        body: input.body,
        author: input.author,
        published: false,
    };

    let col = state.db.collection::<Article>("articles");
    col.insert_one(article.clone(), None)
        .await
        .map_err(|_| warp::reject::reject())?;

    Ok(warp::reply::with_status(
        warp::reply::json(&article),
        warp::http::StatusCode::CREATED,
    ))
}
```

## Main

```rust
#[tokio::main]
async fn main() {
    let state = create_state().await;
    let routes = routes(state);
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
```

## Summary

Warp and MongoDB in Rust produce a highly concurrent, type-safe API. Warp's filter composition model passes shared AppState (containing the MongoDB client) into handlers cleanly, while MongoDB's async driver integrates directly with Tokio. Serialize/deserialize is handled by `serde` with BSON support, and Rust's type system ensures you never accidentally insert a wrong-typed document into MongoDB.
