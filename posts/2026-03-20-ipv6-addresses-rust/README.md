# How to Handle IPv6 Addresses in Rust Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Networking, Std::net, Socket Programming, Development

Description: Handle, parse, validate, and use IPv6 addresses in Rust applications using std::net types including Ipv6Addr, IpAddr, and TcpListener for safe IPv6 networking.

## Introduction

Rust's `std::net` module provides a type-safe, zero-cost abstraction for IPv6 addresses with `Ipv6Addr` and the unified `IpAddr` enum. Rust's strong type system makes IPv6 handling particularly safe, preventing common bugs like treating IPv4 and IPv6 addresses interchangeably without explicit handling.

## Parsing and Validating IPv6 Addresses

```rust
use std::net::{IpAddr, Ipv6Addr};
use std::str::FromStr;

fn is_ipv6(address: &str) -> bool {
    // Strip zone ID if present (e.g., "fe80::1%eth0")
    let clean = address.split('%').next().unwrap_or(address);

    match clean.parse::<IpAddr>() {
        Ok(IpAddr::V6(_)) => true,
        _ => false,
    }
}

fn parse_ipv6(address: &str) -> Option<Ipv6Addr> {
    let clean = address.split('%').next()?;
    clean.parse::<Ipv6Addr>().ok()
}

fn main() {
    let addresses = vec![
        "2001:db8::1",
        "::1",
        "fe80::1%eth0",
        "192.168.1.1",
        "not-an-address",
    ];

    for addr in &addresses {
        println!("{:<25} isIPv6={}", addr, is_ipv6(addr));
    }

    // Parse and inspect an address
    if let Some(addr) = parse_ipv6("2001:db8::1") {
        println!("\nParsed: {}", addr);
        println!("Segments: {:?}", addr.segments());
        println!("Is loopback: {}", addr.is_loopback());
        println!("Is link-local: {}", addr.is_unicast_link_local());
    }
}
```

## Working with IpAddr Enum

```rust
use std::net::IpAddr;

fn classify_ip(ip: &IpAddr) -> &'static str {
    match ip {
        IpAddr::V4(v4) => {
            if v4.is_loopback() { "IPv4 loopback" }
            else if v4.is_private() { "IPv4 private" }
            else { "IPv4 global" }
        }
        IpAddr::V6(v6) => {
            if v6.is_loopback() { "IPv6 loopback" }
            else if v6.is_unicast_link_local() { "IPv6 link-local" }
            else if v6.is_unique_local() { "IPv6 unique-local" }
            else if v6.is_multicast() { "IPv6 multicast" }
            else { "IPv6 unicast" }
        }
    }
}

fn main() {
    let test_ips: Vec<IpAddr> = vec![
        "2001:db8::1".parse().unwrap(),
        "::1".parse().unwrap(),
        "fe80::1".parse().unwrap(),
        "192.168.1.1".parse().unwrap(),
    ];

    for ip in &test_ips {
        println!("{} → {}", ip, classify_ip(ip));
    }
}
```

## Creating an IPv6 TCP Server

```rust
use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};
use std::thread;

fn handle_client(mut stream: TcpStream) {
    // Get client address
    let peer_addr = stream.peer_addr().unwrap();
    println!("Connection from: {}", peer_addr);

    let response = b"Hello from IPv6 Rust server\n";
    stream.write_all(response).unwrap();
}

fn main() -> std::io::Result<()> {
    // Bind to IPv6 wildcard address
    // "[::]:8080" binds to all IPv6 interfaces on port 8080
    let listener = TcpListener::bind("[::]:8080")?;
    println!("Listening on [::]:8080");

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

## Connecting to an IPv6 Server

```rust
use std::net::TcpStream;
use std::io::{Read, Write};
use std::time::Duration;

fn connect_ipv6(host: &str, port: u16) -> std::io::Result<TcpStream> {
    // Format IPv6 address with brackets for the address string
    let addr = format!("[{}]:{}", host, port);
    TcpStream::connect_timeout(
        &addr.parse().map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?,
        Duration::from_secs(10),
    )
}

fn main() {
    match connect_ipv6("::1", 8080) {
        Ok(mut stream) => {
            println!("Connected to {}", stream.peer_addr().unwrap());
            stream.write_all(b"Hello server\n").unwrap();

            let mut buf = [0u8; 1024];
            let n = stream.read(&mut buf).unwrap();
            println!("Received: {}", String::from_utf8_lossy(&buf[..n]));
        }
        Err(e) => eprintln!("Connection failed: {}", e),
    }
}
```

## IPv6 with Tokio Async Runtime

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[tokio::main]
async fn main() -> tokio::io::Result<()> {
    // Async IPv6 TCP server
    let listener = TcpListener::bind("[::]:8080").await?;
    println!("Async IPv6 server on [::]:8080");

    loop {
        let (mut socket, addr) = listener.accept().await?;
        println!("Connection from {}", addr);

        tokio::spawn(async move {
            let mut buf = vec![0; 1024];
            let n = socket.read(&mut buf).await.unwrap_or(0);
            if n > 0 {
                socket.write_all(b"Hello async IPv6 client\n").await.ok();
            }
        });
    }
}
```

## Formatting IPv6 Addresses for URLs

```rust
use std::net::IpAddr;

fn format_for_url(ip: &IpAddr) -> String {
    match ip {
        IpAddr::V6(v6) => format!("[{}]", v6),
        IpAddr::V4(v4) => v4.to_string(),
    }
}

fn main() {
    let v6: IpAddr = "2001:db8::1".parse().unwrap();
    let v4: IpAddr = "192.168.1.1".parse().unwrap();

    println!("{}", format_for_url(&v6));  // [2001:db8::1]
    println!("{}", format_for_url(&v4));  // 192.168.1.1

    let url = format!("https://{}:8080/api", format_for_url(&v6));
    println!("{}", url);  // https://[2001:db8::1]:8080/api
}
```

## Conclusion

Rust's `std::net` module provides type-safe IPv6 handling through `Ipv6Addr` and `IpAddr`. The type system enforces correct handling of IPv4 vs IPv6 at compile time. Use `"[::]:port"` for listeners, handle `IpAddr::V6` variants in match expressions, and leverage `Ipv6Addr` methods like `is_loopback()`, `is_unicast_link_local()`, and `is_unique_local()` for address classification.
