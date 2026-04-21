# How to Build a TCP Client in Rust Using TcpStream for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, TCP, TcpStream, IPv4, Networking, Client

Description: Learn how to build a TCP client in Rust using std::net::TcpStream to connect to an IPv4 server, send data, and receive responses.

## Basic TCP Client

```rust
use std::io::{self, BufRead, BufReader, Write};
use std::net::TcpStream;

fn main() -> io::Result<()> {
    // Connect to the server
    // TcpStream::connect resolves to IPv4 with a dotted-decimal address
    let stream = TcpStream::connect("127.0.0.1:9000")?;
    println!("Connected to {}", stream.peer_addr()?);

    // Clone the stream for independent read/write
    let mut writer = stream.try_clone()?;
    let mut reader = BufReader::new(stream);

    // Send a message
    writer.write_all(b"Hello, Rust TCP server!\n")?;
    writer.flush()?;

    // Read the response
    let mut response = String::new();
    reader.read_line(&mut response)?;
    println!("Server response: {}", response.trim());

    Ok(())
}
```

## Connecting with Timeout

```rust
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;
use std::io;

fn connect_with_timeout(addr: &str, timeout: Duration) -> io::Result<TcpStream> {
    // Resolve the address first
    let addr = addr
        .to_socket_addrs()?
        .next()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not resolve address"))?;

    // connect_timeout takes a SocketAddr (not a string)
    TcpStream::connect_timeout(&addr, timeout)
}

fn main() -> io::Result<()> {
    match connect_with_timeout("192.168.1.100:9000", Duration::from_secs(5)) {
        Ok(stream) => {
            println!("Connected: {} -> {}", stream.local_addr()?, stream.peer_addr()?);
        }
        Err(e) if e.kind() == io::ErrorKind::TimedOut => {
            eprintln!("Connection timed out");
        }
        Err(e) if e.kind() == io::ErrorKind::ConnectionRefused => {
            eprintln!("Connection refused");
        }
        Err(e) => {
            eprintln!("Connection error: {}", e);
        }
    }
    Ok(())
}
```

## Sending Binary Data with Length Prefix

```rust
use std::io::{self, Read, Write};
use std::net::TcpStream;

/// Send a length-prefixed message (4-byte big-endian length + payload)
fn send_message(stream: &mut TcpStream, payload: &[u8]) -> io::Result<()> {
    let len = payload.len() as u32;
    stream.write_all(&len.to_be_bytes())?;
    stream.write_all(payload)?;
    stream.flush()?;
    Ok(())
}

/// Receive a length-prefixed message
fn recv_message(stream: &mut TcpStream) -> io::Result<Vec<u8>> {
    let mut len_buf = [0u8; 4];
    stream.read_exact(&mut len_buf)?;  // read_exact ensures full 4 bytes
    let len = u32::from_be_bytes(len_buf) as usize;

    let mut payload = vec![0u8; len];
    stream.read_exact(&mut payload)?;
    Ok(payload)
}

fn main() -> io::Result<()> {
    let mut stream = TcpStream::connect("127.0.0.1:9009")?;
    stream.set_read_timeout(Some(std::time::Duration::from_secs(10)))?;

    let request = b"{\"action\": \"ping\"}";
    send_message(&mut stream, request)?;
    println!("Sent: {}", std::str::from_utf8(request).unwrap());

    let response = recv_message(&mut stream)?;
    println!("Response: {}", std::str::from_utf8(&response).unwrap_or("invalid utf-8"));

    Ok(())
}
```

## Setting Read/Write Timeouts

```rust
use std::net::TcpStream;
use std::time::Duration;
use std::io;

fn main() -> io::Result<()> {
    let stream = TcpStream::connect("127.0.0.1:9000")?;

    // If a read times out, it returns ErrorKind::WouldBlock on Unix or TimedOut on Windows
    stream.set_read_timeout(Some(Duration::from_secs(30)))?;
    stream.set_write_timeout(Some(Duration::from_secs(10)))?;
    stream.set_nodelay(true)?;  // Disable Nagle's algorithm

    println!("Timeouts set. Read: 30s, Write: 10s");
    Ok(())
}
```

## Retry with Exponential Backoff

```rust
use std::net::TcpStream;
use std::time::Duration;
use std::thread;

fn connect_with_retry(addr: &str, max_attempts: u32) -> Option<TcpStream> {
    for attempt in 0..max_attempts {
        let delay = Duration::from_secs(1 << attempt);  // 1, 2, 4, 8 seconds...
        match TcpStream::connect(addr) {
            Ok(stream) => {
                println!("Connected on attempt {}", attempt + 1);
                return Some(stream);
            }
            Err(e) => {
                eprintln!("Attempt {} failed: {}. Retrying in {:?}...", attempt + 1, e, delay);
                if attempt < max_attempts - 1 {
                    thread::sleep(delay);
                }
            }
        }
    }
    None
}
```

## Conclusion

`TcpStream::connect("host:port")` is the standard way to create a TCP client in Rust. Use `connect_timeout` for connection timeout control, `set_read_timeout` / `set_write_timeout` for I/O timeouts, and `read_exact` to read exactly the expected number of bytes for binary protocols. Rust's ownership model ensures streams are properly closed when dropped.
