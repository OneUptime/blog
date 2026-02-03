# How to Use Actix with SQLx for Database Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Actix, SQLx, Database, PostgreSQL, Backend, Web Development

Description: A practical guide to building type-safe database-driven web applications with Actix Web and SQLx in Rust.

---

Building web applications in Rust means choosing libraries that play well together. Actix Web handles HTTP with impressive performance, and SQLx brings compile-time checked SQL queries without the overhead of a full ORM. Together, they let you build fast, reliable APIs where the compiler catches database mistakes before your code even runs.

This guide walks through setting up SQLx with Actix, managing connection pools, running migrations, and structuring your code for maintainability.

## Why SQLx Over an ORM?

SQLx is not an ORM. You write actual SQL, and SQLx validates your queries against the database at compile time. This approach gives you:

- Direct control over every query
- No hidden N+1 problems or surprise joins
- Database-specific features without fighting abstractions
- Compile-time guarantees that your queries match your schema

If you want maximum control and compile-time safety, SQLx is the right choice. If you prefer Rails-style model abstractions, look at Diesel or SeaORM instead.

## Project Setup

Start with a new Actix project and add the dependencies.

```bash
cargo new actix-sqlx-demo
cd actix-sqlx-demo
```

Add these dependencies to your `Cargo.toml`. We are using PostgreSQL here, but SQLx also supports MySQL, SQLite, and MSSQL.

```toml
[dependencies]
actix-web = "4"
actix-rt = "2"
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "chrono", "uuid"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dotenv = "0.15"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "1"
```

Create a `.env` file in your project root for the database URL.

```bash
DATABASE_URL=postgres://postgres:password@localhost:5432/actix_demo
```

## Architecture Overview

Before diving into code, here is how requests flow through the system.

```mermaid
flowchart LR
    A[HTTP Request] --> B[Actix Handler]
    B --> C[Repository]
    C --> D[Connection Pool]
    D --> E[(PostgreSQL)]
    E --> D
    D --> C
    C --> B
    B --> F[HTTP Response]
```

The connection pool is shared across all handlers. Repositories encapsulate database logic and use the pool to acquire connections. Handlers coordinate business logic and return responses.

## Setting Up the Connection Pool

SQLx uses connection pools to manage database connections efficiently. You create the pool once at startup and share it across all request handlers.

```rust
// src/db.rs
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::env;

// Creates a connection pool with sensible defaults for a web application.
// The pool manages connection lifecycle, handles reconnects, and limits
// concurrent database connections.
pub async fn create_pool() -> Result<PgPool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    PgPoolOptions::new()
        // Maximum connections depends on your database and workload.
        // Start conservative and increase based on metrics.
        .max_connections(10)
        // Connections idle longer than this are closed.
        .idle_timeout(std::time::Duration::from_secs(300))
        // Fail fast if we cannot connect at startup.
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&database_url)
        .await
}
```

Wire the pool into your Actix application using application data. This makes the pool available to all handlers.

```rust
// src/main.rs
use actix_web::{web, App, HttpServer};
use dotenv::dotenv;

mod db;
mod handlers;
mod models;
mod repositories;
mod errors;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables from .env file
    dotenv().ok();

    // Create the database pool - this runs migrations and validates the connection
    let pool = db::create_pool()
        .await
        .expect("Failed to create database pool");

    // Wrap pool in web::Data for shared ownership across handlers
    let pool_data = web::Data::new(pool);

    println!("Starting server at http://127.0.0.1:8080");

    HttpServer::new(move || {
        App::new()
            // Clone the Arc-wrapped pool for each worker
            .app_data(pool_data.clone())
            .configure(handlers::configure_routes)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Running Migrations

SQLx includes a migration system. Migrations live in the `migrations` folder and run in order based on their timestamp prefix.

Install the SQLx CLI to manage migrations.

```bash
cargo install sqlx-cli --no-default-features --features postgres
```

Create your first migration.

```bash
sqlx migrate add create_users_table
```

This creates a new file in `migrations/`. Edit it to define your schema.

```sql
-- migrations/20240101000000_create_users_table.sql

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);
```

Run migrations from the command line or programmatically at startup.

```bash
sqlx migrate run
```

To run migrations automatically when your application starts, add this to your database setup.

```rust
// Run pending migrations on startup
// This is useful for development but consider manual migrations for production
pub async fn create_pool_with_migrations() -> Result<PgPool, sqlx::Error> {
    let pool = create_pool().await?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}
```

## Compile-Time Query Checking

SQLx can verify your queries at compile time. This catches typos, type mismatches, and schema drift before you even run your tests.

First, prepare the query cache. This connects to your database and caches query metadata.

```bash
cargo sqlx prepare
```

This creates a `.sqlx` folder with JSON files describing each query. Commit this folder to version control so CI can verify queries without database access.

Here is a query that SQLx validates at compile time.

```rust
// The sqlx::query_as! macro validates this query against the database schema.
// If the column names or types do not match, compilation fails.
let user = sqlx::query_as!(
    User,
    r#"
    SELECT id, email, name, created_at, updated_at
    FROM users
    WHERE id = $1
    "#,
    user_id
)
.fetch_optional(&pool)
.await?;
```

If you rename a column or change a type, you get a compile error instead of a runtime crash.

## Defining Models

Models represent your database records. SQLx can map query results directly to structs.

```rust
// src/models.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Database model - matches the users table schema exactly
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Request model for creating users - only the fields the client provides
#[derive(Debug, Deserialize)]
pub struct CreateUser {
    pub email: String,
    pub name: String,
}

// Request model for updating users - all fields optional
#[derive(Debug, Deserialize)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub name: Option<String>,
}
```

## The Repository Pattern

Repositories encapsulate all database operations for a domain entity. This keeps SQL out of your handlers and makes testing easier.

```rust
// src/repositories/user_repository.rs
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{CreateUser, UpdateUser, User};

pub struct UserRepository;

impl UserRepository {
    // Fetch a single user by ID. Returns None if not found.
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, name, created_at, updated_at
            FROM users
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    // Fetch a user by email address for login or duplicate checking.
    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, name, created_at, updated_at
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    // List all users with pagination. Defaults to 20 per page.
    pub async fn find_all(
        pool: &PgPool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<User>, AppError> {
        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, name, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(pool)
        .await?;

        Ok(users)
    }

    // Insert a new user and return the created record.
    pub async fn create(pool: &PgPool, input: CreateUser) -> Result<User, AppError> {
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (email, name)
            VALUES ($1, $2)
            RETURNING id, email, name, created_at, updated_at
            "#,
            input.email,
            input.name
        )
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    // Update an existing user. Only updates fields that are provided.
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        input: UpdateUser,
    ) -> Result<Option<User>, AppError> {
        // Build update dynamically based on provided fields
        let user = sqlx::query_as!(
            User,
            r#"
            UPDATE users
            SET
                email = COALESCE($2, email),
                name = COALESCE($3, name),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, name, created_at, updated_at
            "#,
            id,
            input.email,
            input.name
        )
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    // Delete a user by ID. Returns true if a row was deleted.
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query!(
            r#"
            DELETE FROM users
            WHERE id = $1
            "#,
            id
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}
```

## Error Handling

Define custom error types that map to HTTP responses. This keeps error handling consistent across your application.

```rust
// src/errors.rs
use actix_web::{HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    // Database errors - connection failures, constraint violations, etc.
    Database(sqlx::Error),
    // Resource not found - maps to 404
    NotFound(String),
    // Validation errors - maps to 400
    Validation(String),
    // Duplicate resource - maps to 409
    Conflict(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Database(e) => write!(f, "Database error: {}", e),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::Validation(msg) => write!(f, "Validation error: {}", msg),
            AppError::Conflict(msg) => write!(f, "Conflict: {}", msg),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::Database(e) => {
                // Log the actual error but return a generic message
                eprintln!("Database error: {:?}", e);
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Internal server error"
                }))
            }
            AppError::NotFound(msg) => {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": msg
                }))
            }
            AppError::Validation(msg) => {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "error": msg
                }))
            }
            AppError::Conflict(msg) => {
                HttpResponse::Conflict().json(serde_json::json!({
                    "error": msg
                }))
            }
        }
    }
}

// Convert SQLx errors to our app error type
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        // Check for specific database errors
        if let sqlx::Error::Database(ref db_err) = e {
            // PostgreSQL unique violation code
            if db_err.code().map(|c| c == "23505").unwrap_or(false) {
                return AppError::Conflict("Resource already exists".to_string());
            }
        }
        AppError::Database(e)
    }
}
```

## Building Handlers

Handlers receive HTTP requests, call repositories, and return responses. Keep them thin - business logic belongs in services or repositories.

```rust
// src/handlers.rs
use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{CreateUser, UpdateUser};
use crate::repositories::UserRepository;

// Configure all routes for this module
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/users")
            .route("", web::get().to(list_users))
            .route("", web::post().to(create_user))
            .route("/{id}", web::get().to(get_user))
            .route("/{id}", web::put().to(update_user))
            .route("/{id}", web::delete().to(delete_user)),
    );
}

// GET /api/users - List all users with pagination
async fn list_users(
    pool: web::Data<PgPool>,
    query: web::Query<PaginationParams>,
) -> Result<HttpResponse, AppError> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let users = UserRepository::find_all(&pool, limit, offset).await?;

    Ok(HttpResponse::Ok().json(users))
}

#[derive(serde::Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// GET /api/users/{id} - Get a single user
async fn get_user(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let user = UserRepository::find_by_id(&pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))?;

    Ok(HttpResponse::Ok().json(user))
}

// POST /api/users - Create a new user
async fn create_user(
    pool: web::Data<PgPool>,
    body: web::Json<CreateUser>,
) -> Result<HttpResponse, AppError> {
    let input = body.into_inner();

    // Check for duplicate email
    if UserRepository::find_by_email(&pool, &input.email).await?.is_some() {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    let user = UserRepository::create(&pool, input).await?;

    Ok(HttpResponse::Created().json(user))
}

// PUT /api/users/{id} - Update an existing user
async fn update_user(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateUser>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let input = body.into_inner();

    let user = UserRepository::update(&pool, id, input)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))?;

    Ok(HttpResponse::Ok().json(user))
}

// DELETE /api/users/{id} - Delete a user
async fn delete_user(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let deleted = UserRepository::delete(&pool, id).await?;

    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Err(AppError::NotFound(format!("User {} not found", id)))
    }
}
```

## Working with Transactions

Transactions ensure multiple database operations succeed or fail together. SQLx makes transactions straightforward with the `begin`, `commit`, and `rollback` methods.

```rust
// Transfer credits between two users atomically
pub async fn transfer_credits(
    pool: &PgPool,
    from_user_id: Uuid,
    to_user_id: Uuid,
    amount: i64,
) -> Result<(), AppError> {
    // Start a transaction - any error will automatically rollback
    let mut tx = pool.begin().await?;

    // Deduct from sender
    let result = sqlx::query!(
        r#"
        UPDATE users
        SET credits = credits - $2
        WHERE id = $1 AND credits >= $2
        "#,
        from_user_id,
        amount
    )
    .execute(&mut *tx)
    .await?;

    // Check if the sender had enough credits
    if result.rows_affected() == 0 {
        return Err(AppError::Validation("Insufficient credits".to_string()));
    }

    // Add to recipient
    sqlx::query!(
        r#"
        UPDATE users
        SET credits = credits + $2
        WHERE id = $1
        "#,
        to_user_id,
        amount
    )
    .execute(&mut *tx)
    .await?;

    // Record the transfer
    sqlx::query!(
        r#"
        INSERT INTO transfers (from_user_id, to_user_id, amount)
        VALUES ($1, $2, $3)
        "#,
        from_user_id,
        to_user_id,
        amount
    )
    .execute(&mut *tx)
    .await?;

    // Commit the transaction - all operations succeed together
    tx.commit().await?;

    Ok(())
}
```

The transaction flow looks like this.

```mermaid
sequenceDiagram
    participant H as Handler
    participant TX as Transaction
    participant DB as PostgreSQL

    H->>TX: Begin Transaction
    TX->>DB: START TRANSACTION
    H->>TX: Deduct Credits
    TX->>DB: UPDATE users SET credits...
    DB-->>TX: 1 row affected
    H->>TX: Add Credits
    TX->>DB: UPDATE users SET credits...
    DB-->>TX: 1 row affected
    H->>TX: Record Transfer
    TX->>DB: INSERT INTO transfers...
    DB-->>TX: 1 row inserted
    H->>TX: Commit
    TX->>DB: COMMIT
    DB-->>TX: OK
    TX-->>H: Success
```

## Connection Pool Lifecycle

Understanding how the connection pool manages connections helps you tune performance.

```mermaid
stateDiagram-v2
    [*] --> Idle: Pool Created
    Idle --> InUse: Handler Acquires
    InUse --> Idle: Handler Releases
    Idle --> Closed: Idle Timeout
    InUse --> Closed: Connection Error
    Closed --> Idle: New Connection Created
```

Key pool settings to tune:

| Setting | Default | Notes |
| --- | --- | --- |
| `max_connections` | 10 | Increase for high concurrency, but watch database limits |
| `min_connections` | 0 | Set higher to avoid cold start latency |
| `idle_timeout` | 10 min | Lower for serverless, higher for dedicated servers |
| `acquire_timeout` | 30s | How long to wait for an available connection |

## Testing with SQLx

SQLx supports test databases that reset between tests. Use a separate test database to avoid polluting development data.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;

    // Create a test pool connected to a test database
    async fn setup_test_db() -> PgPool {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect("postgres://postgres:password@localhost:5432/actix_demo_test")
            .await
            .expect("Failed to create test pool");

        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        // Clean up any existing test data
        sqlx::query!("TRUNCATE users CASCADE")
            .execute(&pool)
            .await
            .expect("Failed to truncate tables");

        pool
    }

    #[tokio::test]
    async fn test_create_and_find_user() {
        let pool = setup_test_db().await;

        let input = CreateUser {
            email: "test@example.com".to_string(),
            name: "Test User".to_string(),
        };

        // Create a user
        let created = UserRepository::create(&pool, input)
            .await
            .expect("Failed to create user");

        assert_eq!(created.email, "test@example.com");
        assert_eq!(created.name, "Test User");

        // Find the user
        let found = UserRepository::find_by_id(&pool, created.id)
            .await
            .expect("Failed to find user")
            .expect("User should exist");

        assert_eq!(found.id, created.id);
        assert_eq!(found.email, "test@example.com");
    }

    #[tokio::test]
    async fn test_duplicate_email_rejected() {
        let pool = setup_test_db().await;

        let input = CreateUser {
            email: "duplicate@example.com".to_string(),
            name: "First User".to_string(),
        };

        // First creation succeeds
        UserRepository::create(&pool, input.clone())
            .await
            .expect("First user should be created");

        // Second creation with same email fails
        let result = UserRepository::create(&pool, CreateUser {
            email: "duplicate@example.com".to_string(),
            name: "Second User".to_string(),
        })
        .await;

        assert!(matches!(result, Err(AppError::Conflict(_))));
    }
}
```

## Production Checklist

Before deploying, verify these items:

- **Connection limits**: Your pool's `max_connections` should not exceed your database's `max_connections` divided by your replica count
- **Query preparation**: Run `cargo sqlx prepare` and commit the `.sqlx` folder
- **Migration strategy**: Decide between automatic migrations at startup or manual deployment steps
- **Health checks**: Add an endpoint that queries the database to verify connectivity
- **Timeouts**: Set appropriate statement timeouts to prevent runaway queries
- **Logging**: Enable SQLx logging to trace slow queries

```rust
// Health check endpoint that verifies database connectivity
async fn health_check(pool: web::Data<PgPool>) -> HttpResponse {
    match sqlx::query("SELECT 1").execute(pool.get_ref()).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "status": "healthy",
            "database": "connected"
        })),
        Err(e) => {
            eprintln!("Health check failed: {:?}", e);
            HttpResponse::ServiceUnavailable().json(serde_json::json!({
                "status": "unhealthy",
                "database": "disconnected"
            }))
        }
    }
}
```

## Summary

| Component | Purpose |
| --- | --- |
| **Connection Pool** | Manages database connections efficiently across concurrent requests |
| **Migrations** | Version-controlled schema changes with rollback support |
| **Compile-time Checking** | Validates queries against your schema during compilation |
| **Repository Pattern** | Encapsulates database operations for testability and clarity |
| **Transactions** | Groups multiple operations into atomic units |
| **Error Handling** | Maps database errors to appropriate HTTP responses |

SQLx with Actix gives you the performance of raw SQL with the safety of compile-time checking. You write real queries, the compiler verifies them, and your handlers stay clean. This combination works well for teams that value both developer productivity and runtime performance.
