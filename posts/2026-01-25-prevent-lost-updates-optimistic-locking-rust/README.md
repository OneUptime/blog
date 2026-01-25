# How to Prevent Lost Updates with Optimistic Locking in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Optimistic Locking, Database, Concurrency, Data Integrity

Description: Learn how to prevent lost updates in concurrent systems using optimistic locking in Rust. This guide covers version-based locking, database implementation patterns, and retry strategies for handling conflicts gracefully.

---

Lost updates are one of the sneakiest bugs in concurrent systems. Two users read the same record, both make changes, and the last write silently overwrites the first. No errors, no warnings - just vanished data. If you have ever wondered why a customer's changes disappeared or why inventory counts go negative, lost updates are often the culprit.

Optimistic locking is a straightforward pattern that catches these conflicts before they cause damage. Instead of locking rows upfront (pessimistic locking), you let concurrent reads happen freely and detect conflicts at write time. This approach works well for web applications where contention is low and holding database locks is expensive.

## How Optimistic Locking Works

The idea is simple: every record gets a version number. When you read a row, you grab its current version. When you update, you include that version in your WHERE clause. If someone else modified the record in between, the version won't match, and your UPDATE affects zero rows.

Here's the flow:

1. Read the record and its version (e.g., `version = 5`)
2. Make your changes in application code
3. UPDATE the record WHERE `id = X AND version = 5`, incrementing version to 6
4. If zero rows affected, someone else got there first - handle the conflict

This trades the complexity of distributed locks for a simple version check. The database does the heavy lifting.

## Setting Up the Database Schema

First, you need a version column on any table where concurrent updates can happen. Here's a typical migration:

```sql
-- Add version column for optimistic locking
ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Example table structure
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

The version starts at 1 and increments with every successful update. Some teams use a timestamp instead, but integers are easier to reason about and avoid clock skew issues.

## Implementing Optimistic Locking in Rust

Let's build a practical example using `sqlx` with PostgreSQL. We will create a product update function that handles concurrent modifications safely.

```rust
use sqlx::{PgPool, Error as SqlxError};
use thiserror::Error;

// Define our domain types
#[derive(Debug, Clone)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub price: f64,
    pub stock: i32,
    pub version: i32,
}

// Custom error type for update failures
#[derive(Error, Debug)]
pub enum UpdateError {
    #[error("optimistic lock conflict: record was modified by another transaction")]
    Conflict,
    #[error("record not found: id {0}")]
    NotFound(i32),
    #[error("database error: {0}")]
    Database(#[from] SqlxError),
}

// Fetch a product by ID
pub async fn get_product(pool: &PgPool, id: i32) -> Result<Option<Product>, SqlxError> {
    sqlx::query_as!(
        Product,
        r#"
        SELECT id, name, price, stock, version
        FROM products
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await
}
```

Now the critical part - the update function that enforces optimistic locking:

```rust
// Update product with optimistic locking
pub async fn update_product(
    pool: &PgPool,
    id: i32,
    name: &str,
    price: f64,
    stock: i32,
    expected_version: i32,
) -> Result<Product, UpdateError> {
    // The WHERE clause includes the version check
    // If version changed, zero rows match and we detect the conflict
    let result = sqlx::query_as!(
        Product,
        r#"
        UPDATE products
        SET name = $1,
            price = $2,
            stock = $3,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND version = $5
        RETURNING id, name, price, stock, version
        "#,
        name,
        price,
        stock,
        id,
        expected_version
    )
    .fetch_optional(pool)
    .await?;

    match result {
        Some(product) => Ok(product),
        None => {
            // Check if the record exists at all
            let exists = sqlx::query_scalar!(
                "SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)",
                id
            )
            .fetch_one(pool)
            .await?;

            if exists.unwrap_or(false) {
                Err(UpdateError::Conflict)
            } else {
                Err(UpdateError::NotFound(id))
            }
        }
    }
}
```

The key insight here is using `RETURNING` to get the updated row back. If `fetch_optional` returns `None`, either the record doesn't exist or someone else updated it. We distinguish these cases with a follow-up query.

## Handling Conflicts with Retry Logic

When a conflict happens, you have options: fail immediately, retry automatically, or prompt the user. For background jobs and automated processes, automatic retry often makes sense:

```rust
use tokio::time::{sleep, Duration};

// Retry configuration
const MAX_RETRIES: u32 = 3;
const RETRY_DELAY_MS: u64 = 50;

pub async fn update_product_with_retry(
    pool: &PgPool,
    id: i32,
    update_fn: impl Fn(&Product) -> (String, f64, i32),
) -> Result<Product, UpdateError> {
    let mut attempts = 0;

    loop {
        attempts += 1;

        // Fetch current state
        let product = get_product(pool, id)
            .await?
            .ok_or(UpdateError::NotFound(id))?;

        // Apply the update function to get new values
        let (new_name, new_price, new_stock) = update_fn(&product);

        // Attempt the update
        match update_product(
            pool,
            id,
            &new_name,
            new_price,
            new_stock,
            product.version,
        )
        .await
        {
            Ok(updated) => return Ok(updated),
            Err(UpdateError::Conflict) if attempts < MAX_RETRIES => {
                // Wait briefly before retry to reduce contention
                sleep(Duration::from_millis(RETRY_DELAY_MS * attempts as u64)).await;
                continue;
            }
            Err(e) => return Err(e),
        }
    }
}
```

The `update_fn` closure is important here. It takes the current product state and returns the new values. This way, each retry works with fresh data. If you just retried the original update blindly, you would hit the same conflict repeatedly.

## A Complete Example: Inventory Deduction

Here's how this looks in practice for a common scenario - deducting inventory during checkout:

```rust
pub async fn deduct_inventory(
    pool: &PgPool,
    product_id: i32,
    quantity: i32,
) -> Result<Product, UpdateError> {
    update_product_with_retry(pool, product_id, |product| {
        // Calculate new stock based on current value
        let new_stock = (product.stock - quantity).max(0);

        // Return unchanged name and price, updated stock
        (product.name.clone(), product.price, new_stock)
    })
    .await
}

// Usage in a request handler
pub async fn handle_checkout(pool: &PgPool, product_id: i32, qty: i32) {
    match deduct_inventory(pool, product_id, qty).await {
        Ok(product) => {
            println!("Updated stock to {}", product.stock);
        }
        Err(UpdateError::Conflict) => {
            // All retries exhausted - high contention
            eprintln!("Could not update inventory due to high contention");
        }
        Err(UpdateError::NotFound(id)) => {
            eprintln!("Product {} not found", id);
        }
        Err(UpdateError::Database(e)) => {
            eprintln!("Database error: {}", e);
        }
    }
}
```

## When to Use Pessimistic Locking Instead

Optimistic locking shines when conflicts are rare. If most transactions succeed on the first try, the overhead is minimal. But there are scenarios where pessimistic locking (SELECT FOR UPDATE) is better:

- High contention on the same rows, like a counter that every request updates
- Long-running transactions where holding a lock is acceptable
- Financial operations where you need absolute ordering guarantees

For web APIs with typical CRUD operations, optimistic locking is usually the right choice. It scales better because you are not holding database locks during HTTP round trips.

## Testing Your Implementation

Don't skip testing the conflict path. Here's a simple test that simulates concurrent updates:

```rust
#[tokio::test]
async fn test_optimistic_lock_conflict() {
    let pool = setup_test_db().await;

    // Create a test product
    let product = create_test_product(&pool, "Widget", 10.0, 100).await;

    // Simulate reading the same version twice
    let version_a = product.version;
    let version_b = product.version;

    // First update succeeds
    let result_a = update_product(
        &pool, product.id, "Widget A", 10.0, 90, version_a
    ).await;
    assert!(result_a.is_ok());

    // Second update with stale version fails
    let result_b = update_product(
        &pool, product.id, "Widget B", 10.0, 80, version_b
    ).await;
    assert!(matches!(result_b, Err(UpdateError::Conflict)));
}
```

## Summary

Optimistic locking is a battle-tested pattern for preventing lost updates without the overhead of database locks. In Rust, the type system helps you model these conflicts explicitly with custom error types, making it harder to accidentally ignore them.

The core pattern is:

1. Add a version column to your tables
2. Include the expected version in your UPDATE WHERE clause
3. Detect conflicts when zero rows are affected
4. Either fail fast or retry with fresh data

Start with this pattern on any table where concurrent writes can happen. Your future self - and your users - will thank you when data stops mysteriously disappearing.
