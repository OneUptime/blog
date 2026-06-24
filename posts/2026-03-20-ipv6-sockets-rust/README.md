# How to Create IPv6 Sockets in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Socket, Networking, TcpListener, UdpSocket, Socket Programming

Description: Create IPv6 TCP and UDP sockets in Rust using std::net and the socket2 crate for fine-grained socket control, including dual-stack configuration and link-local connections.

## Introduction

Rust's `std::net` module provides `TcpListener`, `TcpStream`, and `UdpSocket` types that support IPv6 natively. For advanced socket options like `IPV6_V6ONLY`, the `socket2` crate provides low-level control. This guide covers both simple and advanced IPv6 socket patterns in Rust.

## IPv6 TCP Server

```rust
use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};
use std::thread;

fn handle_client(mut stream: TcpStream) {
    // Get remote address and print it in [addr]:port form
    let peer = stream.peer_addr().unwrap();
    let host = peer.ip();
    let port = peer.port();
    println!("Client: [{}]:{}", host, port);

    // Check if client used IPv6
    if host.is_ipv6() {
        println!("Client is using IPv6");
    }

    stream.write_all(b"Hello IPv6 Rust client!\n").unwrap();
}

fn main() -> std::io::Result<()> {
    // "[::]:8080" binds to all IPv6 interfaces
    let listener = TcpListener::bind("[::]:8080")?;
    println!("IPv6 TCP server on [::]:8080");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(move || handle_client(stream));
            }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    Ok(())
}
```

## IPv6 TCP Client

```rust
use std::net::TcpStream;
use std::io::{Read, Write};
use std::time::Duration;

fn connect_ipv6(addr: &str, port: u16) -> std::io::Result<TcpStream> {
    // Format: "[ipv6]:port"
    let target = format!("[{}]:{}", addr, port);

    // Connect with timeout
    let socket_addr: std::net::SocketAddr = target
        .parse()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;

    TcpStream::connect_timeout(&socket_addr, Duration::from_secs(10))
}

fn main() {
    match connect_ipv6("::1", 8080) {
        Ok(mut stream) => {
            println!("Connected to {}", stream.peer_addr().unwrap());

            let mut buf = [0u8; 1024];
            let n = stream.read(&mut buf).unwrap_or(0);
            if n > 0 {
                println!("Server: {}", String::from_utf8_lossy(&buf[..n]));
            }
        }
        Err(e) => eprintln!("Connection failed: {}", e),
    }
}
```

## IPv6 UDP Socket

```rust
use std::net::UdpSocket;
use std::time::Duration;

fn ipv6_udp_server(port: u16) -> std::io::Result<()> {
    // Bind UDP socket to IPv6 wildcard
    let socket = UdpSocket::bind(format!("[::]:{}", port))?;
    println!("UDP server on [::]:{}", port);

    let mut buf = [0u8; 4096];
    loop {
        let (n, src) = socket.recv_from(&mut buf)?;
        let msg = String::from_utf8_lossy(&buf[..n]);

        println!("From {}: {}", src, msg);

        // Echo reply
        socket.send_to(b"ACK", src)?;
    }
}

fn ipv6_udp_client(server: &str, port: u16, message: &str) -> std::io::Result<()> {
    // Bind to :: (any available IPv6 address) on port 0 (OS assigns port)
    let socket = UdpSocket::bind("[::]:0")?;

    let server_addr = format!("[{}]:{}", server, port);
    socket.send_to(message.as_bytes(), &server_addr)?;
    println!("Sent: {}", message);

    // Receive reply
    let mut buf = [0u8; 1024];
    socket.set_read_timeout(Some(Duration::from_secs(5)))?;
    if let Ok((n, from)) = socket.recv_from(&mut buf) {
        println!("Reply from {}: {}", from, String::from_utf8_lossy(&buf[..n]));
    }
    Ok(())
}
```

## Dual-Stack with socket2 Crate

For fine-grained control over `IPV6_V6ONLY`:

```toml
# Cargo.toml

[dependencies]
socket2 = "0.5"
```

```rust
use socket2::{Domain, Protocol, Socket, Type};
use std::net::SocketAddr;

fn create_dual_stack_listener(port: u16) -> std::io::Result<std::net::TcpListener> {
    // Create an IPv6 socket
    let socket = Socket::new(Domain::IPV6, Type::STREAM, Some(Protocol::TCP))?;

    // Set IPV6_V6ONLY = false to accept both IPv4 and IPv6
    socket.set_only_v6(false)?;
    socket.set_reuse_address(true)?;

    // Bind to IPv6 wildcard
    let addr: SocketAddr = format!("[::]:{}", port).parse().unwrap();
    socket.bind(&addr.into())?;
    socket.listen(128)?;

    // Convert to std::net::TcpListener
    Ok(socket.into())
}

fn main() -> std::io::Result<()> {
    let listener = create_dual_stack_listener(8080)?;
    println!("Dual-stack server on [::]:8080");

    for stream in listener.incoming() {
        if let Ok(stream) = stream {
            let peer = stream.peer_addr()?;
            println!("Client: {} ({})", peer.ip(), if peer.is_ipv6() { "IPv6" } else { "IPv4" });
        }
    }
    Ok(())
}
```

## Async IPv6 with Tokio

```toml
# Cargo.toml

[dependencies]
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

```rust
use tokio::net::{TcpListener, TcpStream, UdpSocket};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[tokio::main]
async fn main() -> tokio::io::Result<()> {
    // Async IPv6 TCP server
    let listener = TcpListener::bind("[::]:8080").await?;
    println!("Async IPv6 server on [::]:8080");

    loop {
        let (mut socket, addr) = listener.accept().await?;
        println!("Client: {}", addr);

        tokio::spawn(async move {
            socket.write_all(b"Hello async IPv6!\n").await.ok();

            let mut buf = vec![0u8; 1024];
            if let Ok(n) = socket.read(&mut buf).await {
                println!("Received: {}", String::from_utf8_lossy(&buf[..n]));
            }
        });
    }
}
```

## Conclusion

Rust's `std::net` provides simple IPv6 sockets through `TcpListener::bind("[::]:port")` and `UdpSocket::bind("[::]:port")`. For control over `IPV6_V6ONLY` and other socket options, use the `socket2` crate. The `IpAddr::is_ipv6()` method distinguishes IPv6 connections at runtime. Tokio's async socket types use identical address syntax for async IPv6 networking.
