# How to Use Dapr State Management with Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rust, State Management, Redis, Persistence

Description: Learn how to save, retrieve, delete, and run transactions on state using the Dapr Rust SDK, with examples for optimistic concurrency and bulk operations.

---

## Introduction

Dapr State Management gives Rust applications a consistent, backend-agnostic API for persisting key-value data. The Rust SDK's async client provides typed state operations with support for ETags, concurrency modes, and bulk reads. This guide covers all essential state management patterns.

## Setup

```toml
# Cargo.toml
[dependencies]
dapr = "0.17"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Connecting to Dapr

```rust
use dapr::Client;
type DaprClient = Client<dapr::client::TonicClient>;

async fn make_client() -> Result<DaprClient, Box<dyn std::error::Error>> {
    let client = DaprClient::connect("https://127.0.0.1".to_string()).await?;
    Ok(client)
}
```

## Saving State

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct UserProfile {
    username: String,
    email: String,
    plan: String,
}

async fn save_profile(client: &mut DaprClient) -> Result<(), Box<dyn std::error::Error>> {
    let profile = UserProfile {
        username: "alice".to_string(),
        email: "alice@example.com".to_string(),
        plan: "pro".to_string(),
    };

    let value = serde_json::to_vec(&profile)?;
    client.save_state("statestore", "user-alice", value, None, None, None).await?;
    println!("Profile saved for alice");
    Ok(())
}
```

## Getting State

```rust
async fn get_profile(client: &mut DaprClient) -> Result<(), Box<dyn std::error::Error>> {
    let response = client
        .get_state("statestore", "user-alice", None)
        .await?;

    if response.data.is_empty() {
        println!("Profile not found");
    } else {
        let profile: UserProfile = serde_json::from_slice(&response.data)?;
        println!("User: {} ({})", profile.username, profile.plan);
    }
    Ok(())
}
```

## Deleting State

```rust
async fn delete_profile(client: &mut DaprClient) -> Result<(), Box<dyn std::error::Error>> {
    client.delete_state("statestore", "user-alice", None).await?;
    println!("Profile deleted");
    Ok(())
}
```

## Reading Multiple State Keys

```rust
async fn bulk_get(client: &mut DaprClient) -> Result<(), Box<dyn std::error::Error>> {
    let keys = vec!["user-alice", "user-bob", "user-carol"];

    for key in keys {
        let response = client.get_state("statestore", key, None).await?;
        if !response.data.is_empty() {
            println!("Key: {}", key);
        } else {
            println!("Key: {} - not found", key);
        }
    }
    Ok(())
}
```

## Transactional State Updates

```rust
use dapr::dapr::proto::runtime::v1 as dapr_v1;
use dapr::dapr::proto::common::v1 as common_v1;

async fn transactional_update(client: &mut DaprClient) -> Result<(), Box<dyn std::error::Error>> {
    let order = serde_json::json!({"status": "shipped"});
    let inventory = serde_json::json!({"stock": 95});

    let operations = vec![
        dapr_v1::TransactionalStateOperation {
            operation_type: "upsert".to_string(),
            request: Some(common_v1::StateItem {
                key: "order-001".to_string(),
                value: serde_json::to_vec(&order)?,
                ..Default::default()
            }),
        },
        dapr_v1::TransactionalStateOperation {
            operation_type: "upsert".to_string(),
            request: Some(common_v1::StateItem {
                key: "inventory-widget".to_string(),
                value: serde_json::to_vec(&inventory)?,
                ..Default::default()
            }),
        },
    ];

    let request = dapr_v1::ExecuteStateTransactionRequest {
        store_name: "statestore".to_string(),
        operations,
        metadata: Default::default(),
    };

    client.0.execute_state_transaction(request).await?;
    println!("Transaction committed");
    Ok(())
}
```

## Running with Dapr

```bash
dapr run \
  --app-id rust-state-demo \
  --dapr-grpc-port 50001 \
  -- cargo run
```

## Summary

The Dapr Rust SDK provides a fully async state management API covering saves, reads, deletes, and transactions. State values are passed as `Vec<u8>`, so you use serde to serialize and deserialize your Rust structs. The state backend can be swapped from Redis to PostgreSQL or Cosmos DB by updating the component YAML without changing any Rust code.
