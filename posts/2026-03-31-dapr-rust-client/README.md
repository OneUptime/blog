# How to Use Dapr Rust Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rust, Client, gRPC, State Management

Description: Learn how to use the Dapr Rust client for state management, pub/sub publishing, service invocation, and secrets retrieval in async Rust applications.

---

## Introduction

The Dapr Rust client wraps the Dapr gRPC API in a typed, async-friendly interface. Once connected to the sidecar, you can perform state operations, publish events, invoke other services, and retrieve secrets using idiomatic Rust. This guide covers the core client operations with practical examples.

## Setup

```toml
# Cargo.toml
[dependencies]
dapr = "0.17"
tokio = { version = "1", features = ["full"] }
prost-types = "0.12"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Connecting the Client

```rust
use dapr::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = Client::<dapr::client::TonicClient>::connect(
        "https://127.0.0.1".to_string()
    ).await?;

    // Client is ready
    run_demo(&mut client).await?;
    Ok(())
}
```

## State Management

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Session {
    user_id: String,
    role: String,
    expires_at: u64,
}

async fn state_demo(
    client: &mut Client<dapr::client::TonicClient>
) -> Result<(), Box<dyn std::error::Error>> {
    let session = Session {
        user_id: "usr-123".to_string(),
        role: "admin".to_string(),
        expires_at: 1780000000,
    };

    // Save
    client.save_state(
        "statestore",
        "session-usr-123",
        serde_json::to_vec(&session)?,
        None,
        None,
        None,
    ).await?;
    println!("Session saved");

    // Get
    let response = client
        .get_state("statestore", "session-usr-123", None)
        .await?;
    let retrieved: Session = serde_json::from_slice(&response.data)?;
    println!("Session: {:?}", retrieved);

    // Delete
    client.delete_state("statestore", "session-usr-123", None).await?;
    println!("Session deleted");

    Ok(())
}
```

## Publishing Events

```rust
async fn publish_demo(
    client: &mut Client<dapr::client::TonicClient>
) -> Result<(), Box<dyn std::error::Error>> {
    let event = serde_json::json!({
        "order_id": "ORD-001",
        "item": "widget",
        "quantity": 5
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

    println!("Event published");
    Ok(())
}
```

## Service Invocation

```rust
async fn invoke_demo(
    client: &mut Client<dapr::client::TonicClient>
) -> Result<(), Box<dyn std::error::Error>> {
    let data = prost_types::Any {
        type_url: "".to_string(),
        value: serde_json::to_vec(&serde_json::json!({
            "item": "widget"
        }))?,
    };

    let response = client
        .invoke_service("inventory-service", "check-stock", Some(data))
        .await?;

    let body = response.data.unwrap_or_default().value;
    println!("Inventory response: {:?}", String::from_utf8(body));
    Ok(())
}
```

## Secrets Retrieval

```rust
async fn secrets_demo(
    client: &mut Client<dapr::client::TonicClient>
) -> Result<(), Box<dyn std::error::Error>> {
    let secret = client
        .get_secret("localsecretstore", "db-password")
        .await?;

    for (k, v) in &secret.data {
        println!("Secret {}: {}", k, v);
    }
    Ok(())
}
```

## Bulk State Save

```rust
use dapr::client::SaveStateItem;

async fn bulk_state_demo(
    client: &mut Client<dapr::client::TonicClient>
) -> Result<(), Box<dyn std::error::Error>> {
    let items = vec![
        ("key-1", serde_json::to_vec(&serde_json::json!({"value": 1}))?),
        ("key-2", serde_json::to_vec(&serde_json::json!({"value": 2}))?),
    ];

    client
        .save_bulk_states("statestore", items)
        .await?;

    println!("Bulk state saved");
    Ok(())
}
```

## Running the App

```bash
dapr run \
  --app-id rust-client-demo \
  --dapr-grpc-port 50001 \
  -- cargo run --release
```

## Summary

The Dapr Rust client provides async methods for all major Dapr building blocks. State operations, pub/sub publishing, service invocation, and secrets retrieval all follow the same pattern: connect the client once, then call async methods with `await`. The gRPC transport ensures low overhead and type safety through Rust's strong type system.
