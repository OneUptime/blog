# How to Configure Actix-web for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Actix-web, Rust, IPv6, Web Framework, Tokio, Dual-Stack, Std::net

Description: Configure the Actix-web Rust framework to listen on IPv6 addresses, extract client IPv6 from request extensions, and handle IPv6 in extractors.

## Introduction

Actix-web uses Tokio's async runtime and supports IPv6 by binding to `[::]:port` or `SocketAddrV6`. Whether an IPv6 listener also accepts IPv4 connections depends on the OS and the `IPV6_V6ONLY` socket option.

## Step 1: Listen on IPv6

```rust
// src/main.rs
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(index))
    })
    // Bind to all IPv6 interfaces
    .bind("[::]:8080")?
    .run()
    .await
}

async fn index(req: HttpRequest) -> HttpResponse {
    let peer = req.peer_addr()
        .map(|a| a.to_string())
        .unwrap_or_else(|| "unknown".to_string());
    HttpResponse::Ok().body(format!("Client: {}", peer))
}
```

```rust
// IPv6-only (set IPV6_V6ONLY before handing the listener to Actix-web)
use socket2::{Domain, Protocol, Socket, Type};
use std::net::{Ipv6Addr, SocketAddrV6, TcpListener};

let addr = SocketAddrV6::new(Ipv6Addr::UNSPECIFIED, 8080, 0, 0);
let socket = Socket::new(Domain::IPV6, Type::STREAM, Some(Protocol::TCP))?;
socket.set_only_v6(true)?;
socket.set_nonblocking(true)?;
socket.bind(&addr.into())?;
socket.listen(1024)?;

let listener: TcpListener = socket.into();

HttpServer::new(|| { App::new().route("/", web::get().to(index)) })
    .listen(listener)?
    .run()
    .await
```

## Step 2: Extract Client IPv6 Address

```rust
// src/middleware/client_ip.rs
use actix_web::{
    dev::{ServiceRequest, ServiceResponse, Transform, Service},
    Error, HttpMessage,
};
use std::{
    future::{ready, Ready, Future},
    pin::Pin,
    net::IpAddr,
};

pub struct ClientIPMiddleware;

impl<Svc, Body> Transform<Svc, ServiceRequest> for ClientIPMiddleware
where
    Svc: Service<ServiceRequest, Response = ServiceResponse<Body>, Error = Error>,
    Svc::Future: 'static,
{
    type Response = ServiceResponse<Body>;
    type Error = Error;
    type InitError = ();
    type Transform = ClientIPMiddlewareService<Svc>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: Svc) -> Self::Future {
        ready(Ok(ClientIPMiddlewareService { service }))
    }
}

pub struct ClientIPMiddlewareService<Svc> { service: Svc }

impl<Svc, Body> Service<ServiceRequest> for ClientIPMiddlewareService<Svc>
where
    Svc: Service<ServiceRequest, Response = ServiceResponse<Body>, Error = Error>,
    Svc::Future: 'static,
{
    type Response = ServiceResponse<Body>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + 'static>>;

    actix_web::dev::forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Extract client IP from X-Forwarded-For or peer addr
        let ip: Option<IpAddr> = req
            .headers()
            .get("X-Forwarded-For")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.split(',').next())
            .and_then(|s| s.trim().parse().ok())
            .or_else(|| req.peer_addr().map(|a| a.ip()));

        if let Some(addr) = ip {
            req.extensions_mut().insert(addr);
        }

        let fut = self.service.call(req);
        Box::pin(async move { fut.await })
    }
}
```

## Step 3: IPv6 Extractor in Handler

```rust
// src/handlers/info.rs
use actix_web::{HttpMessage, HttpRequest, HttpResponse};
use std::net::IpAddr;

pub async fn client_info(req: HttpRequest) -> HttpResponse {
    let ip = req.extensions()
        .get::<IpAddr>()
        .copied()
        .or_else(|| req.peer_addr().map(|a| a.ip()))
        .unwrap_or(IpAddr::V6(std::net::Ipv6Addr::UNSPECIFIED));

    let is_ipv6 = matches!(ip, IpAddr::V6(_));

    // Normalize IPv4-mapped IPv6 (::ffff:1.2.3.4 → 1.2.3.4)
    let normalized = match ip {
        IpAddr::V6(v6) => {
            if let Some(v4) = v6.to_ipv4_mapped() {
                IpAddr::V4(v4)
            } else {
                ip
            }
        }
        v4 => v4,
    };

    HttpResponse::Ok().json(serde_json::json!({
        "ip": normalized.to_string(),
        "is_ipv6": is_ipv6,
        "is_loopback": normalized.is_loopback(),
    }))
}
```

## Step 4: Build and Test

```bash
cargo build --release

# Run

./target/release/myapp

# Test IPv6
curl -g -6 "http://[::1]:8080/"
curl -g -6 "http://[YOUR_SERVER_IPV6]:8080/"

# Verify
ss -lntp6 | grep :8080
```

## Conclusion

Actix-web supports IPv6 by binding to `"[::]:8080"` in `HttpServer::bind()`. If you need to force IPv6-only behavior, configure `IPV6_V6ONLY` on the listener before passing it to `HttpServer::listen()`. Use middleware to extract client IPs from `X-Forwarded-For` and normalize IPv4-mapped addresses. Rust's `std::net::IpAddr` enum cleanly distinguishes IPv4 and IPv6 addresses. Monitor Actix-web with OneUptime's HTTP checks targeting IPv6 endpoints.
