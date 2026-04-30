# How to Convert Between IPv4 Addresses and Integers in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv4, Integer Conversion, Ipv4Addr, Networking, Binary

Description: Learn how to convert between IPv4 address strings and their 32-bit integer representation in Rust using std::net::Ipv4Addr and From/Into traits.

## IPv4 to u32

```rust
use std::net::Ipv4Addr;

fn ipv4_to_u32(ip: Ipv4Addr) -> u32 {
    // u32::from() uses the same integer representation as Ipv4Addr::to_bits()
    u32::from(ip)
}

fn main() {
    let examples = [
        ("0.0.0.0", 0u32),
        ("10.0.0.1", 0x0A000001),
        ("192.168.1.1", 0xC0A80101),
        ("255.255.255.255", 0xFFFFFFFF),
    ];

    for (s, expected) in examples {
        let ip: Ipv4Addr = s.parse().unwrap();
        let num = u32::from(ip);
        let matches = if num == expected { "✓" } else { "✗" };
        println!("{} {} -> {} (0x{:08X})", matches, s, num, num);
    }
}
```

## u32 to IPv4

```rust
use std::net::Ipv4Addr;

fn u32_to_ipv4(n: u32) -> Ipv4Addr {
    Ipv4Addr::from(n)
}

fn main() {
    let numbers = [0u32, 167772161, 3232235777, 4294967295];
    for n in numbers {
        let ip = Ipv4Addr::from(n);
        println!("{:>12} (0x{:08X}) -> {}", n, n, ip);
    }
}
```

## Using Octets for Conversion

```rust
use std::net::Ipv4Addr;

fn ip_to_u32_manual(ip: Ipv4Addr) -> u32 {
    let [a, b, c, d] = ip.octets();
    ((a as u32) << 24)
        | ((b as u32) << 16)
        | ((c as u32) << 8)
        | (d as u32)
}

fn u32_to_ip_manual(n: u32) -> Ipv4Addr {
    Ipv4Addr::new(
        ((n >> 24) & 0xFF) as u8,
        ((n >> 16) & 0xFF) as u8,
        ((n >>  8) & 0xFF) as u8,
        ((n      ) & 0xFF) as u8,
    )
}
```

## Practical: IP Range Check

```rust
use std::net::Ipv4Addr;

fn is_in_range(ip: Ipv4Addr, start: Ipv4Addr, end: Ipv4Addr) -> bool {
    let n = u32::from(ip);
    let s = u32::from(start);
    let e = u32::from(end);
    n >= s && n <= e
}

fn main() {
    let ip = "192.168.1.50".parse().unwrap();
    let start = "192.168.1.1".parse().unwrap();
    let end = "192.168.1.100".parse().unwrap();

    println!("In range: {}", is_in_range(ip, start, end));  // true
}
```

## Sorting IPv4 Addresses

```rust
use std::net::Ipv4Addr;

fn main() {
    let mut ips: Vec<Ipv4Addr> = vec![
        "10.0.0.5".parse().unwrap(),
        "192.168.1.1".parse().unwrap(),
        "10.0.0.1".parse().unwrap(),
        "172.16.0.1".parse().unwrap(),
    ];

    // Sort by converting to u32 for comparison
    ips.sort_by_key(|ip| u32::from(*ip));

    for ip in &ips {
        println!("{}", ip);
    }
}
```

## Incrementing an IPv4 Address

```rust
use std::net::Ipv4Addr;

fn next_ip(ip: Ipv4Addr) -> Option<Ipv4Addr> {
    let n = u32::from(ip);
    n.checked_add(1).map(Ipv4Addr::from)
}

fn enumerate_subnet(network: Ipv4Addr, prefix: u8) -> Vec<Ipv4Addr> {
    assert!(prefix <= 32, "prefix must be between /0 and /32");

    let host_bits = 32 - prefix as u32;
    let count = (1u64 << host_bits).saturating_sub(2);  // Exclude network + broadcast
    let start = u32::from(network).saturating_add(1);  // Skip network address

    (0..count)
        .filter_map(|i| start.checked_add(i as u32))
        .map(Ipv4Addr::from)
        .collect()
}

fn main() {
    let hosts = enumerate_subnet("192.168.1.0".parse().unwrap(), 29);
    println!("/29 hosts ({}):", hosts.len());
    for h in &hosts { println!("  {}", h); }
}
```

## Conclusion

Rust's `Ipv4Addr` seamlessly converts to and from `u32` via `u32::from(ip)` and `Ipv4Addr::from(n)`. These conversions use the same integer representation as `Ipv4Addr::to_bits()` and `Ipv4Addr::from_bits()`, which Rust documents in native byte order. The `u32` representation enables efficient IP arithmetic: range checks, sorting, subnet enumeration, and address incrementing, all expressible as simple integer operations.
