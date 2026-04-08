# How to Perform CRUD Operations with the MongoDB Rust Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, CRUD, Collection, Serde

Description: A practical guide to inserting, querying, updating, and deleting MongoDB documents from Rust using the official async driver and Serde.

---

## Introduction

The MongoDB Rust driver's CRUD operations are fully async and return `Result` types. Documents are represented as Serde-serializable structs or raw BSON documents. This guide walks through each operation using a typed `Product` struct.

## Setup

```rust
use mongodb::{Client, Collection, bson::doc};
use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;

#[derive(Debug, Serialize, Deserialize)]
struct Product {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id:       Option<ObjectId>,
    name:     String,
    price:    f64,
    category: String,
    in_stock: bool,
}

async fn get_collection(client: &Client) -> Collection<Product> {
    client.database("shop").collection("products")
}
```

## Create - Inserting Documents

```rust
let col = get_collection(&client).await;

// Insert one
let product = Product {
    id:       None,
    name:     "Laptop".to_string(),
    price:    999.99,
    category: "electronics".to_string(),
    in_stock: true,
};
let result = col.insert_one(product).await?;
println!("Inserted: {:?}", result.inserted_id);

// Insert many
let products = vec![
    Product { id: None, name: "Mouse".into(), price: 29.99, category: "electronics".into(), in_stock: true },
    Product { id: None, name: "Desk".into(),  price: 199.0, category: "furniture".into(),   in_stock: false },
];
let result = col.insert_many(products).await?;
println!("Inserted {} documents", result.inserted_ids.len());
```

## Read - Querying Documents

```rust
use mongodb::bson::doc;
use futures::stream::TryStreamExt;

// Find all in category
let filter = doc! { "category": "electronics" };
let mut cursor = col.find(filter).await?;
while let Some(p) = cursor.try_next().await? {
    println!("{}: ${}", p.name, p.price);
}

// Find one
let product = col.find_one(doc! { "name": "Laptop" }).await?;
if let Some(p) = product {
    println!("Found: {} at ${}", p.name, p.price);
}
```

## Update - Modifying Documents

```rust
// Update one
col.update_one(
    doc! { "name": "Laptop" },
    doc! { "$set": { "price": 899.99 } },
).await?;

// Update many
col.update_many(
    doc! { "category": "electronics" },
    doc! { "$inc": { "views": 1 } },
).await?;

// Upsert
col.update_one(
    doc! { "name": "Keyboard" },
    doc! { "$setOnInsert": { "price": 49.99, "category": "electronics", "in_stock": true } },
).upsert(true).await?;
```

## Delete - Removing Documents

```rust
// Delete one
let result = col.delete_one(doc! { "name": "Desk" }).await?;
println!("Deleted: {}", result.deleted_count);

// Delete many
let result = col.delete_many(doc! { "in_stock": false }).await?;
println!("Deleted: {}", result.deleted_count);
```

## Summary

The MongoDB Rust driver uses typed collections backed by Serde-derived structs. Insert documents with `insert_one`/`insert_many`, query with `find`/`find_one` returning async cursors, modify with `update_one`/`update_many` using BSON update operators, and remove with `delete_one`/`delete_many`. All operations are async and return `Result`, integrating naturally with Tokio's error propagation.
