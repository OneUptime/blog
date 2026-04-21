# How to Use Tokio for Asynchronous IPv4 Networking in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Tokio, Async, IPv4, Networking, TCP, UDP

Description: Learn how to use the Tokio async runtime to build high-concurrency IPv4 TCP and UDP servers and clients in Rust.

## Setup

```toml
# Cargo.toml

[dependencies]
tokio = { version = "1", features = ["full"] }
anyhow = "1"
```

## Async TCP Echo Server

```rust
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Bind to all IPv4 interfaces
    let listener = TcpListener::bind("0.0.0.0:9000").await?;
    println!("Async TCP server on {}", listener.local_addr()?);

    loop {
        let (stream, addr) = listener.accept().await?;
        println!("Connected: {}", addr);

        // Spawn a new async task per connection (much lighter than threads)
        tokio::spawn(async move {
            let (reader, mut writer) = stream.into_split();
            let mut reader = BufReader::new(reader);
            let mut line = String::new();

            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => break,  // EOF
                    Ok(_) => {
                        if writer.write_all(line.as_bytes()).await.is_err() {
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("[{}] Read error: {}", addr, e);
                        break;
                    }
                }
            }
            println!("Disconnected: {}", addr);
        });
    }
}
```

## Async TCP Client

```rust
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use std::time::Duration;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Connect with timeout
    let stream = tokio::time::timeout(
        Duration::from_secs(5),
        TcpStream::connect("127.0.0.1:9000"),
    )
    .await??;

    println!("Connected to {}", stream.peer_addr()?);

    let (reader, mut writer) = stream.into_split();

    // Send message
    writer.write_all(b"Hello, async Tokio server!\n").await?;

    // Read response
    let mut reader = BufReader::new(reader);
    let mut response = String::new();
    reader.read_line(&mut response).await?;
    println!("Response: {}", response.trim());

    Ok(())
}
```

## Async UDP Server

```rust
use tokio::net::UdpSocket;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let socket = UdpSocket::bind("0.0.0.0:9001").await?;
    println!("Async UDP server on {}", socket.local_addr()?);

    let mut buf = vec![0u8; 65535];

    loop {
        let (n, src) = socket.recv_from(&mut buf).await?;
        let msg = std::str::from_utf8(&buf[..n]).unwrap_or("?");
        println!("From {}: {}", src, msg);

        let reply = format!("Echo: {}", msg);
        socket.send_to(reply.as_bytes(), src).await?;
    }
}
```

## Handling Many Concurrent Connections

```rust
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:9000").await?;
    let active = Arc::new(AtomicUsize::new(0));

    println!("High-concurrency server on port 9000");

    loop {
        let (mut stream, addr) = listener.accept().await?;
        let count = Arc::clone(&active);

        tokio::spawn(async move {
            count.fetch_add(1, Ordering::Relaxed);
            let mut buf = vec![0u8; 4096];

            loop {
                match stream.read(&mut buf).await {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if stream.write_all(&buf[..n]).await.is_err() {
                            break;
                        }
                    }
                }
            }

            let remaining = count.fetch_sub(1, Ordering::Relaxed) - 1;
            println!("{} disconnected (active: {})", addr, remaining);
        });
    }
}
```

## Tokio vs Threads Performance

| Approach | Practical Concurrency | Memory per Unit |
|----------|----------------------|-----------------|
| `thread::spawn` | Limited by OS threads and stack memory | Platform-dependent stack; currently 2 MiB on Rust Tier-1 platforms |
| `tokio::spawn` | Thousands to millions of tasks, workload-dependent | One allocation and 64 bytes of task overhead, plus future state |

## Conclusion

Tokio's async TCP and UDP types live under `tokio::net`, while utility traits such as `AsyncReadExt` and `AsyncWriteExt` provide `.await`-able I/O methods. Use `tokio::spawn` for each connection; tasks are far lighter than threads, making high concurrency practical. `into_split()` separates a stream into independent reader/writer halves that can be moved across async tasks. Use `tokio::time::timeout` around connection attempts when you need an application-level deadline.
