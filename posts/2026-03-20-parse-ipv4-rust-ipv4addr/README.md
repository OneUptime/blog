# How to Parse IPv4 Addresses in Rust Using std::net::Ipv4Addr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv4, Ipv4Addr, Networking, Parsing, Std::net

Description: Learn how to parse, construct, and manipulate IPv4 addresses in Rust using the std::net::Ipv4Addr type.

## Parsing IPv4 Addresses

```rust
use std::net::Ipv4Addr;
use std::str::FromStr;

fn main() {
    // Method 1: parse() - returns Result<Ipv4Addr, AddrParseError>
    let ip: Ipv4Addr = "192.168.1.100".parse().expect("Invalid IPv4");
    println!("Parsed: {}", ip);

    // Method 2: FromStr trait (same as parse())
    let ip = Ipv4Addr::from_str("10.0.0.1").unwrap();
    println!("FromStr: {}", ip);

    // Method 3: From octets
    let ip = Ipv4Addr::new(172, 16, 0, 1);
    println!("From octets: {}", ip);

    // Method 4: From a u32 (big-endian)
    let ip = Ipv4Addr::from(0xC0A80101_u32);  // 192.168.1.1
    println!("From u32: {}", ip);

    // Method 5: From [u8; 4]
    let ip = Ipv4Addr::from([192, 168, 1, 1]);
    println!("From array: {}", ip);
}
```

## Handling Parse Errors

```rust
use std::net::Ipv4Addr;

fn parse_ipv4(s: &str) -> Result<Ipv4Addr, String> {
    s.parse::<Ipv4Addr>()
        .map_err(|e| format!("Invalid IPv4 '{}': {}", s, e))
}

fn main() {
    let test_cases = vec![
        "192.168.1.1",    // valid
        "10.0.0.256",     // invalid (octet > 255)
        "1.2.3",          // invalid (too few octets)
        "::1",            // invalid (IPv6)
        "not-an-ip",      // invalid
    ];

    for s in test_cases {
        match parse_ipv4(s) {
            Ok(ip) => println!("{:<20} -> OK: {}", s, ip),
            Err(e) => println!("{:<20} -> Error: {}", s, e),
        }
    }
}
```

## Accessing Octets and Fields

```rust
use std::net::Ipv4Addr;

fn main() {
    let ip = Ipv4Addr::new(192, 168, 1, 100);

    // octets() returns [u8; 4]
    let octets = ip.octets();
    println!("Octets: {:?}", octets);
    println!("First octet: {}", octets[0]);

    // to_bits() returns u32 (big-endian)
    let as_u32 = u32::from(ip);
    println!("As u32: {}", as_u32);
    println!("As hex: {:08X}", as_u32);

    // Convert back
    let back: Ipv4Addr = Ipv4Addr::from(as_u32);
    println!("Back to IP: {}", back);
}
```

## IP Classification

```rust
use std::net::Ipv4Addr;

fn classify(ip: Ipv4Addr) {
    println!("{}:", ip);
    println!("  is_loopback:     {}", ip.is_loopback());     // 127.0.0.0/8
    println!("  is_private:      {}", ip.is_private());      // RFC 1918
    println!("  is_link_local:   {}", ip.is_link_local());   // 169.254.0.0/16
    println!("  is_multicast:    {}", ip.is_multicast());    // 224.0.0.0/4
    println!("  is_broadcast:    {}", ip.is_broadcast());    // 255.255.255.255
    println!("  is_unspecified:  {}", ip.is_unspecified());  // 0.0.0.0
    // is_global() is unstable; on nightly enable with #![feature(ip)]
    // println!("  is_global:       {}", ip.is_global());
}

fn main() {
    for s in ["192.168.1.1", "8.8.8.8", "127.0.0.1", "224.0.0.1", "255.255.255.255"] {
        classify(s.parse().unwrap());
    }
}
```

## Working with SocketAddr

```rust
use std::net::{Ipv4Addr, SocketAddrV4};

fn main() {
    let ip = Ipv4Addr::new(0, 0, 0, 0);  // 0.0.0.0
    let port = 9000u16;

    // SocketAddrV4 combines an Ipv4Addr with a port
    let addr = SocketAddrV4::new(ip, port);
    println!("Socket address: {}", addr);  // "0.0.0.0:9000"
    println!("IP: {}, Port: {}", addr.ip(), addr.port());
}
```

## Conclusion

`Ipv4Addr` is Rust's built-in type for IPv4 address representation. Parse with `.parse::<Ipv4Addr>()` which returns a `Result`, handling invalid input gracefully. Use `octets()` for byte access, `u32::from(ip)` for integer conversion, and classification methods like `is_private()` and `is_loopback()` for address categorization. Combine with `SocketAddrV4` when you need an address-port pair.
