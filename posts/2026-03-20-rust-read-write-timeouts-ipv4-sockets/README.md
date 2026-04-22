# How to Set Read and Write Timeouts on IPv4 Sockets in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Socket, IPv4, TCP, Timeout, Networking, Std::net

Description: Configure read and write timeouts on Rust TcpStream sockets over IPv4 using set_read_timeout and set_write_timeout to prevent blocking operations from hanging indefinitely.

## Introduction

Rust's standard library `TcpStream` supports per-socket read and write timeouts through `set_read_timeout` and `set_write_timeout`. Unlike Go's deadline model (absolute time), Rust uses duration-based timeouts that reset with each read/write operation.

## Setting Timeouts on a Client Connection

```rust
use std::net::TcpStream;
use std::time::Duration;

fn connect_with_timeouts(address: &str) -> std::io::Result<()> {
    // Connect with a connection timeout using connect_timeout
    let addr: std::net::SocketAddr = address.parse().expect("Invalid address");
    let stream = TcpStream::connect_timeout(&addr, Duration::from_secs(5))?;
    
    // Set read timeout: returns Err(WouldBlock/TimedOut) after 10 seconds
    stream.set_read_timeout(Some(Duration::from_secs(10)))?;
    
    // Set write timeout: returns Err(WouldBlock/TimedOut) after 5 seconds
    stream.set_write_timeout(Some(Duration::from_secs(5)))?;
    
    println!("Read timeout:  {:?}", stream.read_timeout()?);
    println!("Write timeout: {:?}", stream.write_timeout()?);
    
    Ok(())
}
```

## Client with Send/Receive and Timeout Handling

```rust
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::io::{self, Write, BufRead, BufReader};
use std::time::Duration;

fn send_request(host: &str, port: u16) -> io::Result<String> {
    // Resolve the host and pick an IPv4 address
    let address = (host, port)
        .to_socket_addrs()?
        .find(SocketAddr::is_ipv4)
        .ok_or_else(|| io::Error::new(io::ErrorKind::AddrNotAvailable, "no IPv4 address found"))?;
    let stream = TcpStream::connect(address)?;
    
    // Set timeouts
    stream.set_read_timeout(Some(Duration::from_secs(10)))?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))?;
    
    let mut stream = stream;
    
    // Write request
    let request = format!("GET / HTTP/1.0\r\nHost: {}\r\n\r\n", host);
    stream.write_all(request.as_bytes())?;
    
    // Read response
    let mut response = String::new();
    let mut reader = BufReader::new(&stream);
    
    loop {
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => break,  // EOF
            Ok(_) => response.push_str(&line),
            Err(e) if e.kind() == io::ErrorKind::WouldBlock => {
                eprintln!("Read timeout - no data from server");
                break;
            }
            Err(e) if e.kind() == io::ErrorKind::TimedOut => {
                eprintln!("Read timed out");
                break;
            }
            Err(e) => return Err(e),
        }
    }
    
    Ok(response)
}

fn main() {
    match send_request("example.com", 80) {
        Ok(response) => {
            let preview: String = response.chars().take(200).collect();
            println!("Response:\n{}", preview);
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

## Server with Per-Connection Timeouts

```rust
use std::net::{TcpListener, TcpStream};
use std::io::{Write, BufRead, BufReader};
use std::time::Duration;
use std::thread;

fn handle_client(stream: TcpStream) {
    let peer = stream.peer_addr().unwrap();
    
    // Set 30-second idle timeout
    if let Err(e) = stream.set_read_timeout(Some(Duration::from_secs(30))) {
        eprintln!("Failed to set read timeout for {}: {}", peer, e);
        return;
    }
    stream.set_write_timeout(Some(Duration::from_secs(10))).ok();
    
    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut write_stream = stream;
    
    loop {
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => {
                println!("Client {} disconnected", peer);
                break;
            }
            Ok(_) => {
                let response = format!("Echo: {}", line);
                if let Err(e) = write_stream.write_all(response.as_bytes()) {
                    eprintln!("Write error for {}: {}", peer, e);
                    break;
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock 
                   || e.kind() == std::io::ErrorKind::TimedOut => {
                println!("Client {} idle for 30s - closing", peer);
                let _ = write_stream.write_all(b"Idle timeout\n");
                break;
            }
            Err(e) => {
                eprintln!("Read error for {}: {}", peer, e);
                break;
            }
        }
    }
}

fn main() -> std::io::Result<()> {
    // Bind to IPv4 only
    let listener = TcpListener::bind("0.0.0.0:8080")?;
    println!("Server listening on 0.0.0.0:8080");
    
    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                thread::spawn(|| handle_client(s));
            }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    
    Ok(())
}
```

## Clearing Timeouts

To remove a timeout and allow blocking indefinitely:

```rust
// Clear read timeout (block until data arrives)
stream.set_read_timeout(None)?;

// Clear write timeout
stream.set_write_timeout(None)?;
```

## Error Kind Reference

| Error Kind | Meaning |
|------------|---------|
| `ErrorKind::WouldBlock` | Operation would need to block; timeout expiration is reported this way on Unix-like platforms |
| `ErrorKind::TimedOut` | Timeout expired; Windows may report read/write timeouts this way |
| `ErrorKind::ConnectionReset` | Remote peer reset the connection |
| `ErrorKind::BrokenPipe` | Tried to write to a closed connection |

## Conclusion

Rust's `set_read_timeout` and `set_write_timeout` provide safe, duration-based socket timeouts. Always handle `ErrorKind::WouldBlock` and `ErrorKind::TimedOut` in your read loops to prevent threads from blocking indefinitely on unresponsive peers.
