# How to Build Microservices Architecture in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Microservices, Architecture, Distributed Systems, gRPC

Description: A practical guide to building microservices in Rust with service communication, configuration, and deployment patterns.

---

Rust has become a serious contender for building microservices. Its memory safety guarantees, zero-cost abstractions, and excellent async runtime make it ideal for high-performance distributed systems. This guide walks through building production-ready microservices in Rust - from project structure to deployment.

## Why Rust for Microservices?

Before diving into code, let's address the elephant in the room. Yes, Rust has a steeper learning curve than Go or Node.js. But the tradeoffs are worth it:

- **Memory safety without garbage collection** - predictable latency, no GC pauses
- **Fearless concurrency** - the compiler catches race conditions at compile time
- **Small binary sizes** - your container images stay lean
- **Excellent performance** - comparable to C/C++ with modern ergonomics

The ecosystem has matured significantly. Libraries like Axum, Tonic, and Tokio provide everything you need for production workloads.

## Project Structure for Microservices

A well-organized monorepo helps manage multiple services. Here's a structure that scales:

```
microservices/
├── Cargo.toml              # Workspace root
├── services/
│   ├── user-service/
│   │   ├── Cargo.toml
│   │   └── src/
│   ├── order-service/
│   │   ├── Cargo.toml
│   │   └── src/
│   └── notification-service/
│       ├── Cargo.toml
│       └── src/
├── shared/
│   ├── common/             # Shared utilities
│   ├── proto/              # Protocol buffer definitions
│   └── models/             # Shared data models
└── deploy/
    ├── docker/
    └── k8s/
```

The workspace Cargo.toml ties everything together:

```toml
# Root Cargo.toml - defines the workspace and shared dependencies
[workspace]
members = [
    "services/user-service",
    "services/order-service",
    "services/notification-service",
    "shared/common",
    "shared/models",
]

# Shared dependencies across all services
[workspace.dependencies]
tokio = { version = "1.35", features = ["full"] }
axum = "0.7"
tonic = "0.10"
serde = { version = "1.0", features = ["derive"] }
tracing = "0.1"
```

## Building an HTTP Service with Axum

Let's build a user service that exposes a REST API. Axum is the go-to framework - it's built on Tokio and integrates well with the Tower ecosystem.

```rust
// src/main.rs - Entry point for the user service
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

// User model with serde for JSON serialization
#[derive(Clone, Serialize, Deserialize)]
struct User {
    id: String,
    email: String,
    name: String,
}

// Request payload for creating users
#[derive(Deserialize)]
struct CreateUserRequest {
    email: String,
    name: String,
}

// Application state shared across handlers
// Using Arc<RwLock<_>> allows concurrent reads with exclusive writes
struct AppState {
    users: RwLock<HashMap<String, User>>,
}

#[tokio::main]
async fn main() {
    // Initialize tracing for structured logging
    tracing_subscriber::init();

    // Create shared state wrapped in Arc for thread-safe sharing
    let state = Arc::new(AppState {
        users: RwLock::new(HashMap::new()),
    });

    // Define routes with state injection
    let app = Router::new()
        .route("/users", post(create_user))
        .route("/users/:id", get(get_user))
        .route("/health", get(health_check))
        .with_state(state);

    // Bind to all interfaces on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("User service listening on port 3000");
    axum::serve(listener, app).await.unwrap();
}

// Handler for creating new users
// State is automatically extracted from the router
async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateUserRequest>,
) -> (StatusCode, Json<User>) {
    let user = User {
        id: uuid::Uuid::new_v4().to_string(),
        email: payload.email,
        name: payload.name,
    };

    // Acquire write lock and insert user
    state.users.write().await.insert(user.id.clone(), user.clone());

    (StatusCode::CREATED, Json(user))
}

// Handler for fetching a user by ID
async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<User>, StatusCode> {
    // Acquire read lock - multiple readers allowed simultaneously
    state
        .users
        .read()
        .await
        .get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

// Simple health check endpoint for Kubernetes probes
async fn health_check() -> StatusCode {
    StatusCode::OK
}
```

## Service Communication with gRPC

For internal service-to-service communication, gRPC outperforms REST. Tonic is the standard gRPC library for Rust. Define your service contract in Protocol Buffers:

```protobuf
// proto/user.proto - Service definition for user operations
syntax = "proto3";

package user;

service UserService {
    rpc GetUser(GetUserRequest) returns (UserResponse);
    rpc CreateUser(CreateUserRequest) returns (UserResponse);
}

message GetUserRequest {
    string id = 1;
}

message CreateUserRequest {
    string email = 1;
    string name = 2;
}

message UserResponse {
    string id = 1;
    string email = 2;
    string name = 3;
}
```

Generate Rust code with tonic-build in your build.rs:

```rust
// build.rs - Compiles protobuf files during cargo build
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // tonic_build generates server and client code from .proto files
    tonic_build::compile_protos("proto/user.proto")?;
    Ok(())
}
```

Implement the gRPC server:

```rust
// src/grpc.rs - gRPC service implementation
use tonic::{Request, Response, Status};
use user::user_service_server::UserService;
use user::{CreateUserRequest, GetUserRequest, UserResponse};

// Include generated code from tonic-build
pub mod user {
    tonic::include_proto!("user");
}

// Service implementation holding shared state
pub struct UserServiceImpl {
    state: Arc<AppState>,
}

// Implement the trait generated from our proto file
#[tonic::async_trait]
impl UserService for UserServiceImpl {
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<UserResponse>, Status> {
        let id = request.into_inner().id;

        // Look up user in our state
        let users = self.state.users.read().await;
        let user = users
            .get(&id)
            .ok_or_else(|| Status::not_found("User not found"))?;

        Ok(Response::new(UserResponse {
            id: user.id.clone(),
            email: user.email.clone(),
            name: user.name.clone(),
        }))
    }

    async fn create_user(
        &self,
        request: Request<CreateUserRequest>,
    ) -> Result<Response<UserResponse>, Status> {
        let req = request.into_inner();
        let user = User {
            id: uuid::Uuid::new_v4().to_string(),
            email: req.email,
            name: req.name,
        };

        self.state.users.write().await.insert(user.id.clone(), user.clone());

        Ok(Response::new(UserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
        }))
    }
}
```

## Configuration Management

Hardcoding configuration is a recipe for disaster. Use environment variables with a typed configuration struct:

```rust
// src/config.rs - Centralized configuration with validation
use serde::Deserialize;

// Configuration struct loaded from environment
// Each field maps to an environment variable with optional defaults
#[derive(Debug, Deserialize)]
pub struct Config {
    #[serde(default = "default_port")]
    pub port: u16,
    
    #[serde(default = "default_host")]
    pub host: String,
    
    pub database_url: String,        // Required - no default
    
    #[serde(default = "default_log_level")]
    pub log_level: String,
    
    // Service discovery endpoints
    pub order_service_url: Option<String>,
    pub notification_service_url: Option<String>,
}

fn default_port() -> u16 { 3000 }
fn default_host() -> String { "0.0.0.0".to_string() }
fn default_log_level() -> String { "info".to_string() }

impl Config {
    // Load configuration from environment with prefix
    pub fn from_env() -> Result<Self, config::ConfigError> {
        config::Config::builder()
            .add_source(config::Environment::with_prefix("APP"))
            .build()?
            .try_deserialize()
    }
}
```

Load it at startup:

```rust
// In main.rs - Load config early and fail fast if invalid
let config = Config::from_env().expect("Failed to load configuration");
tracing::info!("Starting service on {}:{}", config.host, config.port);
```

## Health Checks and Readiness Probes

Kubernetes needs to know when your service is ready to accept traffic. Implement both liveness and readiness checks:

```rust
// src/health.rs - Health check endpoints for Kubernetes
use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;
use std::sync::Arc;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    checks: Vec<CheckResult>,
}

#[derive(Serialize)]
pub struct CheckResult {
    name: String,
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

// Liveness probe - is the process running and not deadlocked?
pub async fn liveness() -> StatusCode {
    StatusCode::OK
}

// Readiness probe - can the service handle requests?
// Checks dependencies like database connections
pub async fn readiness(
    State(state): State<Arc<AppState>>,
) -> (StatusCode, Json<HealthResponse>) {
    let mut checks = Vec::new();
    let mut all_healthy = true;

    // Check database connectivity
    match state.db.ping().await {
        Ok(_) => {
            checks.push(CheckResult {
                name: "database".to_string(),
                status: "healthy".to_string(),
                message: None,
            });
        }
        Err(e) => {
            all_healthy = false;
            checks.push(CheckResult {
                name: "database".to_string(),
                status: "unhealthy".to_string(),
                message: Some(e.to_string()),
            });
        }
    }

    let status = if all_healthy { "healthy" } else { "unhealthy" };
    let code = if all_healthy {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (code, Json(HealthResponse {
        status: status.to_string(),
        checks,
    }))
}
```

Wire them up in your router:

```rust
// Health check routes - separate from main API
let health_routes = Router::new()
    .route("/health/live", get(liveness))
    .route("/health/ready", get(readiness))
    .with_state(state.clone());

let app = Router::new()
    .merge(api_routes)
    .merge(health_routes);
```

## Service Discovery

In Kubernetes, services discover each other through DNS. But you still need to handle the client-side logic properly:

```rust
// src/clients/order_client.rs - HTTP client for order service
use reqwest::Client;
use std::time::Duration;

pub struct OrderClient {
    client: Client,
    base_url: String,
}

impl OrderClient {
    pub fn new(base_url: String) -> Self {
        // Configure client with sensible defaults
        let client = Client::builder()
            .timeout(Duration::from_secs(10))        // Request timeout
            .connect_timeout(Duration::from_secs(5)) // Connection timeout
            .pool_max_idle_per_host(10)              // Connection pool size
            .build()
            .expect("Failed to create HTTP client");

        Self { client, base_url }
    }

    pub async fn get_orders_for_user(&self, user_id: &str) -> Result<Vec<Order>, ClientError> {
        let url = format!("{}/orders?user_id={}", self.base_url, user_id);
        
        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(ClientError::Request)?;

        if !response.status().is_success() {
            return Err(ClientError::Status(response.status()));
        }

        response.json().await.map_err(ClientError::Parse)
    }
}
```

For gRPC, Tonic handles connection pooling and load balancing:

```rust
// src/clients/notification_grpc.rs - gRPC client with retry logic
use notification::notification_client::NotificationClient;
use tonic::transport::Channel;

pub async fn create_notification_client(
    endpoint: &str,
) -> Result<NotificationClient<Channel>, tonic::transport::Error> {
    // Tonic's Channel handles connection management
    let channel = Channel::from_shared(endpoint.to_string())?
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(10))
        .connect()
        .await?;

    Ok(NotificationClient::new(channel))
}
```

## Containerization with Multi-stage Builds

Rust binaries are statically linked and tiny. Take advantage of this with multi-stage Docker builds:

```dockerfile
# Dockerfile - Multi-stage build for minimal image size
# Stage 1: Build the application
FROM rust:1.75-slim as builder

WORKDIR /app

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY services/user-service ./services/user-service
COPY shared ./shared

# Build release binary with optimizations
RUN cargo build --release --package user-service

# Stage 2: Create minimal runtime image
FROM debian:bookworm-slim

# Install only required runtime dependencies
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -r -s /bin/false appuser
USER appuser

# Copy only the compiled binary
COPY --from=builder /app/target/release/user-service /usr/local/bin/

# Expose service port
EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["user-service"]
```

The resulting image is typically under 100MB - sometimes as small as 20MB depending on dependencies.

## Distributed Tracing with OpenTelemetry

In microservices, a single request spans multiple services. Distributed tracing is essential for debugging:

```rust
// src/telemetry.rs - OpenTelemetry setup for distributed tracing
use opentelemetry::global;
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn init_telemetry(service_name: &str, otlp_endpoint: &str) {
    // Create OTLP exporter pointing to your collector
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(otlp_endpoint),
        )
        .with_trace_config(
            opentelemetry::sdk::trace::config()
                .with_resource(opentelemetry::sdk::Resource::new(vec![
                    opentelemetry::KeyValue::new("service.name", service_name.to_string()),
                ])),
        )
        .install_batch(opentelemetry::runtime::Tokio)
        .expect("Failed to install OpenTelemetry tracer");

    // Create tracing subscriber that exports to OpenTelemetry
    let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(telemetry_layer)
        .with(tracing_subscriber::fmt::layer())
        .init();
}
```

Add trace context to your handlers:

```rust
// Instrument handlers to create spans automatically
#[tracing::instrument(skip(state))]
async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<User>, StatusCode> {
    tracing::info!(user_id = %id, "Fetching user");
    // ... handler logic
}
```

## Putting It All Together

Here's the complete main.rs tying everything together:

```rust
// src/main.rs - Complete service entry point
use std::sync::Arc;

mod config;
mod health;
mod telemetry;
mod handlers;
mod clients;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load configuration first - fail fast if invalid
    let config = config::Config::from_env()?;

    // Initialize distributed tracing
    telemetry::init_telemetry("user-service", &config.otlp_endpoint);

    // Create shared application state
    let state = Arc::new(AppState::new(&config).await?);

    // Build the router with all routes
    let app = Router::new()
        .nest("/api/v1", handlers::api_routes())
        .merge(health::health_routes())
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    // Start the server
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Service listening on {}", addr);

    // Graceful shutdown on SIGTERM
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    // Flush telemetry before exit
    opentelemetry::global::shutdown_tracer_provider();

    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install signal handler");
    tracing::info!("Received shutdown signal");
}
```

## Wrapping Up

Building microservices in Rust takes more upfront effort than Go or Node.js. The compiler is strict, and you'll fight the borrow checker. But once your code compiles, it runs. Memory bugs, data races, null pointer exceptions - these whole categories of production incidents simply vanish.

Start with one service. Get comfortable with Axum and Tokio. Add gRPC when you need internal service communication. Use the patterns here as a foundation, but adapt them to your specific needs.

The Rust ecosystem for microservices has reached a point where you're not fighting libraries anymore - you're building on solid foundations.

---

*Monitor your Rust microservices with [OneUptime](https://oneuptime.com) - distributed tracing across service boundaries.*
