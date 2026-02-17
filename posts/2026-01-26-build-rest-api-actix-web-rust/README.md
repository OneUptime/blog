# How to Build a REST API with Actix Web

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Actix Web, REST API, Backend, Web Development

Description: Learn how to build a production-ready REST API using Actix Web in Rust, covering project setup, routing, middleware, database integration, and error handling with practical code examples.

---

Actix Web is one of the fastest web frameworks available, and it runs on Rust - a language known for memory safety and performance. If you want to build APIs that handle thousands of requests per second with minimal resource usage, Actix Web is worth considering.

This guide walks through building a complete REST API for managing a task list. By the end, you will have a working API with CRUD operations, database persistence, middleware for logging and authentication, and proper error handling.

## Why Actix Web?

Before diving into code, here is what makes Actix Web stand out:

- **Performance**: Benchmarks consistently place it among the fastest web frameworks across all languages
- **Type Safety**: Rust's compiler catches bugs at compile time that would be runtime errors in other languages
- **Async by Default**: Built on Tokio, it handles concurrent requests efficiently
- **Actor Model**: Based on the Actix actor framework, though you can use it without actors

The tradeoff is a steeper learning curve compared to frameworks in Python or JavaScript. Rust's ownership model takes time to understand, but the compiler guides you through it.

## Project Setup

Start by creating a new Rust project:

```bash
cargo new task-api
cd task-api
```

Add the dependencies to `Cargo.toml`:

```toml
[package]
name = "task-api"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
actix-rt = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dotenv = "0.15"
env_logger = "0.10"
log = "0.4"
thiserror = "1"
```

## Basic Server Structure

Create the entry point in `src/main.rs`:

```rust
use actix_web::{web, App, HttpServer, middleware};
use dotenv::dotenv;
use std::env;

mod handlers;
mod models;
mod errors;
mod db;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables from .env file
    dotenv().ok();

    // Initialize logger for request logging
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Create database connection pool
    let pool = db::create_pool(&database_url)
        .await
        .expect("Failed to create database pool");

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_address = format!("{}:{}", host, port);

    log::info!("Starting server at http://{}", bind_address);

    HttpServer::new(move || {
        App::new()
            // Share database pool across all handlers
            .app_data(web::Data::new(pool.clone()))
            // Enable request logging
            .wrap(middleware::Logger::default())
            // Configure routes
            .configure(handlers::configure_routes)
    })
    .bind(&bind_address)?
    .run()
    .await
}
```

## Defining Data Models

Create `src/models.rs` for your data structures:

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// Database model - matches the database schema
#[derive(Debug, FromRow, Serialize)]
pub struct Task {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Request payload for creating a task
#[derive(Debug, Deserialize)]
pub struct CreateTask {
    pub title: String,
    pub description: Option<String>,
}

// Request payload for updating a task
#[derive(Debug, Deserialize)]
pub struct UpdateTask {
    pub title: Option<String>,
    pub description: Option<String>,
    pub completed: Option<bool>,
}

// Query parameters for listing tasks
#[derive(Debug, Deserialize)]
pub struct TaskQuery {
    pub completed: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// Standard API response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            message: None,
        }
    }

    pub fn error(message: &str) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            data: None,
            message: Some(message.to_string()),
        }
    }
}
```

## Database Layer

Create `src/db.rs` to handle database operations:

```rust
use sqlx::postgres::{PgPool, PgPoolOptions};
use uuid::Uuid;

use crate::errors::ApiError;
use crate::models::{CreateTask, Task, TaskQuery, UpdateTask};

// Create a connection pool with sensible defaults
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
}

// Fetch all tasks with optional filtering
pub async fn get_tasks(pool: &PgPool, query: &TaskQuery) -> Result<Vec<Task>, ApiError> {
    let limit = query.limit.unwrap_or(100);
    let offset = query.offset.unwrap_or(0);

    let tasks = match query.completed {
        Some(completed) => {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, completed, created_at, updated_at
                FROM tasks
                WHERE completed = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#
            )
            .bind(completed)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await?
        }
        None => {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, completed, created_at, updated_at
                FROM tasks
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(tasks)
}

// Fetch a single task by ID
pub async fn get_task(pool: &PgPool, id: Uuid) -> Result<Option<Task>, ApiError> {
    let task = sqlx::query_as::<_, Task>(
        r#"
        SELECT id, title, description, completed, created_at, updated_at
        FROM tasks
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(task)
}

// Create a new task
pub async fn create_task(pool: &PgPool, task: &CreateTask) -> Result<Task, ApiError> {
    let task = sqlx::query_as::<_, Task>(
        r#"
        INSERT INTO tasks (id, title, description, completed, created_at, updated_at)
        VALUES ($1, $2, $3, false, NOW(), NOW())
        RETURNING id, title, description, completed, created_at, updated_at
        "#
    )
    .bind(Uuid::new_v4())
    .bind(&task.title)
    .bind(&task.description)
    .fetch_one(pool)
    .await?;

    Ok(task)
}

// Update an existing task
pub async fn update_task(
    pool: &PgPool,
    id: Uuid,
    update: &UpdateTask,
) -> Result<Option<Task>, ApiError> {
    // Build dynamic update query based on provided fields
    let task = sqlx::query_as::<_, Task>(
        r#"
        UPDATE tasks
        SET
            title = COALESCE($2, title),
            description = COALESCE($3, description),
            completed = COALESCE($4, completed),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, title, description, completed, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(&update.title)
    .bind(&update.description)
    .bind(update.completed)
    .fetch_optional(pool)
    .await?;

    Ok(task)
}

// Delete a task
pub async fn delete_task(pool: &PgPool, id: Uuid) -> Result<bool, ApiError> {
    let result = sqlx::query("DELETE FROM tasks WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}
```

## Error Handling

Create `src/errors.rs` for centralized error handling:

```rust
use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub enum ApiError {
    NotFound(String),
    BadRequest(String),
    InternalError(String),
    DatabaseError(String),
    Unauthorized(String),
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::NotFound(msg) => write!(f, "Not found: {}", msg),
            ApiError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            ApiError::InternalError(msg) => write!(f, "Internal error: {}", msg),
            ApiError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            ApiError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
        }
    }
}

// Convert our errors to HTTP responses
impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        let (status, message) = match self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            ApiError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            ApiError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            ApiError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
        };

        HttpResponse::build(status).json(serde_json::json!({
            "success": false,
            "error": message
        }))
    }
}

// Convert sqlx errors to our API errors
impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        log::error!("Database error: {:?}", err);
        ApiError::DatabaseError("A database error occurred".to_string())
    }
}
```

## Request Handlers

Create `src/handlers.rs` for your route handlers:

```rust
use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::db;
use crate::errors::ApiError;
use crate::models::{ApiResponse, CreateTask, TaskQuery, UpdateTask};

// Configure all routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .route("/health", web::get().to(health_check))
            .service(
                web::scope("/tasks")
                    .route("", web::get().to(list_tasks))
                    .route("", web::post().to(create_task))
                    .route("/{id}", web::get().to(get_task))
                    .route("/{id}", web::put().to(update_task))
                    .route("/{id}", web::delete().to(delete_task))
            )
    );
}

// Health check endpoint for load balancers and monitoring
async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now()
    }))
}

// GET /api/v1/tasks - List all tasks
async fn list_tasks(
    pool: web::Data<PgPool>,
    query: web::Query<TaskQuery>,
) -> Result<HttpResponse, ApiError> {
    let tasks = db::get_tasks(pool.get_ref(), &query).await?;
    Ok(HttpResponse::Ok().json(ApiResponse::success(tasks)))
}

// GET /api/v1/tasks/{id} - Get a single task
async fn get_task(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let id = path.into_inner();

    match db::get_task(pool.get_ref(), id).await? {
        Some(task) => Ok(HttpResponse::Ok().json(ApiResponse::success(task))),
        None => Err(ApiError::NotFound(format!("Task {} not found", id))),
    }
}

// POST /api/v1/tasks - Create a new task
async fn create_task(
    pool: web::Data<PgPool>,
    body: web::Json<CreateTask>,
) -> Result<HttpResponse, ApiError> {
    // Validate input
    if body.title.trim().is_empty() {
        return Err(ApiError::BadRequest("Title cannot be empty".to_string()));
    }

    if body.title.len() > 255 {
        return Err(ApiError::BadRequest("Title must be 255 characters or less".to_string()));
    }

    let task = db::create_task(pool.get_ref(), &body).await?;

    log::info!("Created task: {}", task.id);

    Ok(HttpResponse::Created().json(ApiResponse::success(task)))
}

// PUT /api/v1/tasks/{id} - Update a task
async fn update_task(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateTask>,
) -> Result<HttpResponse, ApiError> {
    let id = path.into_inner();

    // Validate title if provided
    if let Some(ref title) = body.title {
        if title.trim().is_empty() {
            return Err(ApiError::BadRequest("Title cannot be empty".to_string()));
        }
        if title.len() > 255 {
            return Err(ApiError::BadRequest("Title must be 255 characters or less".to_string()));
        }
    }

    match db::update_task(pool.get_ref(), id, &body).await? {
        Some(task) => {
            log::info!("Updated task: {}", id);
            Ok(HttpResponse::Ok().json(ApiResponse::success(task)))
        }
        None => Err(ApiError::NotFound(format!("Task {} not found", id))),
    }
}

// DELETE /api/v1/tasks/{id} - Delete a task
async fn delete_task(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let id = path.into_inner();

    if db::delete_task(pool.get_ref(), id).await? {
        log::info!("Deleted task: {}", id);
        Ok(HttpResponse::NoContent().finish())
    } else {
        Err(ApiError::NotFound(format!("Task {} not found", id)))
    }
}
```

## Adding Middleware

Actix Web supports middleware for cross-cutting concerns. Here is an example of a simple API key authentication middleware:

```rust
// src/middleware.rs
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse,
};
use futures::future::{ok, Either, Ready};
use std::future::Future;
use std::pin::Pin;

pub struct ApiKeyAuth {
    api_key: String,
}

impl ApiKeyAuth {
    pub fn new(api_key: String) -> Self {
        ApiKeyAuth { api_key }
    }
}

impl<Svc, Bd> Transform<Svc, ServiceRequest> for ApiKeyAuth
where
    Svc: Service<ServiceRequest, Response = ServiceResponse<Bd>, Error = Error>,
    Svc::Future: 'static,
    Bd: 'static,
{
    type Response = ServiceResponse<Bd>;
    type Error = Error;
    type Transform = ApiKeyAuthMiddleware<Svc>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: Svc) -> Self::Future {
        ok(ApiKeyAuthMiddleware {
            service,
            api_key: self.api_key.clone(),
        })
    }
}

pub struct ApiKeyAuthMiddleware<Svc> {
    service: Svc,
    api_key: String,
}

impl<Svc, Bd> Service<ServiceRequest> for ApiKeyAuthMiddleware<Svc>
where
    Svc: Service<ServiceRequest, Response = ServiceResponse<Bd>, Error = Error>,
    Svc::Future: 'static,
    Bd: 'static,
{
    type Response = ServiceResponse<Bd>;
    type Error = Error;
    type Future = Either<
        Svc::Future,
        Ready<Result<Self::Response, Self::Error>>,
    >;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Skip auth for health check
        if req.path() == "/api/v1/health" {
            return Either::Left(self.service.call(req));
        }

        // Check for API key header
        let api_key = req
            .headers()
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok());

        match api_key {
            Some(key) if key == self.api_key => {
                Either::Left(self.service.call(req))
            }
            _ => {
                let response = HttpResponse::Unauthorized()
                    .json(serde_json::json!({
                        "success": false,
                        "error": "Invalid or missing API key"
                    }));
                Either::Right(ok(req.into_response(response).map_into_boxed_body()))
            }
        }
    }
}
```

To use the middleware, wrap your routes:

```rust
// In main.rs
use crate::middleware::ApiKeyAuth;

HttpServer::new(move || {
    let api_key = env::var("API_KEY").unwrap_or_else(|_| "dev-key".to_string());

    App::new()
        .app_data(web::Data::new(pool.clone()))
        .wrap(middleware::Logger::default())
        .wrap(ApiKeyAuth::new(api_key))
        .configure(handlers::configure_routes)
})
```

## Database Migration

Create the database schema. You can use sqlx-cli for migrations:

```bash
cargo install sqlx-cli
sqlx database create
sqlx migrate add create_tasks_table
```

Add the migration in `migrations/[timestamp]_create_tasks_table.sql`:

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
```

Run the migration:

```bash
sqlx migrate run
```

## Testing the API

Create a `.env` file:

```bash
DATABASE_URL=postgres://user:password@localhost/task_api
HOST=127.0.0.1
PORT=8080
API_KEY=your-secret-key
RUST_LOG=info
```

Run the server:

```bash
cargo run
```

Test the endpoints:

```bash
# Health check
curl http://localhost:8080/api/v1/health

# Create a task
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"title": "Learn Actix Web", "description": "Build a REST API"}'

# List tasks
curl http://localhost:8080/api/v1/tasks \
  -H "X-API-Key: your-secret-key"

# Get a specific task
curl http://localhost:8080/api/v1/tasks/{task-id} \
  -H "X-API-Key: your-secret-key"

# Update a task
curl -X PUT http://localhost:8080/api/v1/tasks/{task-id} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"completed": true}'

# Delete a task
curl -X DELETE http://localhost:8080/api/v1/tasks/{task-id} \
  -H "X-API-Key: your-secret-key"
```

## Request Flow

Here is how a request flows through the application:

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant Handler
    participant Database

    Client->>Middleware: HTTP Request
    Middleware->>Middleware: Log Request
    Middleware->>Middleware: Validate API Key
    alt Invalid Key
        Middleware-->>Client: 401 Unauthorized
    else Valid Key
        Middleware->>Handler: Forward Request
        Handler->>Handler: Validate Input
        alt Invalid Input
            Handler-->>Client: 400 Bad Request
        else Valid Input
            Handler->>Database: Query/Mutation
            Database-->>Handler: Result
            Handler-->>Client: JSON Response
        end
    end
```

## Performance Considerations

Actix Web is fast out of the box, but here are some tips:

1. **Connection Pooling**: Always use connection pools for databases. The example uses sqlx's built-in pooling.

2. **Async Everything**: Keep your handlers async. Avoid blocking operations that would tie up the executor.

3. **Payload Limits**: Set limits on request body size to prevent memory exhaustion:

```rust
App::new()
    .app_data(web::JsonConfig::default().limit(4096))
```

4. **Compression**: Enable response compression for larger payloads:

```rust
App::new()
    .wrap(middleware::Compress::default())
```

## Summary

| Component | Purpose |
|-----------|---------|
| **main.rs** | Application entry point, server configuration |
| **models.rs** | Data structures for requests and responses |
| **handlers.rs** | Route handlers and business logic |
| **db.rs** | Database operations with sqlx |
| **errors.rs** | Centralized error handling |
| **middleware.rs** | Cross-cutting concerns like auth |

Actix Web gives you the performance of Rust with an ergonomic API for building web services. The type system catches many errors at compile time, and the async runtime handles concurrency efficiently. While the learning curve is steeper than frameworks in dynamic languages, the reliability and performance benefits make it worthwhile for production APIs that need to scale.

Start with the basics shown here, then explore advanced features like WebSockets, server-sent events, and the actor system as your needs grow.
