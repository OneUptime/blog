# How to Serialize and Deserialize with Serde for MongoDB in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Serde, BSON, Serialization

Description: Learn how to use Serde derive macros and BSON attributes to map Rust structs to MongoDB documents with correct type handling.

---

## Introduction

The MongoDB Rust driver uses BSON as its wire format and Serde for converting between Rust types and BSON documents. Understanding the available field attributes and type mappings is essential for writing Rust structs that round-trip correctly through MongoDB.

## Basic Derive Setup

```toml
[dependencies]
mongodb = "3"
serde   = { version = "1", features = ["derive"] }
bson    = { version = "2", features = ["chrono-0_4"] }
chrono  = "0.4"
```

```rust
use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id:         Option<ObjectId>,
    name:       String,
    email:      String,
    created_at: DateTime<Utc>,
}
```

## Renaming Fields

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Product {
    product_name:  String,   // serialized as "productName"
    unit_price:    f64,      // serialized as "unitPrice"
    in_stock:      bool,     // serialized as "inStock"
}
```

## Handling Optional Fields

Use `skip_serializing_if` to avoid writing `null` to MongoDB:

```rust
#[derive(Serialize, Deserialize)]
struct Article {
    title: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    subtitle: Option<String>,

    #[serde(default)]
    tags: Vec<String>,
}
```

## BSON-Specific Types

```rust
use mongodb::bson::{Bson, Decimal128, oid::ObjectId, DateTime as BsonDateTime};

#[derive(Serialize, Deserialize)]
struct Order {
    #[serde(rename = "_id")]
    id:          ObjectId,

    #[serde(with = "bson::serde_helpers::bson_datetime_as_rfc3339_string")]
    placed_at:   BsonDateTime,

    // Store large decimal without floating-point loss
    total:       Decimal128,
}
```

## Enum Serialization

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum Status {
    Pending,
    Active,
    Archived,
}

#[derive(Serialize, Deserialize)]
struct Task {
    title:  String,
    status: Status,
}
```

## Converting Between Document and Struct

```rust
use mongodb::bson::{doc, from_document, to_document};

let user = User {
    id:         None,
    name:       "Alice".to_string(),
    email:      "alice@example.com".to_string(),
    created_at: Utc::now(),
};

// Struct -> Document
let doc = to_document(&user)?;

// Document -> Struct
let raw = doc! { "name": "Bob", "email": "bob@example.com", "created_at": BsonDateTime::now() };
let parsed: User = from_document(raw)?;
```

## Summary

Serde integration in the MongoDB Rust driver relies on `#[derive(Serialize, Deserialize)]` combined with field attributes: `rename` maps `_id`, `rename_all` converts naming conventions, `skip_serializing_if` suppresses null fields, and `default` fills missing values. Use BSON-specific types like `ObjectId` and `DateTime` for fields that must interoperate with MongoDB's native types.
