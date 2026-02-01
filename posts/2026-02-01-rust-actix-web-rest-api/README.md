# How to Build REST APIs with Actix-web in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Actix-web, REST API, Web Development, Backend

Description: A practical guide to building high-performance REST APIs in Rust using the Actix-web framework.

---

Rust has been gaining traction for backend development, and for good reason. Memory safety without garbage collection, fearless concurrency, and performance that rivals C++ make it an attractive choice for building APIs that need to handle serious traffic. Actix-web is the most popular Rust web framework, and it consistently tops benchmarks while remaining pleasant to work with.

In this guide, we'll build a complete REST API from scratch. No toy examples - we'll cover everything you need to ship production code: routing, request handling, state management, middleware, serialization, and proper error handling.

## Setting Up Your Project

First, create a new Rust project and add the dependencies we'll need.

```bash
cargo new rust-api
cd rust-api
```

Open `Cargo.toml` and add these dependencies:

```toml
[package]
name = "rust-api"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
env_logger = "0.10"
log = "0.4"
```

We're pulling in `actix-web` for the framework, `serde` for JSON serialization, `uuid` for generating IDs, `chrono` for timestamps, and logging utilities. Run `cargo build` to fetch everything.

## Basic Server and Routing

Let's start with a minimal server and build from there. This sets up the HTTP server with a single health check endpoint.

```rust
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};

// Health check endpoint - useful for load balancers and monitoring
#[get("/health")]
async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    
    log::info!("Starting server at http://127.0.0.1:8080");
    
    HttpServer::new(|| {
        App::new()
            .service(health_check)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

The `#[get("/health")]` attribute macro handles routing automatically. You can also use `#[post]`, `#[put]`, `#[delete]`, and `#[patch]` for other HTTP methods. Run `cargo run` and hit `http://localhost:8080/health` to verify it works.

## Domain Models with Serde

Before writing more handlers, let's define our data models. We'll build a simple task management API. Serde handles all the JSON conversion through derive macros.

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Task represents a single task in our system
// Serialize lets us convert to JSON, Deserialize lets us parse from JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// CreateTask is what clients send when creating a new task
// We don't let clients set the ID or timestamps - those are server-controlled
#[derive(Debug, Deserialize)]
pub struct CreateTask {
    pub title: String,
    pub description: Option<String>,
}

// UpdateTask uses Option for all fields
// This allows partial updates where clients only send what they want to change
#[derive(Debug, Deserialize)]
pub struct UpdateTask {
    pub title: Option<String>,
    pub description: Option<String>,
    pub completed: Option<bool>,
}

impl Task {
    pub fn new(title: String, description: Option<String>) -> Self {
        let now = Utc::now();
        Task {
            id: Uuid::new_v4(),
            title,
            description,
            completed: false,
            created_at: now,
            updated_at: now,
        }
    }
}
```

Separating the domain model from request/response DTOs is a pattern that pays off. It keeps your API contract stable even when internal representations change.

## Application State

Real APIs need to store data somewhere. We'll use an in-memory store wrapped in thread-safe primitives. In production, you'd swap this for a database connection pool.

```rust
use std::collections::HashMap;
use std::sync::Mutex;

// AppState holds our application's shared state
// Mutex ensures safe concurrent access across threads
pub struct AppState {
    pub tasks: Mutex<HashMap<Uuid, Task>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            tasks: Mutex::new(HashMap::new()),
        }
    }
}
```

Register the state with your app using `app_data`. Actix wraps it in an `Arc` automatically.

```rust
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    
    // Create shared state that will be available to all handlers
    let app_state = web::Data::new(AppState::new());
    
    log::info!("Starting server at http://127.0.0.1:8080");
    
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .service(health_check)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Request Handlers and Extractors

Now for the CRUD operations. Extractors are how Actix passes request data to your handlers - path parameters, query strings, JSON bodies, and application state all come through extractors.

```rust
use actix_web::{get, post, put, delete, web, HttpResponse};

// GET /tasks - List all tasks
// web::Data extracts our shared application state
#[get("/tasks")]
async fn list_tasks(data: web::Data<AppState>) -> HttpResponse {
    let tasks = data.tasks.lock().unwrap();
    let task_list: Vec<&Task> = tasks.values().collect();
    HttpResponse::Ok().json(task_list)
}

// GET /tasks/{id} - Get a single task by ID
// web::Path extracts the {id} segment from the URL
#[get("/tasks/{id}")]
async fn get_task(
    path: web::Path<Uuid>,
    data: web::Data<AppState>,
) -> HttpResponse {
    let task_id = path.into_inner();
    let tasks = data.tasks.lock().unwrap();
    
    match tasks.get(&task_id) {
        Some(task) => HttpResponse::Ok().json(task),
        None => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Task not found"
        })),
    }
}

// POST /tasks - Create a new task
// web::Json extracts and deserializes the request body
#[post("/tasks")]
async fn create_task(
    body: web::Json<CreateTask>,
    data: web::Data<AppState>,
) -> HttpResponse {
    let new_task = Task::new(
        body.title.clone(),
        body.description.clone(),
    );
    
    let mut tasks = data.tasks.lock().unwrap();
    let task_id = new_task.id;
    tasks.insert(task_id, new_task.clone());
    
    log::info!("Created task: {}", task_id);
    HttpResponse::Created().json(new_task)
}

// PUT /tasks/{id} - Update an existing task
#[put("/tasks/{id}")]
async fn update_task(
    path: web::Path<Uuid>,
    body: web::Json<UpdateTask>,
    data: web::Data<AppState>,
) -> HttpResponse {
    let task_id = path.into_inner();
    let mut tasks = data.tasks.lock().unwrap();
    
    match tasks.get_mut(&task_id) {
        Some(task) => {
            // Only update fields that were provided in the request
            if let Some(title) = &body.title {
                task.title = title.clone();
            }
            if let Some(description) = &body.description {
                task.description = Some(description.clone());
            }
            if let Some(completed) = body.completed {
                task.completed = completed;
            }
            task.updated_at = Utc::now();
            
            log::info!("Updated task: {}", task_id);
            HttpResponse::Ok().json(task.clone())
        }
        None => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Task not found"
        })),
    }
}

// DELETE /tasks/{id} - Delete a task
#[delete("/tasks/{id}")]
async fn delete_task(
    path: web::Path<Uuid>,
    data: web::Data<AppState>,
) -> HttpResponse {
    let task_id = path.into_inner();
    let mut tasks = data.tasks.lock().unwrap();
    
    match tasks.remove(&task_id) {
        Some(_) => {
            log::info!("Deleted task: {}", task_id);
            HttpResponse::NoContent().finish()
        }
        None => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Task not found"
        })),
    }
}
```

Register all the handlers in your app:

```rust
App::new()
    .app_data(app_state.clone())
    .service(health_check)
    .service(list_tasks)
    .service(get_task)
    .service(create_task)
    .service(update_task)
    .service(delete_task)
```

## Query Parameters

For filtering and pagination, you'll want query parameters. Define a struct and use `web::Query`.

```rust
// Query parameters for filtering the task list
#[derive(Debug, Deserialize)]
pub struct TaskQuery {
    pub completed: Option<bool>,
    pub limit: Option<usize>,
}

// Updated list endpoint with filtering support
#[get("/tasks")]
async fn list_tasks(
    query: web::Query<TaskQuery>,
    data: web::Data<AppState>,
) -> HttpResponse {
    let tasks = data.tasks.lock().unwrap();
    
    let mut task_list: Vec<&Task> = tasks.values()
        // Filter by completion status if provided
        .filter(|t| {
            query.completed.map_or(true, |c| t.completed == c)
        })
        .collect();
    
    // Sort by creation date, newest first
    task_list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    // Apply limit if provided
    if let Some(limit) = query.limit {
        task_list.truncate(limit);
    }
    
    HttpResponse::Ok().json(task_list)
}
```

Now you can call `GET /tasks?completed=false&limit=10` to get the 10 most recent incomplete tasks.

## Custom Error Handling

Production APIs need consistent error responses. Define an error type that implements `ResponseError`.

```rust
use actix_web::{HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub enum ApiError {
    NotFound(String),
    BadRequest(String),
    InternalError(String),
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::NotFound(msg) => write!(f, "Not found: {}", msg),
            ApiError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            ApiError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

// ResponseError tells Actix how to convert our error into an HTTP response
impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        match self {
            ApiError::NotFound(msg) => {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "not_found",
                    "message": msg
                }))
            }
            ApiError::BadRequest(msg) => {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "bad_request",
                    "message": msg
                }))
            }
            ApiError::InternalError(msg) => {
                log::error!("Internal error: {}", msg);
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "internal_error",
                    "message": "An unexpected error occurred"
                }))
            }
        }
    }
}
```

Now handlers can return `Result<HttpResponse, ApiError>` and errors get converted to proper JSON responses automatically.

## Middleware

Middleware lets you add cross-cutting concerns like logging, authentication, and CORS. Actix provides built-in middleware and lets you write custom ones.

```rust
use actix_web::middleware::Logger;
use actix_cors::Cors;

HttpServer::new(move || {
    // Configure CORS - adjust these settings for your needs
    let cors = Cors::default()
        .allow_any_origin()
        .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
        .allowed_headers(vec!["Content-Type", "Authorization"])
        .max_age(3600);
    
    App::new()
        // Request logging middleware
        .wrap(Logger::default())
        // CORS middleware
        .wrap(cors)
        .app_data(app_state.clone())
        .service(health_check)
        .service(list_tasks)
        .service(get_task)
        .service(create_task)
        .service(update_task)
        .service(delete_task)
})
```

Add `actix-cors = "0.6"` to your dependencies for CORS support.

For custom middleware, you can use the `wrap_fn` helper for simple cases:

```rust
use actix_web::dev::ServiceRequest;
use std::time::Instant;

// Simple timing middleware
.wrap_fn(|req: ServiceRequest, srv| {
    let start = Instant::now();
    let path = req.path().to_string();
    let method = req.method().to_string();
    
    let fut = srv.call(req);
    
    async move {
        let res = fut.await?;
        let duration = start.elapsed();
        log::info!("{} {} - {:?}", method, path, duration);
        Ok(res)
    }
})
```

## Scoping Routes

As your API grows, organize routes with scopes. This groups related endpoints and lets you apply middleware to specific sections.

```rust
use actix_web::web;

// Group all task routes under /api/v1
fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .service(health_check)
            .service(
                web::scope("/tasks")
                    .service(list_tasks)
                    .service(get_task)
                    .service(create_task)
                    .service(update_task)
                    .service(delete_task)
            )
    );
}

// In main:
App::new()
    .wrap(Logger::default())
    .app_data(app_state.clone())
    .configure(configure_routes)
```

Your endpoints now live at `/api/v1/tasks` with versioning built in from the start.

## Testing Your API

Actix has excellent testing support. You can write integration tests that spin up your app and make real HTTP requests.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_create_and_get_task() {
        let app_state = web::Data::new(AppState::new());
        
        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .service(create_task)
                .service(get_task)
        ).await;
        
        // Create a task
        let req = test::TestRequest::post()
            .uri("/tasks")
            .set_json(serde_json::json!({
                "title": "Test task",
                "description": "A test"
            }))
            .to_request();
        
        let resp: Task = test::call_and_read_body_json(&app, req).await;
        assert_eq!(resp.title, "Test task");
        assert!(!resp.completed);
        
        // Retrieve it
        let req = test::TestRequest::get()
            .uri(&format!("/tasks/{}", resp.id))
            .to_request();
        
        let resp: Task = test::call_and_read_body_json(&app, req).await;
        assert_eq!(resp.title, "Test task");
    }
}
```

Run tests with `cargo test`.

## Going to Production

Before deploying, consider these additions:

- Swap the in-memory store for a real database using `sqlx` or `diesel`
- Add authentication middleware with JWT tokens
- Implement rate limiting with `actix-governor`
- Add request validation with the `validator` crate
- Set up graceful shutdown handling
- Configure connection pooling for database access

Actix-web runs well behind any reverse proxy. The framework handles thousands of concurrent connections on modest hardware, so a single instance goes a long way.

## Wrapping Up

We've covered the core concepts you need to build REST APIs with Actix-web - from basic routing through state management, error handling, and middleware. The type system catches mistakes at compile time, and the performance is there when you need it.

The patterns shown here scale from small services to complex applications. Start simple, add what you need, and let the compiler guide you when things get complicated.

---

*Monitor your Rust APIs with [OneUptime](https://oneuptime.com) - track response times, error rates, and throughput.*
