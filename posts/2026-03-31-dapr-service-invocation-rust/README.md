# How to Use Dapr Service Invocation with Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rust, Service Invocation, Microservice, gRPC

Description: Learn how to invoke other Dapr-enabled services from Rust using the Dapr Rust SDK, with examples for HTTP and gRPC invocation, retries, and response handling.

---

## Introduction

Dapr Service Invocation provides a built-in mechanism for Rust microservices to call each other using logical app IDs instead of direct network addresses. Dapr handles service discovery, load balancing, retries, and mTLS. This guide demonstrates invoking services from a Rust application using the Dapr Rust SDK.

## Setup

```toml
# Cargo.toml
[dependencies]
dapr = "0.13"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
prost = "0.11"
prost-types = "0.11"
```

## Basic Service Invocation

```rust
use dapr::Client;
use prost_types::Any;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = Client::<dapr::client::TonicClient>::connect(
        "https://127.0.0.1:50001".to_string()
    ).await?;

    let request_body = serde_json::json!({
        "order_id": "ORD-001",
        "item": "widget"
    });

    let response = client
        .invoke_service(
            "order-service",
            "create-order",
            Some(Any {
                type_url: String::new(),
                value: serde_json::to_vec(&request_body)?,
            })
        )
        .await?;

    if let Some(data) = response.data {
        let body = String::from_utf8(data.value)?;
        println!("Response: {}", body);
    }

    Ok(())
}
```

## Invoking with Structured Response

Deserialize the response into a typed struct:

```rust
use serde::Deserialize;
use prost_types::Any;

#[derive(Deserialize, Debug)]
struct OrderResponse {
    order_id: String,
    status: String,
    total: f64,
}

async fn create_order(
    client: &mut Client<dapr::client::TonicClient>,
    order_id: &str,
    item: &str
) -> Result<OrderResponse, Box<dyn std::error::Error>> {
    let body = serde_json::json!({
        "order_id": order_id,
        "item": item
    });

    let response = client
        .invoke_service(
            "order-service",
            "create-order",
            Some(Any {
                type_url: String::new(),
                value: serde_json::to_vec(&body)?,
            })
        )
        .await?;

    let data = response.data.unwrap_or_default().value;
    let order: OrderResponse = serde_json::from_slice(&data)?;
    Ok(order)
}
```

## Implementing the Service Side (Actix-web)

The target service just exposes a standard HTTP endpoint:

```rust
use actix_web::{web, App, HttpServer, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct OrderRequest {
    order_id: String,
    item: String,
}

#[derive(Serialize)]
struct OrderResponse {
    order_id: String,
    status: String,
    total: f64,
}

async fn create_order(body: web::Json<OrderRequest>) -> HttpResponse {
    HttpResponse::Ok().json(OrderResponse {
        order_id: body.order_id.clone(),
        status: "created".to_string(),
        total: 49.99,
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().route("/create-order", web::post().to(create_order))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

## Running Both Services

```bash
# Service being invoked
dapr run \
  --app-id order-service \
  --app-port 8080 \
  -- cargo run --bin order-service

# Calling service
dapr run \
  --app-id rust-caller \
  --dapr-grpc-port 50001 \
  -- cargo run --bin caller
```

## Testing Service Invocation

```bash
dapr invoke \
  --app-id order-service \
  --method create-order \
  --verb POST \
  --data '{"order_id":"ORD-001","item":"widget"}'
```

## Error Handling for Service Calls

```rust
match client.invoke_service("order-service", "create-order", Some(body)).await {
    Ok(response) => {
        println!("Success: {:?}", response.data);
    }
    Err(e) => {
        eprintln!("Invocation failed: {}", e);
        // Handle specific gRPC status codes
    }
}
```

## Summary

Dapr Service Invocation in Rust decouples your microservices by routing calls through the sidecar using app IDs. The `invoke_service` method sends requests to the target service's HTTP endpoint and returns the response. Dapr handles retries, discovery, and mutual TLS automatically, so your Rust code focuses purely on business logic.
