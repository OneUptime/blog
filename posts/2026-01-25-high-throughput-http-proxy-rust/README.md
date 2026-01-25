# How to Build a High-Throughput HTTP Proxy in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, HTTP Proxy, High Throughput, Networking, Performance

Description: A practical guide to building an HTTP proxy in Rust that can handle tens of thousands of concurrent connections using async I/O, connection pooling, and zero-copy techniques.

---

Building an HTTP proxy might sound straightforward until you need it to handle real traffic. The moment you go from "it works on my machine" to "it needs to handle 50,000 concurrent connections," everything changes. Rust, with its zero-cost abstractions and fearless concurrency, is an excellent choice for this kind of systems programming.

This guide walks through building a production-grade HTTP proxy from scratch. We will focus on the techniques that actually matter for throughput: async I/O, connection reuse, and avoiding unnecessary allocations.

---

## Why Rust for Proxies?

Before diving into code, let's address the obvious question. Why not use nginx, HAProxy, or one of the battle-tested proxies that already exist?

Sometimes you need custom logic. Maybe you're doing request transformation, implementing a proprietary authentication scheme, or building a service mesh sidecar. Off-the-shelf proxies are configurable, but they have limits.

Rust gives you:
- **Predictable latency** - No garbage collector pauses
- **Memory safety** - No buffer overflows or use-after-free bugs
- **Excellent async ecosystem** - Tokio provides a mature runtime
- **Low resource usage** - A Rust proxy can run with a fraction of the memory of equivalent Go or Java implementations

---

## Setting Up the Project

Start with a new Cargo project:

```bash
cargo new http-proxy
cd http-proxy
```

Add these dependencies to `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1.35", features = ["full"] }
hyper = { version = "1.1", features = ["full"] }
hyper-util = { version = "0.1", features = ["full"] }
http-body-util = "0.1"
bytes = "1.5"
tracing = "0.1"
tracing-subscriber = "0.3"

[profile.release]
lto = true
codegen-units = 1
```

The release profile settings enable link-time optimization. This adds compile time but significantly improves runtime performance.

---

## The Basic Proxy Structure

Here's a minimal proxy that forwards requests:

```rust
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use http_body_util::{BodyExt, Full};
use bytes::Bytes;
use std::net::SocketAddr;
use tokio::net::TcpListener;

// Type alias for our response body
type BoxBody = http_body_util::combinators::BoxBody<Bytes, hyper::Error>;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = TcpListener::bind(addr).await?;

    tracing::info!("Proxy listening on {}", addr);

    loop {
        let (stream, _) = listener.accept().await?;
        let io = TokioIo::new(stream);

        // Spawn a task for each connection
        tokio::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(io, service_fn(proxy_handler))
                .await
            {
                tracing::error!("Connection error: {:?}", err);
            }
        });
    }
}

async fn proxy_handler(
    req: Request<hyper::body::Incoming>,
) -> Result<Response<BoxBody>, hyper::Error> {
    // For now, just return a placeholder
    let response = Response::builder()
        .status(StatusCode::OK)
        .body(full_body("Proxy received request"))
        .unwrap();

    Ok(response)
}

// Helper to create a full body from bytes
fn full_body(data: &str) -> BoxBody {
    Full::new(Bytes::from(data.to_owned()))
        .map_err(|never| match never {})
        .boxed()
}
```

This compiles and runs, but it doesn't actually proxy anything yet.

---

## Adding Connection Pooling

The single biggest throughput improvement comes from connection pooling. Without it, you pay the TCP handshake and TLS negotiation cost for every request. With it, you amortize that cost across many requests.

```rust
use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;
use std::sync::Arc;

// Create a shared client with connection pooling
fn create_client() -> Client<HttpConnector, BoxBody> {
    let mut connector = HttpConnector::new();
    connector.set_nodelay(true);  // Disable Nagle's algorithm
    connector.set_keepalive(Some(std::time::Duration::from_secs(60)));

    Client::builder(hyper_util::rt::TokioExecutor::new())
        .pool_idle_timeout(std::time::Duration::from_secs(30))
        .pool_max_idle_per_host(32)  // Tune based on your backend
        .build(connector)
}
```

The `pool_max_idle_per_host` setting is critical. Too low and you waste connections. Too high and you hold open connections that your backend could use for other clients. Start with the number of worker threads your backend uses and adjust based on metrics.

---

## Implementing the Forwarding Logic

Now let's actually forward requests to a backend:

```rust
use hyper::Uri;

async fn proxy_handler(
    client: Arc<Client<HttpConnector, BoxBody>>,
    mut req: Request<hyper::body::Incoming>,
) -> Result<Response<BoxBody>, hyper::Error> {
    let backend = "http://127.0.0.1:3000";

    // Rewrite the URI to point to the backend
    let path = req.uri().path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/");

    let new_uri = format!("{}{}", backend, path)
        .parse::<Uri>()
        .expect("Invalid URI");

    *req.uri_mut() = new_uri;

    // Forward the request
    match client.request(req).await {
        Ok(response) => {
            let (parts, body) = response.into_parts();
            let boxed_body = body.map_err(|e| e).boxed();
            Ok(Response::from_parts(parts, boxed_body))
        }
        Err(e) => {
            tracing::error!("Backend error: {:?}", e);
            let response = Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(full_body("Bad Gateway"))
                .unwrap();
            Ok(response)
        }
    }
}
```

---

## Streaming Without Buffering

A common mistake is buffering the entire request or response body in memory. For large uploads or downloads, this kills your throughput and memory usage. Hyper streams by default - don't fight it.

The body types in hyper implement the `Body` trait, which is essentially an async iterator of chunks. The proxy above already streams correctly because we pass the body through without collecting it.

If you need to inspect or modify the body, do it chunk by chunk:

```rust
use http_body_util::BodyStream;
use futures_util::StreamExt;

async fn transform_body(
    body: hyper::body::Incoming,
) -> impl hyper::body::Body<Data = Bytes, Error = hyper::Error> {
    let stream = BodyStream::new(body);

    let transformed = stream.map(|result| {
        result.map(|frame| {
            // Transform each chunk here
            // This example just passes through unchanged
            frame
        })
    });

    http_body_util::StreamBody::new(transformed)
}
```

---

## TCP Tuning

The default socket settings are conservative. For high throughput, tune them:

```rust
use socket2::{Socket, Domain, Type, Protocol};

fn create_listener(addr: SocketAddr) -> std::io::Result<TcpListener> {
    let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP))?;

    // Allow address reuse for fast restarts
    socket.set_reuse_address(true)?;

    // Increase the accept backlog
    socket.bind(&addr.into())?;
    socket.listen(8192)?;

    // Set non-blocking for async
    socket.set_nonblocking(true)?;

    TcpListener::from_std(socket.into())
}
```

On Linux, also consider tuning kernel parameters:

```bash
# Increase socket buffer sizes
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216

# Increase the backlog queue
sysctl -w net.core.somaxconn=65535
```

---

## Graceful Shutdown

A production proxy needs to handle SIGTERM gracefully, draining existing connections before exiting:

```rust
use tokio::signal;
use tokio::sync::watch;

async fn run_server() -> Result<(), Box<dyn std::error::Error>> {
    let (shutdown_tx, shutdown_rx) = watch::channel(false);

    // Handle shutdown signal
    tokio::spawn(async move {
        signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
        tracing::info!("Shutdown signal received");
        let _ = shutdown_tx.send(true);
    });

    let listener = TcpListener::bind("0.0.0.0:8080").await?;

    loop {
        tokio::select! {
            result = listener.accept() => {
                let (stream, _) = result?;
                let mut rx = shutdown_rx.clone();

                tokio::spawn(async move {
                    // Connection handling with shutdown awareness
                    tokio::select! {
                        _ = handle_connection(stream) => {}
                        _ = rx.changed() => {
                            tracing::debug!("Connection interrupted by shutdown");
                        }
                    }
                });
            }
            _ = shutdown_rx.clone().changed() => {
                tracing::info!("Stopping accept loop");
                break;
            }
        }
    }

    Ok(())
}
```

---

## Benchmarking Your Proxy

Use `wrk` or `hey` to benchmark:

```bash
# Install wrk
brew install wrk  # macOS
# or
apt install wrk   # Ubuntu

# Run benchmark
wrk -t12 -c400 -d30s http://localhost:8080/
```

Track these metrics:
- **Requests/second** - Your throughput
- **Latency p99** - Tail latency matters more than average
- **Errors** - Any non-200 responses under load

A well-tuned Rust proxy on modest hardware (4 cores, 8GB RAM) should handle 100,000+ requests per second for simple forwarding. If you're seeing less, profile with `perf` or `flamegraph` to find the bottleneck.

---

## Where to Go From Here

This proxy handles the basics, but production systems need more:
- **TLS termination** - Use `rustls` or `native-tls`
- **Load balancing** - Implement round-robin, least-connections, or consistent hashing
- **Health checks** - Remove unhealthy backends from rotation
- **Rate limiting** - Protect your backends from thundering herds
- **Metrics** - Export Prometheus metrics for observability

The Rust ecosystem has crates for all of these. The patterns stay the same: async I/O, connection reuse, streaming bodies, and careful memory management.

Building a proxy from scratch teaches you more about networking than any tutorial. You'll understand why existing proxies make certain tradeoffs, and you'll have a foundation for building custom network infrastructure when off-the-shelf solutions fall short.
