# How to Use SocketAddr and SocketAddrV4 in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, SocketAddr, SocketAddrV4, IPv4, Networking, Std::net

Description: Learn how to work with SocketAddr and SocketAddrV4 in Rust for representing and manipulating IPv4 address-port pairs in network applications.

## SocketAddrV4 vs SocketAddr

- `SocketAddrV4` - IPv4 address + port (always IPv4)
- `SocketAddr` - enum that can hold either `V4(SocketAddrV4)` or `V6(SocketAddrV6)`

Use `SocketAddrV4` when you know you're working with IPv4; use `SocketAddr` for code that accepts both.

## Creating SocketAddrV4

```rust
use std::net::{Ipv4Addr, SocketAddrV4};

fn main() {
    // Method 1: from Ipv4Addr + port
    let ip = Ipv4Addr::new(127, 0, 0, 1);
    let addr = SocketAddrV4::new(ip, 8080);
    println!("Address: {}", addr);       // "127.0.0.1:8080"
    println!("IP: {}", addr.ip());       // "127.0.0.1"
    println!("Port: {}", addr.port());   // 8080

    // Method 2: parse from string
    let addr: SocketAddrV4 = "192.168.1.1:9000".parse().unwrap();
    println!("Parsed: {}", addr);

    // Method 3: using predefined constants
    let any = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 9000);  // 0.0.0.0:9000
    let loopback = SocketAddrV4::new(Ipv4Addr::LOCALHOST, 9000);  // 127.0.0.1:9000
    println!("Any: {}", any);
    println!("Loopback: {}", loopback);
}
```

## Working with SocketAddr Enum

```rust
use std::net::{SocketAddr, SocketAddrV4, Ipv4Addr};

fn print_socket_info(addr: SocketAddr) {
    match addr {
        SocketAddr::V4(v4) => {
            println!("IPv4: {} (ip={}, port={})", v4, v4.ip(), v4.port());
        }
        SocketAddr::V6(v6) => {
            println!("IPv6: {}", v6);
        }
    }
}

fn main() {
    // From SocketAddrV4
    let v4 = SocketAddrV4::new(Ipv4Addr::new(10, 0, 0, 1), 3000);
    let addr = SocketAddr::V4(v4);
    print_socket_info(addr);

    // Parse from string (returns SocketAddr)
    let addr: SocketAddr = "192.168.1.100:8080".parse().unwrap();
    print_socket_info(addr);

    // Check if IPv4
    if addr.is_ipv4() {
        println!("It's IPv4!");
    }
}
```

## Using SocketAddr in TCP Connections

```rust
use std::net::{TcpStream, TcpListener, SocketAddrV4, Ipv4Addr, SocketAddr};

fn connect_to_v4(ip: Ipv4Addr, port: u16) -> std::io::Result<TcpStream> {
    let addr = SocketAddrV4::new(ip, port);
    // TcpStream::connect accepts any ToSocketAddrs; SocketAddr implements it
    TcpStream::connect(SocketAddr::V4(addr))
}

fn listen_on_v4(ip: Ipv4Addr, port: u16) -> std::io::Result<TcpListener> {
    let addr = SocketAddrV4::new(ip, port);
    TcpListener::bind(addr)  // TcpListener::bind accepts ToSocketAddrs
}
```

## Mutable Address Operations

```rust
use std::net::{SocketAddrV4, Ipv4Addr};

fn main() {
    let mut addr = SocketAddrV4::new(Ipv4Addr::new(0, 0, 0, 0), 8080);

    // Mutate IP
    addr.set_ip(Ipv4Addr::new(192, 168, 1, 50));

    // Mutate port
    addr.set_port(9090);

    println!("Updated address: {}", addr);  // "192.168.1.50:9090"
}
```

## Converting Between Formats

```rust
use std::net::{SocketAddr, SocketAddrV4, Ipv4Addr};

fn main() {
    let v4_addr = SocketAddrV4::new(Ipv4Addr::new(192, 168, 1, 1), 8080);

    // To SocketAddr
    let generic: SocketAddr = v4_addr.into();
    println!("SocketAddr: {}", generic);

    // From SocketAddr to SocketAddrV4
    if let SocketAddr::V4(v4) = generic {
        println!("SocketAddrV4: {}", v4);
    }

    // To string
    let s = v4_addr.to_string();
    println!("String: {}", s);

    // From string
    let parsed: SocketAddrV4 = s.parse().unwrap();
    println!("Parsed back: {}", parsed);
}
```

## Conclusion

`SocketAddrV4` pairs an `Ipv4Addr` with a port number and is the typed IPv4 address-port representation in Rust. Use `SocketAddr` when writing generic code that accepts both IPv4 and IPv6. Both types parse from `"ip:port"` strings and implement `ToSocketAddrs`, and `SocketAddrV4` converts into `SocketAddr`, making them usable in most standard library networking functions.
