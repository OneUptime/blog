# How to Create Structured JSON Logs with tracing in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Logging, tracing, JSON, Observability

Description: A hands-on guide to implementing structured JSON logging in Rust using the tracing ecosystem, with practical examples for production-ready observability.

---

Plain text logs are fine for development, but they fall apart in production. When you have dozens of services generating thousands of log lines per second, grepping through unstructured text becomes impossible. You need structured logs that machines can parse, filter, and aggregate.

Rust's `tracing` crate, combined with `tracing-subscriber`, gives you a powerful foundation for structured logging. This guide shows you how to set it up properly for JSON output.

## Why tracing Instead of log?

The `log` crate works, but `tracing` does more. Beyond simple log levels, tracing gives you spans (representing operations over time), structured fields, and better integration with async code. It was built for observability from the ground up.

The key difference is that `tracing` captures context. A span wraps an operation and automatically includes timing, nested relationships, and custom fields in every log message within that span.

## Setting Up Your Dependencies

Add these to your `Cargo.toml`:

```toml
[dependencies]
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
```

The `json` feature enables JSON formatting, and `env-filter` lets you control log levels via environment variables.

## Basic JSON Logging Setup

Here's a minimal setup that outputs JSON logs to stdout:

```rust
use tracing::{info, Level};
use tracing_subscriber::fmt::format::FmtSpan;

fn main() {
    // Initialize the subscriber with JSON formatting
    tracing_subscriber::fmt()
        .json()
        .with_max_level(Level::INFO)
        .with_target(true)          // Include the module path
        .with_current_span(true)    // Include the current span
        .with_span_list(true)       // Include the full span hierarchy
        .init();

    info!(user_id = 42, action = "login", "User logged in");
}
```

This produces output like:

```json
{
  "timestamp": "2026-01-25T14:32:01.234567Z",
  "level": "INFO",
  "target": "my_app",
  "message": "User logged in",
  "user_id": 42,
  "action": "login"
}
```

Notice how `user_id` and `action` become top-level fields in the JSON. No string concatenation, no manual formatting.

## Using Spans for Request Context

Spans wrap operations and attach context to all logs within them. This is where tracing really shines:

```rust
use tracing::{info, warn, instrument, span, Level};

#[instrument(fields(request_id = %request_id, user_id))]
async fn handle_request(request_id: String, user_id: Option<i64>) -> Result<(), Error> {
    // This span is now active for all code in this function

    info!("Processing request");

    // The user_id field starts empty, we can fill it later
    if let Some(uid) = user_id {
        tracing::Span::current().record("user_id", uid);
    }

    // Call another function - the span context carries over
    fetch_user_data().await?;

    info!("Request completed");
    Ok(())
}

#[instrument]
async fn fetch_user_data() -> Result<UserData, Error> {
    info!("Fetching user data from database");
    // This log will include the parent span's request_id and user_id

    // Simulate some work
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    Ok(UserData::default())
}
```

Every log message inside `handle_request` and any functions it calls will include the `request_id` automatically. You do not have to pass it around or remember to include it.

## Environment-Based Log Level Control

Production systems need runtime control over log verbosity. Use `EnvFilter` for this:

```rust
use tracing_subscriber::{fmt, EnvFilter};

fn init_logging() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| {
            // Default: info level, but debug for our crate
            EnvFilter::new("info,my_app=debug")
        });

    tracing_subscriber::fmt()
        .json()
        .with_env_filter(filter)
        .with_file(true)       // Include source file
        .with_line_number(true) // Include line number
        .init();
}
```

Now you can control logging at runtime:

```bash
# Show everything
RUST_LOG=trace ./my_app

# Only warnings and errors
RUST_LOG=warn ./my_app

# Debug for specific modules
RUST_LOG=info,my_app::database=debug ./my_app
```

## Customizing JSON Output

The default JSON format works for most cases, but you might need to customize field names or add static fields:

```rust
use tracing_subscriber::fmt::format::JsonFields;
use tracing_subscriber::fmt::time::UtcTime;

fn init_custom_logging() {
    tracing_subscriber::fmt()
        .json()
        // Use a custom timestamp format
        .with_timer(UtcTime::rfc_3339())
        // Flatten the event fields into the root object
        .flatten_event(true)
        .init();
}
```

For more control, you can build a custom layer:

```rust
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

fn init_with_layers() {
    let json_layer = tracing_subscriber::fmt::layer()
        .json()
        .with_current_span(true);

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(json_layer)
        .init();
}
```

## Adding Static Fields for Service Identification

In a microservices environment, you want every log line to identify which service and instance it came from:

```rust
use tracing::subscriber::set_global_default;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::Registry;

fn init_with_service_context() {
    // Create the JSON layer
    let json_layer = tracing_subscriber::fmt::layer()
        .json()
        .with_current_span(true);

    let subscriber = Registry::default()
        .with(EnvFilter::from_default_env())
        .with(json_layer);

    set_global_default(subscriber).expect("Failed to set subscriber");
}

// Then use a root span to add service context
fn main() {
    init_with_service_context();

    // Create a root span with service identification
    let _guard = tracing::span!(
        Level::INFO,
        "service",
        service.name = "payment-api",
        service.version = env!("CARGO_PKG_VERSION"),
        service.instance = std::env::var("HOSTNAME").unwrap_or_default()
    ).entered();

    // All subsequent logs will include these fields
    run_server();
}
```

## Error Logging with Context

When errors occur, you want as much context as possible. Here's a pattern that works well:

```rust
use tracing::{error, instrument};

#[derive(Debug)]
struct OrderError {
    kind: String,
    details: String,
}

#[instrument(skip(order), fields(order_id = %order.id, amount = %order.amount))]
async fn process_order(order: Order) -> Result<(), OrderError> {
    // Validate
    if order.amount <= 0 {
        error!(
            error.kind = "validation",
            error.message = "Invalid order amount",
            "Order validation failed"
        );
        return Err(OrderError {
            kind: "validation".into(),
            details: "Amount must be positive".into(),
        });
    }

    // Process payment
    match charge_payment(&order).await {
        Ok(_) => {
            info!("Payment processed successfully");
            Ok(())
        }
        Err(e) => {
            error!(
                error.kind = "payment",
                error.message = %e,
                payment_provider = "stripe",
                "Payment processing failed"
            );
            Err(OrderError {
                kind: "payment".into(),
                details: e.to_string(),
            })
        }
    }
}
```

The error logs will include the span's `order_id` and `amount`, plus the error-specific fields. Your log aggregator can then filter by `error.kind` or search for specific order IDs.

## Async Runtime Considerations

When using `tokio`, spans need special handling to work correctly across await points:

```rust
use tracing::Instrument;

async fn parallel_operations() {
    let span = tracing::span!(Level::INFO, "parallel_work", batch_id = 123);

    // Use .instrument() to attach span to futures
    let handle1 = tokio::spawn(
        async {
            info!("Worker 1 starting");
            do_work().await;
            info!("Worker 1 done");
        }
        .instrument(span.clone())
    );

    let handle2 = tokio::spawn(
        async {
            info!("Worker 2 starting");
            do_work().await;
            info!("Worker 2 done");
        }
        .instrument(span.clone())
    );

    let _ = tokio::join!(handle1, handle2);
}
```

The `.instrument()` method ensures the span context follows the future across thread boundaries.

## Writing to Files Instead of Stdout

For production systems that use file-based log collection:

```rust
use std::fs::File;
use tracing_subscriber::fmt::writer::MakeWriterExt;

fn init_file_logging() {
    let log_file = File::create("app.log").expect("Failed to create log file");

    tracing_subscriber::fmt()
        .json()
        .with_writer(log_file)
        .with_ansi(false)  // Disable colors for file output
        .init();
}
```

For log rotation, consider using `tracing-appender`:

```rust
use tracing_appender::rolling::{RollingFileAppender, Rotation};

fn init_rolling_logs() {
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        "/var/log/my_app",
        "app.log"
    );

    tracing_subscriber::fmt()
        .json()
        .with_writer(file_appender)
        .init();
}
```

## Performance Considerations

JSON serialization has overhead. A few tips to keep logging fast:

1. Use `#[instrument(skip(large_field))]` to avoid serializing large structs
2. Set appropriate log levels in production - trace and debug logs add up
3. Consider sampling high-frequency events
4. Use `tracing::enabled!()` to check if a level is active before expensive field computation

```rust
use tracing::{debug, enabled, Level};

fn expensive_operation() {
    // Only compute expensive_stats if debug logging is enabled
    if enabled!(Level::DEBUG) {
        let stats = compute_expensive_stats();
        debug!(stats = ?stats, "Operation stats");
    }
}
```

## Wrapping Up

Structured JSON logging with `tracing` transforms your logs from grep-unfriendly text into queryable data. The span system automatically propagates context, so you spend less time manually threading request IDs through your code.

Start with the basic setup, add environment-based filtering, and gradually introduce spans as you identify the operations that matter most for debugging. Your future self, debugging a production issue at 2 AM, will thank you.
