# How to Build a Port Scanner in Rust for IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Port Scanner, IPv4, TCP, Networking, Concurrency

Description: Learn how to build a fast, concurrent IPv4 TCP port scanner in Rust using threads and channels to scan multiple ports simultaneously.

## Simple Sequential Port Scanner

```rust
use std::net::{SocketAddrV4, Ipv4Addr, TcpStream};
use std::time::Duration;
use std::str::FromStr;

fn is_port_open(ip: Ipv4Addr, port: u16, timeout: Duration) -> bool {
    let addr = SocketAddrV4::new(ip, port);
    TcpStream::connect_timeout(&addr.into(), timeout).is_ok()
}

fn main() {
    let target: Ipv4Addr = "127.0.0.1".parse().unwrap();
    let timeout = Duration::from_millis(500);
    let common_ports = [22, 80, 443, 3000, 3306, 5432, 6379, 8080, 8443, 27017];

    println!("Scanning {} ...", target);
    for &port in &common_ports {
        if is_port_open(target, port, timeout) {
            println!("  PORT {}/tcp   OPEN", port);
        }
    }
}
```

## Multi-Threaded Port Scanner

```rust
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn scan_port(ip: Ipv4Addr, port: u16, timeout: Duration) -> Option<u16> {
    let addr = SocketAddr::new(IpAddr::V4(ip), port);
    match TcpStream::connect_timeout(&addr, timeout) {
        Ok(_) => Some(port),
        Err(_) => None,
    }
}

fn scan_range(
    ip: Ipv4Addr,
    start: u16,
    end: u16,
    num_threads: usize,
    timeout_ms: u64,
) -> Vec<u16> {
    let (tx, rx) = mpsc::channel::<Option<u16>>();
    let ports: Vec<u16> = (start..=end).collect();
    let timeout = Duration::from_millis(timeout_ms);

    // Split ports into chunks for each thread
    let chunk_size = (ports.len() + num_threads - 1) / num_threads;

    let mut handles = vec![];
    for chunk in ports.chunks(chunk_size) {
        let ports_chunk = chunk.to_vec();
        let tx = tx.clone();

        handles.push(thread::spawn(move || {
            for port in ports_chunk {
                let result = scan_port(ip, port, timeout);
                tx.send(result).unwrap();
            }
        }));
    }

    // Drop extra sender so channel closes when all threads finish
    drop(tx);

    // Collect results
    let total = (end - start + 1) as usize;
    let mut results = rx.into_iter().take(total).flatten().collect::<Vec<_>>();
    results.sort_unstable();

    for handle in handles {
        handle.join().unwrap();
    }

    results
}

fn main() {
    let target = "127.0.0.1";
    let ip: Ipv4Addr = target.parse().unwrap();

    println!("Scanning {} (ports 1-1024) with 100 threads...", target);
    let open_ports = scan_range(ip, 1, 1024, 100, 300);

    if open_ports.is_empty() {
        println!("No open ports found");
    } else {
        println!("Open ports:");
        for port in &open_ports {
            println!("  {}/tcp   open", port);
        }
    }
}
```

## Rayon-based Scanner (Parallel Iterator)

```toml
[dependencies]
rayon = "1"
```

```rust
use rayon::prelude::*;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream};
use std::time::Duration;

fn scan_with_rayon(ip: Ipv4Addr, start: u16, end: u16) -> Vec<u16> {
    let timeout = Duration::from_millis(300);

    let mut open: Vec<u16> = (start..=end)
        .into_par_iter()
        .filter(|&port| {
            let addr = SocketAddr::new(IpAddr::V4(ip), port);
            TcpStream::connect_timeout(&addr, timeout).is_ok()
        })
        .collect();

    open.sort_unstable();
    open
}

fn main() {
    let ip: Ipv4Addr = "127.0.0.1".parse().unwrap();
    let open = scan_with_rayon(ip, 1, 1024);
    println!("Open ports: {:?}", open);
}
```

## Responsible Use

Port scanning systems you own or have explicit permission to test is legal. Scanning systems without authorization may violate computer crime laws in your jurisdiction.

## Conclusion

Rust port scanners can use `TcpStream::connect_timeout` for TCP connection attempts with a timeout. The multi-threaded approach with `mpsc::channel` distributes work across a fixed number of threads. For the most ergonomic parallel scanner, `rayon`'s `into_par_iter()` distributes work across Rayon's thread pool. Always use responsibly on authorized targets.
