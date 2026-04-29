# How to Use IPv6 UDP Sockets in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, UDP, Networking, Tokio, Multicast

Description: Use IPv6 UDP sockets in Rust for unicast messaging, multicast groups, and async UDP with Tokio.

## Basic IPv6 UDP Socket

```rust
use std::net::UdpSocket;

fn main() -> std::io::Result<()> {
    // Bind to IPv6 any address
    let socket = UdpSocket::bind("[::]:9000")?;
    println!("UDP server on {}", socket.local_addr()?);

    let mut buf = [0u8; 1500];
    loop {
        let (len, src) = socket.recv_from(&mut buf)?;
        let msg = std::str::from_utf8(&buf[..len]).unwrap_or("<binary>");
        println!("From {}: {}", src, msg);

        // Echo back
        socket.send_to(&buf[..len], src)?;
    }
}
```

## IPv6 UDP Client

```rust
use std::net::UdpSocket;

fn main() -> std::io::Result<()> {
    // Bind to ephemeral port on any IPv6 interface
    let socket = UdpSocket::bind("[::]:0")?;

    let server = "[::1]:9000";
    let msg = b"Hello over IPv6 UDP";

    socket.send_to(msg, server)?;
    println!("Sent {} bytes to {}", msg.len(), server);

    let mut buf = [0u8; 1500];
    let (len, from) = socket.recv_from(&mut buf)?;
    println!("Response from {}: {}", from, std::str::from_utf8(&buf[..len]).unwrap());

    Ok(())
}
```

## IPv6 Multicast

IPv6 multicast uses `ff00::/8` addresses. Join a multicast group to receive packets sent to that group:

```rust
use std::net::{Ipv6Addr, UdpSocket};

fn main() -> std::io::Result<()> {
    let socket = UdpSocket::bind("[::]:5353")?;

    // Join ff02::fb (mDNS multicast) on interface index 0 (any)
    let multicast_addr: Ipv6Addr = "ff02::fb".parse().unwrap();
    socket.join_multicast_v6(&multicast_addr, 0)?;

    println!("Joined multicast group ff02::fb");

    let mut buf = [0u8; 1500];
    loop {
        let (len, src) = socket.recv_from(&mut buf)?;
        println!("Multicast from {}: {} bytes", src, len);
    }
}
```

To send link-local multicast, specify the outgoing interface with the destination scope ID:

```rust
use std::net::{Ipv6Addr, SocketAddrV6, UdpSocket};

fn send_multicast(message: &[u8], iface_index: u32) -> std::io::Result<()> {
    let socket = UdpSocket::bind("[::]:0")?;

    // Use the scope ID to choose the outgoing interface
    let multicast_addr = SocketAddrV6::new(
        "ff02::1".parse::<Ipv6Addr>().unwrap(),
        5000,
        0,
        iface_index,
    );

    socket.send_to(message, multicast_addr)?;
    println!("Sent {} bytes to {}", message.len(), multicast_addr);

    Ok(())
}

fn main() -> std::io::Result<()> {
    send_multicast(b"announcement", 1)?; // replace 1 with your interface index
    Ok(())
}
```

## Async UDP with Tokio

```toml
# Cargo.toml

[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
use tokio::net::UdpSocket;

#[tokio::main]
async fn main() -> tokio::io::Result<()> {
    let socket = UdpSocket::bind("[::]:9000").await?;
    println!("Async UDP server on {}", socket.local_addr()?);

    let mut buf = vec![0u8; 4096];
    loop {
        let (len, src) = socket.recv_from(&mut buf).await?;
        let msg = String::from_utf8_lossy(&buf[..len]);
        println!("From {}: {}", src, msg);
        socket.send_to(&buf[..len], src).await?;
    }
}
```

## Async UDP with Shared Socket (Arc)

When multiple tasks need to send from the same socket, wrap it in `Arc`:

```rust
use std::sync::Arc;
use tokio::net::UdpSocket;

#[tokio::main]
async fn main() -> tokio::io::Result<()> {
    let socket = Arc::new(UdpSocket::bind("[::]:9000").await?);

    let targets = ["[::1]:9001", "[::1]:9002"];
    let mut handles = Vec::new();

    for target in targets {
        let send_sock = socket.clone();
        handles.push(tokio::spawn(async move {
            send_sock.send_to(b"ping", target).await.unwrap();
        }));
    }

    for handle in handles {
        handle.await.unwrap();
    }

    Ok(())
}
```

## Setting Socket Options

```rust
use std::net::UdpSocket;
use std::time::Duration;

fn configured_udp_socket() -> std::io::Result<UdpSocket> {
    let socket = UdpSocket::bind("[::]:0")?;

    // Set read/write timeouts
    socket.set_read_timeout(Some(Duration::from_secs(5)))?;
    socket.set_write_timeout(Some(Duration::from_secs(5)))?;

    // Control whether this socket receives the IPv6 multicast packets it sends
    socket.set_multicast_loop_v6(true)?;

    Ok(socket)
}

fn main() -> std::io::Result<()> {
    let sock = configured_udp_socket()?;
    println!("Socket ready: {}", sock.local_addr()?);
    Ok(())
}
```

## Conclusion

Rust's `std::net::UdpSocket` handles IPv6 by binding to `[::]:port` or a specific IPv6 address. Multicast group membership uses `join_multicast_v6()` with an interface index. For async applications, Tokio's `UdpSocket` mirrors the API with `.await` semantics. Wrap shared send sockets in `Arc` to allow multiple tasks to send concurrently.
