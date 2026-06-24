# How to Build IPv6 Network Tools in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Network Tools, DNS, Port Scanner, Ping, CLI

Description: Build practical IPv6 network tools in Rust including ping utilities, port scanners, DNS lookup tools, and subnet calculators.

## IPv6 Reachability Checker

Check TCP reachability of an IPv6 address and port with a timeout:

```rust
use std::net::{Ipv6Addr, SocketAddrV6, TcpStream};
use std::time::Duration;

fn check_tcp_reachable(addr: Ipv6Addr, port: u16, timeout: Duration) -> bool {
    let socket_addr = SocketAddrV6::new(addr, port, 0, 0);
    TcpStream::connect_timeout(&socket_addr.into(), timeout).is_ok()
}

fn main() {
    let targets: &[(&str, u16)] = &[
        ("2001:4860:4860::8888", 53),  // Google DNS
        ("2620:fe::fe", 53),           // Hurricane Electric DNS
        ("::1", 22),                   // Localhost SSH
    ];

    for (addr_str, port) in targets {
        match addr_str.parse::<Ipv6Addr>() {
            Ok(addr) => {
                let reachable = check_tcp_reachable(addr, *port, Duration::from_secs(3));
                println!("[{}]:{} → {}", addr, port,
                    if reachable { "reachable" } else { "unreachable" });
            }
            Err(e) => eprintln!("Invalid address {}: {}", addr_str, e),
        }
    }
}
```

## Async IPv6 Port Scanner

```toml
# Cargo.toml

[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
use std::net::Ipv6Addr;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

async fn scan_port(addr: Ipv6Addr, port: u16) -> (u16, bool) {
    let target = format!("[{}]:{}", addr, port);
    let open = timeout(Duration::from_secs(2), TcpStream::connect(&target))
        .await
        .map(|r| r.is_ok())
        .unwrap_or(false);
    (port, open)
}

#[tokio::main]
async fn main() {
    let target: Ipv6Addr = std::env::args()
        .nth(1)
        .unwrap_or("::1".to_string())
        .parse()
        .expect("Invalid IPv6 address");

    let ports: Vec<u16> = vec![22, 53, 80, 443, 8080, 8443];
    println!("Scanning [{}]...", target);

    let mut handles = Vec::new();
    for port in ports {
        handles.push(tokio::spawn(scan_port(target, port)));
    }

    for handle in handles {
        let (port, open) = handle.await.unwrap();
        if open {
            println!("  port {} OPEN", port);
        }
    }
}
```

## IPv6 DNS Lookup Tool

```toml
# Cargo.toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
use std::net::{Ipv6Addr, SocketAddr};

async fn lookup_ipv6_addrs(hostname: &str) -> Vec<Ipv6Addr> {
    tokio::net::lookup_host(format!("{}:0", hostname))
        .await
        .map(|iter| {
            iter.filter_map(|sa| match sa {
                SocketAddr::V6(v6) => Some(*v6.ip()),
                SocketAddr::V4(_) => None,
            })
            .collect()
        })
        .unwrap_or_default()
}

fn reverse_ip6_arpa_name(addr: &str) -> String {
    let ipv6: std::net::Ipv6Addr = match addr.parse() {
        Ok(a) => a,
        Err(_) => return "invalid address".to_string(),
    };

    // Build the ip6.arpa name used for PTR lookups.
    let nibbles: String = ipv6.octets()
        .iter()
        .rev()
        .flat_map(|b| {
            let hi = (b >> 4) as u8;
            let lo = (b & 0xf) as u8;
            [
                char::from_digit(lo as u32, 16).unwrap(),
                '.',
                char::from_digit(hi as u32, 16).unwrap(),
                '.',
            ]
        })
        .collect();

    format!("{}.ip6.arpa", nibbles.trim_end_matches('.'))
}

#[tokio::main]
async fn main() {
    let host = "ipv6.google.com";
    println!("IPv6 addresses for {}:", host);
    for ip in lookup_ipv6_addrs(host).await {
        println!("  {}", ip);
    }

    let addr = "2001:4860:4860::8888";
    println!("\nReverse lookup name for {}:", addr);
    println!("  {}", reverse_ip6_arpa_name(addr));
}
```

## IPv6 Subnet Calculator

```toml
# Cargo.toml
[dependencies]
ipnet = "2"
```

```rust
use ipnet::Ipv6Net;

fn subnet_info(prefix: &str) {
    let net: Ipv6Net = match prefix.parse() {
        Ok(n) => n,
        Err(e) => {
            eprintln!("Invalid prefix {}: {}", prefix, e);
            return;
        }
    };

    println!("Prefix:       {}", net);
    println!("Network addr: {}", net.network());
    println!("Last addr:    {}", net.broadcast());
    println!("Prefix len:   /{}", net.prefix_len());
    println!("Host bits:    {}", 128 - net.prefix_len());
    println!("Addresses:    2^{}", 128 - net.prefix_len());

    // Show first 4 child subnets by extending the prefix by 2 bits.
    if net.prefix_len() <= 46 {
        let subnets: Vec<Ipv6Net> = net.subnets(net.prefix_len() + 2)
            .unwrap()
            .take(4)
            .collect();
        println!("First 4 /{} subnets:", net.prefix_len() + 2);
        for s in subnets {
            println!("  {}", s);
        }
    }
}

fn main() {
    subnet_info("2001:db8::/32");
    println!();
    subnet_info("2001:db8::/48");
}
```

## Network Interface Lister (Unix)

```toml
# Cargo.toml
[dependencies]
nix = { version = "0.31", features = ["net"] }
```

```rust
use std::net::Ipv6Addr;

fn ipv6_addr_type(ip: Ipv6Addr) -> &'static str {
    if ip.is_loopback() {
        "loopback"
    } else if ip.is_unicast_link_local() {
        "link-local"
    } else if ip.is_unique_local() {
        "unique-local"
    } else if ip.is_multicast() {
        "multicast"
    } else if ip.is_unspecified() {
        "unspecified"
    } else {
        "global-or-other"
    }
}

fn list_ipv6_interfaces() {
    let interfaces = match nix::ifaddrs::getifaddrs() {
        Ok(i) => i,
        Err(e) => {
            eprintln!("getifaddrs failed: {}", e);
            return;
        }
    };

    println!("{:<15} {:<40} Type", "Interface", "IPv6 Address");
    println!("{}", "-".repeat(70));

    for iface in interfaces {
        if let Some(addr) = iface.address {
            if let Some(sa) = addr.as_sockaddr_in6() {
                let ip = sa.ip();
                println!("{:<15} {:<40} {}", iface.interface_name, ip, ipv6_addr_type(ip));
            }
        }
    }
}

fn main() {
    list_ipv6_interfaces();
}
```

## Conclusion

Rust's combination of zero-cost abstractions and Tokio async runtime makes it excellent for IPv6 network tooling. `TcpStream::connect_timeout` handles synchronous reachability checks. Async port scanners use `tokio::spawn` to parallelize probe tasks. The `ipnet` crate provides subnet arithmetic. Basic hostname resolution works through `tokio::net::lookup_host`, and reverse IPv6 lookup names follow the nibble-reversed `ip6.arpa` format from RFC 3596. These building blocks combine into production-quality network diagnostic utilities.
