# How to Add Custom Metrics to Rust Applications with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Prometheus, Metrics, Observability, Monitoring, Performance, Grafana

Description: Learn how to add custom metrics to Rust applications using the prometheus crate. This guide covers counters, gauges, histograms, and best practices for exposing metrics in production.

---

> Metrics are the pulse of your application. They tell you what's happening at a glance without the overhead of tracing every request. This guide shows you how to implement production-ready metrics in Rust using the Prometheus ecosystem.

Prometheus has become the de facto standard for metrics in cloud-native applications. Rust's `prometheus` crate provides a native implementation that's both performant and ergonomic.

---

## Why Prometheus for Rust?

- **Pull-based model** - Prometheus scrapes your app, reducing coupling
- **Rich query language** - PromQL for flexible alerting and dashboards
- **Native Rust crate** - Zero-cost abstractions, no FFI overhead
- **Ecosystem integration** - Works with Grafana, AlertManager, and more

---

## Getting Started

Add the prometheus crate and dependencies to your `Cargo.toml`.

```toml
[dependencies]
# Prometheus metrics library
prometheus = { version = "0.13", features = ["process"] }

# Lazy initialization for global metrics
lazy_static = "1.4"

# Web framework for metrics endpoint
axum = "0.7"
tokio = { version = "1", features = ["full"] }
```

---

## Defining Metrics

### Counter

Counters are monotonically increasing values, perfect for counting events like requests or errors.

```rust
// src/metrics.rs
// Define application metrics using prometheus crate

use lazy_static::lazy_static;
use prometheus::{
    Counter, CounterVec, Gauge, GaugeVec, Histogram, HistogramOpts, HistogramVec,
    IntCounter, IntCounterVec, IntGauge, IntGaugeVec, Opts, Registry,
};

// Create a custom registry (optional, can use default)
lazy_static! {
    pub static ref REGISTRY: Registry = Registry::new();

    // Simple counter - total requests processed
    pub static ref REQUESTS_TOTAL: IntCounter = IntCounter::new(
        "http_requests_total",
        "Total number of HTTP requests processed"
    ).expect("metric can be created");

    // Counter with labels - requests by endpoint and status
    pub static ref REQUESTS_BY_ENDPOINT: IntCounterVec = IntCounterVec::new(
        Opts::new(
            "http_requests_by_endpoint_total",
            "HTTP requests by endpoint and status code"
        ),
        &["endpoint", "method", "status"]  // Label names
    ).expect("metric can be created");

    // Counter for errors by type
    pub static ref ERRORS_TOTAL: IntCounterVec = IntCounterVec::new(
        Opts::new(
            "app_errors_total",
            "Total errors by type and component"
        ),
        &["error_type", "component"]
    ).expect("metric can be created");
}

/// Initialize and register all metrics with the registry
pub fn init_metrics() {
    REGISTRY
        .register(Box::new(REQUESTS_TOTAL.clone()))
        .expect("collector can be registered");

    REGISTRY
        .register(Box::new(REQUESTS_BY_ENDPOINT.clone()))
        .expect("collector can be registered");

    REGISTRY
        .register(Box::new(ERRORS_TOTAL.clone()))
        .expect("collector can be registered");
}

// Usage examples
pub fn record_request(endpoint: &str, method: &str, status: u16) {
    // Increment simple counter
    REQUESTS_TOTAL.inc();

    // Increment labeled counter
    REQUESTS_BY_ENDPOINT
        .with_label_values(&[endpoint, method, &status.to_string()])
        .inc();
}

pub fn record_error(error_type: &str, component: &str) {
    ERRORS_TOTAL
        .with_label_values(&[error_type, component])
        .inc();
}
```

### Gauge

Gauges represent values that can go up or down, like active connections or queue depth.

```rust
// src/metrics.rs (continued)
// Gauge metrics for current state

lazy_static! {
    // Simple gauge - active connections
    pub static ref ACTIVE_CONNECTIONS: IntGauge = IntGauge::new(
        "http_active_connections",
        "Number of currently active HTTP connections"
    ).expect("metric can be created");

    // Gauge with labels - queue depth by queue name
    pub static ref QUEUE_DEPTH: IntGaugeVec = IntGaugeVec::new(
        Opts::new(
            "job_queue_depth",
            "Number of jobs waiting in each queue"
        ),
        &["queue_name"]
    ).expect("metric can be created");

    // Gauge for resource usage
    pub static ref MEMORY_USAGE_BYTES: IntGauge = IntGauge::new(
        "app_memory_usage_bytes",
        "Current memory usage in bytes"
    ).expect("metric can be created");

    // Gauge with floating point values
    pub static ref CPU_USAGE_PERCENT: Gauge = Gauge::new(
        "app_cpu_usage_percent",
        "Current CPU usage percentage"
    ).expect("metric can be created");
}

// Register gauges
pub fn register_gauges() {
    REGISTRY.register(Box::new(ACTIVE_CONNECTIONS.clone())).unwrap();
    REGISTRY.register(Box::new(QUEUE_DEPTH.clone())).unwrap();
    REGISTRY.register(Box::new(MEMORY_USAGE_BYTES.clone())).unwrap();
    REGISTRY.register(Box::new(CPU_USAGE_PERCENT.clone())).unwrap();
}

// Usage examples
pub fn connection_opened() {
    ACTIVE_CONNECTIONS.inc();
}

pub fn connection_closed() {
    ACTIVE_CONNECTIONS.dec();
}

pub fn set_queue_depth(queue: &str, depth: i64) {
    QUEUE_DEPTH.with_label_values(&[queue]).set(depth);
}

pub fn update_resource_metrics(memory_bytes: i64, cpu_percent: f64) {
    MEMORY_USAGE_BYTES.set(memory_bytes);
    CPU_USAGE_PERCENT.set(cpu_percent);
}
```

### Histogram

Histograms track distributions of values, ideal for latencies and request sizes.

```rust
// src/metrics.rs (continued)
// Histogram metrics for distributions

lazy_static! {
    // Request latency histogram with custom buckets
    pub static ref REQUEST_LATENCY: HistogramVec = HistogramVec::new(
        HistogramOpts::new(
            "http_request_duration_seconds",
            "HTTP request latency in seconds"
        )
        // Define bucket boundaries for latency distribution
        // These buckets are optimized for typical web service latencies
        .buckets(vec![
            0.001,  // 1ms
            0.005,  // 5ms
            0.01,   // 10ms
            0.025,  // 25ms
            0.05,   // 50ms
            0.1,    // 100ms
            0.25,   // 250ms
            0.5,    // 500ms
            1.0,    // 1s
            2.5,    // 2.5s
            5.0,    // 5s
            10.0,   // 10s
        ]),
        &["endpoint", "method"]
    ).expect("metric can be created");

    // Response size histogram
    pub static ref RESPONSE_SIZE: HistogramVec = HistogramVec::new(
        HistogramOpts::new(
            "http_response_size_bytes",
            "HTTP response size in bytes"
        )
        .buckets(vec![
            100.0,
            1_000.0,      // 1KB
            10_000.0,     // 10KB
            100_000.0,    // 100KB
            1_000_000.0,  // 1MB
            10_000_000.0, // 10MB
        ]),
        &["endpoint"]
    ).expect("metric can be created");

    // Database query latency
    pub static ref DB_QUERY_LATENCY: HistogramVec = HistogramVec::new(
        HistogramOpts::new(
            "db_query_duration_seconds",
            "Database query latency in seconds"
        )
        .buckets(vec![
            0.0001, // 0.1ms
            0.0005, // 0.5ms
            0.001,  // 1ms
            0.005,  // 5ms
            0.01,   // 10ms
            0.05,   // 50ms
            0.1,    // 100ms
            0.5,    // 500ms
            1.0,    // 1s
        ]),
        &["query_type", "table"]
    ).expect("metric can be created");
}

// Register histograms
pub fn register_histograms() {
    REGISTRY.register(Box::new(REQUEST_LATENCY.clone())).unwrap();
    REGISTRY.register(Box::new(RESPONSE_SIZE.clone())).unwrap();
    REGISTRY.register(Box::new(DB_QUERY_LATENCY.clone())).unwrap();
}

// Usage examples
use std::time::Instant;

/// Record request latency using a timer
pub fn record_request_latency(endpoint: &str, method: &str, start: Instant) {
    let duration = start.elapsed().as_secs_f64();
    REQUEST_LATENCY
        .with_label_values(&[endpoint, method])
        .observe(duration);
}

/// Record response size
pub fn record_response_size(endpoint: &str, size_bytes: f64) {
    RESPONSE_SIZE
        .with_label_values(&[endpoint])
        .observe(size_bytes);
}

/// Timer helper for automatic latency recording
pub struct LatencyTimer {
    histogram: Histogram,
    start: Instant,
}

impl LatencyTimer {
    pub fn new(histogram: Histogram) -> Self {
        Self {
            histogram,
            start: Instant::now(),
        }
    }
}

impl Drop for LatencyTimer {
    fn drop(&mut self) {
        let duration = self.start.elapsed().as_secs_f64();
        self.histogram.observe(duration);
    }
}

// Usage with timer
pub fn timed_db_query(query_type: &str, table: &str) -> LatencyTimer {
    let histogram = DB_QUERY_LATENCY
        .with_label_values(&[query_type, table]);
    LatencyTimer::new(histogram)
}
```

---

## Exposing Metrics Endpoint

Create an HTTP endpoint that Prometheus can scrape.

```rust
// src/metrics_endpoint.rs
// Axum handler for Prometheus metrics endpoint

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use prometheus::{Encoder, TextEncoder};

use crate::metrics::REGISTRY;

/// Handler for /metrics endpoint
/// Returns metrics in Prometheus text format
async fn metrics_handler() -> Response {
    // Collect all metrics from the registry
    let metric_families = REGISTRY.gather();

    // Encode metrics in Prometheus text format
    let encoder = TextEncoder::new();
    let mut buffer = Vec::new();

    match encoder.encode(&metric_families, &mut buffer) {
        Ok(_) => {
            // Return metrics with correct content type
            (
                StatusCode::OK,
                [(
                    "content-type",
                    "text/plain; version=0.0.4; charset=utf-8",
                )],
                buffer,
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to encode metrics");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

/// Create router with metrics endpoint
pub fn metrics_router() -> Router {
    Router::new().route("/metrics", get(metrics_handler))
}

// Alternative: Include process metrics (memory, CPU, file descriptors)
pub fn metrics_handler_with_process() -> Response {
    // Collect default process metrics
    let process_metrics = prometheus::gather();

    // Collect custom metrics
    let mut all_metrics = REGISTRY.gather();
    all_metrics.extend(process_metrics);

    let encoder = TextEncoder::new();
    let mut buffer = Vec::new();

    encoder.encode(&all_metrics, &mut buffer).unwrap();

    (
        StatusCode::OK,
        [("content-type", "text/plain; version=0.0.4; charset=utf-8")],
        buffer,
    )
        .into_response()
}
```

---

## Integrating with Your Application

Here's a complete example integrating metrics into an Axum web service.

```rust
// src/main.rs
// Complete application with Prometheus metrics

mod metrics;
mod metrics_endpoint;

use axum::{
    extract::State,
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use metrics::{
    record_error, record_request, record_request_latency, record_response_size,
    ACTIVE_CONNECTIONS,
};
use std::{sync::Arc, time::Instant};
use tokio::net::TcpListener;

// Application state
struct AppState {
    // Add your dependencies here
}

#[tokio::main]
async fn main() {
    // Initialize tracing for logs
    tracing_subscriber::fmt::init();

    // Initialize metrics
    metrics::init_metrics();
    metrics::register_gauges();
    metrics::register_histograms();

    tracing::info!("Metrics initialized");

    // Create app state
    let state = Arc::new(AppState {});

    // Build application router
    let app = Router::new()
        // Business endpoints
        .route("/api/orders", post(create_order))
        .route("/api/orders/:id", get(get_order))
        .route("/health", get(health_check))
        // Apply metrics middleware to all routes
        .layer(middleware::from_fn(metrics_middleware))
        .with_state(state)
        // Metrics endpoint (no middleware to avoid self-recording)
        .merge(metrics_endpoint::metrics_router());

    // Start server
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Server listening on 0.0.0.0:3000");
    tracing::info!("Metrics available at http://localhost:3000/metrics");

    axum::serve(listener, app).await.unwrap();
}

/// Middleware that records metrics for every request
async fn metrics_middleware(
    request: axum::extract::Request,
    next: Next,
) -> Response {
    let start = Instant::now();

    // Track active connections
    ACTIVE_CONNECTIONS.inc();

    // Get request details
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    // Process request
    let response = next.run(request).await;

    // Record metrics
    let status = response.status().as_u16();

    // Record request count
    record_request(&path, &method, status);

    // Record latency
    record_request_latency(&path, &method, start);

    // Track connection closed
    ACTIVE_CONNECTIONS.dec();

    // Record errors
    if status >= 500 {
        record_error("server_error", "http");
    } else if status >= 400 {
        record_error("client_error", "http");
    }

    response
}

/// Health check endpoint
async fn health_check() -> StatusCode {
    StatusCode::OK
}

/// Create order endpoint
async fn create_order(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<CreateOrderRequest>,
) -> Result<Json<OrderResponse>, StatusCode> {
    // Business logic...
    let order_id = format!("ord_{}", uuid::Uuid::new_v4());

    Ok(Json(OrderResponse {
        id: order_id,
        status: "created".to_string(),
    }))
}

/// Get order endpoint
async fn get_order(
    State(_state): State<Arc<AppState>>,
    axum::extract::Path(order_id): axum::extract::Path<String>,
) -> Result<Json<OrderResponse>, StatusCode> {
    // Business logic...
    Ok(Json(OrderResponse {
        id: order_id,
        status: "completed".to_string(),
    }))
}

#[derive(serde::Deserialize)]
struct CreateOrderRequest {
    customer_id: String,
    items: Vec<String>,
}

#[derive(serde::Serialize)]
struct OrderResponse {
    id: String,
    status: String,
}
```

---

## Prometheus Configuration

Configure Prometheus to scrape your application.

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'rust-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
    scrape_interval: 10s
```

---

## Example Metrics Output

Your `/metrics` endpoint will return data like this:

```
# HELP http_requests_total Total number of HTTP requests processed
# TYPE http_requests_total counter
http_requests_total 1542

# HELP http_requests_by_endpoint_total HTTP requests by endpoint and status code
# TYPE http_requests_by_endpoint_total counter
http_requests_by_endpoint_total{endpoint="/api/orders",method="POST",status="201"} 523
http_requests_by_endpoint_total{endpoint="/api/orders/:id",method="GET",status="200"} 892
http_requests_by_endpoint_total{endpoint="/api/orders/:id",method="GET",status="404"} 127

# HELP http_active_connections Number of currently active HTTP connections
# TYPE http_active_connections gauge
http_active_connections 12

# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{endpoint="/api/orders",method="POST",le="0.01"} 412
http_request_duration_seconds_bucket{endpoint="/api/orders",method="POST",le="0.025"} 498
http_request_duration_seconds_bucket{endpoint="/api/orders",method="POST",le="0.05"} 520
http_request_duration_seconds_bucket{endpoint="/api/orders",method="POST",le="+Inf"} 523
http_request_duration_seconds_sum{endpoint="/api/orders",method="POST"} 8.234
http_request_duration_seconds_count{endpoint="/api/orders",method="POST"} 523
```

---

## Best Practices

### Naming Conventions

Follow Prometheus naming conventions for consistency:

```rust
// Good: snake_case, descriptive, includes unit
"http_request_duration_seconds"
"db_connections_active"
"queue_messages_total"

// Bad: camelCase, no unit, vague
"requestLatency"
"connections"
"count"
```

### Avoid High Cardinality

Don't use unbounded values as labels:

```rust
// Bad: user_id creates unbounded labels
REQUESTS.with_label_values(&[user_id]).inc();

// Good: use bounded categories
REQUESTS.with_label_values(&[user_type]).inc();  // "free", "premium", "enterprise"
```

### Use Appropriate Metric Types

| Use Case | Metric Type |
|----------|-------------|
| Event counts (requests, errors) | Counter |
| Current state (connections, queue size) | Gauge |
| Latency, sizes, distributions | Histogram |
| High-percentile latency (when precision matters) | Summary |

---

## Useful PromQL Queries

```promql
# Request rate per second over 5 minutes
rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
sum(rate(http_requests_by_endpoint_total{status=~"5.."}[5m])) /
sum(rate(http_requests_by_endpoint_total[5m])) * 100

# Active connections trend
http_active_connections
```

---

*Ready to visualize your Rust application metrics? [OneUptime](https://oneuptime.com) supports Prometheus metrics ingestion with pre-built dashboards and alerting.*

**Related Reading:**
- [How to Instrument Rust Applications with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-07-rust-opentelemetry-instrumentation/view)
- [SRE Metrics to Track](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
