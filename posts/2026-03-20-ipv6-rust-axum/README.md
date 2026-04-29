# How to Use IPv6 with Rust Axum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Axum, HTTP, Web Framework, Tokio

Description: Build IPv6-ready web services with Rust's Axum framework including binding, client IP extraction, extractors, and middleware.

## Binding Axum to IPv6

```toml
# Cargo.toml

[dependencies]
axum = "0.8"
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
tower-http = { version = "0.6", features = ["trace"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

```rust
use axum::{routing::get, Router};

async fn hello() -> &'static str {
    "Hello from IPv6 Axum!"
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(hello));

    // Listen on all IPv6 interfaces. On many Linux systems this also accepts
    // IPv4 via IPv4-mapped IPv6 addresses unless IPV6_V6ONLY is enabled.
    let listener = tokio::net::TcpListener::bind("[::]:3000").await.unwrap();
    println!("Listening on {}", listener.local_addr().unwrap());

    axum::serve(listener, app).await.unwrap();
}
```

## Extracting Client IP with ConnectInfo

Axum provides `ConnectInfo` to access the peer's `SocketAddr`:

```rust
use axum::{
    extract::ConnectInfo,
    routing::get,
    Router,
};
use std::net::{IpAddr, SocketAddr};

async fn client_ip(ConnectInfo(addr): ConnectInfo<SocketAddr>) -> String {
    let real_ip = match addr.ip() {
        IpAddr::V6(v6) => {
            // Unwrap IPv4-mapped addresses (::ffff:x.x.x.x) from dual-stack
            v6.to_ipv4_mapped()
                .map(IpAddr::V4)
                .unwrap_or(IpAddr::V6(v6))
        }
        v4 => v4,
    };

    format!("Client IP: {}", real_ip)
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/ip", get(client_ip));

    let listener = tokio::net::TcpListener::bind("[::]:3000").await.unwrap();

    // `ConnectInfo` is available when you serve the router with
    // `into_make_service_with_connect_info`.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}
```

## Custom Extractor for IPv6 Validation

```rust
use axum::{
    extract::{FromRequestParts, Query},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
};
use serde::Deserialize;
use std::net::Ipv6Addr;

#[derive(Deserialize)]
struct IPv6Query {
    addr: String,
}

pub struct ValidIPv6(Ipv6Addr);

impl<St> FromRequestParts<St> for ValidIPv6
where
    St: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &St) -> Result<Self, Self::Rejection> {
        let Query(q) = Query::<IPv6Query>::from_request_parts(parts, state)
            .await
            .map_err(|e| e.into_response())?;

        q.addr
            .parse::<Ipv6Addr>()
            .map(ValidIPv6)
            .map_err(|_| {
                (StatusCode::BAD_REQUEST, "Invalid IPv6 address").into_response()
            })
    }
}

async fn process_addr(ValidIPv6(addr): ValidIPv6) -> String {
    format!("Processing: {} (loopback={})", addr, addr.is_loopback())
}
```

## Tower Middleware for IPv6 Logging

```rust
use axum::{extract::ConnectInfo, http::Request, routing::get, Router};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

async fn root() -> &'static str {
    "IPv6 Axum with tracing"
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = Router::new().route("/", get(root)).layer(
        TraceLayer::new_for_http().make_span_with(|request: &Request<_>| {
            let client_ip = request
                .extensions()
                .get::<ConnectInfo<SocketAddr>>()
                .map(|ConnectInfo(addr)| addr.ip().to_canonical().to_string())
                .unwrap_or_else(|| "unknown".to_string());

            tracing::span!(
                Level::INFO,
                "http-request",
                method = %request.method(),
                uri = %request.uri(),
                client_ip = %client_ip,
            )
        }),
    );

    let listener = tokio::net::TcpListener::bind("[::]:3000").await.unwrap();
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}
```

## State Sharing with IPv6 Allow List

```rust
use axum::{
    extract::{ConnectInfo, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use std::{net::{IpAddr, Ipv6Addr, SocketAddr}, sync::Arc};

#[derive(Clone)]
struct AppState {
    allowed: Arc<Vec<Ipv6Addr>>,
}

async fn protected(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let client_v6 = match addr.ip() {
        IpAddr::V6(v6) => v6,
        IpAddr::V4(v4) => v4.to_ipv6_mapped(),
    };

    if state.allowed.contains(&client_v6) {
        (StatusCode::OK, "Access granted")
    } else {
        (StatusCode::FORBIDDEN, "Access denied")
    }
}

#[tokio::main]
async fn main() {
    let state = AppState {
        allowed: Arc::new(vec![
            "::1".parse().unwrap(),
            "2001:db8::100".parse().unwrap(),
        ]),
    };

    let app = Router::new()
        .route("/protected", get(protected))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("[::]:3000").await.unwrap();
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}
```

## Conclusion

Axum supports IPv6 by binding Tokio's `TcpListener` to an IPv6 socket such as `"[::]:port"`. The `ConnectInfo<SocketAddr>` extractor provides the client's socket address including IPv6 addresses. Custom extractors encode validation logic - including IPv6 checks - into the type system. To extract `ConnectInfo` when serving with `axum::serve`, use `into_make_service_with_connect_info`. Tower middleware via `TraceLayer` can include IPv6 peer addresses when you add them to the span from request extensions such as `ConnectInfo`.
