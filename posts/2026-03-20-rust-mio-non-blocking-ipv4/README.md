# How to Use Rust mio Crate for Non-Blocking IPv4 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Mio, Non-Blocking, IPv4, Networking, Event-Driven, Epoll

Description: Learn how to use the mio crate for non-blocking event-driven IPv4 networking in Rust, implementing an efficient single-threaded TCP echo server.

## Setup

```toml
# Cargo.toml

[dependencies]
mio = { version = "1", features = ["net", "os-poll"] }
```

## Non-Blocking TCP Server with mio

```rust
use mio::net::{TcpListener, TcpStream};
use mio::{Events, Interest, Poll, Token};
use std::collections::HashMap;
use std::io::{self, Read, Write};
use std::net::SocketAddr;

const SERVER: Token = Token(0);
const MAX_EVENTS: usize = 128;

struct Client {
    stream: TcpStream,
    addr: SocketAddr,
    pending_write: Vec<u8>,
}

fn main() -> io::Result<()> {
    // Create the event poll (uses epoll on Linux, kqueue on macOS)
    let mut poll = Poll::new()?;
    let mut events = Events::with_capacity(MAX_EVENTS);

    // Create and register the listening socket
    let addr: SocketAddr = "0.0.0.0:9000".parse().unwrap();
    let mut server = TcpListener::bind(addr)?;
    poll.registry().register(&mut server, SERVER, Interest::READABLE)?;

    let mut clients: HashMap<Token, Client> = HashMap::new();
    let mut next_token = Token(1);

    println!("mio non-blocking server on port 9000");

    loop {
        // Block until at least one event is ready (None = wait forever)
        poll.poll(&mut events, None)?;

        for event in events.iter() {
            match event.token() {
                SERVER => {
                    // Accept all pending connections
                    loop {
                        match server.accept() {
                            Ok((mut stream, addr)) => {
                                let token = next_token;
                                next_token = Token(next_token.0 + 1);

                                // Register client for read events
                                poll.registry().register(
                                    &mut stream,
                                    token,
                                    Interest::READABLE,
                                )?;

                                println!("[{:?}] Connected: {}", token, addr);
                                clients.insert(token, Client { stream, addr, pending_write: Vec::new() });
                            }
                            Err(e) if e.kind() == io::ErrorKind::WouldBlock => break,
                            Err(e) => eprintln!("Accept error: {}", e),
                        }
                    }
                }

                token => {
                    let mut to_remove = false;
                    let mut change_interests = None;

                    if let Some(client) = clients.get_mut(&token) {
                        if event.is_readable() {
                            let mut buf = vec![0u8; 4096];
                            loop {
                                match client.stream.read(&mut buf) {
                                    Ok(0) => {
                                        if client.pending_write.is_empty() {
                                            to_remove = true;
                                        }
                                        break;
                                    }
                                    Ok(n) => {
                                        client.pending_write.extend_from_slice(&buf[..n]);
                                    }
                                    Err(e) if e.kind() == io::ErrorKind::WouldBlock => break,
                                    Err(_) => { to_remove = true; break; }
                                }
                            }

                            if !client.pending_write.is_empty() {
                                change_interests = Some(Interest::READABLE | Interest::WRITABLE);
                            }
                        }

                        if event.is_writable() && !client.pending_write.is_empty() {
                            match client.stream.write(&client.pending_write) {
                                Ok(0) => { to_remove = true; }
                                Ok(n) => { client.pending_write.drain(..n); }
                                Err(e) if e.kind() == io::ErrorKind::WouldBlock => {}
                                Err(_) => { to_remove = true; }
                            }

                            if client.pending_write.is_empty() {
                                change_interests = Some(Interest::READABLE);
                            }
                        }
                    }

                    if to_remove {
                        if let Some(mut client) = clients.remove(&token) {
                            println!("[{:?}] Disconnected: {}", token, client.addr);
                            poll.registry().deregister(&mut client.stream)?;
                        }
                    } else if let Some(interests) = change_interests {
                        if let Some(client) = clients.get_mut(&token) {
                            poll.registry().reregister(&mut client.stream, token, interests)?;
                        }
                    }
                }
            }
        }
    }
}
```

## Key mio Concepts

| Concept | Description |
|---------|-------------|
| `Poll` | Event loop backed by epoll/kqueue/IOCP |
| `Token` | Identifies which source triggered an event |
| `Interest::READABLE` | Watch for data available to read |
| `Interest::WRITABLE` | Watch for buffer space available to write |
| `WouldBlock` | Operation can't complete without blocking - try again |
| `register` | Add a source to the poll |
| `reregister` | Change interest flags for a registered source |
| `deregister` | Remove a source from the poll |

## Conclusion

`mio` provides a thin, cross-platform abstraction over OS event notification mechanisms (`epoll`, `kqueue`). It's the foundation for async runtimes like Tokio. For application code, prefer Tokio's higher-level async I/O. Use `mio` directly when building your own runtime, protocol library, or when you need maximum control over event handling without async overhead.
