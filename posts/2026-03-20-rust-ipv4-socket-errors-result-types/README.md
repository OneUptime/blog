# How to Handle IPv4 Socket Errors in Rust with Result Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Error Handling, IPv4, TCP, Result, Std::io::Error, Networking

Description: Handle IPv4 TCP socket errors idiomatically in Rust using Result types, the ? operator, pattern matching on error kinds, and custom error types.

## Introduction

Rust's type system makes fallible operations explicit through `Result<T, E>`. Network code using `std::net` commonly returns `std::io::Result<T>`, and matching on `std::io::ErrorKind` lets you distinguish between connection refused, timeout, reset, and other network errors - and respond appropriately to each.

## Basic Error Handling with `?` Operator

```rust
use std::net::TcpStream;
use std::io::{self, Read, Write};
use std::time::Duration;

fn connect_and_ping(address: &str) -> io::Result<String> {
    // ? propagates the error to the caller if connection fails
    let mut stream = TcpStream::connect(address)?;
    
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))?;
    
    // Write request
    stream.write_all(b"PING\n")?;
    
    // Read response
    let mut response = vec![0u8; 1024];
    let n = stream.read(&mut response)?;
    
    // Convert to String (may fail if not valid UTF-8)
    String::from_utf8(response[..n].to_vec())
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

fn main() {
    match connect_and_ping("192.168.1.1:8080") {
        Ok(response) => println!("Response: {}", response),
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

## Pattern Matching on ErrorKind

```rust
use std::io::{self, ErrorKind};
use std::net::TcpStream;

fn handle_connection_result(result: io::Result<TcpStream>) -> Option<TcpStream> {
    match result {
        Ok(stream) => Some(stream),
        
        Err(e) => {
            match e.kind() {
                ErrorKind::ConnectionRefused => {
                    eprintln!("Connection refused - server not listening");
                    None
                }
                ErrorKind::TimedOut | ErrorKind::WouldBlock => {
                    eprintln!("Operation timed out or would block");
                    None
                }
                ErrorKind::NetworkUnreachable | ErrorKind::HostUnreachable => {
                    eprintln!("Network/host unreachable - check routing");
                    None
                }
                ErrorKind::ConnectionReset => {
                    eprintln!("Connection reset by peer");
                    None
                }
                ErrorKind::ConnectionAborted => {
                    eprintln!("Connection aborted");
                    None
                }
                ErrorKind::PermissionDenied => {
                    eprintln!("Permission denied - operation blocked or insufficient privileges");
                    None
                }
                ErrorKind::AddrInUse => {
                    eprintln!("Address already in use - port conflict");
                    None
                }
                ErrorKind::AddrNotAvailable => {
                    eprintln!("Address not available on this machine");
                    None
                }
                other => {
                    eprintln!("Unexpected error ({:?}): {}", other, e);
                    None
                }
            }
        }
    }
}
```

## Custom Error Type for Network Applications

```rust
use std::fmt;
use std::io;
use std::net::AddrParseError;

#[derive(Debug)]
pub enum NetworkError {
    Io(io::Error),
    InvalidAddress(AddrParseError),
    ConnectionFailed { address: String, reason: String },
    Timeout { operation: &'static str, duration_secs: u64 },
    ProtocolError(String),
}

impl fmt::Display for NetworkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(e) => write!(f, "I/O error: {}", e),
            Self::InvalidAddress(e) => write!(f, "Invalid address: {}", e),
            Self::ConnectionFailed { address, reason } => {
                write!(f, "Failed to connect to {}: {}", address, reason)
            }
            Self::Timeout { operation, duration_secs } => {
                write!(f, "{} timed out after {}s", operation, duration_secs)
            }
            Self::ProtocolError(msg) => write!(f, "Protocol error: {}", msg),
        }
    }
}

impl From<io::Error> for NetworkError {
    fn from(e: io::Error) -> Self {
        NetworkError::Io(e)
    }
}

impl From<AddrParseError> for NetworkError {
    fn from(e: AddrParseError) -> Self {
        NetworkError::InvalidAddress(e)
    }
}

impl std::error::Error for NetworkError {}
```

## Using the Custom Error Type

```rust
use std::net::{SocketAddrV4, TcpStream};
use std::io::ErrorKind;
use std::time::Duration;

fn connect(address: &str) -> Result<TcpStream, NetworkError> {
    let addr: SocketAddrV4 = address.parse().map_err(NetworkError::from)?;
    
    let stream = TcpStream::connect_timeout(
        &addr.into(), 
        Duration::from_secs(5)
    ).map_err(|e| {
        match e.kind() {
            ErrorKind::ConnectionRefused => NetworkError::ConnectionFailed {
                address: address.to_string(),
                reason: "connection refused".to_string(),
            },
            ErrorKind::TimedOut => NetworkError::Timeout {
                operation: "connect",
                duration_secs: 5,
            },
            _ => NetworkError::Io(e),
        }
    })?;
    
    stream.set_read_timeout(Some(Duration::from_secs(10)))?;
    Ok(stream)
}

fn main() {
    match connect("10.0.0.1:8080") {
        Ok(stream) => println!("Connected to {:?}", stream.peer_addr()),
        Err(NetworkError::ConnectionFailed { address, reason }) => {
            eprintln!("Could not reach {}: {}", address, reason);
        }
        Err(NetworkError::Timeout { operation, duration_secs }) => {
            eprintln!("{} operation timed out after {}s", operation, duration_secs);
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

## Retry with Exponential Backoff

```rust
use std::io;
use std::net::TcpStream;
use std::time::Duration;
use std::thread;

fn connect_with_retry(address: &str, max_retries: u32) -> io::Result<TcpStream> {
    let mut delay = Duration::from_millis(500);
    
    for attempt in 1..=max_retries {
        match TcpStream::connect(address) {
            Ok(stream) => return Ok(stream),
            Err(e) if e.kind() == io::ErrorKind::ConnectionRefused && attempt < max_retries => {
                eprintln!("Attempt {}/{}: {}. Retrying in {:?}...", attempt, max_retries, e, delay);
                thread::sleep(delay);
                delay = delay.saturating_mul(2).min(Duration::from_secs(30));
            }
            Err(e) => return Err(e),
        }
    }
    
    Err(io::Error::new(io::ErrorKind::ConnectionRefused, "Max retries exceeded"))
}
```

## Conclusion

Rust's `Result` types and `ErrorKind` enum enable precise, explicit error handling for network code. Pattern matching on known error kinds, with a wildcard for future or platform-specific cases, lets you implement intelligent retry logic, user-friendly error messages, and proper cleanup.
