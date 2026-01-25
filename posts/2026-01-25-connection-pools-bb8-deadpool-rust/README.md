# How to Build Connection Pools with bb8 and deadpool in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Connection Pool, bb8, deadpool, Database

Description: Learn how to implement efficient connection pooling in Rust using bb8 and deadpool, two async-first libraries that handle database connections for high-throughput applications.

---

Database connections are expensive. Each new connection involves TCP handshakes, authentication, and protocol negotiation. In a high-traffic application, creating a fresh connection for every request becomes a bottleneck. Connection pools solve this by maintaining a set of reusable connections that your application can borrow and return.

Rust has two standout async connection pooling libraries: bb8 and deadpool. Both integrate with Tokio and support popular databases like PostgreSQL, Redis, and more. This guide walks through building production-ready connection pools with both libraries.

## Why Connection Pooling Matters

Without pooling, a typical request flow looks like this:

1. Open TCP connection to database
2. Authenticate
3. Execute query
4. Close connection

With 1000 requests per second, you would open and close 1000 connections every second. Database servers have connection limits, and this approach wastes resources.

Connection pools change the flow:

1. Borrow an existing connection from the pool
2. Execute query
3. Return connection to the pool

The pool manages connection lifecycle, health checks, and limits. Your application code stays simple.

## Setting Up bb8 for PostgreSQL

bb8 is a generic connection pool that works with any async connection type through its `ManageConnection` trait. For PostgreSQL, the `bb8-postgres` crate provides the adapter.

Add the dependencies to your `Cargo.toml`:

```toml
[dependencies]
bb8 = "0.8"
bb8-postgres = "0.8"
tokio-postgres = "0.7"
tokio = { version = "1", features = ["full"] }
```

Here is a basic pool setup:

```rust
use bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;

// Create a connection pool with default settings
// The manager handles creating and validating connections
async fn create_pool() -> Result<Pool<PostgresConnectionManager<NoTls>>, Box<dyn std::error::Error>> {
    let manager = PostgresConnectionManager::new_from_stringlike(
        "host=localhost user=postgres dbname=myapp",
        NoTls,
    )?;

    let pool = Pool::builder()
        .max_size(20)              // Maximum connections in the pool
        .min_idle(Some(5))         // Keep at least 5 idle connections ready
        .connection_timeout(std::time::Duration::from_secs(30))
        .build(manager)
        .await?;

    Ok(pool)
}
```

Using the pool is straightforward. Call `get()` to borrow a connection:

```rust
async fn fetch_user(pool: &Pool<PostgresConnectionManager<NoTls>>, user_id: i32)
    -> Result<String, Box<dyn std::error::Error>>
{
    // Get a connection from the pool
    // This returns a guard that automatically returns the connection when dropped
    let conn = pool.get().await?;

    // Use the connection
    let row = conn
        .query_one("SELECT name FROM users WHERE id = $1", &[&user_id])
        .await?;

    let name: String = row.get(0);
    Ok(name)
}
```

The connection automatically returns to the pool when the `conn` variable goes out of scope.

## Setting Up deadpool for PostgreSQL

deadpool takes a different approach. It provides runtime-specific implementations and often simpler configuration through the config crate. The `deadpool-postgres` crate integrates directly with `tokio-postgres`.

```toml
[dependencies]
deadpool-postgres = "0.12"
tokio-postgres = "0.7"
tokio = { version = "1", features = ["full"] }
```

Basic deadpool setup:

```rust
use deadpool_postgres::{Config, Pool, Runtime};
use tokio_postgres::NoTls;

// Create a deadpool connection pool
// deadpool uses a Config struct for settings
async fn create_pool() -> Result<Pool, Box<dyn std::error::Error>> {
    let mut cfg = Config::new();
    cfg.host = Some("localhost".to_string());
    cfg.user = Some("postgres".to_string());
    cfg.dbname = Some("myapp".to_string());

    // Pool configuration
    cfg.pool = Some(deadpool_postgres::PoolConfig {
        max_size: 20,
        timeouts: deadpool_postgres::Timeouts {
            wait: Some(std::time::Duration::from_secs(30)),
            create: Some(std::time::Duration::from_secs(30)),
            recycle: Some(std::time::Duration::from_secs(30)),
        },
        ..Default::default()
    });

    let pool = cfg.create_pool(Some(Runtime::Tokio1), NoTls)?;
    Ok(pool)
}
```

Using deadpool:

```rust
use deadpool_postgres::Pool;

async fn fetch_user(pool: &Pool, user_id: i32)
    -> Result<String, Box<dyn std::error::Error>>
{
    // Get a client from the pool
    let client = pool.get().await?;

    let row = client
        .query_one("SELECT name FROM users WHERE id = $1", &[&user_id])
        .await?;

    let name: String = row.get(0);
    Ok(name)
}
```

## Handling Connection Failures

Real applications need to handle connection errors gracefully. Both libraries support custom error handling:

```rust
use bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;

// Wrapper that handles pool exhaustion and connection errors
async fn query_with_retry<T, F, Fut>(
    pool: &Pool<PostgresConnectionManager<NoTls>>,
    max_retries: u32,
    operation: F,
) -> Result<T, Box<dyn std::error::Error>>
where
    F: Fn(bb8::PooledConnection<'_, PostgresConnectionManager<NoTls>>) -> Fut,
    Fut: std::future::Future<Output = Result<T, Box<dyn std::error::Error>>>,
{
    let mut attempts = 0;

    loop {
        attempts += 1;

        // Try to get a connection
        let conn = match pool.get().await {
            Ok(conn) => conn,
            Err(e) if attempts < max_retries => {
                eprintln!("Failed to get connection (attempt {}): {}", attempts, e);
                tokio::time::sleep(std::time::Duration::from_millis(100 * attempts as u64)).await;
                continue;
            }
            Err(e) => return Err(e.into()),
        };

        // Execute the operation
        match operation(conn).await {
            Ok(result) => return Ok(result),
            Err(e) if attempts < max_retries => {
                eprintln!("Query failed (attempt {}): {}", attempts, e);
                tokio::time::sleep(std::time::Duration::from_millis(100 * attempts as u64)).await;
                continue;
            }
            Err(e) => return Err(e),
        }
    }
}
```

## Health Checks and Connection Recycling

Connections can go stale. Network issues, database restarts, or idle timeouts can leave connections in a broken state. Both libraries support health checking.

bb8 validates connections before returning them:

```rust
use bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;

// bb8 automatically tests connections before returning them
// You can also configure custom test queries
let pool = Pool::builder()
    .max_size(20)
    .test_on_check_out(true)  // Verify connection health when borrowing
    .build(manager)
    .await?;
```

deadpool has explicit recycling configuration:

```rust
use deadpool_postgres::{Config, RecyclingMethod};

// Configure how deadpool validates connections
let mut cfg = Config::new();
cfg.host = Some("localhost".to_string());
cfg.user = Some("postgres".to_string());

// Choose recycling method
// Fast: No validation (trusts the connection)
// Verified: Runs a test query
// Clean: Runs DISCARD ALL to reset session state
let pool = cfg.builder(NoTls)?
    .recycling_method(RecyclingMethod::Verified)
    .build()?;
```

## Integrating with Web Frameworks

Both libraries work well with Axum, Actix-web, and other async frameworks. Here is an Axum example with deadpool:

```rust
use axum::{extract::State, routing::get, Router, Json};
use deadpool_postgres::Pool;
use serde::Serialize;

#[derive(Clone)]
struct AppState {
    pool: Pool,
}

#[derive(Serialize)]
struct User {
    id: i32,
    name: String,
}

// Handler that uses the pool from application state
async fn get_users(State(state): State<AppState>) -> Result<Json<Vec<User>>, String> {
    let client = state.pool.get().await.map_err(|e| e.to_string())?;

    let rows = client
        .query("SELECT id, name FROM users LIMIT 10", &[])
        .await
        .map_err(|e| e.to_string())?;

    let users: Vec<User> = rows
        .iter()
        .map(|row| User {
            id: row.get(0),
            name: row.get(1),
        })
        .collect();

    Ok(Json(users))
}

#[tokio::main]
async fn main() {
    // Create pool at startup
    let pool = create_pool().await.expect("Failed to create pool");

    let state = AppState { pool };

    let app = Router::new()
        .route("/users", get(get_users))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## bb8 vs deadpool: Which Should You Choose?

| Feature | bb8 | deadpool |
|---------|-----|----------|
| Generic pool | Yes | Yes |
| Config file support | Manual | Built-in |
| Runtime support | Any async | Tokio, async-std |
| Connection recycling | Basic | Configurable |
| Metrics | External | Built-in hooks |

Choose bb8 if you need flexibility or work with custom connection types. Choose deadpool if you want simpler configuration and built-in features like config file support.

## Tuning Pool Size

The optimal pool size depends on your workload. A common formula:

```
pool_size = (core_count * 2) + effective_spindle_count
```

For SSD-backed databases, start with twice your CPU cores. Monitor these metrics:

- Wait time for connections
- Active vs idle connections
- Connection errors

If requests frequently wait for connections, increase the pool size. If many connections sit idle, reduce it.

## Summary

Connection pooling is essential for any database-backed Rust application. Both bb8 and deadpool provide battle-tested implementations that integrate with the async ecosystem. bb8 offers flexibility for custom connections, while deadpool provides convenience with better defaults. Either choice will handle thousands of concurrent database operations efficiently.

Start with conservative pool sizes and tune based on your actual traffic patterns. Monitor connection wait times and adjust accordingly. Your database server will thank you.
