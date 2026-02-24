# How to Configure Istio for Rust Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rust, Kubernetes, Service Mesh, Actix

Description: Guide to configuring Istio for Rust web applications built with frameworks like Actix Web or Axum, covering health checks, tracing, and deployment.

---

Rust applications are gaining popularity in Kubernetes environments, especially for performance-critical services. They produce tiny binaries, use minimal memory, and start almost instantly. Running Rust apps in an Istio mesh is straightforward, but there are framework-specific details worth knowing about. This guide covers the setup for Rust services using popular frameworks like Actix Web and Axum.

## Basic Deployment

Rust apps compile to a single static binary, making the Docker image very small:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pricing-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pricing-service
      version: v1
  template:
    metadata:
      labels:
        app: pricing-service
        version: v1
    spec:
      containers:
      - name: pricing-service
        image: myregistry/pricing-service:1.0.0
        ports:
        - name: http-api
          containerPort: 8080
        resources:
          requests:
            cpu: 50m
            memory: 16Mi
          limits:
            cpu: 500m
            memory: 64Mi
```

Those resource numbers are not a typo. A typical Rust HTTP service uses 5-15MB of memory at idle. It is one of the most efficient runtimes you can run in Kubernetes. The Istio sidecar will actually use several times more resources than the application itself.

## Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: pricing-service
  namespace: production
spec:
  selector:
    app: pricing-service
  ports:
  - name: http-api
    port: 8080
    targetPort: http-api
```

## Health Checks with Actix Web

```rust
use actix_web::{web, App, HttpServer, HttpResponse};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

struct AppState {
    ready: AtomicBool,
}

async fn liveness() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status": "alive"}))
}

async fn readiness(data: web::Data<Arc<AppState>>) -> HttpResponse {
    if data.ready.load(Ordering::Relaxed) {
        HttpResponse::Ok().json(serde_json::json!({"status": "ready"}))
    } else {
        HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({"status": "not ready"}))
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let state = Arc::new(AppState {
        ready: AtomicBool::new(false),
    });

    // Initialize dependencies
    initialize_database().await.expect("DB init failed");
    state.ready.store(true, Ordering::Relaxed);

    let state_clone = state.clone();
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(state_clone.clone()))
            .route("/healthz", web::get().to(liveness))
            .route("/ready", web::get().to(readiness))
            .route("/api/v1/pricing", web::get().to(get_pricing))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

## Health Checks with Axum

```rust
use axum::{
    routing::get,
    Router, Json,
    extract::State,
    http::StatusCode,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    ready: Arc<AtomicBool>,
}

async fn liveness() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status": "alive"}))
}

async fn readiness(State(state): State<AppState>) -> (StatusCode, Json<serde_json::Value>) {
    if state.ready.load(Ordering::Relaxed) {
        (StatusCode::OK, Json(serde_json::json!({"status": "ready"})))
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({"status": "not ready"})))
    }
}

#[tokio::main]
async fn main() {
    let state = AppState {
        ready: Arc::new(AtomicBool::new(false)),
    };

    // Initialize
    init_db().await.expect("DB init failed");
    state.ready.store(true, Ordering::Relaxed);

    let app = Router::new()
        .route("/healthz", get(liveness))
        .route("/ready", get(readiness))
        .route("/api/v1/pricing", get(get_pricing))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

Configure the probes:

```yaml
containers:
- name: pricing-service
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 2
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 2
    periodSeconds: 5
  startupProbe:
    httpGet:
      path: /healthz
      port: 8080
    periodSeconds: 1
    failureThreshold: 10
```

Rust apps start in milliseconds, so the initialDelaySeconds can be very low.

## Trace Header Propagation with Actix Web

Create an extractor and middleware for trace headers:

```rust
use actix_web::{HttpRequest, HttpResponse, web, middleware};
use reqwest::Client;
use std::collections::HashMap;

const TRACE_HEADERS: &[&str] = &[
    "x-request-id",
    "x-b3-traceid",
    "x-b3-spanid",
    "x-b3-parentspanid",
    "x-b3-sampled",
    "x-b3-flags",
    "b3",
    "traceparent",
    "tracestate",
];

fn extract_trace_headers(req: &HttpRequest) -> HashMap<String, String> {
    let mut headers = HashMap::new();
    for &name in TRACE_HEADERS {
        if let Some(value) = req.headers().get(name) {
            if let Ok(v) = value.to_str() {
                headers.insert(name.to_string(), v.to_string());
            }
        }
    }
    headers
}

async fn get_pricing(req: HttpRequest) -> HttpResponse {
    let trace_headers = extract_trace_headers(&req);

    // Make downstream call with trace headers
    let client = Client::new();
    let mut request = client.get("http://inventory-service:8080/api/v1/stock");

    for (key, value) in &trace_headers {
        request = request.header(key.as_str(), value.as_str());
    }

    match request.send().await {
        Ok(response) => {
            let body = response.text().await.unwrap_or_default();
            HttpResponse::Ok()
                .content_type("application/json")
                .body(body)
        }
        Err(e) => {
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": e.to_string()}))
        }
    }
}
```

## Trace Header Propagation with Axum

Axum makes this cleaner with extractors and middleware:

```rust
use axum::{
    extract::Request,
    http::{HeaderMap, HeaderName, HeaderValue},
    middleware::{self, Next},
    response::Response,
};
use std::str::FromStr;
use tower::ServiceBuilder;

const TRACE_HEADERS: &[&str] = &[
    "x-request-id", "x-b3-traceid", "x-b3-spanid",
    "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
    "b3", "traceparent", "tracestate",
];

#[derive(Clone)]
struct TraceContext(HeaderMap);

async fn trace_middleware(mut req: Request, next: Next) -> Response {
    let mut trace_headers = HeaderMap::new();
    for &name in TRACE_HEADERS {
        if let Some(value) = req.headers().get(name) {
            if let Ok(header_name) = HeaderName::from_str(name) {
                trace_headers.insert(header_name, value.clone());
            }
        }
    }
    req.extensions_mut().insert(TraceContext(trace_headers));
    next.run(req).await
}

// Usage in main
let app = Router::new()
    .route("/api/v1/pricing", get(get_pricing))
    .layer(middleware::from_fn(trace_middleware))
    .with_state(state);
```

## Graceful Shutdown

### Actix Web

```rust
use actix_web::{HttpServer, App};
use tokio::signal;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let server = HttpServer::new(|| {
        App::new()
            // ... routes
    })
    .bind("0.0.0.0:8080")?
    .shutdown_timeout(20)
    .run();

    let server_handle = server.handle();

    // Spawn a task to handle shutdown
    tokio::spawn(async move {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to create SIGTERM handler")
            .recv()
            .await;

        println!("SIGTERM received, shutting down...");
        // Wait for sidecar to drain
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        server_handle.stop(true).await;
    });

    server.await
}
```

### Axum

```rust
use axum::serve;
use tokio::signal;

#[tokio::main]
async fn main() {
    let app = Router::new()
        // ... routes
        ;

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .unwrap();

    serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    let mut sigterm = signal::unix::signal(signal::unix::SignalKind::terminate())
        .expect("Failed to create SIGTERM handler");
    sigterm.recv().await;
    println!("SIGTERM received, waiting for sidecar drain...");
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
}
```

Deployment configuration:

```yaml
spec:
  terminationGracePeriodSeconds: 30
```

## Traffic Management

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: pricing-service
  namespace: production
spec:
  hosts:
  - pricing-service
  http:
  - route:
    - destination:
        host: pricing-service
        port:
          number: 8080
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: pricing-service
  namespace: production
spec:
  host: pricing-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        h2UpgradePolicy: DEFAULT
        http2MaxRequests: 2000
        maxRequestsPerConnection: 0
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 15s
      baseEjectionTime: 30s
```

Rust apps handle concurrency extremely well, so you can set higher connection limits than most other languages.

## Dockerfile for Minimal Images

```dockerfile
# Build stage
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

# Runtime stage
FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/pricing-service /
EXPOSE 8080
CMD ["/pricing-service"]
```

Using distroless images gives you the smallest possible container, but note that Istio's init container needs iptables. This works fine because the init container runs its own image.

## Common Rust + Istio Issues

**No shell in distroless images**: If you use distroless, you cannot use shell-based preStop hooks. Either use a slightly larger base image or handle the shutdown delay in your Rust code (as shown above).

**Tokio runtime and sidecar**: The Tokio async runtime starts very quickly, often before the sidecar. Use `holdApplicationUntilProxyStarts` if your app makes network calls during initialization.

**Connection pools**: Libraries like `sqlx` and `deadpool` manage their own connection pools. These work fine through the sidecar, but make sure connection timeouts are set appropriately.

Rust applications are excellent mesh citizens. They start fast, use minimal resources, and handle high concurrency. The main consideration is that the sidecar proxy will be the dominant resource consumer for most Rust services, which is worth factoring into your resource planning.
