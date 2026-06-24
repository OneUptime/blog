# How to Use Rust Ipv6Addr for IPv6 Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Ipv6Addr, IPv6, Standard Library, Std::net, Network Programming

Description: Use Rust's std::net::Ipv6Addr type for IPv6 address parsing, classification, manipulation, and prefix operations in network applications.

## Introduction

Rust's standard library includes `std::net::Ipv6Addr` for IPv6 address representation. It is a Copy type that does not allocate, supports common address classifications, and can be combined with the `ipnet` crate for prefix operations.

## Basic Ipv6Addr Operations

```rust
use std::net::Ipv6Addr;

fn main() {
    // Parse IPv6 address
    let addr: Ipv6Addr = "2001:db8::1".parse().unwrap();

    println!("{}", addr);             // 2001:db8::1
    println!("{:?}", addr.segments()); // [8193, 3512, 0, 0, 0, 0, 0, 1]
    println!("{}", addr.is_loopback()); // false
    println!("{}", addr.is_unspecified()); // false

    // Special addresses
    println!("{}", Ipv6Addr::LOCALHOST);   // ::1
    println!("{}", Ipv6Addr::UNSPECIFIED); // ::

    // Loopback
    let lo = Ipv6Addr::LOCALHOST;
    println!("{}", lo.is_loopback()); // true

    // Multicast
    let mcast: Ipv6Addr = "ff02::1".parse().unwrap();
    println!("{}", mcast.is_multicast()); // true

    // Link-local
    let ll: Ipv6Addr = "fe80::1".parse().unwrap();
    println!("{}", ll.is_unicast_link_local()); // true
}
```

## Address Classification

```rust
use std::net::Ipv6Addr;

fn is_documentation(addr: Ipv6Addr) -> bool {
    let segments = addr.segments();
    (segments[0] == 0x2001 && segments[1] == 0x0db8)
        || (segments[0] == 0x3fff && segments[1] & 0xf000 == 0)
}

fn classify_ipv6(addr: Ipv6Addr) -> &'static str {
    if addr.is_loopback() {
        "loopback"
    } else if addr.is_unspecified() {
        "unspecified"
    } else if addr.is_multicast() {
        "multicast"
    } else if addr.is_unicast_link_local() {
        "link-local"
    } else if addr.is_unique_local() {
        "unique-local (ULA)"
    } else if addr.to_ipv4_mapped().is_some() {
        "IPv4-mapped"
    } else if is_documentation(addr) {
        "documentation"
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
        "fd00::1",
        "::ffff:192.0.2.1",
        "2001:db8::1",
        "2606:4700::1",
    ];

    for addr_str in tests {
        let addr: Ipv6Addr = addr_str.parse().unwrap();
        println!("{}: {}", addr, classify_ipv6(addr));
    }
}
```

## IPv4-Mapped IPv6 Handling

```rust
use std::net::IpAddr;

fn normalize_ip(addr: IpAddr) -> IpAddr {
    match addr {
        IpAddr::V6(v6) => {
            // Unmap IPv4-mapped IPv6 addresses (::ffff:1.2.3.4 → 1.2.3.4)
            if let Some(v4) = v6.to_ipv4_mapped() {
                IpAddr::V4(v4)
            } else {
                IpAddr::V6(v6)
            }
        }
        v4 => v4,
    }
}

fn main() {
    let mapped: IpAddr = "::ffff:192.0.2.1".parse().unwrap();
    let normalized = normalize_ip(mapped);
    println!("{}", normalized); // 192.0.2.1

    let pure_v6: IpAddr = "2001:db8::1".parse().unwrap();
    println!("{}", normalize_ip(pure_v6)); // 2001:db8::1 (unchanged)
}
```

## Prefix Operations with ipnet Crate

```rust
// Cargo.toml
// [dependencies]
// ipnet = "2"

use ipnet::Ipv6Net;
use std::net::Ipv6Addr;

fn main() {
    // Create a /48 prefix
    let prefix: Ipv6Net = "2001:db8:1::/48".parse().unwrap();

    println!("{}", prefix.network());  // 2001:db8:1::
    println!("{}", prefix.broadcast()); // 2001:db8:1:ffff:ffff:ffff:ffff:ffff
    println!("{}", prefix.prefix_len()); // 48

    // Check containment
    let addr: Ipv6Addr = "2001:db8:1::1".parse().unwrap();
    println!("{}", prefix.contains(&addr)); // true

    // Subnet the /48 into /64s
    for subnet in prefix.subnets(64).unwrap().take(5) {
        println!("{}", subnet);
    }

    // Get the /64 prefix of an address
    let full_addr: Ipv6Addr = "2001:db8:1:2:3:4:5:6".parse().unwrap();
    let net = Ipv6Net::new(full_addr, 64).unwrap().trunc();
    println!("/{} subnet: {}", 64, net); // 2001:db8:1:2::/64
}
```

## Rate Limiting by /64 Subnet

```rust
use ipnet::Ipv6Net;
use std::collections::HashMap;
use std::net::Ipv6Addr;
use std::time::{Duration, Instant};

struct RateLimiter {
    counts: HashMap<Ipv6Net, Vec<Instant>>,
    window: Duration,
    limit: usize,
}

impl RateLimiter {
    fn new(window: Duration, limit: usize) -> Self {
        Self {
            counts: HashMap::new(),
            window,
            limit,
        }
    }

    fn allow(&mut self, addr: Ipv6Addr) -> bool {
        // Get /64 prefix as rate limit key
        let key = Ipv6Net::new(addr, 64).unwrap().trunc();
        let now = Instant::now();
        let cutoff = now - self.window;

        let times = self.counts.entry(key).or_default();
        times.retain(|&t| t > cutoff);
        times.push(now);

        times.len() <= self.limit
    }
}
```

## Conclusion

Rust's `Ipv6Addr` is a Copy type with built-in classification methods: `is_loopback()`, `is_multicast()`, `is_unicast_link_local()`, `is_unique_local()`, and `to_ipv4_mapped()`. Add the `ipnet` crate for prefix/subnet operations. Use `IpAddr` enum for code that handles both IPv4 and IPv6. These primitives power correct IPv6 handling in Actix-web, Axum, and other Rust web frameworks. Use in OneUptime's Rust components for efficient IP address processing.
