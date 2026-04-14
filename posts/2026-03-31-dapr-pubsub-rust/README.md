# How to Use Dapr Pub/Sub with Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rust, Pub/Sub, Event-Driven, Messaging

Description: Learn how to publish and subscribe to events in Rust using the Dapr Rust SDK and actix-web, with CloudEvents handling and topic subscription patterns.

---

## Introduction

Dapr Pub/Sub enables Rust microservices to communicate asynchronously through a message broker. Publishers send events using the Dapr Rust SDK, while subscribers expose HTTP endpoints that Dapr forwards matching events to. This guide covers both sides of the pub/sub pattern in Rust.

## Setup

```toml
# Cargo.toml
[dependencies]
dapr = "0.17"
actix-web = "4"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Publishing Events

```rust
use dapr::Client;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = Client::<dapr::client::TonicClient>::connect(
        "https://127.0.0.1".to_string()
    ).await?;

    let event = json!({
        "order_id": "ORD-001",
        "item": "widget",
        "quantity": 5,
        "price": 49.95
    });

    client
        .publish_event(
            "pubsub",
            "orders",
            "application/json",
            serde_json::to_vec(&event)?,
            None,
        )
        .await?;

    println!("Published order event");
    Ok(())
}
```

## Subscribing with Actix-web

```rust
use actix_web::{web, App, HttpServer, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug)]
struct CloudEvent {
    data: serde_json::Value,
    #[serde(rename = "datacontenttype")]
    data_content_type: Option<String>,
    id: String,
}

#[derive(Serialize)]
struct SubscriptionResponse {
    pubsubname: String,
    topic: String,
    route: String,
}

async fn subscribe() -> HttpResponse {
    let subs = vec![SubscriptionResponse {
        pubsubname: "pubsub".to_string(),
        topic: "orders".to_string(),
        route: "/orders".to_string(),
    }];
    HttpResponse::Ok().json(subs)
}

async fn handle_order(event: web::Json<CloudEvent>) -> HttpResponse {
    println!("Received event {}: {:?}", event.id, event.data);

    // Process the order
    if let Some(order_id) = event.data.get("order_id") {
        println!("Processing order: {}", order_id);
    }

    HttpResponse::Ok().json(serde_json::json!({"status": "SUCCESS"}))
}
```

## Wiring Up the App

```rust
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/dapr/subscribe", web::get().to(subscribe))
            .route("/orders", web::post().to(handle_order))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

## Running Publisher and Subscriber

```bash
# Subscriber
dapr run \
  --app-id order-subscriber \
  --app-port 8080 \
  -- cargo run --bin subscriber

# Publisher (separate terminal)
dapr run \
  --app-id order-publisher \
  --dapr-grpc-port 50001 \
  -- cargo run --bin publisher
```

## Publishing with Metadata

```rust
use std::collections::HashMap;

let mut metadata = HashMap::new();
metadata.insert("ttlInSeconds".to_string(), "3600".to_string());
metadata.insert("rawPayload".to_string(), "false".to_string());

client
    .publish_event(
        "pubsub",
        "orders",
        "application/json",
        serde_json::to_vec(&event)?,
        Some(metadata),
    )
    .await?;
```

## Dead Letter Handling

Return a 404 to drop a message, or a 5xx to trigger retry:

```rust
async fn handle_order(event: web::Json<CloudEvent>) -> HttpResponse {
    match process_event(&event) {
        Ok(_) => HttpResponse::Ok().json(json!({"status": "SUCCESS"})),
        Err(e) if e.is_permanent() => {
            // Drop the message
            HttpResponse::NotFound().json(json!({"status": "DROP"}))
        }
        Err(_) => {
            // Retry
            HttpResponse::InternalServerError().finish()
        }
    }
}
```

## Summary

Dapr Pub/Sub in Rust separates publishing (using `Client::publish_event`) from subscribing (using HTTP endpoint registration). Actix-web is a natural fit for the subscriber side. CloudEvents are deserialized automatically by the Dapr sidecar before forwarding to your handler. Metadata options let you configure TTL, ordering, and raw payloads per-publish.
