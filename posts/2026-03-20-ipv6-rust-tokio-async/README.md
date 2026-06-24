# How to Use IPv6 with Rust Tokio Async Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Tokio, Async, Networking, TCP

Description: Build async IPv6 network applications with Rust's Tokio runtime including TCP servers, clients, timeouts, and connection pooling.

## Tokio IPv6 TCP Server

Tokio's async I/O model handles thousands of IPv6 connections with minimal overhead:

```toml
# Cargo.toml

[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> tokio::io::Result<()> {
    let listener = TcpListener::bind("[::]:8080").await?;
    println!("IPv6 server on {}", listener.local_addr()?);

    loop {
        let (mut socket, addr) = listener.accept().await?;
        println!("New connection: {}", addr);

        tokio::spawn(async move {
            let mut buf = vec![0u8; 1024];
            loop {
                let n = match socket.read(&mut buf).await {
                    Ok(0) => break,  // Connection closed
                    Ok(n) => n,
                    Err(e) => {
                        eprintln!("Read error: {}", e);
                        break;
                    }
                };

                if socket.write_all(&buf[..n]).await.is_err() {
                    break;
                }
            }
        });
    }
}
```

## Tokio IPv6 TCP Client with Timeout

```rust
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;

async fn connect_with_timeout(addr: &str, secs: u64) -> tokio::io::Result<TcpStream> {
    let stream = timeout(
        Duration::from_secs(secs),
        TcpStream::connect(addr),
    )
    .await
    .map_err(|_| tokio::io::Error::new(tokio::io::ErrorKind::TimedOut, "connection timed out"))??;

    println!("Connected to {} via {}", addr, stream.local_addr()?);
    Ok(stream)
}

#[tokio::main]
async fn main() -> tokio::io::Result<()> {
    let mut stream = connect_with_timeout("[2001:db8::1]:8080", 10).await?;

    stream.write_all(b"Hello IPv6\n").await?;

    let mut response = vec![0u8; 256];
    let n = stream.read(&mut response).await?;
    println!("Response: {}", String::from_utf8_lossy(&response[..n]));

    Ok(())
}
```

## Concurrent IPv6 Connections

Spawn multiple concurrent outbound IPv6 connections using `JoinSet`:

```rust
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::task::JoinSet;

async fn probe(addr: &'static str) -> (&'static str, bool) {
    match TcpStream::connect(addr).await {
        Ok(mut s) => {
            let _ = s.write_all(b"HEAD / HTTP/1.0\r\n\r\n").await;
            (addr, true)
        }
        Err(_) => (addr, false),
    }
}

#[tokio::main]
async fn main() {
    let targets = [
        "[2001:db8::1]:80",
        "[2001:db8::2]:80",
        "[2001:db8::3]:80",
        "[2001:db8::4]:80",
    ];

    let mut set = JoinSet::new();
    for target in targets {
        set.spawn(probe(target));
    }

    while let Some(result) = set.join_next().await {
        match result {
            Ok((addr, true)) => println!("{} reachable", addr),
            Ok((addr, false)) => println!("{} unreachable", addr),
            Err(e) => eprintln!("Task error: {}", e),
        }
    }
}
```

## Async IPv6 UDP with Tokio

```rust
use tokio::net::UdpSocket;

#[tokio::main]
async fn main() -> tokio::io::Result<()> {
    let socket = UdpSocket::bind("[::]:9000").await?;
    println!("UDP on {}", socket.local_addr()?);

    let mut buf = [0u8; 4096];
    loop {
        let (len, src) = socket.recv_from(&mut buf).await?;
        println!("UDP from {}: {} bytes", src, len);
        socket.send_to(&buf[..len], &src).await?;
    }
}
```

## Structured Async Server with Graceful Shutdown

```rust
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Notify;

async fn run_server(shutdown: Arc<Notify>) {
    let listener = TcpListener::bind("[::]:8080").await.unwrap();
    println!("Server on {}", listener.local_addr().unwrap());

    loop {
        tokio::select! {
            result = listener.accept() => {
                let (socket, addr) = result.unwrap();
                println!("Accepted: {}", addr);
                tokio::spawn(async move {
                    drop(socket); // handle connection
                });
            }
            _ = shutdown.notified() => {
                println!("Shutdown signal received");
                break;
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let shutdown = Arc::new(Notify::new());
    let shutdown_trigger = shutdown.clone();

    // Spawn server
    let server = tokio::spawn(run_server(shutdown));

    // Simulate shutdown after 1 second (replace with signal handling in production)
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    shutdown_trigger.notify_one();

    server.await.unwrap();
    println!("Server stopped");
}
```

## Conclusion

Tokio makes IPv6 async networking in Rust ergonomic and high-performance. `TcpListener::bind("[::]:port")` and `TcpStream::connect()` accept IPv6 addresses directly. `tokio::time::timeout` wraps connections to enforce latency budgets. `JoinSet` enables structured concurrency for fan-out operations. Use `Notify` or broadcast channels for graceful shutdown coordination.
