# How to Parse IPv6 Addresses in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Parsing, Std::net, Networking

Description: Parse IPv6 addresses in Rust from strings, log lines, URLs, and network packets using std::net and the ipnet crate.

## Basic Parsing with std::net

Rust's `FromStr` implementation for `Ipv6Addr` handles all standard IPv6 forms including compressed notation.

```rust
use std::net::{IpAddr, Ipv6Addr};
use std::str::FromStr;

fn main() {
    // Compressed notation
    let a: Ipv6Addr = "2001:db8::1".parse().unwrap();

    // Full notation
    let b: Ipv6Addr = "2001:0db8:0000:0000:0000:0000:0000:0001".parse().unwrap();

    assert_eq!(a, b);

    // IpAddr enum - handles both IPv4 and IPv6
    let ip: IpAddr = "2001:db8::1".parse().unwrap();
    match ip {
        IpAddr::V6(v6) => println!("IPv6: {}", v6),
        IpAddr::V4(v4) => println!("IPv4: {}", v4),
    }

    // Error handling
    match Ipv6Addr::from_str("not-an-address") {
        Ok(addr) => println!("{}", addr),
        Err(e) => println!("Parse error: {}", e),
    }
}
```

## Parsing IPv6 with Ports

IPv6 addresses in socket notation are bracketed: `[2001:db8::1]:8080`.

```rust
use std::net::SocketAddr;

fn parse_socket_addr(s: &str) -> Option<(String, u16)> {
    let addr: SocketAddr = s.parse().ok()?;
    Some((addr.ip().to_string(), addr.port()))
}

fn main() {
    // IPv6 socket address
    let (ip, port) = parse_socket_addr("[2001:db8::1]:8080").unwrap();
    println!("IP: {}, Port: {}", ip, port);

    // IPv4 socket address - same function works
    let (ip4, port4) = parse_socket_addr("192.168.1.1:80").unwrap();
    println!("IP: {}, Port: {}", ip4, port4);
}
```

## Parsing CIDRs with ipnet

The `ipnet` crate provides `Ipv6Net` for CIDR prefix handling:

```toml
# Cargo.toml

[dependencies]
ipnet = "2"
```

```rust
use ipnet::Ipv6Net;
use std::net::Ipv6Addr;

fn main() {
    let net: Ipv6Net = "2001:db8::/32".parse().unwrap();

    println!("Network:   {}", net.network());
    println!("Broadcast: {}", net.broadcast());
    println!("Prefix:    {}", net.prefix_len());
    println!("Hosts:     2^{}", 128 - net.prefix_len());

    // Check membership
    let addr: Ipv6Addr = "2001:db8::1".parse().unwrap();
    println!("Contains: {}", net.contains(&addr));
}
```

## Extracting IPv6 Addresses from Log Lines

```rust
use std::net::Ipv6Addr;
use regex::Regex;

// Cargo.toml: regex = "1"

fn extract_ipv6_from_log(line: &str) -> Vec<Ipv6Addr> {
    // Match IPv6 addresses in various formats (simplified pattern)
    let re = Regex::new(
        r"((?:[0-9a-fA-F]{1,4}:){1,7}(?::[0-9a-fA-F]{1,4})+|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4})*)?|(?:[0-9a-fA-F]{1,4}:){1,7}:)"
    ).unwrap();

    re.captures_iter(line)
        .filter_map(|cap| cap[1].parse::<Ipv6Addr>().ok())
        .collect()
}

fn main() {
    let log = "2026-01-01 client 2001:db8::42 connected, src 2001:db8::1";
    let addrs = extract_ipv6_from_log(log);
    for addr in addrs {
        println!("Found: {}", addr);
    }
}
```

## Parsing IPv6 from URL Strings

IPv6 literals in URLs are enclosed in brackets per RFC 2732. The `url` crate handles this:

```toml
# Cargo.toml
[dependencies]
url = "2"
```

```rust
use std::net::IpAddr;
use url::{Host, Url};

fn extract_host_ip(raw_url: &str) -> Option<IpAddr> {
    let url = Url::parse(raw_url).ok()?;
    match url.host()? {
        Host::Ipv4(addr) => Some(IpAddr::V4(addr)),
        Host::Ipv6(addr) => Some(IpAddr::V6(addr)),
        Host::Domain(_) => None,
    }
}

fn main() {
    let urls = [
        "http://[2001:db8::1]:8080/path",
        "https://[::1]/",
        "http://192.168.1.1/",
    ];

    for url in urls {
        let parsed = Url::parse(url).unwrap();
        println!("{} → host: {:?}", url, parsed.host_str());
    }
}
```

## Parsing IPv6 from Packet Bytes

Reading a raw IPv6 header from bytes (the address starts at byte 8 for source, byte 24 for destination):

```rust
use std::net::Ipv6Addr;

fn parse_ipv6_header(raw: &[u8]) -> Option<(Ipv6Addr, Ipv6Addr)> {
    if raw.len() < 40 {
        return None;  // IPv6 header is 40 bytes
    }

    let src_bytes: [u8; 16] = raw[8..24].try_into().ok()?;
    let dst_bytes: [u8; 16] = raw[24..40].try_into().ok()?;

    Some((Ipv6Addr::from(src_bytes), Ipv6Addr::from(dst_bytes)))
}

fn main() {
    // Minimal IPv6 header fragment (version=6, src=2001:db8::1, dst=2001:db8::2)
    let mut header = [0u8; 40];
    header[0] = 0x60; // version 6
    // src: 2001:db8::1
    header[8..24].copy_from_slice(&[
        0x20,0x01, 0x0d,0xb8, 0,0, 0,0, 0,0, 0,0, 0,0, 0,1
    ]);
    // dst: 2001:db8::2
    header[24..40].copy_from_slice(&[
        0x20,0x01, 0x0d,0xb8, 0,0, 0,0, 0,0, 0,0, 0,0, 0,2
    ]);

    if let Some((src, dst)) = parse_ipv6_header(&header) {
        println!("src={} dst={}", src, dst);
    }
}
```

## Conclusion

Rust provides robust IPv6 parsing through `std::net::Ipv6Addr`'s `FromStr` implementation. Use `SocketAddr` for bracketed address+port strings. For CIDR prefix handling, the `ipnet` crate adds `Ipv6Net`. Raw bytes parse directly into `Ipv6Addr` via `from([u8; 16])`. Always propagate parse errors with `?` or pattern match the `Result` - Rust's type system ensures you handle malformed input explicitly.
