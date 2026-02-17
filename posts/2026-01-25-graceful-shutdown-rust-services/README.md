# How to Implement Graceful Shutdown in Rust Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Graceful Shutdown, Signals, Kubernetes, DevOps

Description: Learn how to implement graceful shutdown in Rust services by handling Unix signals, draining connections, and coordinating with Kubernetes for zero-downtime deployments.

---

When deploying services to production, one of the most overlooked aspects is how the application handles shutdown. A service that terminates abruptly can leave database transactions incomplete, drop client connections mid-response, or corrupt state. Rust gives you the tools to handle this properly, but it requires deliberate implementation.

This guide walks through building a robust graceful shutdown system for Rust services, from basic signal handling to production-ready patterns that work with Kubernetes orchestration.

## Why Graceful Shutdown Matters

Consider what happens when your service receives a SIGTERM signal without proper handling:

- Active HTTP requests return 502 errors to clients
- Database connections close without committing transactions
- Background jobs stop mid-execution
- WebSocket clients disconnect without notification

With graceful shutdown, your service instead:

- Stops accepting new connections
- Completes in-flight requests
- Flushes buffers and commits transactions
- Closes connections cleanly
- Exits with status code 0

## Basic Signal Handling with Tokio

The foundation of graceful shutdown is catching termination signals. In Rust with Tokio, you can use the `tokio::signal` module.

```rust
use tokio::signal;
use tokio::sync::broadcast;

// Create a shutdown signal channel
pub fn shutdown_signal() -> broadcast::Sender<()> {
    let (tx, _) = broadcast::channel(1);
    let tx_clone = tx.clone();

    tokio::spawn(async move {
        // Wait for SIGTERM or SIGINT
        let ctrl_c = async {
            signal::ctrl_c()
                .await
                .expect("Failed to install Ctrl+C handler");
        };

        #[cfg(unix)]
        let terminate = async {
            signal::unix::signal(signal::unix::SignalKind::terminate())
                .expect("Failed to install SIGTERM handler")
                .recv()
                .await;
        };

        #[cfg(not(unix))]
        let terminate = std::future::pending::<()>();

        tokio::select! {
            _ = ctrl_c => {
                println!("Received SIGINT, initiating shutdown...");
            }
            _ = terminate => {
                println!("Received SIGTERM, initiating shutdown...");
            }
        }

        // Notify all listeners
        let _ = tx_clone.send(());
    });

    tx
}
```

## Integrating with Axum Web Server

Most Rust web applications use Axum or Actix. Here is how to wire up graceful shutdown with Axum:

```rust
use axum::{routing::get, Router};
use std::net::SocketAddr;
use tokio::sync::broadcast;

async fn health_check() -> &'static str {
    "OK"
}

pub async fn run_server(shutdown_tx: broadcast::Sender<()>) {
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/", get(|| async { "Hello, World!" }));

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("Server listening on {}", addr);

    // Create a shutdown receiver
    let mut shutdown_rx = shutdown_tx.subscribe();

    // Run server with graceful shutdown
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let _ = shutdown_rx.recv().await;
            println!("Shutting down HTTP server...");
        })
        .await
        .unwrap();
}
```

## Complete Shutdown Coordinator

For production services, you need a coordinator that manages multiple resources. This pattern ensures resources shut down in the correct order.

```rust
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex, Semaphore};
use tokio::time::{timeout, Duration};

pub struct ShutdownCoordinator {
    shutdown_tx: broadcast::Sender<()>,
    // Track in-flight requests
    request_semaphore: Arc<Semaphore>,
    max_requests: usize,
    // Cleanup handlers run in order during shutdown
    cleanup_handlers: Arc<Mutex<Vec<CleanupHandler>>>,
}

type CleanupHandler = Box<dyn FnOnce() -> BoxFuture<'static, ()> + Send>;
type BoxFuture<'a, T> = std::pin::Pin<Box<dyn std::future::Future<Output = T> + Send + 'a>>;

impl ShutdownCoordinator {
    pub fn new(max_concurrent_requests: usize) -> Self {
        let (shutdown_tx, _) = broadcast::channel(1);

        Self {
            shutdown_tx,
            request_semaphore: Arc::new(Semaphore::new(max_concurrent_requests)),
            max_requests: max_concurrent_requests,
            cleanup_handlers: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn shutdown_signal(&self) -> broadcast::Receiver<()> {
        self.shutdown_tx.subscribe()
    }

    pub fn shutdown_sender(&self) -> broadcast::Sender<()> {
        self.shutdown_tx.clone()
    }

    // Acquire a permit for an in-flight request
    pub async fn acquire_request_permit(&self) -> Option<tokio::sync::OwnedSemaphorePermit> {
        self.request_semaphore.clone().try_acquire_owned().ok()
    }

    // Wait for all in-flight requests to complete
    pub async fn wait_for_requests(&self, timeout_duration: Duration) -> bool {
        let start = std::time::Instant::now();

        loop {
            let available = self.request_semaphore.available_permits();
            if available == self.max_requests {
                return true; // All requests completed
            }

            if start.elapsed() > timeout_duration {
                println!(
                    "Timeout waiting for requests. {} still in flight",
                    self.max_requests - available
                );
                return false;
            }

            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }

    // Initiate shutdown sequence
    pub async fn shutdown(&self, timeout_duration: Duration) {
        println!("Starting graceful shutdown...");

        // Signal all components to stop
        let _ = self.shutdown_tx.send(());

        // Wait for in-flight requests
        println!("Waiting for in-flight requests to complete...");
        self.wait_for_requests(timeout_duration).await;

        // Run cleanup handlers
        let handlers = {
            let mut guard = self.cleanup_handlers.lock().await;
            std::mem::take(&mut *guard)
        };

        for handler in handlers {
            let future = handler();
            if timeout(Duration::from_secs(5), future).await.is_err() {
                println!("Cleanup handler timed out");
            }
        }

        println!("Graceful shutdown complete");
    }
}
```

## Middleware for Request Tracking

Create middleware that tracks in-flight requests and rejects new ones during shutdown:

```rust
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::sync::atomic::{AtomicBool, Ordering};

pub struct AppState {
    pub coordinator: Arc<ShutdownCoordinator>,
    pub is_shutting_down: AtomicBool,
}

pub async fn shutdown_middleware<Bd>(
    State(state): State<Arc<AppState>>,
    request: Request<Bd>,
    next: Next<Bd>,
) -> Result<Response, StatusCode> {
    // Reject requests during shutdown
    if state.is_shutting_down.load(Ordering::SeqCst) {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    // Acquire permit for this request
    let permit = state.coordinator.acquire_request_permit().await;

    if permit.is_none() {
        // Too many concurrent requests
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    // Process request - permit automatically drops when response completes
    let response = next.run(request).await;

    Ok(response)
}
```

## Database Connection Cleanup

Database connections need explicit cleanup. Here is a pattern for SQLx connection pools:

```rust
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn create_db_pool(database_url: &str) -> PgPool {
    PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
        .expect("Failed to create database pool")
}

pub async fn shutdown_db_pool(pool: PgPool) {
    println!("Closing database connections...");

    // Close the pool - this waits for active connections
    pool.close().await;

    println!("Database connections closed");
}
```

## Health Check Transitions

Kubernetes uses readiness probes to decide whether to send traffic to a pod. During shutdown, you should fail the readiness check before stopping the server:

```rust
use std::sync::atomic::{AtomicBool, Ordering};

pub struct HealthState {
    is_ready: AtomicBool,
    is_live: AtomicBool,
}

impl HealthState {
    pub fn new() -> Self {
        Self {
            is_ready: AtomicBool::new(false),
            is_live: AtomicBool::new(true),
        }
    }

    pub fn set_ready(&self, ready: bool) {
        self.is_ready.store(ready, Ordering::SeqCst);
    }

    pub fn is_ready(&self) -> bool {
        self.is_ready.load(Ordering::SeqCst)
    }

    pub fn is_live(&self) -> bool {
        self.is_live.load(Ordering::SeqCst)
    }
}

// Health check endpoints
async fn liveness(State(health): State<Arc<HealthState>>) -> StatusCode {
    if health.is_live() {
        StatusCode::OK
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    }
}

async fn readiness(State(health): State<Arc<HealthState>>) -> StatusCode {
    if health.is_ready() {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}
```

## Putting It All Together

Here is the complete main function wiring everything together:

```rust
#[tokio::main]
async fn main() {
    // Initialize components
    let coordinator = Arc::new(ShutdownCoordinator::new(1000));
    let health = Arc::new(HealthState::new());
    let db_pool = create_db_pool(&std::env::var("DATABASE_URL").unwrap()).await;

    // Set up shutdown signal handler
    let shutdown_tx = shutdown_signal();

    // Clone references for the shutdown task
    let coordinator_clone = coordinator.clone();
    let health_clone = health.clone();
    let db_pool_clone = db_pool.clone();

    // Spawn shutdown handler
    let mut shutdown_rx = shutdown_tx.subscribe();
    tokio::spawn(async move {
        let _ = shutdown_rx.recv().await;

        // Step 1: Mark as not ready (stop receiving traffic)
        health_clone.set_ready(false);

        // Step 2: Wait for load balancer to notice (Kubernetes needs time)
        println!("Waiting for load balancer to drain...");
        tokio::time::sleep(Duration::from_secs(5)).await;

        // Step 3: Initiate coordinated shutdown
        coordinator_clone.shutdown(Duration::from_secs(30)).await;

        // Step 4: Close database pool
        shutdown_db_pool(db_pool_clone).await;
    });

    // Mark as ready
    health.set_ready(true);

    // Run the server
    run_server(shutdown_tx).await;
}
```

## Kubernetes Configuration

Configure your Kubernetes deployment to work with graceful shutdown:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rust-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 45
      containers:
        - name: app
          image: my-rust-service
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]
```

The `preStop` hook gives Kubernetes time to remove the pod from service endpoints before sending SIGTERM.

## Testing Your Shutdown Logic

Write integration tests to verify shutdown behavior:

```rust
#[tokio::test]
async fn test_graceful_shutdown_completes_requests() {
    let coordinator = Arc::new(ShutdownCoordinator::new(100));

    // Start a slow request
    let permit = coordinator.acquire_request_permit().await.unwrap();

    // Trigger shutdown in background
    let coordinator_clone = coordinator.clone();
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_millis(100)).await;
        coordinator_clone.shutdown(Duration::from_secs(5)).await;
    });

    // Simulate request taking some time
    tokio::time::sleep(Duration::from_millis(500)).await;
    drop(permit); // Request completes

    // Shutdown should complete successfully
    tokio::time::sleep(Duration::from_millis(200)).await;
}
```

## Summary

Graceful shutdown in Rust services requires coordinating several moving parts:

1. Catch SIGTERM and SIGINT signals using tokio::signal
2. Immediately fail readiness checks to stop new traffic
3. Wait for the load balancer to drain existing connections
4. Stop accepting new requests at the application level
5. Wait for in-flight requests to complete with a timeout
6. Close database connections and other resources
7. Exit cleanly

The investment pays off in production. Zero-downtime deployments become reliable, and you avoid the frustrating edge cases where users see errors during rollouts. Rust's ownership model and async runtime make this pattern straightforward to implement correctly.
