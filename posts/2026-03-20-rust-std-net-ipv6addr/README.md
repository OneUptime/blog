# How to Use Rust std::net::Ipv6Addr for IPv6 Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Std::net, Networking, Systems Programming

Description: Use Rust's std::net::Ipv6Addr type for IPv6 address operations including parsing, classification, manipulation, and network programming.

## The Ipv6Addr Type

Rust's `std::net::Ipv6Addr` is a 128-bit IPv6 address type in the standard library. It provides parsing, formatting, classification, and conversion methods.

```rust
use std::net::Ipv6Addr;

fn main() {
    // Construct from segments (each is a 16-bit value)
    let addr = Ipv6Addr::new(0x2001, 0x0db8, 0, 0, 0, 0, 0, 1);
    println!("{}", addr);  // 2001:db8::1

    // Parse from string
    let addr2: Ipv6Addr = "2001:db8::1".parse().unwrap();
    assert_eq!(addr, addr2);

    // Well-known constants
    println!("{}", Ipv6Addr::LOCALHOST);   // ::1
    println!("{}", Ipv6Addr::UNSPECIFIED); // ::
}
```

## Classifying IPv6 Addresses

```rust
use std::net::Ipv6Addr;

fn classify_ipv6(addr: Ipv6Addr) -> &'static str {
    if addr.is_loopback() {
        "loopback"
    } else if addr.is_unspecified() {
        "unspecified"
    } else if addr.is_multicast() {
        "multicast"
    } else if addr.is_unicast_link_local() {
        "link-local unicast"
    } else if addr.is_unique_local() {
        "unique local"
    } else {
        "other unicast"
    }
}

fn main() {
    let tests = [
        "::1",
        "::",
        "ff02::1",
        "fe80::1",
        "2001:db8::1",
        "fc00::1",
    ];

    for s in tests {
        let addr: Ipv6Addr = s.parse().unwrap();
        println!("{:<20} → {}", s, classify_ipv6(addr));
    }
}
```

## Converting Between Representations

```rust
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

fn main() {
    // Convert Ipv6Addr to octets (16 bytes)
    let addr: Ipv6Addr = "2001:db8::1".parse().unwrap();
    let octets: [u8; 16] = addr.octets();
    println!("{:?}", octets);

    // Construct from octets
    let addr2 = Ipv6Addr::from(octets);
    assert_eq!(addr, addr2);

    // IPv4-mapped IPv6: detect and convert
    let mapped: Ipv6Addr = "::ffff:192.168.1.1".parse().unwrap();
    if let Some(ipv4) = mapped.to_ipv4_mapped() {
        println!("IPv4-mapped: {}", ipv4);  // 192.168.1.1
    }

    // Promote IPv4 to IPv4-mapped IPv6
    let ipv4: Ipv4Addr = "10.0.0.1".parse().unwrap();
    let as_v6: Ipv6Addr = ipv4.to_ipv6_mapped();
    println!("{}", as_v6);  // ::ffff:10.0.0.1

    // Use IpAddr enum for dual-stack code
    let ip: IpAddr = "2001:db8::1".parse().unwrap();
    match ip {
        IpAddr::V4(v4) => println!("IPv4: {}", v4),
        IpAddr::V6(v6) => println!("IPv6: {}", v6),
    }
}
```

## Checking Address Ranges

`std::net::Ipv6Addr` doesn't include CIDR membership checks natively - use the `ipnetwork` or `ipnet` crate for that. However, you can check address properties directly:

```rust
use std::net::Ipv6Addr;

fn is_documentation(addr: &Ipv6Addr) -> bool {
    // Documentation prefixes: 2001:db8::/32 (RFC 3849) and 3fff::/20 (RFC 9637)
    let segs = addr.segments();
    (segs[0] == 0x2001 && segs[1] == 0x0db8)
        || (segs[0] == 0x3fff && (segs[1] & 0xf000) == 0)
}

fn is_6to4(addr: &Ipv6Addr) -> bool {
    // 2002::/16
    addr.segments()[0] == 0x2002
}

fn main() {
    let doc_addr: Ipv6Addr = "2001:db8::abcd".parse().unwrap();
    let global_addr: Ipv6Addr = "2001:4860:4860::8888".parse().unwrap();

    println!("doc_addr is documentation: {}", is_documentation(&doc_addr));
    println!("global_addr is documentation: {}", is_documentation(&global_addr));
    println!("doc_addr segments: {:?}", doc_addr.segments());
}
```

## Using Ipv6Addr in Network Sockets

```rust
use std::net::{Ipv6Addr, SocketAddrV6, TcpListener};

fn main() -> std::io::Result<()> {
    // SocketAddrV6 holds address + port + flowinfo + scope_id
    let addr = SocketAddrV6::new(
        Ipv6Addr::UNSPECIFIED,  // [::]
        8080,
        0,  // flowinfo
        0,  // scope_id (0 = no zone)
    );

    let listener = TcpListener::bind(addr)?;
    println!("Listening on {}", listener.local_addr()?);

    // For link-local addresses, set scope_id to interface index
    let link_local: Ipv6Addr = "fe80::1".parse().unwrap();
    let _ll_addr = SocketAddrV6::new(link_local, 22, 0, 2); // example interface index

    Ok(())
}
```

## Iterating Over Address Space

```rust
use std::net::Ipv6Addr;

fn next_addr(addr: Ipv6Addr) -> Option<Ipv6Addr> {
    let n = u128::from(addr);
    n.checked_add(1).map(Ipv6Addr::from)
}

fn main() {
    // Enumerate first 5 addresses in 2001:db8::/32
    let start: Ipv6Addr = "2001:db8::".parse().unwrap();
    let mut current = start;

    for i in 0..5 {
        println!("{}: {}", i, current);
        current = next_addr(current).unwrap();
    }
}
```

`u128` conversion is the idiomatic way to do arithmetic on IPv6 addresses in Rust - `Ipv6Addr` implements `From<u128>` and `From<[u8;16]>`.

## Conclusion

`std::net::Ipv6Addr` provides the foundational IPv6 type in Rust. It supports parsing, formatting, classification via predicate methods (`is_loopback()`, `is_multicast()`, `is_unique_local()`), and conversion to/from octets and `u128`. For CIDR operations, use the `ipnet` crate. For socket programming, pair it with `SocketAddrV6` to carry the port and scope ID alongside the address.
