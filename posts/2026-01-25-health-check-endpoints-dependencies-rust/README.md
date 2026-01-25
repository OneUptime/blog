# How to Build Health Check Endpoints with Dependencies in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Health Checks, Kubernetes, Dependencies, Reliability

Description: Learn how to build health check endpoints in Rust that properly manage and report on multiple service dependencies, with patterns for parallel checking, categorization, and graceful degradation.

---

> Production services rarely exist in isolation. They depend on databases, caches, message queues, and external APIs. Your health check endpoints need to reflect this reality by checking dependencies and reporting their status accurately.

A health check that only confirms your process is running tells Kubernetes nothing about whether your service can actually do its job. If your database is down, returning 200 OK from your health endpoint is lying to your orchestrator. This guide shows you how to build honest, dependency-aware health checks.

---

## The Dependency Problem

Consider a typical service that depends on:

- PostgreSQL for primary data
- Redis for caching
- An external payment API
- A message queue for async processing

If any critical dependency fails, your service cannot function properly. But not all dependencies are equal - you can probably survive without cache, but not without your database.

---

## Defining the Health Check Infrastructure

Start by creating types that represent dependency health status and the registry that manages them.

```rust
// src/health/types.rs
// Core types for dependency health checking

use serde::Serialize;
use std::time::Duration;

/// Possible states for a dependency
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,   // Working normally
    Degraded,  // Working but with issues
    Unhealthy, // Not working
}

/// Category determines how failures affect overall health
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DependencyCategory {
    Critical,    // Service cannot function without this
    NonCritical, // Service can degrade gracefully
}

/// Result of checking a single dependency
#[derive(Debug, Clone, Serialize)]
pub struct DependencyHealth {
    pub name: String,
    pub status: HealthStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

/// Configuration for a health check
pub struct HealthCheckConfig {
    pub timeout: Duration,
    pub category: DependencyCategory,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(5),
            category: DependencyCategory::Critical,
        }
    }
}
```

---

## Building the Dependency Registry

The registry holds all dependency checks and runs them when requested. Using trait objects allows registering different types of checks.

```rust
// src/health/registry.rs
// Registry for managing dependency health checks

use super::types::*;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use tokio::time::timeout;

/// Trait that all health checks must implement
#[async_trait]
pub trait HealthCheck: Send + Sync {
    /// Perform the health check and return status
    async fn check(&self) -> Result<DependencyHealth, Box<dyn std::error::Error + Send + Sync>>;

    /// Get the name of this dependency
    fn name(&self) -> &str;
}

/// Entry in the registry containing check and config
struct RegisteredCheck {
    check: Arc<dyn HealthCheck>,
    config: HealthCheckConfig,
}

/// Central registry for all dependency health checks
pub struct DependencyRegistry {
    checks: RwLock<HashMap<String, RegisteredCheck>>,
}

impl DependencyRegistry {
    pub fn new() -> Self {
        Self {
            checks: RwLock::new(HashMap::new()),
        }
    }

    /// Register a new dependency check
    pub async fn register(
        &self,
        check: Arc<dyn HealthCheck>,
        config: HealthCheckConfig,
    ) {
        let name = check.name().to_string();
        let mut checks = self.checks.write().await;
        checks.insert(name, RegisteredCheck { check, config });
    }

    /// Run all health checks in parallel with timeouts
    pub async fn check_all(&self) -> Vec<(DependencyHealth, DependencyCategory)> {
        let checks = self.checks.read().await;

        // Spawn all checks concurrently
        let futures: Vec<_> = checks.iter().map(|(name, registered)| {
            let check = registered.check.clone();
            let timeout_duration = registered.config.timeout;
            let category = registered.config.category;
            let name = name.clone();

            async move {
                let start = Instant::now();

                // Run check with timeout protection
                let result = timeout(timeout_duration, check.check()).await;
                let latency_ms = start.elapsed().as_millis() as u64;

                let health = match result {
                    Ok(Ok(mut health)) => {
                        // Add latency to successful check
                        health.latency_ms = Some(latency_ms);
                        health
                    }
                    Ok(Err(e)) => {
                        // Check returned an error
                        DependencyHealth {
                            name: name.clone(),
                            status: HealthStatus::Unhealthy,
                            latency_ms: Some(latency_ms),
                            message: Some(e.to_string()),
                            details: None,
                        }
                    }
                    Err(_) => {
                        // Check timed out
                        DependencyHealth {
                            name: name.clone(),
                            status: HealthStatus::Unhealthy,
                            latency_ms: Some(latency_ms),
                            message: Some("Health check timed out".to_string()),
                            details: None,
                        }
                    }
                };

                (health, category)
            }
        }).collect();

        // Wait for all checks to complete
        futures::future::join_all(futures).await
    }
}
```

---

## Implementing Specific Dependency Checks

Now implement concrete health checks for common dependencies. Each check implements the `HealthCheck` trait.

### PostgreSQL Check

```rust
// src/health/checks/postgres.rs
// PostgreSQL health check implementation

use super::super::{HealthCheck, DependencyHealth, HealthStatus};
use async_trait::async_trait;
use sqlx::PgPool;

pub struct PostgresHealthCheck {
    pool: PgPool,
    name: String,
}

impl PostgresHealthCheck {
    pub fn new(pool: PgPool, name: impl Into<String>) -> Self {
        Self {
            pool,
            name: name.into(),
        }
    }
}

#[async_trait]
impl HealthCheck for PostgresHealthCheck {
    fn name(&self) -> &str {
        &self.name
    }

    async fn check(&self) -> Result<DependencyHealth, Box<dyn std::error::Error + Send + Sync>> {
        // Run a simple query to verify connectivity
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await?;

        // Collect pool statistics for debugging
        let pool_size = self.pool.size();
        let idle = self.pool.num_idle();

        // Warn if pool is nearly exhausted
        let status = if idle < 2 && pool_size > 5 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        };

        Ok(DependencyHealth {
            name: self.name.clone(),
            status,
            latency_ms: None, // Will be filled by registry
            message: if status == HealthStatus::Degraded {
                Some(format!("Low idle connections: {}/{}", idle, pool_size))
            } else {
                None
            },
            details: Some(serde_json::json!({
                "pool_size": pool_size,
                "idle_connections": idle,
                "active_connections": pool_size - idle as u32,
            })),
        })
    }
}
```

### Redis Check

```rust
// src/health/checks/redis.rs
// Redis health check implementation

use super::super::{HealthCheck, DependencyHealth, HealthStatus};
use async_trait::async_trait;
use redis::aio::ConnectionManager;

pub struct RedisHealthCheck {
    client: ConnectionManager,
    name: String,
}

impl RedisHealthCheck {
    pub fn new(client: ConnectionManager, name: impl Into<String>) -> Self {
        Self {
            client,
            name: name.into(),
        }
    }
}

#[async_trait]
impl HealthCheck for RedisHealthCheck {
    fn name(&self) -> &str {
        &self.name
    }

    async fn check(&self) -> Result<DependencyHealth, Box<dyn std::error::Error + Send + Sync>> {
        // Use PING command to verify connectivity
        let mut conn = self.client.clone();
        redis::cmd("PING")
            .query_async::<_, String>(&mut conn)
            .await?;

        // Optionally get server info for diagnostics
        let info: String = redis::cmd("INFO")
            .arg("server")
            .query_async(&mut conn)
            .await
            .unwrap_or_default();

        Ok(DependencyHealth {
            name: self.name.clone(),
            status: HealthStatus::Healthy,
            latency_ms: None,
            message: None,
            details: if !info.is_empty() {
                Some(serde_json::json!({
                    "server_info": info.lines().take(5).collect::<Vec<_>>(),
                }))
            } else {
                None
            },
        })
    }
}
```

### External API Check

```rust
// src/health/checks/external_api.rs
// External API health check implementation

use super::super::{HealthCheck, DependencyHealth, HealthStatus};
use async_trait::async_trait;
use reqwest::Client;

pub struct ExternalApiHealthCheck {
    client: Client,
    url: String,
    name: String,
}

impl ExternalApiHealthCheck {
    pub fn new(client: Client, url: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            client,
            url: url.into(),
            name: name.into(),
        }
    }
}

#[async_trait]
impl HealthCheck for ExternalApiHealthCheck {
    fn name(&self) -> &str {
        &self.name
    }

    async fn check(&self) -> Result<DependencyHealth, Box<dyn std::error::Error + Send + Sync>> {
        let response = self.client
            .get(&self.url)
            .send()
            .await?;

        let status_code = response.status();

        // Determine health based on status code
        let status = if status_code.is_success() {
            HealthStatus::Healthy
        } else if status_code.is_server_error() {
            HealthStatus::Unhealthy
        } else {
            // Client errors might indicate config issues
            HealthStatus::Degraded
        };

        Ok(DependencyHealth {
            name: self.name.clone(),
            status,
            latency_ms: None,
            message: if status != HealthStatus::Healthy {
                Some(format!("HTTP {}", status_code))
            } else {
                None
            },
            details: Some(serde_json::json!({
                "status_code": status_code.as_u16(),
                "url": self.url,
            })),
        })
    }
}
```

---

## The Health Check Service

This service ties everything together and provides the endpoints for Kubernetes probes.

```rust
// src/health/service.rs
// Health check service with proper status aggregation

use super::{DependencyRegistry, DependencyHealth, HealthStatus, DependencyCategory};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub dependencies: Vec<DependencyHealth>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

pub struct HealthService {
    registry: Arc<DependencyRegistry>,
    started: AtomicBool,
    shutting_down: AtomicBool,
}

impl HealthService {
    pub fn new(registry: Arc<DependencyRegistry>) -> Self {
        Self {
            registry,
            started: AtomicBool::new(false),
            shutting_down: AtomicBool::new(false),
        }
    }

    /// Mark service as started after initialization
    pub fn mark_started(&self) {
        self.started.store(true, Ordering::SeqCst);
    }

    /// Mark service as shutting down
    pub fn mark_shutting_down(&self) {
        self.shutting_down.store(true, Ordering::SeqCst);
    }

    /// Liveness check - is the process running?
    /// Keep this simple and fast
    pub fn liveness(&self) -> HealthResponse {
        HealthResponse {
            status: "healthy",
            version: env!("CARGO_PKG_VERSION"),
            dependencies: vec![],
            message: None,
        }
    }

    /// Startup check - has initialization completed?
    pub fn startup(&self) -> (HealthResponse, u16) {
        if self.started.load(Ordering::SeqCst) {
            (
                HealthResponse {
                    status: "started",
                    version: env!("CARGO_PKG_VERSION"),
                    dependencies: vec![],
                    message: None,
                },
                200,
            )
        } else {
            (
                HealthResponse {
                    status: "starting",
                    version: env!("CARGO_PKG_VERSION"),
                    dependencies: vec![],
                    message: Some("Service is still initializing".to_string()),
                },
                503,
            )
        }
    }

    /// Readiness check - can we handle traffic?
    /// This checks all dependencies and aggregates status
    pub async fn readiness(&self) -> (HealthResponse, u16) {
        // Fail fast during shutdown
        if self.shutting_down.load(Ordering::SeqCst) {
            return (
                HealthResponse {
                    status: "shutting_down",
                    version: env!("CARGO_PKG_VERSION"),
                    dependencies: vec![],
                    message: Some("Service is shutting down".to_string()),
                },
                503,
            );
        }

        // Fail if not started
        if !self.started.load(Ordering::SeqCst) {
            return (
                HealthResponse {
                    status: "not_started",
                    version: env!("CARGO_PKG_VERSION"),
                    dependencies: vec![],
                    message: Some("Service has not finished starting".to_string()),
                },
                503,
            );
        }

        // Run all dependency checks
        let results = self.registry.check_all().await;

        // Separate dependencies and check for failures
        let mut dependencies = Vec::new();
        let mut critical_failure = false;
        let mut degraded = false;

        for (health, category) in results {
            match (health.status, category) {
                (HealthStatus::Unhealthy, DependencyCategory::Critical) => {
                    critical_failure = true;
                }
                (HealthStatus::Unhealthy, DependencyCategory::NonCritical) => {
                    degraded = true;
                }
                (HealthStatus::Degraded, _) => {
                    degraded = true;
                }
                _ => {}
            }
            dependencies.push(health);
        }

        // Determine overall status
        let (status, code) = if critical_failure {
            ("unhealthy", 503)
        } else if degraded {
            ("degraded", 200) // Still accept traffic but flag the issue
        } else {
            ("healthy", 200)
        };

        (
            HealthResponse {
                status,
                version: env!("CARGO_PKG_VERSION"),
                dependencies,
                message: if critical_failure {
                    Some("Critical dependency failure".to_string())
                } else {
                    None
                },
            },
            code,
        )
    }
}
```

---

## Wiring It All Together with Axum

Here is how to integrate everything into an Axum application.

```rust
// src/main.rs
// Complete example with dependency registration

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use std::sync::Arc;

mod health;

use health::{
    DependencyRegistry, HealthService, HealthCheckConfig, DependencyCategory,
    PostgresHealthCheck, RedisHealthCheck, ExternalApiHealthCheck,
};

struct AppState {
    health_service: Arc<HealthService>,
}

#[tokio::main]
async fn main() {
    // Create the dependency registry
    let registry = Arc::new(DependencyRegistry::new());

    // Initialize database pool
    let db_pool = sqlx::PgPool::connect("postgres://localhost/mydb")
        .await
        .expect("Failed to connect to database");

    // Initialize Redis
    let redis_client = redis::Client::open("redis://localhost")
        .expect("Failed to create Redis client");
    let redis_conn = redis::aio::ConnectionManager::new(redis_client)
        .await
        .expect("Failed to connect to Redis");

    // Create HTTP client for external APIs
    let http_client = reqwest::Client::new();

    // Register critical dependencies
    registry.register(
        Arc::new(PostgresHealthCheck::new(db_pool.clone(), "postgres")),
        HealthCheckConfig {
            timeout: std::time::Duration::from_secs(3),
            category: DependencyCategory::Critical,
        },
    ).await;

    // Register non-critical dependencies (cache)
    registry.register(
        Arc::new(RedisHealthCheck::new(redis_conn, "redis")),
        HealthCheckConfig {
            timeout: std::time::Duration::from_secs(2),
            category: DependencyCategory::NonCritical,
        },
    ).await;

    // Register external API check
    registry.register(
        Arc::new(ExternalApiHealthCheck::new(
            http_client,
            "https://api.payment-provider.com/health",
            "payment_api",
        )),
        HealthCheckConfig {
            timeout: std::time::Duration::from_secs(5),
            category: DependencyCategory::Critical,
        },
    ).await;

    // Create health service
    let health_service = Arc::new(HealthService::new(registry));

    // Create app state
    let state = Arc::new(AppState { health_service: health_service.clone() });

    // Build router
    let app = Router::new()
        .route("/health/live", get(liveness))
        .route("/health/ready", get(readiness))
        .route("/health/startup", get(startup))
        .with_state(state);

    // Mark service as started after initialization
    health_service.mark_started();

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn liveness(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(state.health_service.liveness())
}

async fn readiness(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let (response, code) = state.health_service.readiness().await;
    (StatusCode::from_u16(code).unwrap(), Json(response))
}

async fn startup(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let (response, code) = state.health_service.startup();
    (StatusCode::from_u16(code).unwrap(), Json(response))
}
```

---

## Sample Response

When you hit `/health/ready`, you get a comprehensive view of all dependencies:

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "dependencies": [
    {
      "name": "postgres",
      "status": "healthy",
      "latency_ms": 2,
      "details": {
        "pool_size": 10,
        "idle_connections": 8,
        "active_connections": 2
      }
    },
    {
      "name": "redis",
      "status": "unhealthy",
      "latency_ms": 5003,
      "message": "Health check timed out"
    },
    {
      "name": "payment_api",
      "status": "healthy",
      "latency_ms": 45,
      "details": {
        "status_code": 200,
        "url": "https://api.payment-provider.com/health"
      }
    }
  ]
}
```

Notice the status is "degraded" because Redis (non-critical) is down, but the HTTP status is still 200. If Postgres or the payment API failed, the status would be "unhealthy" with a 503 response.

---

## Best Practices

1. **Categorize dependencies properly** - Be honest about what your service actually needs
2. **Set appropriate timeouts** - Health checks should be fast; 5 seconds is a reasonable upper bound
3. **Run checks in parallel** - Sequential checks add up; parallel execution keeps latency low
4. **Include useful details** - Pool sizes, latencies, and connection counts help with debugging
5. **Fail readiness during shutdown** - Stop accepting new traffic before closing connections
6. **Keep liveness simple** - Never check dependencies in liveness probes

---

*Need visibility into your service dependencies? [OneUptime](https://oneuptime.com) monitors health endpoints and alerts you when dependencies fail, before your users notice.*

**Related Reading:**
- [How to Build a Graceful Shutdown Handler in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-graceful-shutdown/view)
- [How to Implement Circuit Breakers in Rust Services](https://oneuptime.com/blog/post/2026-01-25-circuit-breakers-rust-services/view)
