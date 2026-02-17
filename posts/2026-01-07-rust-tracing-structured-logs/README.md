# How to Structure Logs Properly in Rust with tracing and OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Logging, Structured Logging, tracing, OpenTelemetry, Observability, JSON

Description: Learn how to implement structured logging in Rust using the tracing ecosystem with OpenTelemetry integration. This guide covers JSON output, trace correlation, context propagation, and production best practices.

---

> Logs are your application's journal. When structured properly and correlated with traces, they transform from a wall of text into a queryable, debuggable record of every operation. This guide shows you how to implement production-grade structured logging in Rust.

The `tracing` crate has become Rust's standard for instrumentation, providing both logging and span-based tracing in a unified API. Combined with OpenTelemetry, you get logs that automatically include trace context for end-to-end debugging.

---

## Why Structured Logging?

Traditional logging produces output like this:

```
2026-01-07 10:15:23 ERROR User login failed for user@example.com
2026-01-07 10:15:24 INFO Order processed
```

Structured logging produces:

```json
{"timestamp":"2026-01-07T10:15:23Z","level":"error","message":"User login failed","user.email":"user@example.com","error.type":"invalid_credentials","trace_id":"abc123","span_id":"def456"}
```

Benefits of structured logging:
- **Queryable** - Filter by any field in your log aggregator
- **Correlated** - Trace IDs connect logs to distributed traces
- **Consistent** - Machine-parseable format across all services
- **Contextual** - Automatic inclusion of span context

---

## Setting Up the tracing Ecosystem

Add the required dependencies to your `Cargo.toml`.

```toml
[dependencies]
# Core tracing API
tracing = "0.1"

# Subscriber for collecting and processing spans/events
tracing-subscriber = { version = "0.3", features = [
    "env-filter",  # RUST_LOG environment variable support
    "json",        # JSON output format
    "fmt",         # Formatted output
] }

# OpenTelemetry integration
tracing-opentelemetry = "0.25"
opentelemetry = "0.24"
opentelemetry_sdk = { version = "0.24", features = ["rt-tokio"] }
opentelemetry-otlp = "0.17"

# Async runtime
tokio = { version = "1", features = ["full"] }

# Serialization for custom types
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

---

## Basic Structured Logging Setup

This configuration sets up tracing with JSON output and environment-based filtering.

```rust
// src/logging.rs
// Configure structured logging with tracing-subscriber

use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// Initialize structured logging with JSON output
/// Call this once at application startup
pub fn init_logging() {
    // Create an environment filter from RUST_LOG
    // Default to "info" if not set
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // JSON formatting layer for structured output
    let json_layer = fmt::layer()
        .json()                           // Output as JSON
        .with_current_span(true)          // Include current span info
        .with_span_list(true)             // Include full span hierarchy
        .with_thread_ids(true)            // Include thread ID
        .with_thread_names(true)          // Include thread name
        .with_file(true)                  // Include source file
        .with_line_number(true)           // Include line number
        .with_target(true)                // Include log target (module path)
        .with_span_events(FmtSpan::CLOSE) // Log when spans close
        .flatten_event(true);             // Flatten event fields to top level

    // Initialize the global subscriber
    tracing_subscriber::registry()
        .with(env_filter)
        .with(json_layer)
        .init();
}

/// Initialize with both JSON (for production) and pretty (for development) output
pub fn init_logging_with_env_detection() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // Check if we're in development mode
    let is_development = std::env::var("ENVIRONMENT")
        .map(|e| e == "development")
        .unwrap_or(true);

    if is_development {
        // Pretty output for development
        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt::layer().pretty())
            .init();
    } else {
        // JSON output for production
        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt::layer().json().flatten_event(true))
            .init();
    }
}
```

---

## Using Structured Logging

The `tracing` crate provides macros for different log levels with structured field support.

```rust
// src/main.rs
// Using structured logging throughout your application

use tracing::{debug, error, info, info_span, instrument, warn, Span};

mod logging;

#[tokio::main]
async fn main() {
    // Initialize logging first
    logging::init_logging();

    info!("Application starting");

    // Log with structured fields
    let config = AppConfig {
        port: 3000,
        environment: "production".to_string(),
    };

    info!(
        port = config.port,
        environment = %config.environment,
        "Server configuration loaded"
    );

    // Process a sample request
    if let Err(e) = process_order("ord_12345", "cust_789").await {
        error!(error = %e, "Failed to process order");
    }
}

/// Process an order with full instrumentation
/// The #[instrument] macro automatically creates a span and logs function entry/exit
#[instrument(
    name = "process_order",
    skip(order_id, customer_id),  // Don't log arguments automatically
    fields(
        order.id = %order_id,      // Add order_id as span field
        customer.id = %customer_id, // Add customer_id as span field
        order.status = tracing::field::Empty  // Placeholder for later
    )
)]
async fn process_order(order_id: &str, customer_id: &str) -> Result<(), OrderError> {
    info!("Starting order processing");

    // Validate the order
    validate_order(order_id).await?;

    // Update span with new information
    Span::current().record("order.status", "validated");

    // Process payment
    let payment_result = process_payment(order_id, 99.99).await?;

    info!(
        transaction_id = %payment_result.transaction_id,
        amount = payment_result.amount,
        "Payment processed successfully"
    );

    // Update final status
    Span::current().record("order.status", "completed");

    info!("Order processing completed");
    Ok(())
}

#[instrument]
async fn validate_order(order_id: &str) -> Result<(), OrderError> {
    // Simulate validation
    debug!("Validating order data");

    if order_id.is_empty() {
        warn!("Empty order ID provided");
        return Err(OrderError::InvalidOrderId);
    }

    debug!("Order validation passed");
    Ok(())
}

#[instrument(fields(payment.amount = %amount))]
async fn process_payment(order_id: &str, amount: f64) -> Result<PaymentResult, OrderError> {
    debug!("Initiating payment processing");

    // Simulate payment gateway call
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    info!("Payment gateway responded");

    Ok(PaymentResult {
        transaction_id: "txn_abc123".to_string(),
        amount,
    })
}

// Domain types
struct AppConfig {
    port: u16,
    environment: String,
}

struct PaymentResult {
    transaction_id: String,
    amount: f64,
}

#[derive(Debug)]
enum OrderError {
    InvalidOrderId,
    PaymentFailed(String),
}

impl std::fmt::Display for OrderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidOrderId => write!(f, "Invalid order ID"),
            Self::PaymentFailed(msg) => write!(f, "Payment failed: {}", msg),
        }
    }
}
```

---

## OpenTelemetry Integration

Connect tracing to OpenTelemetry for trace correlation and export to observability backends.

```rust
// src/telemetry.rs
// OpenTelemetry integration with tracing

use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{
    runtime,
    trace::{BatchConfig, RandomIdGenerator, Sampler},
    Resource,
};
use opentelemetry_semantic_conventions::resource::{
    DEPLOYMENT_ENVIRONMENT, SERVICE_NAME, SERVICE_VERSION,
};
use std::time::Duration;
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// Initialize tracing with OpenTelemetry integration
/// This enables trace correlation in logs
pub fn init_tracing_with_otel(service_name: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Create resource attributes
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

    // Configure OTLP exporter
    let otlp_exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint(
            std::env::var("OTLP_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:4317".to_string()),
        )
        .with_timeout(Duration::from_secs(3));

    // Build tracer provider
    let tracer_provider = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(otlp_exporter)
        .with_trace_config(
            opentelemetry_sdk::trace::Config::default()
                .with_sampler(Sampler::AlwaysOn)
                .with_id_generator(RandomIdGenerator::default())
                .with_resource(resource),
        )
        .with_batch_config(BatchConfig::default())
        .install_batch(runtime::Tokio)?;

    let tracer = tracer_provider.tracer(service_name);

    // Create OpenTelemetry layer for tracing
    let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    // Create JSON formatting layer
    let json_layer = fmt::layer()
        .json()
        .with_current_span(true)
        .with_span_list(false)
        .flatten_event(true)
        .with_span_events(FmtSpan::CLOSE);

    // Environment filter
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // Initialize subscriber with all layers
    tracing_subscriber::registry()
        .with(env_filter)
        .with(otel_layer)
        .with(json_layer)
        .init();

    Ok(())
}

/// Shutdown OpenTelemetry, flushing pending spans
pub fn shutdown_otel() {
    opentelemetry::global::shutdown_tracer_provider();
}
```

---

## Custom JSON Format with Trace IDs

For cases where you need custom JSON formatting with explicit trace ID inclusion:

```rust
// src/custom_format.rs
// Custom JSON formatter with trace context

use serde::Serialize;
use std::io;
use tracing::{Event, Subscriber};
use tracing_subscriber::{
    fmt::{
        format::{self, FormatEvent, FormatFields},
        FmtContext, FormattedFields,
    },
    registry::LookupSpan,
};

/// Custom JSON log format with explicit trace context
#[derive(Debug)]
pub struct CustomJsonFormat {
    service_name: String,
}

impl CustomJsonFormat {
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
        }
    }
}

#[derive(Serialize)]
struct LogRecord<'a> {
    timestamp: String,
    level: &'a str,
    message: String,
    service: &'a str,
    target: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    trace_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    span_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    span_name: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    file: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    line: Option<u32>,
    #[serde(flatten)]
    fields: serde_json::Value,
}

impl<Sub, N> FormatEvent<Sub, N> for CustomJsonFormat
where
    Sub: Subscriber + for<'a> LookupSpan<'a>,
    N: for<'a> FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        ctx: &FmtContext<'_, Sub, N>,
        mut writer: format::Writer<'_>,
        event: &Event<'_>,
    ) -> std::fmt::Result {
        // Get timestamp
        let timestamp = chrono::Utc::now().to_rfc3339();

        // Extract event fields
        let mut visitor = JsonVisitor::default();
        event.record(&mut visitor);

        // Get trace context from OpenTelemetry
        let (trace_id, span_id) = get_otel_trace_context();

        // Get current span info
        let (span_name, span_fields) = ctx.lookup_current().map(|span| {
            let name = span.name();
            let extensions = span.extensions();
            let fields = extensions
                .get::<FormattedFields<N>>()
                .map(|f| f.fields.as_str())
                .unwrap_or("");
            (Some(name), Some(fields))
        }).unwrap_or((None, None));

        // Build log record
        let metadata = event.metadata();
        let record = LogRecord {
            timestamp,
            level: metadata.level().as_str(),
            message: visitor.message.unwrap_or_default(),
            service: &self.service_name,
            target: metadata.target(),
            trace_id,
            span_id,
            span_name,
            file: metadata.file(),
            line: metadata.line(),
            fields: visitor.fields,
        };

        // Serialize and write
        let json = serde_json::to_string(&record).map_err(|_| std::fmt::Error)?;
        writeln!(writer, "{}", json)
    }
}

/// Extract OpenTelemetry trace context
fn get_otel_trace_context() -> (Option<String>, Option<String>) {
    use opentelemetry::trace::TraceContextExt;

    let context = opentelemetry::Context::current();
    let span = context.span();
    let span_context = span.span_context();

    if span_context.is_valid() {
        (
            Some(format!("{:032x}", span_context.trace_id())),
            Some(format!("{:016x}", span_context.span_id())),
        )
    } else {
        (None, None)
    }
}

/// Visitor to extract event fields
#[derive(Default)]
struct JsonVisitor {
    message: Option<String>,
    fields: serde_json::Value,
}

impl tracing::field::Visit for JsonVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = Some(format!("{:?}", value));
        } else {
            if let serde_json::Value::Object(ref mut map) = self.fields {
                map.insert(
                    field.name().to_string(),
                    serde_json::Value::String(format!("{:?}", value)),
                );
            }
        }
    }

    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.message = Some(value.to_string());
        } else {
            if let serde_json::Value::Object(ref mut map) = self.fields {
                map.insert(
                    field.name().to_string(),
                    serde_json::Value::String(value.to_string()),
                );
            }
        }
    }

    fn record_i64(&mut self, field: &tracing::field::Field, value: i64) {
        if let serde_json::Value::Object(ref mut map) = self.fields {
            map.insert(
                field.name().to_string(),
                serde_json::Value::Number(value.into()),
            );
        }
    }

    fn record_u64(&mut self, field: &tracing::field::Field, value: u64) {
        if let serde_json::Value::Object(ref mut map) = self.fields {
            map.insert(
                field.name().to_string(),
                serde_json::Value::Number(value.into()),
            );
        }
    }

    fn record_bool(&mut self, field: &tracing::field::Field, value: bool) {
        if let serde_json::Value::Object(ref mut map) = self.fields {
            map.insert(
                field.name().to_string(),
                serde_json::Value::Bool(value),
            );
        }
    }
}

impl Default for serde_json::Value {
    fn default() -> Self {
        serde_json::Value::Object(serde_json::Map::new())
    }
}
```

---

## Log Levels and When to Use Them

```rust
// src/log_levels.rs
// Demonstration of appropriate log level usage

use tracing::{debug, error, info, trace, warn};

/// TRACE: Very detailed debugging information
/// Use for: Function entry/exit, loop iterations, verbose diagnostics
/// Production: Usually disabled
fn trace_example() {
    trace!("Entering function");
    trace!(iteration = 1, "Processing item");
}

/// DEBUG: Detailed information useful during development
/// Use for: Variable values, decision branches, internal state
/// Production: Usually disabled
fn debug_example(user_id: &str) {
    debug!(user_id, "Looking up user in cache");
    debug!(cache_hit = true, "User found in cache");
}

/// INFO: General operational events
/// Use for: Request handling, business events, startup/shutdown
/// Production: Enabled
fn info_example(order_id: &str, total: f64) {
    info!("Service started successfully");
    info!(order_id, total, "Order created");
}

/// WARN: Unexpected situations that aren't errors
/// Use for: Deprecations, recoverable errors, approaching limits
/// Production: Enabled, may trigger alerts
fn warn_example(retry_count: u32, max_retries: u32) {
    warn!(
        retry_count,
        max_retries,
        "Retrying failed operation"
    );
    warn!("Configuration missing, using defaults");
}

/// ERROR: Failures that prevent operations from completing
/// Use for: Exceptions, failed validations, service unavailable
/// Production: Enabled, should trigger alerts
fn error_example(user_id: &str, error: &str) {
    error!(user_id, error, "Failed to process payment");
    error!(
        endpoint = "/api/orders",
        status_code = 503,
        "Upstream service unavailable"
    );
}
```

---

## Sensitive Data Filtering

Prevent sensitive data from appearing in logs.

```rust
// src/sensitive.rs
// Handling sensitive data in logs

use tracing::info;

/// Wrapper type that redacts value in Display/Debug
pub struct Redacted<T>(pub T);

impl<T> std::fmt::Display for Redacted<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl<T> std::fmt::Debug for Redacted<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[REDACTED]")
    }
}

/// Wrapper that shows only last 4 characters
pub struct Masked(pub String);

impl std::fmt::Display for Masked {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.0.len() > 4 {
            write!(f, "****{}", &self.0[self.0.len()-4..])
        } else {
            write!(f, "****")
        }
    }
}

// Usage
fn log_payment(card_number: &str, amount: f64) {
    let masked_card = Masked(card_number.to_string());

    info!(
        card = %masked_card,  // Shows: ****1234
        amount,
        "Processing payment"
    );
}

fn log_user_creation(email: &str, password: &str) {
    let redacted_password = Redacted(password);

    info!(
        email,
        password = %redacted_password,  // Shows: [REDACTED]
        "Creating user account"
    );
}

/// Email masking - shows domain only
pub struct MaskedEmail(pub String);

impl std::fmt::Display for MaskedEmail {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if let Some(at_pos) = self.0.find('@') {
            write!(f, "****{}", &self.0[at_pos..])
        } else {
            write!(f, "[INVALID_EMAIL]")
        }
    }
}
```

---

## Async Context Preservation

Ensure logging context is preserved across async boundaries.

```rust
// src/async_context.rs
// Preserving context in async code

use tracing::{info, info_span, Instrument};

/// Spawn a task with preserved tracing context
async fn spawn_with_context() {
    let span = info_span!("parent_operation", request_id = "req_123");

    // Use .instrument() to attach span to future
    let handle = tokio::spawn(
        async {
            info!("Running in spawned task");
            // This log will include parent span context
            do_work().await;
        }
        .instrument(span.clone()),
    );

    handle.await.unwrap();
}

/// Alternative: Enter span explicitly
async fn explicit_span_entry() {
    let span = info_span!("explicit_span");
    let _guard = span.enter();

    // All logs in this scope include the span
    info!("Inside explicit span");
}

#[tracing::instrument]
async fn do_work() {
    info!("Doing work");
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    info!("Work completed");
}
```

---

## Example Output

With JSON logging configured, your output looks like:

```json
{"timestamp":"2026-01-07T10:15:23.456789Z","level":"INFO","message":"Application starting","target":"myapp","service":"order-service"}
{"timestamp":"2026-01-07T10:15:23.457123Z","level":"INFO","message":"Server configuration loaded","target":"myapp","port":3000,"environment":"production","service":"order-service"}
{"timestamp":"2026-01-07T10:15:23.458000Z","level":"INFO","message":"Starting order processing","target":"myapp::orders","trace_id":"abc123def456...","span_id":"789012...","order.id":"ord_12345","customer.id":"cust_789","service":"order-service"}
{"timestamp":"2026-01-07T10:15:23.460000Z","level":"DEBUG","message":"Validating order data","target":"myapp::orders","trace_id":"abc123def456...","span_id":"345678...","service":"order-service"}
{"timestamp":"2026-01-07T10:15:23.510000Z","level":"INFO","message":"Payment processed successfully","target":"myapp::orders","trace_id":"abc123def456...","span_id":"789012...","transaction_id":"txn_abc123","amount":99.99,"service":"order-service"}
```

---

## Best Practices Summary

1. **Initialize early** - Set up logging before any business logic
2. **Use structured fields** - Never concatenate values into message strings
3. **Include trace context** - Enable OpenTelemetry integration for correlation
4. **Filter sensitive data** - Use wrapper types to redact PII
5. **Choose levels wisely** - TRACE/DEBUG for development, INFO+ for production
6. **Preserve async context** - Use `.instrument()` with spawned tasks
7. **Add request IDs** - Include correlation IDs in all request-scoped logs

---

*Ready to centralize your Rust application logs? [OneUptime](https://oneuptime.com) provides native OpenTelemetry support with powerful log search and trace correlation.*

**Related Reading:**
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [How to Instrument Rust Applications with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-07-rust-opentelemetry-instrumentation/view)
