# How to Instrument Rust Applications with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, OpenTelemetry, Observability, Tracing, Metrics, Logging, Distributed Tracing

Description: Learn how to instrument Rust applications with OpenTelemetry for traces, metrics, and structured logs. This guide covers SDK setup, automatic instrumentation, and best practices for production deployments.

---

> Rust's performance guarantees make it ideal for systems programming, but without proper observability, even the fastest code becomes a black box in production. OpenTelemetry brings standardized telemetry to Rust with minimal runtime overhead.

OpenTelemetry provides a vendor-neutral way to collect traces, metrics, and logs from your Rust applications. This guide covers everything from basic setup to production-ready configurations.

---

## Why OpenTelemetry for Rust?

Rust's ecosystem has converged on OpenTelemetry as the standard for observability:

- **Zero-cost abstractions** - Disabled spans compile to no-ops
- **Async-native** - First-class support for tokio and async-std
- **Unified SDK** - Single dependency for traces, metrics, and logs
- **Vendor-neutral** - Export to any backend (Jaeger, Zipkin, OTLP)

---

## Setting Up the Dependencies

Add the required crates to your `Cargo.toml`. The OpenTelemetry ecosystem in Rust is modular, so you only include what you need.

```toml
[dependencies]
# Core OpenTelemetry APIs and SDK
opentelemetry = "0.24"
opentelemetry_sdk = { version = "0.24", features = ["rt-tokio"] }

# OTLP exporter for sending data to collectors
opentelemetry-otlp = { version = "0.17", features = ["tonic"] }

# Semantic conventions for consistent attribute naming
opentelemetry-semantic-conventions = "0.16"

# The tracing ecosystem for instrumentation
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-opentelemetry = "0.25"

# Async runtime
tokio = { version = "1", features = ["full"] }
```

---

## Basic Tracing Setup

This configuration initializes the OpenTelemetry tracer with OTLP export. It sets up resource attributes to identify your service and configures batch processing for efficient span export.

```rust
// src/telemetry.rs
// Initialize OpenTelemetry tracing with OTLP export

use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{
    runtime,
    trace::{BatchConfig, RandomIdGenerator, Sampler, Tracer},
    Resource,
};
use opentelemetry_semantic_conventions::resource::{
    DEPLOYMENT_ENVIRONMENT, SERVICE_NAME, SERVICE_VERSION,
};
use std::time::Duration;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Initialize OpenTelemetry tracing infrastructure
/// Returns the tracer for creating spans
pub fn init_tracing(service_name: &str) -> Result<Tracer, Box<dyn std::error::Error>> {
    // Define resource attributes that identify this service
    // These appear on every span and help filter in your observability backend
    let resource = Resource::new(vec![
        opentelemetry::KeyValue::new(SERVICE_NAME, service_name.to_string()),
        opentelemetry::KeyValue::new(
            SERVICE_VERSION,
            std::env::var("SERVICE_VERSION").unwrap_or_else(|_| "1.0.0".to_string()),
        ),
        opentelemetry::KeyValue::new(
            DEPLOYMENT_ENVIRONMENT,
            std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string()),
        ),
    ]);

    // Configure the OTLP exporter
    // This sends spans to an OpenTelemetry Collector or compatible backend
    let otlp_exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint(
            std::env::var("OTLP_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:4317".to_string()),
        )
        .with_timeout(Duration::from_secs(3));

    // Build the tracer provider with batch processing
    // Batch processing reduces network overhead by sending spans in groups
    let tracer_provider = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(otlp_exporter)
        .with_trace_config(
            opentelemetry_sdk::trace::Config::default()
                .with_sampler(Sampler::AlwaysOn) // Sample all traces in dev
                .with_id_generator(RandomIdGenerator::default())
                .with_resource(resource),
        )
        .with_batch_config(
            BatchConfig::default()
                .with_max_queue_size(4096)
                .with_max_export_batch_size(512)
                .with_scheduled_delay(Duration::from_millis(5000)),
        )
        .install_batch(runtime::Tokio)?;

    // Get the tracer from the provider
    let tracer = tracer_provider.tracer("app");

    // Create the tracing-opentelemetry layer
    // This bridges the `tracing` crate to OpenTelemetry
    let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer.clone());

    // Configure log filtering from RUST_LOG environment variable
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // Initialize the global subscriber with both layers
    tracing_subscriber::registry()
        .with(env_filter)
        .with(telemetry_layer)
        .with(tracing_subscriber::fmt::layer()) // Console output
        .init();

    Ok(tracer)
}

/// Gracefully shutdown telemetry, flushing pending spans
pub fn shutdown_tracing() {
    opentelemetry::global::shutdown_tracer_provider();
}
```

---

## Instrumenting Your Application

With the tracing subscriber configured, you can use the `#[tracing::instrument]` macro to automatically create spans for functions.

```rust
// src/main.rs
// Application with OpenTelemetry instrumentation

mod telemetry;

use tracing::{info, instrument, warn, Span};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize telemetry before any other operations
    let _tracer = telemetry::init_tracing("order-service")?;

    info!("Starting order service");

    // Simulate processing an order
    let order_id = "ord_12345";
    match process_order(order_id).await {
        Ok(result) => info!(order_id, "Order processed successfully"),
        Err(e) => warn!(order_id, error = %e, "Order processing failed"),
    }

    // Ensure all spans are exported before shutdown
    telemetry::shutdown_tracing();

    Ok(())
}

/// Process an order - automatically creates a span
/// The #[instrument] macro captures function arguments as span attributes
#[instrument(skip(order_id), fields(order.id = %order_id))]
async fn process_order(order_id: &str) -> Result<OrderResult, OrderError> {
    // Add custom attributes to the current span
    Span::current().record("order.step", "validation");

    // Validate the order
    validate_order(order_id).await?;

    // Process payment
    Span::current().record("order.step", "payment");
    let payment_result = process_payment(order_id).await?;

    // Fulfill the order
    Span::current().record("order.step", "fulfillment");
    fulfill_order(order_id).await?;

    Ok(OrderResult {
        order_id: order_id.to_string(),
        transaction_id: payment_result.transaction_id,
    })
}

/// Validate order data
#[instrument]
async fn validate_order(order_id: &str) -> Result<(), OrderError> {
    // Simulate validation logic
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;

    info!("Order validated");
    Ok(())
}

/// Process payment for an order
#[instrument(fields(payment.provider = "stripe"))]
async fn process_payment(order_id: &str) -> Result<PaymentResult, OrderError> {
    // Simulate payment processing
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    info!("Payment processed");
    Ok(PaymentResult {
        transaction_id: "txn_abc123".to_string(),
    })
}

/// Fulfill the order
#[instrument]
async fn fulfill_order(order_id: &str) -> Result<(), OrderError> {
    // Simulate fulfillment
    tokio::time::sleep(std::time::Duration::from_millis(30)).await;

    info!("Order fulfilled");
    Ok(())
}

// Domain types
struct OrderResult {
    order_id: String,
    transaction_id: String,
}

struct PaymentResult {
    transaction_id: String,
}

#[derive(Debug)]
struct OrderError(String);

impl std::fmt::Display for OrderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for OrderError {}
```

---

## Adding Metrics

OpenTelemetry metrics in Rust use the same SDK with a separate meter provider. Here's how to add counters, gauges, and histograms.

```rust
// src/metrics.rs
// OpenTelemetry metrics configuration

use opentelemetry::{
    metrics::{Counter, Histogram, MeterProvider, UpDownCounter},
    KeyValue,
};
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{
    metrics::{PeriodicReader, SdkMeterProvider},
    runtime, Resource,
};
use std::time::Duration;

/// Application metrics container
pub struct AppMetrics {
    /// Count of requests by endpoint and status
    pub request_counter: Counter<u64>,
    /// Currently active connections
    pub active_connections: UpDownCounter<i64>,
    /// Request latency distribution
    pub request_latency: Histogram<f64>,
}

/// Initialize the meter provider and create application metrics
pub fn init_metrics(service_name: &str) -> Result<AppMetrics, Box<dyn std::error::Error>> {
    // Create resource with service identification
    let resource = Resource::new(vec![
        opentelemetry::KeyValue::new("service.name", service_name.to_string()),
    ]);

    // Configure OTLP exporter for metrics
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint(
            std::env::var("OTLP_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:4317".to_string()),
        );

    // Build meter provider with periodic export
    let meter_provider = SdkMeterProvider::builder()
        .with_resource(resource)
        .with_reader(
            PeriodicReader::builder(
                opentelemetry_otlp::new_exporter()
                    .tonic()
                    .build_metrics_exporter(
                        Box::new(opentelemetry_sdk::metrics::data::Temporality::Cumulative),
                    )?,
                runtime::Tokio,
            )
            .with_interval(Duration::from_secs(10))
            .build(),
        )
        .build();

    // Get a meter for creating instruments
    let meter = meter_provider.meter("app");

    // Create metrics instruments
    let request_counter = meter
        .u64_counter("http.server.requests")
        .with_description("Total HTTP requests processed")
        .with_unit("requests")
        .init();

    let active_connections = meter
        .i64_up_down_counter("http.server.active_connections")
        .with_description("Currently active HTTP connections")
        .with_unit("connections")
        .init();

    let request_latency = meter
        .f64_histogram("http.server.request.duration")
        .with_description("HTTP request latency distribution")
        .with_unit("ms")
        .init();

    Ok(AppMetrics {
        request_counter,
        active_connections,
        request_latency,
    })
}

// Example usage in request handling
impl AppMetrics {
    /// Record a completed request
    pub fn record_request(&self, endpoint: &str, status_code: u16, latency_ms: f64) {
        // Increment request counter with labels
        self.request_counter.add(
            1,
            &[
                KeyValue::new("http.route", endpoint.to_string()),
                KeyValue::new("http.status_code", status_code.to_string()),
            ],
        );

        // Record latency in histogram
        self.request_latency.record(
            latency_ms,
            &[KeyValue::new("http.route", endpoint.to_string())],
        );
    }

    /// Track connection count changes
    pub fn connection_opened(&self) {
        self.active_connections.add(1, &[]);
    }

    pub fn connection_closed(&self) {
        self.active_connections.add(-1, &[]);
    }
}
```

---

## Structured Logging with OpenTelemetry

Connect Rust's `tracing` logs to OpenTelemetry for correlated logging. This ensures logs include trace and span IDs automatically.

```rust
// src/logging.rs
// Structured logging with OpenTelemetry correlation

use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{logs::LoggerProvider, runtime, Resource};
use std::time::Duration;
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// Initialize logging with trace correlation
pub fn init_logging_with_traces(
    service_name: &str,
) -> Result<LoggerProvider, Box<dyn std::error::Error>> {
    // Create resource for log attribution
    let resource = Resource::new(vec![
        opentelemetry::KeyValue::new("service.name", service_name.to_string()),
    ]);

    // Configure OTLP log exporter
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint(
            std::env::var("OTLP_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:4317".to_string()),
        )
        .with_timeout(Duration::from_secs(3));

    // Build logger provider
    let logger_provider = opentelemetry_otlp::new_pipeline()
        .logging()
        .with_resource(resource)
        .with_exporter(exporter)
        .install_batch(runtime::Tokio)?;

    Ok(logger_provider)
}

/// Custom JSON log formatter for production
pub fn init_json_logging() {
    // JSON format layer for structured output
    let json_layer = fmt::layer()
        .json()
        .with_span_events(FmtSpan::CLOSE) // Log when spans close
        .with_current_span(true) // Include current span info
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true);

    // Environment filter for log levels
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(json_layer)
        .init();
}
```

---

## Complete Application Example

This example brings together tracing, metrics, and logging in a simple HTTP service.

```rust
// src/main.rs
// Complete OpenTelemetry instrumented application

mod logging;
mod metrics;
mod telemetry;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use metrics::AppMetrics;
use serde::{Deserialize, Serialize};
use std::{sync::Arc, time::Instant};
use tracing::{info, instrument, warn};

// Application state containing metrics
struct AppState {
    metrics: AppMetrics,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize telemetry first
    let _tracer = telemetry::init_tracing("api-service")?;
    let metrics = metrics::init_metrics("api-service")?;

    info!("Starting API service");

    // Create application state
    let state = Arc::new(AppState { metrics });

    // Build router with instrumented handlers
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/orders", post(create_order))
        .route("/api/orders/:id", get(get_order))
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    info!("Listening on 0.0.0.0:3000");

    axum::serve(listener, app).await?;

    // Cleanup
    telemetry::shutdown_tracing();

    Ok(())
}

/// Health check endpoint - minimal instrumentation
async fn health_check() -> StatusCode {
    StatusCode::OK
}

/// Create order endpoint with full instrumentation
#[instrument(skip(state, payload), fields(order.customer_id))]
async fn create_order(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateOrderRequest>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let start = Instant::now();

    // Record customer ID in span
    tracing::Span::current().record("order.customer_id", &payload.customer_id);

    info!(items_count = payload.items.len(), "Creating order");

    // Simulate order processing
    let order_id = format!("ord_{}", uuid::Uuid::new_v4());

    let response = OrderResponse {
        id: order_id.clone(),
        customer_id: payload.customer_id,
        status: "created".to_string(),
    };

    // Record metrics
    let latency = start.elapsed().as_secs_f64() * 1000.0;
    state.metrics.record_request("/api/orders", 201, latency);

    info!(order_id = %order_id, "Order created");

    Ok(Json(response))
}

/// Get order endpoint
#[instrument(skip(state), fields(order.id = %order_id))]
async fn get_order(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(order_id): axum::extract::Path<String>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let start = Instant::now();

    info!("Fetching order");

    // Simulate database lookup
    tokio::time::sleep(std::time::Duration::from_millis(5)).await;

    let response = OrderResponse {
        id: order_id,
        customer_id: "cust_123".to_string(),
        status: "completed".to_string(),
    };

    let latency = start.elapsed().as_secs_f64() * 1000.0;
    state.metrics.record_request("/api/orders/:id", 200, latency);

    Ok(Json(response))
}

// Request/Response types
#[derive(Deserialize)]
struct CreateOrderRequest {
    customer_id: String,
    items: Vec<OrderItem>,
}

#[derive(Deserialize)]
struct OrderItem {
    product_id: String,
    quantity: u32,
}

#[derive(Serialize)]
struct OrderResponse {
    id: String,
    customer_id: String,
    status: String,
}
```

---

## Production Configuration

For production deployments, configure sampling to reduce telemetry volume while maintaining visibility.

```rust
// Production tracer configuration with sampling
use opentelemetry_sdk::trace::{Sampler, TraceIdRatioBased};

// Sample 10% of traces in production
let sampler = Sampler::TraceIdRatioBased(0.1);

// Or use parent-based sampling to respect upstream decisions
let sampler = Sampler::ParentBased(Box::new(TraceIdRatioBased::new(0.1)));
```

Environment variables for configuration:

```bash
# OTLP endpoint (collector or direct to backend)
OTLP_ENDPOINT=https://otlp.oneuptime.com:4317

# Service identification
SERVICE_VERSION=1.2.3
ENVIRONMENT=production

# Log level
RUST_LOG=info,tower_http=debug

# Sampling rate (if using env-based config)
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

---

## Best Practices

1. **Initialize early** - Set up telemetry before any business logic
2. **Use semantic conventions** - Follow OpenTelemetry naming standards
3. **Instrument at boundaries** - Focus on HTTP handlers, database calls, external services
4. **Avoid high-cardinality attributes** - Don't use user IDs or request IDs as metric labels
5. **Graceful shutdown** - Always flush pending telemetry before exit
6. **Sample appropriately** - Use parent-based sampling in production

---

*Ready to centralize your Rust application telemetry? [OneUptime](https://oneuptime.com) provides native OpenTelemetry support with powerful search, visualization, and alerting capabilities.*

**Related Reading:**
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
