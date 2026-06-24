# How to Build IPv6 HTTP Servers with Rust Hyper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Hyper, HTTP, Async, Tokio

Description: Build low-level IPv6 HTTP servers with Rust's Hyper library, handle requests, extract client IPs, and serve TLS over IPv6.

## Basic Hyper IPv6 HTTP Server

Hyper is a low-level HTTP library that works with Tokio. Since Hyper 1.x, you provide your own TCP listener:

```toml
# Cargo.toml

[dependencies]
hyper = { version = "1", features = ["full"] }
hyper-util = { version = "0.1", features = ["full"] }
http-body-util = "0.1"
tokio = { version = "1", features = ["full"] }
bytes = "1"
```

```rust
use bytes::Bytes;
use http_body_util::Full;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;

async fn handle(req: Request<hyper::body::Incoming>) -> Result<Response<Full<Bytes>>, hyper::Error> {
    println!("Request: {} {}", req.method(), req.uri());

    let response = Response::new(Full::new(Bytes::from("Hello from IPv6 Hyper!\n")));
    Ok(response)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = TcpListener::bind("[::]:8080").await?;
    println!("Hyper IPv6 server on {}", listener.local_addr()?);

    loop {
        let (stream, addr) = listener.accept().await?;
        println!("Connection from {}", addr);

        let io = TokioIo::new(stream);
        tokio::spawn(async move {
            if let Err(e) = http1::Builder::new()
                .serve_connection(io, service_fn(handle))
                .await
            {
                eprintln!("Connection error: {}", e);
            }
        });
    }
}
```

## Extracting Client IP Address

Pass the peer address into the handler using a closure that captures it:

```rust
use bytes::Bytes;
use http_body_util::Full;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use std::net::SocketAddr;
use tokio::net::TcpListener;

async fn handle_with_addr(
    req: Request<hyper::body::Incoming>,
    peer: SocketAddr,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let body = format!("Your address: {}\nPath: {}\n", peer.ip(), req.uri().path());
    Ok(Response::new(Full::new(Bytes::from(body))))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = TcpListener::bind("[::]:8080").await?;

    loop {
        let (stream, peer_addr) = listener.accept().await?;
        let io = TokioIo::new(stream);

        tokio::spawn(async move {
            let svc = service_fn(move |req| handle_with_addr(req, peer_addr));
            if let Err(e) = http1::Builder::new().serve_connection(io, svc).await {
                eprintln!("Error: {}", e);
            }
        });
    }
}
```

## Router with Multiple Endpoints

```rust
use bytes::Bytes;
use http_body_util::Full;
use hyper::{Method, Request, Response, StatusCode};

async fn router(req: Request<hyper::body::Incoming>) -> Result<Response<Full<Bytes>>, hyper::Error> {
    match (req.method(), req.uri().path()) {
        (&Method::GET, "/") => {
            Ok(Response::new(Full::new(Bytes::from("Homepage\n"))))
        }
        (&Method::GET, "/health") => {
            Ok(Response::new(Full::new(Bytes::from("{\"status\":\"ok\"}\n"))))
        }
        (&Method::GET, path) if path.starts_with("/ip/") => {
            let addr_str = &path[4..];
            match addr_str.parse::<std::net::Ipv6Addr>() {
                Ok(addr) => {
                    let info = format!("Address: {}\nLoopback: {}\n",
                        addr, addr.is_loopback());
                    Ok(Response::new(Full::new(Bytes::from(info))))
                }
                Err(_) => {
                    let mut resp = Response::new(Full::new(Bytes::from("Invalid IPv6\n")));
                    *resp.status_mut() = StatusCode::BAD_REQUEST;
                    Ok(resp)
                }
            }
        }
        _ => {
            let mut resp = Response::new(Full::new(Bytes::from("Not Found\n")));
            *resp.status_mut() = StatusCode::NOT_FOUND;
            Ok(resp)
        }
    }
}
```

## Cleartext HTTP/2 over IPv6

```rust
use bytes::Bytes;
use http_body_util::Full;
use hyper::server::conn::http2;
use hyper::service::service_fn;
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = TcpListener::bind("[::]:8080").await?;
    println!("HTTP/2 server on {}", listener.local_addr()?);

    loop {
        let (stream, addr) = listener.accept().await?;
        println!("HTTP/2 connection from {}", addr);
        let io = TokioIo::new(stream);

        tokio::spawn(async move {
            if let Err(e) = http2::Builder::new(TokioExecutor::new())
                .serve_connection(io, service_fn(handle))
                .await
            {
                eprintln!("HTTP/2 error: {}", e);
            }
        });
    }
}

// Reuse the handle function from the first example
async fn handle(
    req: hyper::Request<hyper::body::Incoming>,
) -> Result<hyper::Response<Full<Bytes>>, hyper::Error> {
    Ok(hyper::Response::new(Full::new(Bytes::from("HTTP/2 over IPv6!\n"))))
}
```

## Graceful Shutdown

```rust
use bytes::Bytes;
use http_body_util::Full;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use hyper_util::server::graceful::GracefulShutdown;
use tokio::net::TcpListener;

async fn handle(
    req: Request<hyper::body::Incoming>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    println!("Request: {} {}", req.method(), req.uri());
    Ok(Response::new(Full::new(Bytes::from("Hello from IPv6 Hyper!\n"))))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = TcpListener::bind("[::]:8080").await?;
    let graceful = GracefulShutdown::new();
    let mut signal = std::pin::pin!(tokio::signal::ctrl_c());

    loop {
        tokio::select! {
            result = listener.accept() => {
                let (stream, addr) = result?;
                println!("Accept: {}", addr);
                let io = TokioIo::new(stream);
                let conn = http1::Builder::new()
                    .serve_connection(io, service_fn(handle));
                let watched = graceful.watch(conn);
                tokio::spawn(async move {
                    if let Err(e) = watched.await {
                        eprintln!("Error: {}", e);
                    }
                });
            }
            _ = &mut signal => {
                println!("Shutting down...");
                drop(listener);
                break;
            }
        }
    }

    graceful.shutdown().await;

    Ok(())
}
```

## Conclusion

Hyper 1.x gives full control over the IPv6 HTTP server lifecycle. Bind via `TcpListener::bind("[::]:port")`, then use `http1::Builder` or `http2::Builder` to serve connections. The peer address is captured from `listener.accept()` and passed into service closures. `GracefulShutdown` from `hyper-util` drains in-flight connections on shutdown. For most applications, higher-level frameworks like Axum (which builds on Hyper) are preferable unless you need hyper-specific control.
