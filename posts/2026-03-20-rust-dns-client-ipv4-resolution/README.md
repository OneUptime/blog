# How to Create a DNS Client in Rust for IPv4 Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, DNS, IPv4, UDP, Networking, Protocol, Std::net

Description: Build a DNS A record resolver in Rust that sends UDP DNS queries directly to a resolver and parses the IPv4 address responses without external DNS libraries.

## Introduction

Understanding DNS at the protocol level is valuable for network programmers. This Rust implementation constructs a DNS A record query packet, sends it via UDP to a resolver (8.8.8.8), and parses the response to extract IPv4 addresses - all without external crates.

## DNS Packet Structure

```text
Header  (12 bytes): ID, flags, question/answer/authority/additional counts
Question section:  QNAME (labels), QTYPE, QCLASS
Answer section:    NAME, TYPE, CLASS, TTL, RDLENGTH, RDATA (IPv4 = 4 bytes)
```

## DNS Query Builder

```rust
use std::net::UdpSocket;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Build a DNS A record query packet for the given hostname.
fn build_dns_query(hostname: &str, query_id: u16) -> Vec<u8> {
    let mut packet = Vec::new();
    
    // Header
    packet.extend_from_slice(&query_id.to_be_bytes()); // Transaction ID
    packet.extend_from_slice(&[0x01, 0x00]);           // Flags: QR=0 (query), RD=1 (recursion desired)
    packet.extend_from_slice(&[0x00, 0x01]);           // QDCOUNT: 1 question
    packet.extend_from_slice(&[0x00, 0x00]);           // ANCOUNT: 0
    packet.extend_from_slice(&[0x00, 0x00]);           // NSCOUNT: 0
    packet.extend_from_slice(&[0x00, 0x00]);           // ARCOUNT: 0
    
    // Question section - encode hostname as DNS labels
    for label in hostname.split('.') {
        packet.push(label.len() as u8);                // Label length
        packet.extend_from_slice(label.as_bytes());    // Label bytes
    }
    packet.push(0x00);                                 // Root label (end of QNAME)
    
    packet.extend_from_slice(&[0x00, 0x01]);           // QTYPE: A (IPv4)
    packet.extend_from_slice(&[0x00, 0x01]);           // QCLASS: IN (Internet)
    
    packet
}
```

## DNS Response Parser

```rust
use std::net::Ipv4Addr;

fn skip_dns_name(response: &[u8], pos: &mut usize) -> bool {
    while *pos < response.len() {
        let len = response[*pos];
        
        if len & 0xC0 == 0xC0 {
            if *pos + 2 > response.len() {
                return false;
            }
            *pos += 2;
            return true;
        }
        
        if len & 0xC0 != 0 {
            return false;
        }
        
        *pos += 1;
        if len == 0 {
            return true;
        }
        
        if *pos + len as usize > response.len() {
            return false;
        }
        *pos += len as usize;
    }
    
    false
}

/// Parse IPv4 addresses from a DNS A record response.
fn parse_dns_response(response: &[u8], expected_id: u16) -> Vec<Ipv4Addr> {
    let mut ips = Vec::new();
    
    if response.len() < 12 {
        return ips;
    }
    
    // Parse header
    let id = u16::from_be_bytes([response[0], response[1]]);
    let flags = u16::from_be_bytes([response[2], response[3]]);
    
    if id != expected_id {
        eprintln!("Mismatched DNS response ID");
        return ips;
    }
    
    // Check QR bit (bit 15) - should be 1 for response
    if flags & 0x8000 == 0 {
        eprintln!("Not a DNS response");
        return ips;
    }
    
    // Check RCODE (lower 4 bits) - 0 = no error
    let rcode = flags & 0x000F;
    if rcode != 0 {
        eprintln!("DNS error code: {}", rcode);
        return ips;
    }
    
    let qdcount = u16::from_be_bytes([response[4], response[5]]) as usize;
    let ancount = u16::from_be_bytes([response[6], response[7]]) as usize;
    
    // Skip the question section
    let mut pos = 12;
    for _ in 0..qdcount {
        if !skip_dns_name(response, &mut pos) {
            return ips;
        }
        if pos + 4 > response.len() {
            return ips;
        }
        pos += 4; // QTYPE + QCLASS
    }
    
    // Parse answer section
    for _ in 0..ancount {
        // Skip NAME (could be pointer)
        if !skip_dns_name(response, &mut pos) {
            break;
        }
        
        if pos + 10 > response.len() { break; }
        
        let rtype = u16::from_be_bytes([response[pos], response[pos + 1]]);
        let rclass = u16::from_be_bytes([response[pos + 2], response[pos + 3]]);
        // Skip: TYPE(2) + CLASS(2) + TTL(4) = 8 bytes
        let rdlength = u16::from_be_bytes([response[pos + 8], response[pos + 9]]) as usize;
        pos += 10;
        
        if pos + rdlength > response.len() {
            break;
        }
        
        // TYPE 1 = A record (IPv4), CLASS 1 = IN (Internet)
        if rtype == 1 && rclass == 1 && rdlength == 4 {
            let ip = Ipv4Addr::new(
                response[pos],
                response[pos + 1],
                response[pos + 2],
                response[pos + 3],
            );
            ips.push(ip);
        }
        
        pos += rdlength;
    }
    
    ips
}
```

## Complete DNS Resolver

```rust
fn resolve_ipv4(hostname: &str, dns_server: &str) -> std::io::Result<Vec<Ipv4Addr>> {
    let socket = UdpSocket::bind("0.0.0.0:0")?;
    socket.set_read_timeout(Some(Duration::from_secs(5)))?;
    socket.connect(format!("{}:53", dns_server))?;
    
    let query_id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.subsec_nanos() as u16)
        .unwrap_or(0);
    let query = build_dns_query(hostname, query_id);
    
    socket.send(&query)?;
    
    let mut response = vec![0u8; 512];
    let n = socket.recv(&mut response)?;
    
    Ok(parse_dns_response(&response[..n], query_id))
}

fn main() {
    let hostnames = ["google.com", "example.com", "cloudflare.com"];
    
    for hostname in &hostnames {
        match resolve_ipv4(hostname, "8.8.8.8") {
            Ok(ips) => {
                print!("{}: ", hostname);
                for ip in &ips {
                    print!("{} ", ip);
                }
                println!();
            }
            Err(e) => eprintln!("Failed to resolve {}: {}", hostname, e),
        }
    }
}
```

For production DNS resolution in Rust, use the current `hickory-resolver` crate (the renamed Trust-DNS resolver project), which handles DNS over TCP, DNSSEC support, and many protocol edge cases.

## Conclusion

This raw DNS client demonstrates UDP socket programming, binary protocol construction, and byte-level parsing in Rust. The `parse_dns_response` function handles DNS name compression pointers - a key feature of the DNS wire format. For production use, lean on well-maintained DNS resolver crates.
