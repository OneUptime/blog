# How to Configure Non-Blocking OpenTelemetry Exporters for Actix-web with Tokio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rust, Actix-web, Tokio, Non-Blocking, Async

Description: Learn how to configure asynchronous, non-blocking OpenTelemetry exporters for Actix-web applications to maintain high performance and prevent request latency.

When adding observability to high-throughput Actix-web services, the last thing you want is for telemetry export to slow down your request handlers. This guide shows you how to configure non-blocking exporters that ship telemetry data asynchronously without impacting request latency.

## Understanding the Blocking Problem

By default, some OpenTelemetry exporters can block your application threads while sending data to collectors. This blocking behavior manifests as increased request latency, especially when the collector is slow or network conditions are poor. In the worst case, a failing collector can bring down your entire service.

The solution is to use batch span processors with async exporters that run on separate Tokio tasks. These exporters buffer spans in memory and send them in batches on a background schedule, completely decoupled from request processing.

## Setting Up Async Dependencies

Your `Cargo.toml` should include the Tokio runtime features:

```toml
[dependencies]
actix-web = "4.5"
tokio = { version = "1.35", features = ["full"] }
opentelemetry = { version = "0.22", features = ["trace", "metrics"] }
opentelemetry_sdk = { version = "0.22", features = ["rt-tokio", "rt-tokio-current-thread"] }
opentelemetry-otlp = { version = "0.15", features = ["tokio", "grpc-tonic"] }
tracing = "0.1"
tracing-opentelemetry = "0.23"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-actix-web = "0.7"
```

The `rt-tokio` feature enables the batch span processor to use Tokio's runtime for background tasks.

## Configuring the Batch Span Processor

The batch span processor is your primary tool for non-blocking telemetry:

```rust
use opentelemetry::global;
use opentelemetry_sdk::trace::{self, BatchConfig, RandomIdGenerator, Sampler};
use opentelemetry_sdk::{runtime, Resource};
use opentelemetry::KeyValue;
use std::time::Duration;

fn init_non_blocking_tracer() -> Result<(), Box<dyn std::error::Error>> {
    // Configure the OTLP exporter to use async gRPC
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://localhost:4317")
        .with_timeout(Duration::from_secs(3));

    // Create a batch processor with optimized settings
    let batch_config = BatchConfig::default()
        .with_max_queue_size(4096)           // Buffer up to 4096 spans
        .with_scheduled_delay(Duration::from_secs(5))  // Export every 5 seconds
        .with_max_export_batch_size(512)      // Send up to 512 spans per batch
        .with_max_concurrent_exports(1);      // One export operation at a time

    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .with_trace_config(
            trace::config()
                .with_sampler(Sampler::AlwaysOn)
                .with_id_generator(RandomIdGenerator::default())
                .with_resource(Resource::new(vec![
                    KeyValue::new("service.name", "my-actix-service"),
                    KeyValue::new("service.version", "1.0.0"),
                ]))
        )
        .with_batch_config(batch_config)
        .install_batch(runtime::Tokio)?;

    global::set_tracer_provider(tracer);

    Ok(())
}
```

These settings ensure spans are queued in memory and exported asynchronously, with no blocking of request handlers.

## Optimizing Batch Parameters for Your Workload

Different workloads require different batch configurations. Here's how to tune for various scenarios:

```rust
use opentelemetry_sdk::trace::BatchConfig;
use std::time::Duration;

// High-throughput configuration (thousands of requests per second)
fn high_throughput_config() -> BatchConfig {
    BatchConfig::default()
        .with_max_queue_size(8192)           // Larger buffer for burst traffic
        .with_scheduled_delay(Duration::from_secs(2))  // Export more frequently
        .with_max_export_batch_size(1024)    // Larger batches reduce overhead
        .with_max_concurrent_exports(2)      // Allow parallel exports
}

// Low-latency configuration (minimize data staleness)
fn low_latency_config() -> BatchConfig {
    BatchConfig::default()
        .with_max_queue_size(2048)
        .with_scheduled_delay(Duration::from_millis(500))  // Export every 500ms
        .with_max_export_batch_size(256)
        .with_max_concurrent_exports(1)
}

// Resource-constrained configuration (minimize memory usage)
fn resource_constrained_config() -> BatchConfig {
    BatchConfig::default()
        .with_max_queue_size(1024)           // Smaller buffer
        .with_scheduled_delay(Duration::from_secs(10))  // Less frequent exports
        .with_max_export_batch_size(256)
        .with_max_concurrent_exports(1)
}

// Production-balanced configuration
fn production_config() -> BatchConfig {
    BatchConfig::default()
        .with_max_queue_size(4096)
        .with_scheduled_delay(Duration::from_secs(5))
        .with_max_export_batch_size(512)
        .with_max_concurrent_exports(1)
}
```

Monitor your queue utilization to determine if you need larger buffers or more frequent exports.

## Handling Exporter Failures Gracefully

When exporters fail, you don't want to lose spans or crash your service. Implement proper error handling:

```rust
use opentelemetry_sdk::trace::{SpanProcessor, Tracer};
use tracing::{error, warn};

fn init_resilient_tracer() -> Result<(), Box<dyn std::error::Error>> {
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://localhost:4317")
        .with_timeout(Duration::from_secs(3));

    // Configure retry behavior
    let export_config = opentelemetry_otlp::ExportConfig {
        endpoint: "http://localhost:4317".to_string(),
        timeout: Duration::from_secs(3),
        protocol: opentelemetry_otlp::Protocol::Grpc,
    };

    let batch_config = BatchConfig::default()
        .with_max_queue_size(4096)
        .with_scheduled_delay(Duration::from_secs(5))
        .with_max_export_batch_size(512);

    match opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .with_batch_config(batch_config)
        .install_batch(runtime::Tokio)
    {
        Ok(tracer) => {
            global::set_tracer_provider(tracer);
            Ok(())
        }
        Err(err) => {
            error!("Failed to initialize tracer: {}", err);
            warn!("Service will continue without tracing");
            // Don't crash the service if tracing fails
            Ok(())
        }
    }
}
```

This approach lets your service start even if the collector is unavailable, preventing observability issues from causing outages.

## Implementing Backpressure Handling

When the queue fills up, you need a strategy to handle backpressure:

```rust
use opentelemetry::trace::{Tracer, Status};
use tracing::{info_span, warn};

async fn handler_with_backpressure_awareness() -> actix_web::HttpResponse {
    // Create a span, which will be queued for export
    let span = info_span!("handle_request");
    let _guard = span.enter();

    // Perform request handling
    process_request().await;

    actix_web::HttpResponse::Ok().finish()
}

// Monitor queue metrics to detect backpressure
fn setup_queue_monitoring() {
    use opentelemetry::metrics::{self, MeterProvider};

    let meter = global::meter("actix-service");

    // Create a gauge to track queue size
    let queue_size = meter
        .i64_observable_gauge("span_processor.queue_size")
        .with_description("Current size of span export queue")
        .init();

    // Register callback to report queue size
    // In production, you'd get this from the span processor
    meter.register_callback(&[queue_size.as_any()], move |observer| {
        // Implementation would read actual queue size
        let current_size = get_current_queue_size();
        observer.observe_i64(&queue_size, current_size, &[]);
    });
}

fn get_current_queue_size() -> i64 {
    // In a real implementation, you'd expose this from your span processor
    // For now, this is a placeholder
    0
}
```

Monitor the queue size metric to detect when backpressure occurs and adjust your batch configuration accordingly.

## Configuring Multiple Exporters

Sometimes you need to send telemetry to multiple destinations without blocking:

```rust
use opentelemetry_sdk::trace::{BatchSpanProcessor, SpanProcessor};

fn init_multi_exporter_tracer() -> Result<(), Box<dyn std::error::Error>> {
    // Create first exporter for production collector
    let prod_exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://prod-collector:4317")
        .with_timeout(Duration::from_secs(3))
        .build_span_exporter()?;

    // Create second exporter for dev/debug collector
    let debug_exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://debug-collector:4317")
        .with_timeout(Duration::from_secs(1))
        .build_span_exporter()?;

    // Create batch processors for each exporter
    let prod_processor = BatchSpanProcessor::builder(
        prod_exporter,
        runtime::Tokio
    )
    .with_batch_config(
        BatchConfig::default()
            .with_max_queue_size(4096)
            .with_scheduled_delay(Duration::from_secs(5))
    )
    .build();

    let debug_processor = BatchSpanProcessor::builder(
        debug_exporter,
        runtime::Tokio
    )
    .with_batch_config(
        BatchConfig::default()
            .with_max_queue_size(1024)
            .with_scheduled_delay(Duration::from_secs(2))
    )
    .build();

    // Combine processors
    let tracer_provider = opentelemetry_sdk::trace::TracerProvider::builder()
        .with_span_processor(prod_processor)
        .with_span_processor(debug_processor)
        .with_config(
            trace::config()
                .with_resource(Resource::new(vec![
                    KeyValue::new("service.name", "my-actix-service"),
                ]))
        )
        .build();

    global::set_tracer_provider(tracer_provider);

    Ok(())
}
```

Each processor runs independently, so a slow or failing collector doesn't affect the others.

## Integrating with Actix-web

Wire everything together in your Actix-web application:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, middleware};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize non-blocking tracer
    init_non_blocking_tracer()
        .expect("Failed to initialize tracer");

    // Set up tracing subscriber
    let telemetry = tracing_opentelemetry::layer()
        .with_tracer(global::tracer("actix-web"));

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .with(telemetry)
        .with(tracing_subscriber::fmt::layer())
        .init();

    HttpServer::new(|| {
        App::new()
            .wrap(tracing_actix_web::TracingLogger::default())
            .wrap(middleware::Compress::default())
            .route("/api/users", web::get().to(get_users))
            .route("/api/heavy", web::post().to(heavy_operation))
    })
    .bind(("127.0.0.1", 8080))?
    .workers(4)  // Multiple workers all share the same async exporter
    .run()
    .await?;

    // Flush remaining spans before shutdown
    global::shutdown_tracer_provider();

    Ok(())
}

async fn get_users() -> HttpResponse {
    // This handler completes immediately, even though spans are still queued
    HttpResponse::Ok().json(vec!["user1", "user2", "user3"])
}

async fn heavy_operation() -> HttpResponse {
    // Even expensive operations don't wait for span export
    tokio::time::sleep(Duration::from_millis(100)).await;
    HttpResponse::Ok().finish()
}
```

Request handlers complete immediately after the span is created, with export happening asynchronously in the background.

## Monitoring Exporter Performance

Track key metrics to ensure your async exporters are healthy:

```rust
use opentelemetry::metrics::{self, MeterProvider};

fn setup_exporter_metrics() {
    let meter = global::meter("span_exporter");

    // Track successful exports
    let exports_total = meter
        .u64_counter("exporter.exports.total")
        .with_description("Total number of export attempts")
        .init();

    // Track failed exports
    let export_failures = meter
        .u64_counter("exporter.exports.failed")
        .with_description("Number of failed export attempts")
        .init();

    // Track export latency
    let export_duration = meter
        .f64_histogram("exporter.export.duration")
        .with_description("Time taken to export spans")
        .with_unit("ms")
        .init();

    // Track queue utilization
    let queue_utilization = meter
        .f64_observable_gauge("exporter.queue.utilization")
        .with_description("Percentage of queue capacity used")
        .init();
}
```

Set up alerts when export failures spike or queue utilization stays above 80%, indicating you need to tune your configuration.

## Visualizing the Async Export Flow

Here's how data flows through the non-blocking pipeline:

```mermaid
graph LR
    A[Request Handler] -->|Create Span| B[In-Memory Queue]
    B -->|Batch Every 5s| C[Async Exporter Task]
    C -->|gRPC| D[OpenTelemetry Collector]
    A -->|Return Response| E[Client]

    style A fill:#90EE90
    style B fill:#FFD700
    style C fill:#87CEEB
    style D fill:#DDA0DD
    style E fill:#90EE90
```

The request handler and client response are completely decoupled from the export process, ensuring consistent low latency.

## Testing Non-Blocking Behavior

Verify that your exporters don't block request processing:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    use std::time::Instant;

    #[actix_web::test]
    async fn test_non_blocking_export() {
        init_non_blocking_tracer().unwrap();

        let app = test::init_service(
            App::new()
                .wrap(tracing_actix_web::TracingLogger::default())
                .route("/test", web::get().to(|| async {
                    HttpResponse::Ok().finish()
                }))
        ).await;

        // Make multiple requests and measure latency
        let start = Instant::now();
        for _ in 0..100 {
            let req = test::TestRequest::get().uri("/test").to_request();
            let resp = test::call_service(&app, req).await;
            assert!(resp.status().is_success());
        }
        let elapsed = start.elapsed();

        // Even with 100 requests, latency should be minimal
        // because export happens asynchronously
        assert!(elapsed.as_millis() < 1000, "Requests took too long");
    }
}
```

This test confirms that creating spans doesn't add significant latency to request processing.

With properly configured async exporters, you get comprehensive observability without sacrificing the performance that makes Actix-web attractive in the first place. The key is batching, async I/O, and proper queue management to keep telemetry export completely off the critical path.
