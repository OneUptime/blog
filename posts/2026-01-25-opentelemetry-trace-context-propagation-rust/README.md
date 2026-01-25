# How to Propagate OpenTelemetry Trace Context in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, OpenTelemetry, Tracing, Context Propagation, Observability

Description: Learn how to propagate trace context across service boundaries in Rust applications using OpenTelemetry, with practical examples for HTTP clients, async tasks, and message queues.

---

Distributed tracing only works when context flows seamlessly between services. Without proper propagation, your traces become disconnected fragments rather than end-to-end stories. In Rust, the combination of strict ownership rules and async runtimes makes context propagation slightly trickier than in garbage-collected languages, but the patterns are clean once you understand them.

This guide walks through the practical techniques for propagating OpenTelemetry trace context in Rust applications - from basic HTTP propagation to async tasks and message queues.

---

## Why Context Propagation Matters

When Service A calls Service B, you need both spans to appear in the same trace. This requires:

1. Extracting the current span context from the active trace
2. Injecting that context into outgoing requests (HTTP headers, message metadata)
3. Extracting context from incoming requests on the receiving side
4. Creating child spans that link back to the parent

Skip any step, and your traces become islands.

---

## Setting Up OpenTelemetry in Rust

First, add the necessary dependencies to your `Cargo.toml`:

```toml
[dependencies]
opentelemetry = "0.21"
opentelemetry_sdk = { version = "0.21", features = ["rt-tokio"] }
opentelemetry-otlp = { version = "0.14", features = ["tonic"] }
opentelemetry-http = "0.10"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-opentelemetry = "0.22"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
```

Initialize the tracer provider early in your application:

```rust
use opentelemetry::global;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{
    runtime,
    trace::{Config, TracerProvider},
    Resource,
};
use opentelemetry::KeyValue;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn init_tracer() -> TracerProvider {
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://localhost:4317");

    let tracer_provider = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .with_trace_config(
            Config::default().with_resource(Resource::new(vec![
                KeyValue::new("service.name", "my-rust-service"),
                KeyValue::new("service.version", "1.0.0"),
            ])),
        )
        .install_batch(runtime::Tokio)
        .expect("Failed to initialize tracer");

    // Set global tracer provider
    global::set_tracer_provider(tracer_provider.clone());

    // Set up tracing-subscriber with OpenTelemetry layer
    let telemetry_layer = tracing_opentelemetry::layer()
        .with_tracer(tracer_provider.tracer("my-rust-service"));

    tracing_subscriber::registry()
        .with(telemetry_layer)
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracer_provider
}
```

---

## HTTP Context Propagation with Reqwest

The most common propagation scenario is HTTP calls between services. Here's how to inject context into outgoing requests:

```rust
use opentelemetry::global;
use opentelemetry::propagation::Injector;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use tracing::{instrument, Span};
use tracing_opentelemetry::OpenTelemetrySpanExt;

// Custom injector for reqwest HeaderMap
struct HeaderInjector<'a>(&'a mut HeaderMap);

impl<'a> Injector for HeaderInjector<'a> {
    fn set(&mut self, key: &str, value: String) {
        if let Ok(header_name) = HeaderName::from_bytes(key.as_bytes()) {
            if let Ok(header_value) = HeaderValue::from_str(&value) {
                self.0.insert(header_name, header_value);
            }
        }
    }
}

#[instrument(name = "call_downstream_service")]
async fn call_downstream(client: &reqwest::Client, url: &str) -> Result<String, reqwest::Error> {
    let mut headers = HeaderMap::new();

    // Get current span context and inject into headers
    let cx = Span::current().context();
    global::get_text_map_propagator(|propagator| {
        propagator.inject_context(&cx, &mut HeaderInjector(&mut headers));
    });

    let response = client
        .get(url)
        .headers(headers)
        .send()
        .await?
        .text()
        .await?;

    Ok(response)
}
```

On the receiving side, extract the context from incoming headers:

```rust
use opentelemetry::propagation::Extractor;
use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use tracing_opentelemetry::OpenTelemetrySpanExt;

// Custom extractor for HTTP headers
struct HeaderExtractor<'a>(&'a http::HeaderMap);

impl<'a> Extractor for HeaderExtractor<'a> {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|v| v.to_str().ok())
    }

    fn keys(&self) -> Vec<&str> {
        self.0.keys().map(|k| k.as_str()).collect()
    }
}

// Axum middleware to extract trace context
pub async fn trace_context_middleware(
    request: Request,
    next: Next,
) -> Response {
    let parent_cx = global::get_text_map_propagator(|propagator| {
        propagator.extract(&HeaderExtractor(request.headers()))
    });

    // Set parent context on current span
    Span::current().set_parent(parent_cx);

    next.run(request).await
}
```

---

## Propagating Context Across Async Tasks

Rust's async model requires explicit context handling when spawning tasks. The context does not automatically flow into spawned futures.

```rust
use opentelemetry::Context;
use tracing::{instrument, Span};
use tracing_opentelemetry::OpenTelemetrySpanExt;

#[instrument(name = "process_order")]
async fn process_order(order_id: &str) {
    // Capture context before spawning
    let cx = Span::current().context();

    // Spawn background task with captured context
    let order_id = order_id.to_string();
    tokio::spawn(async move {
        // Attach parent context to this task
        let _guard = cx.attach();

        // Now any spans created here will be children of process_order
        send_notification(&order_id).await;
    });

    // Continue with main processing
    validate_inventory(order_id).await;
}

#[instrument(name = "send_notification")]
async fn send_notification(order_id: &str) {
    // This span will correctly appear as a child of process_order
    tracing::info!(order_id, "Sending order notification");
    // ... notification logic
}
```

For more control, create a wrapper that preserves context:

```rust
use std::future::Future;
use opentelemetry::Context;

// Wrapper to run futures with preserved context
pub fn with_context<F>(cx: Context, f: F) -> impl Future<Output = F::Output>
where
    F: Future,
{
    async move {
        let _guard = cx.attach();
        f.await
    }
}

// Usage
async fn dispatch_work() {
    let cx = Context::current();

    tokio::spawn(with_context(cx.clone(), async {
        // Work with preserved context
        do_work().await;
    }));
}
```

---

## Message Queue Propagation

For message queues like Kafka or RabbitMQ, inject context into message headers:

```rust
use opentelemetry::global;
use opentelemetry::propagation::Injector;
use std::collections::HashMap;
use tracing::Span;
use tracing_opentelemetry::OpenTelemetrySpanExt;

// Injector for message headers
struct MessageHeaderInjector<'a>(&'a mut HashMap<String, String>);

impl<'a> Injector for MessageHeaderInjector<'a> {
    fn set(&mut self, key: &str, value: String) {
        self.0.insert(key.to_string(), value);
    }
}

#[tracing::instrument(name = "publish_event")]
async fn publish_event(payload: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut headers: HashMap<String, String> = HashMap::new();

    // Inject current trace context
    let cx = Span::current().context();
    global::get_text_map_propagator(|propagator| {
        propagator.inject_context(&cx, &mut MessageHeaderInjector(&mut headers));
    });

    // Now headers contains traceparent and tracestate
    // Send message with these headers to your queue
    tracing::info!(?headers, "Publishing event with trace context");

    // kafka_producer.send(payload, headers).await?;
    Ok(())
}
```

On the consumer side:

```rust
use opentelemetry::propagation::Extractor;

struct MessageHeaderExtractor<'a>(&'a HashMap<String, String>);

impl<'a> Extractor for MessageHeaderExtractor<'a> {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).map(|s| s.as_str())
    }

    fn keys(&self) -> Vec<&str> {
        self.0.keys().map(|s| s.as_str()).collect()
    }
}

#[tracing::instrument(name = "consume_event", skip(headers, payload))]
async fn consume_event(headers: &HashMap<String, String>, payload: &str) {
    // Extract parent context from message headers
    let parent_cx = global::get_text_map_propagator(|propagator| {
        propagator.extract(&MessageHeaderExtractor(headers))
    });

    // Set as parent of current span
    Span::current().set_parent(parent_cx);

    // Process the message - this span is now connected to the publisher's trace
    tracing::info!(payload, "Processing consumed event");
}
```

---

## Context Propagation with Tower Middleware

If you're using Tower (common with Axum, Tonic), create reusable middleware:

```rust
use axum::{
    body::Body,
    http::Request,
    middleware::{self, Next},
    response::Response,
    Router,
};
use opentelemetry::global;
use tracing::Span;
use tracing_opentelemetry::OpenTelemetrySpanExt;

async fn propagate_trace_context(
    request: Request<Body>,
    next: Next,
) -> Response {
    // Extract context from incoming request
    let parent_cx = global::get_text_map_propagator(|propagator| {
        propagator.extract(&HeaderExtractor(request.headers()))
    });

    // Create a new span with the extracted parent
    let span = tracing::info_span!(
        "http_request",
        method = %request.method(),
        uri = %request.uri(),
    );
    span.set_parent(parent_cx);

    // Enter the span for the duration of the request
    let _enter = span.enter();

    next.run(request).await
}

// Apply to router
fn create_router() -> Router {
    Router::new()
        .route("/api/orders", axum::routing::get(handle_orders))
        .layer(middleware::from_fn(propagate_trace_context))
}
```

---

## Common Pitfalls and Solutions

### 1. Context Lost in Spawned Tasks

The context does not automatically propagate into `tokio::spawn`. Always capture and reattach:

```rust
// Wrong - context is lost
tokio::spawn(async {
    do_work().await; // This span has no parent
});

// Correct - context is preserved
let cx = Context::current();
tokio::spawn(async move {
    let _guard = cx.attach();
    do_work().await; // Properly connected to parent
});
```

### 2. Missing Propagator Registration

Make sure you register the W3C propagator at startup:

```rust
use opentelemetry::global;
use opentelemetry_sdk::propagation::TraceContextPropagator;

fn main() {
    // Register W3C TraceContext propagator
    global::set_text_map_propagator(TraceContextPropagator::new());

    // ... rest of initialization
}
```

### 3. Header Case Sensitivity

HTTP headers are case-insensitive, but your extractor implementation might not handle this. The W3C standard uses lowercase `traceparent` and `tracestate`, so ensure your extraction handles both cases.

---

## Testing Context Propagation

Verify propagation works by checking trace IDs match across services:

```rust
use opentelemetry::trace::TraceContextExt;

#[instrument]
async fn debug_context() {
    let cx = Span::current().context();
    let span_ref = cx.span();
    let span_context = span_ref.span_context();

    tracing::info!(
        trace_id = %span_context.trace_id(),
        span_id = %span_context.span_id(),
        "Current trace context"
    );
}
```

When both services log the same `trace_id`, propagation is working correctly.

---

## Summary

Context propagation in Rust requires explicit handling at three boundaries:

1. **HTTP calls**: Inject into outgoing headers, extract from incoming headers
2. **Async tasks**: Capture context before spawning, attach inside the spawned future
3. **Message queues**: Inject into message metadata, extract when consuming

The patterns are straightforward once established. The key insight is that Rust won't implicitly carry context across boundaries - you need to be explicit about what context flows where.

Build these patterns into your HTTP clients, message producers, and task spawners early. Once the plumbing is in place, distributed tracing just works.

---

**Related Reading:**

- [What are Traces and Spans in OpenTelemetry: A Practical Guide](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to name spans in OpenTelemetry?](https://oneuptime.com/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
