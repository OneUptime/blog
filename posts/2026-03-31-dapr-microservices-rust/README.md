# How to Build Microservices with Dapr and Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rust, Microservice, Architecture, Actix

Description: Learn how to build a Rust microservices system with Dapr, combining service invocation, pub/sub messaging, and state management across multiple Rust services.

---

## Introduction

Rust's performance and memory safety make it an excellent language for microservices. Dapr augments Rust services with service discovery, messaging, and state management out of the box. This guide builds two Rust services - an inventory service and an order service - that coordinate through Dapr.

## Project Workspace

```toml
# Cargo.toml (workspace root)
[workspace]
members = [
    "order-service",
    "inventory-service",
    "common"
]
```

## Common Types

```rust
// common/src/lib.rs
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Order {
    pub order_id: String,
    pub item: String,
    pub quantity: u32,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StockResponse {
    pub item: String,
    pub available: u32,
    pub reserved: u32,
}
```

## Order Service

```rust
// order-service/src/main.rs
use actix_web::{web, App, HttpServer, HttpResponse};
use dapr::Client;
use common::Order;
use prost_types::Any;
use serde_json::json;

async fn create_order(body: web::Json<Order>) -> HttpResponse {
    let addr = "https://127.0.0.1".to_string();
    let mut client = Client::<dapr::client::TonicClient>::connect(addr)
        .await
        .expect("Failed to connect to Dapr");

    // Check inventory via service invocation
    let check_body = json!({"item": body.item, "quantity": body.quantity});
    let inv_response = client
        .invoke_service(
            "inventory-service",
            "reserve",
            Some(Any {
                type_url: "".to_string(),
                value: serde_json::to_vec(&check_body).unwrap(),
            }),
        )
        .await;

    if inv_response.is_err() {
        return HttpResponse::ServiceUnavailable().json(json!({"error": "inventory unavailable"}));
    }

    let order = Order {
        order_id: body.order_id.clone(),
        item: body.item.clone(),
        quantity: body.quantity,
        status: "confirmed".to_string(),
    };

    // Save order state
    client
        .save_state(
            "statestore",
            order.order_id.clone(),
            serde_json::to_vec(&order).unwrap(),
            None,
            None,
            None,
        )
        .await
        .unwrap();

    // Publish order confirmed event
    client
        .publish_event(
            "pubsub",
            "order-confirmed",
            "application/json",
            serde_json::to_vec(&order).unwrap(),
            None,
        )
        .await
        .unwrap();

    HttpResponse::Created().json(json!({"order_id": order.order_id, "status": "confirmed"}))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().route("/orders", web::post().to(create_order))
    })
    .bind("0.0.0.0:8081")?
    .run()
    .await
}
```

## Inventory Service

```rust
// inventory-service/src/main.rs
use actix_web::{web, App, HttpServer, HttpResponse};
use common::StockResponse;
use serde_json::json;
use serde::Deserialize;

#[derive(Deserialize)]
struct ReserveRequest {
    item: String,
    quantity: u32,
}

async fn reserve_stock(body: web::Json<ReserveRequest>) -> HttpResponse {
    println!("Reserving {} x {} for order", body.quantity, body.item);
    // In real code: check and decrement stock from state store
    HttpResponse::Ok().json(StockResponse {
        item: body.item.clone(),
        available: 100,
        reserved: body.quantity,
    })
}

async fn subscribe() -> HttpResponse {
    HttpResponse::Ok().json(vec![
        json!({"pubsubname": "pubsub", "topic": "order-confirmed", "route": "/order-confirmed"})
    ])
}

async fn handle_order_confirmed(body: web::Json<serde_json::Value>) -> HttpResponse {
    println!("Order confirmed event: {:?}", body.get("data"));
    HttpResponse::Ok().json(json!({"status": "SUCCESS"}))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/reserve", web::post().to(reserve_stock))
            .route("/dapr/subscribe", web::get().to(subscribe))
            .route("/order-confirmed", web::post().to(handle_order_confirmed))
    })
    .bind("0.0.0.0:8082")?
    .run()
    .await
}
```

## Running the System

```bash
# Inventory service
dapr run --app-id inventory-service --app-port 8082 \
  -- cargo run --bin inventory-service

# Order service
dapr run --app-id order-service --app-port 8081 \
  -- cargo run --bin order-service

# Test
curl -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORD-001","item":"widget","quantity":3,"status":"pending"}'
```

## Summary

Building microservices with Dapr and Rust combines Rust's performance with Dapr's infrastructure abstractions. Service invocation replaces direct HTTP calls with sidecar-mediated requests, pub/sub decouples event producers from consumers, and state management persists data without tight coupling to a specific database. Each service is independent and can be scaled separately.
