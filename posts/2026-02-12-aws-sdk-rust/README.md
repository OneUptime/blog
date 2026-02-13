# How to Use the AWS SDK for Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Rust, SDK

Description: A practical guide to using the AWS SDK for Rust, covering setup, S3 operations, DynamoDB, Lambda, error handling, and async patterns with Tokio for AWS development.

---

The AWS SDK for Rust brings AWS services to one of the fastest systems programming languages available. Built on top of the Smithy code generation framework (the same one powering the Kotlin and Swift SDKs), it's fully async and designed around Rust's ownership model. If you're building high-performance AWS-connected applications, this SDK is worth learning.

## Setting Up

Add the SDK crates to your `Cargo.toml`. Each AWS service has its own crate.

```toml
[dependencies]
aws-config = { version = "1.5", features = ["behavior-version-latest"] }
aws-sdk-s3 = "1.50"
aws-sdk-dynamodb = "1.50"
aws-sdk-lambda = "1.50"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Creating Clients

All SDK clients are created from a shared AWS config. Load it once and create clients from it.

```rust
use aws_config::BehaviorVersion;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_dynamodb::Client as DynamoClient;

#[tokio::main]
async fn main() {
    // Load config from environment, profile, or IAM role
    let config = aws_config::defaults(BehaviorVersion::latest())
        .region("us-east-1")
        .load()
        .await;

    // Create service clients from the shared config
    let s3 = S3Client::new(&config);
    let dynamodb = DynamoClient::new(&config);

    // List S3 buckets
    let resp = s3.list_buckets().send().await.unwrap();
    for bucket in resp.buckets() {
        println!("Bucket: {}", bucket.name().unwrap_or("unnamed"));
    }
}
```

## S3 Operations

Here are the most common S3 operations in Rust.

```rust
use aws_sdk_s3::Client;
use aws_sdk_s3::primitives::ByteStream;
use std::path::Path;

async fn s3_examples(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    // Upload a file from disk
    let body = ByteStream::from_path(Path::new("report.pdf")).await?;
    client.put_object()
        .bucket("my-bucket")
        .key("reports/report.pdf")
        .content_type("application/pdf")
        .body(body)
        .send()
        .await?;
    println!("File uploaded");

    // Upload from bytes
    let data = b"Hello, World!";
    client.put_object()
        .bucket("my-bucket")
        .key("data/hello.txt")
        .content_type("text/plain")
        .body(ByteStream::from(data.to_vec()))
        .send()
        .await?;

    // Download an object
    let resp = client.get_object()
        .bucket("my-bucket")
        .key("data/hello.txt")
        .send()
        .await?;

    let body_bytes = resp.body.collect().await?.into_bytes();
    let content = String::from_utf8(body_bytes.to_vec())?;
    println!("Content: {content}");

    // List objects with a prefix
    let resp = client.list_objects_v2()
        .bucket("my-bucket")
        .prefix("reports/")
        .send()
        .await?;

    for object in resp.contents() {
        println!(
            "  {} ({} bytes)",
            object.key().unwrap_or(""),
            object.size().unwrap_or(0)
        );
    }

    Ok(())
}
```

## DynamoDB Operations

Working with DynamoDB in Rust uses the AttributeValue enum for typed data.

```rust
use aws_sdk_dynamodb::Client;
use aws_sdk_dynamodb::types::AttributeValue;
use std::collections::HashMap;

async fn dynamodb_examples(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    // Put an item
    client.put_item()
        .table_name("users")
        .item("user_id", AttributeValue::S("user-123".to_string()))
        .item("name", AttributeValue::S("Alice Johnson".to_string()))
        .item("email", AttributeValue::S("alice@example.com".to_string()))
        .item("age", AttributeValue::N("30".to_string()))
        .item("active", AttributeValue::Bool(true))
        .send()
        .await?;
    println!("Item created");

    // Get an item
    let resp = client.get_item()
        .table_name("users")
        .key("user_id", AttributeValue::S("user-123".to_string()))
        .send()
        .await?;

    if let Some(item) = resp.item() {
        let name = item.get("name")
            .and_then(|v| v.as_s().ok())
            .unwrap_or(&"unknown".to_string());
        println!("Name: {name}");
    }

    // Query items
    let resp = client.query()
        .table_name("orders")
        .key_condition_expression("customer_id = :cid")
        .expression_attribute_values(
            ":cid",
            AttributeValue::S("cust-12345".to_string())
        )
        .send()
        .await?;

    println!("Found {} orders", resp.count());
    for item in resp.items() {
        let order_id = item.get("order_id")
            .and_then(|v| v.as_s().ok())
            .unwrap_or(&"unknown".to_string());
        println!("  Order: {order_id}");
    }

    Ok(())
}
```

## Lambda Invocation

```rust
use aws_sdk_lambda::Client;
use aws_sdk_lambda::primitives::Blob;

async fn invoke_lambda(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    let payload = serde_json::json!({
        "user_id": "user-123",
        "action": "process"
    });

    let resp = client.invoke()
        .function_name("my-processor")
        .payload(Blob::new(serde_json::to_vec(&payload)?))
        .send()
        .await?;

    if let Some(payload) = resp.payload() {
        let result: serde_json::Value = serde_json::from_slice(payload.as_ref())?;
        println!("Result: {result}");
    }

    // Check for function errors
    if let Some(error) = resp.function_error() {
        println!("Function error: {error}");
    }

    Ok(())
}
```

## Error Handling

The Rust SDK uses typed errors that integrate with Rust's Result type.

```rust
use aws_sdk_s3::Client;
use aws_sdk_s3::operation::get_object::GetObjectError;
use aws_sdk_s3::error::SdkError;

async fn get_object_safe(
    client: &Client,
    bucket: &str,
    key: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    match client.get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
    {
        Ok(resp) => {
            let bytes = resp.body.collect().await?.into_bytes();
            Ok(String::from_utf8(bytes.to_vec())?)
        }
        Err(SdkError::ServiceError(err)) => {
            match err.err() {
                GetObjectError::NoSuchKey(_) => {
                    println!("Object {key} not found in {bucket}");
                    Err("Object not found".into())
                }
                other => {
                    println!("Service error: {other:?}");
                    Err(other.into())
                }
            }
        }
        Err(SdkError::TimeoutError(_)) => {
            println!("Request timed out");
            Err("Timeout".into())
        }
        Err(err) => {
            println!("Other error: {err:?}");
            Err(err.into())
        }
    }
}
```

## Pagination

The Rust SDK provides paginator methods that return async streams.

```rust
use aws_sdk_s3::Client;

async fn list_all_objects(
    client: &Client,
    bucket: &str,
    prefix: &str,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut keys = Vec::new();

    let mut paginator = client.list_objects_v2()
        .bucket(bucket)
        .prefix(prefix)
        .into_paginator()
        .send();

    while let Some(page) = paginator.next().await {
        let page = page?;
        for object in page.contents() {
            if let Some(key) = object.key() {
                keys.push(key.to_string());
            }
        }
    }

    println!("Found {} objects", keys.len());
    Ok(keys)
}
```

## Custom Configuration

Configure timeouts, retries, and endpoints.

```rust
use aws_config::BehaviorVersion;
use aws_sdk_s3::Client;
use aws_sdk_s3::config::Builder;
use std::time::Duration;

async fn create_configured_client() -> Client {
    let config = aws_config::defaults(BehaviorVersion::latest())
        .region("us-east-1")
        .load()
        .await;

    // Standard client
    let s3 = Client::new(&config);

    // Client with custom endpoint (for LocalStack)
    let local_config = aws_sdk_s3::config::Builder::from(&config)
        .endpoint_url("http://localhost:4566")
        .force_path_style(true)
        .build();

    let local_s3 = Client::from_conf(local_config);

    s3
}
```

## Concurrent Operations

Rust's async model makes concurrent AWS operations natural and safe.

```rust
use aws_sdk_s3::Client;
use tokio::task::JoinSet;

async fn upload_files_concurrently(
    client: &Client,
    bucket: &str,
    files: Vec<(String, Vec<u8>)>,  // (key, content) pairs
) -> Result<usize, Box<dyn std::error::Error>> {
    let mut tasks = JoinSet::new();

    for (key, content) in files {
        let client = client.clone();
        let bucket = bucket.to_string();

        tasks.spawn(async move {
            client.put_object()
                .bucket(&bucket)
                .key(&key)
                .body(content.into())
                .send()
                .await
                .map(|_| key)
        });
    }

    let mut success_count = 0;
    while let Some(result) = tasks.join_next().await {
        match result? {
            Ok(key) => {
                println!("Uploaded: {key}");
                success_count += 1;
            }
            Err(err) => {
                println!("Upload failed: {err:?}");
            }
        }
    }

    Ok(success_count)
}
```

## Best Practices

- **Load config once** and create multiple clients from it. Config loading resolves credentials and region.
- **Clone clients freely.** AWS SDK clients in Rust use `Arc` internally and are cheap to clone.
- **Use paginators** for list operations. They handle continuation tokens automatically.
- **Match on specific error variants.** Rust's type system gives you precise error handling.
- **Use Tokio for the async runtime.** The SDK is built on Tokio and works best with it.
- **Leverage Rust's type safety.** Use structs with serde for serializing Lambda payloads instead of raw JSON strings.

For testing Rust AWS code locally without real AWS services, check out [LocalStack](https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view). The custom endpoint configuration shown above is all you need to point your Rust clients at a local stack.
