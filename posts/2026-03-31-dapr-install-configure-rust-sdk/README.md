# How to Install and Configure the Dapr Rust SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rust, SDK, Installation, Configuration

Description: Learn how to add the Dapr Rust SDK to your Cargo project, configure the client connection, and make your first state management call to the Dapr sidecar.

---

## Introduction

The Dapr Rust SDK (`dapr` crate) provides an async-first client for interacting with the Dapr sidecar from Rust applications. Built on `tonic` for gRPC communication, it offers typed state management, pub/sub, service invocation, and secrets APIs. This guide covers installation, configuration, and basic usage.

## Prerequisites

- Rust 1.78 or higher
- Cargo
- Dapr CLI installed

```bash
dapr init
```

## Adding the Dependency

```toml
# Cargo.toml
[dependencies]
dapr = "0.17"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Creating a Basic Dapr Client

```rust
// src/main.rs
use dapr::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Dapr sidecar (default: localhost:50001)
    let addr = "https://127.0.0.1".to_string();
    let mut client = Client::<dapr::client::TonicClient>::connect(addr).await?;

    println!("Connected to Dapr sidecar");
    Ok(())
}
```

## Configuring the Port

The Dapr gRPC port defaults to `50001`. Override it with the `DAPR_GRPC_PORT` environment variable:

```bash
export DAPR_GRPC_PORT=50001
```

Or connect with an explicit port using `connect_with_port`:

```rust
let addr = "https://127.0.0.1".to_string();
let port = "50001".to_string();
let mut client = Client::<dapr::client::TonicClient>::connect_with_port(addr, port).await?;
```

Note that `Client::connect` reads `DAPR_GRPC_PORT` internally and appends it to the address, so you should not include the port in the address string when using `connect`.

## Saving and Retrieving State

```rust
use dapr::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Product {
    name: String,
    price: f64,
    stock: u32,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "https://127.0.0.1".to_string();
    let mut client = Client::<dapr::client::TonicClient>::connect(addr).await?;

    let product = Product {
        name: "Widget".to_string(),
        price: 9.99,
        stock: 100,
    };

    // Save state (value must be Vec<u8>)
    client
        .save_state(
            "statestore",
            "product-001",
            serde_json::to_vec(&product)?,
            None,
            None,
            None,
        )
        .await?;
    println!("State saved");

    // Get state (returns GetStateResponse with data as Vec<u8>)
    let response = client
        .get_state("statestore", "product-001", None)
        .await?;

    if !response.data.is_empty() {
        let p: Product = serde_json::from_slice(&response.data)?;
        println!("Retrieved: {} at ${}", p.name, p.price);
    }

    Ok(())
}
```

## Running with Dapr

```bash
dapr run \
  --app-id rust-app \
  --dapr-grpc-port 50001 \
  -- cargo run
```

## Component Configuration

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
```

## Verifying the Setup

```bash
# Check sidecar is running
dapr list

# Verify state was saved
curl http://localhost:3500/v1.0/state/statestore/product-001
```

## Summary

The Dapr Rust SDK connects to the sidecar via gRPC using the `tonic` client. Add the `dapr` crate to `Cargo.toml`, connect with `Client::connect`, and use async methods for state, pub/sub, and service invocation. The port is configurable via environment variable, making the same code work across local development and Kubernetes deployments.
