# How to Bind Rust Sockets to Specific IPv4 Network Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Socket, IPv4, Network Interfaces, Binding, TCP, Std::net

Description: Bind Rust TCP listener and client sockets to specific IPv4 addresses and network interfaces to control which interface handles incoming and outgoing traffic.

## Introduction

On multi-homed hosts (servers with multiple NICs or IP addresses), you may need to bind a socket to a specific local IPv4 address to control which interface receives connections. For outbound connections, binding a source IP can influence the path used, but the kernel's routing table still decides the outgoing interface. Rust's `TcpListener::bind` takes any `ToSocketAddrs` value, including `SocketAddr`, for listener addresses; `TcpStream::connect` connects to a remote address and does not expose a bind-before-connect step.

## Binding a Server to a Specific IPv4 Address

```rust
use std::net::{TcpListener, TcpStream, SocketAddr};
use std::io::{Read, Write};
use std::thread;

fn main() -> std::io::Result<()> {
    // Bind only to 192.168.1.10 - won't accept connections to other local addresses
    let bind_addr: SocketAddr = "192.168.1.10:8080".parse().unwrap();
    let listener = TcpListener::bind(bind_addr)?;
    
    println!("Listening on {}", listener.local_addr()?);
    
    for stream in listener.incoming() {
        match stream {
            Ok(s) => { thread::spawn(|| handle(s)); }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    Ok(())
}

fn handle(mut stream: TcpStream) {
    let peer = stream.peer_addr().unwrap();
    println!("Connection from {}", peer);
    
    let mut buf = [0u8; 512];
    if let Ok(n) = stream.read(&mut buf) {
        let _ = stream.write_all(&buf[..n]);
    }
}
```

## Binding to Multiple Addresses

To listen on multiple specific addresses, create multiple listeners:

```rust
use std::net::TcpListener;
use std::io::Write;
use std::thread;

fn main() -> std::io::Result<()> {
    let addresses = vec![
        "192.168.1.10:8080",   // Internal interface
        "10.0.0.5:8080",       // VPN interface
    ];
    
    let mut handles = Vec::new();
    
    for addr in addresses {
        let listener = TcpListener::bind(addr)?;
        println!("Listening on {}", listener.local_addr()?);
        
        let handle = thread::spawn(move || {
            for stream in listener.incoming() {
                if let Ok(s) = stream {
                    thread::spawn(|| handle_connection(s));
                }
            }
        });
        
        handles.push(handle);
    }
    
    for handle in handles {
        handle.join().ok();
    }
    
    Ok(())
}

fn handle_connection(mut stream: std::net::TcpStream) {
    // Same handler for all listeners
    let local = stream.local_addr().unwrap();
    let peer = stream.peer_addr().unwrap();
    println!("Connection {} -> {}", peer, local);
    
    let response = format!("You connected to {}\n", local);
    let _ = stream.write_all(response.as_bytes());
}
```

## Binding Client to a Specific Source IP

For outbound connections, `std::net::TcpStream::connect` does not let you bind the local address first. Without `socket2`, connect normally and let the OS choose the source IP based on routing:

```rust
use std::net::{TcpStream, SocketAddr};

fn connect_without_source_bind(destination: &str) -> std::io::Result<TcpStream> {
    // Parse addresses
    let dst_addr: SocketAddr = destination.parse().unwrap();
    
    // Use socket2 for bind-before-connect on TcpStream
    // (std::net doesn't directly support this pattern)
    TcpStream::connect(dst_addr)
}
```

## Using socket2 for Advanced Binding

The `socket2` crate provides more control:

```toml
# Cargo.toml

[dependencies]
socket2 = "0.5"
```

```rust
use socket2::{Socket, Domain, Type, Protocol, SockAddr};
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

fn connect_with_source_bind(source_ip: &str, destination: &str) -> std::io::Result<TcpStream> {
    let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP))?;
    
    // Bind to specific source IP (let OS pick the port)
    let src_addr: SocketAddr = format!("{}:0", source_ip).parse().unwrap();
    socket.bind(&SockAddr::from(src_addr))?;
    
    let dst_addr: SocketAddr = destination.parse().unwrap();
    socket.connect_timeout(&SockAddr::from(dst_addr), Duration::from_secs(10))?;
    
    // Convert socket2::Socket to std::net::TcpStream
    Ok(TcpStream::from(socket))
}
```

## Listing Available IPv4 Addresses

```toml
# Cargo.toml

[dependencies]
get_if_addrs = "0.5"
```

```rust
use get_if_addrs::{get_if_addrs, IfAddr};
use std::net::Ipv4Addr;

/// Get all non-loopback IPv4 addresses available on this host
fn get_local_ipv4_addresses() -> std::io::Result<Vec<Ipv4Addr>> {
    let addrs = get_if_addrs()?
        .into_iter()
        .filter_map(|interface| match interface.addr {
            IfAddr::V4(addr) if !addr.is_loopback() => Some(addr.ip),
            _ => None,
        })
        .collect();
    
    Ok(addrs)
}
```

## Conclusion

Binding Rust sockets to specific IPv4 addresses is straightforward with `TcpListener::bind` for servers. For source-binding client connections, use the `socket2` crate, which exposes lower-level socket APIs for bind-before-connect workflows. This level of control is essential for multi-homed hosts, traffic engineering, and testing network policies.
