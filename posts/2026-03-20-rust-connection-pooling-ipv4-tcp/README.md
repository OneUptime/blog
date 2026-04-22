# How to Implement Connection Pooling for IPv4 TCP in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Connection Pooling, IPv4, TCP, Performance, Arc, Mutex

Description: Build a thread-safe TCP connection pool in Rust using Arc and Mutex to reuse IPv4 connections and reduce connection establishment overhead for high-throughput services.

## Introduction

Establishing a new TCP connection per request adds latency from the three-way handshake. A connection pool maintains a set of pre-established connections that can be borrowed by threads and returned when done. This guide implements a thread-safe pool using Rust's `Arc<Mutex<>>`.

## Connection Pool Implementation

```rust
use std::collections::VecDeque;
use std::io::{self, ErrorKind};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// A guard that returns the connection to the pool when dropped
pub struct PooledConnection {
    stream: Option<TcpStream>,
    pool: Arc<Mutex<ConnectionPool>>,
}

impl PooledConnection {
    pub fn stream(&mut self) -> &mut TcpStream {
        self.stream.as_mut().unwrap()
    }
}

impl Drop for PooledConnection {
    fn drop(&mut self) {
        if let Some(conn) = self.stream.take() {
            let mut pool = self.pool.lock().unwrap();
            pool.return_connection(conn);
        }
    }
}

impl std::ops::Deref for PooledConnection {
    type Target = TcpStream;
    fn deref(&self) -> &TcpStream { self.stream.as_ref().unwrap() }
}

impl std::ops::DerefMut for PooledConnection {
    fn deref_mut(&mut self) -> &mut TcpStream { self.stream.as_mut().unwrap() }
}

/// Thread-safe TCP connection pool
pub struct ConnectionPool {
    address: String,
    connections: VecDeque<TcpStream>,
    max_idle: usize,
    timeout: Duration,
}

impl ConnectionPool {
    pub fn new(address: &str, max_idle: usize, timeout: Duration) -> Self {
        ConnectionPool {
            address: address.to_string(),
            connections: VecDeque::new(),
            max_idle,
            timeout,
        }
    }

    fn create_connection(&self) -> io::Result<TcpStream> {
        let stream = TcpStream::connect(&*self.address)?;
        stream.set_read_timeout(Some(self.timeout))?;
        stream.set_write_timeout(Some(self.timeout))?;
        Ok(stream)
    }

    fn is_alive(stream: &TcpStream) -> bool {
        // Best-effort liveness check: peek without consuming data.
        // WouldBlock means no data is queued, not that the socket is dead.
        if stream.set_nonblocking(true).is_err() {
            return false;
        }

        let mut buf = [0u8; 1];
        let alive = match stream.peek(&mut buf) {
            Ok(0) => false,
            Ok(_) => true,
            Err(ref e) if matches!(e.kind(), ErrorKind::WouldBlock | ErrorKind::Interrupted) => {
                true
            }
            Err(_) => false,
        };

        stream.set_nonblocking(false).is_ok() && alive
    }

    fn return_connection(&mut self, conn: TcpStream) {
        if self.connections.len() < self.max_idle {
            self.connections.push_back(conn);
        }
        // If the idle cache is full, the connection is dropped (closed)
    }
}

/// Shareable pool handle
pub struct Pool {
    inner: Arc<Mutex<ConnectionPool>>,
}

impl Pool {
    pub fn new(address: &str, initial_size: usize, max_idle: usize, timeout: Duration)
        -> io::Result<Self>
    {
        if initial_size > max_idle {
            return Err(io::Error::new(
                ErrorKind::InvalidInput,
                "initial_size cannot exceed max_idle",
            ));
        }

        let mut inner = ConnectionPool::new(address, max_idle, timeout);

        // Pre-fill with initial connections
        for _ in 0..initial_size {
            let conn = inner.create_connection()?;
            inner.connections.push_back(conn);
        }

        Ok(Pool {
            inner: Arc::new(Mutex::new(inner))
        })
    }

    /// Get a connection from the pool (creates a new one if pool is empty)
    pub fn get(&self) -> io::Result<PooledConnection> {
        let mut pool = self.inner.lock().unwrap();

        // Try to get an existing connection
        while let Some(conn) = pool.connections.pop_front() {
            if ConnectionPool::is_alive(&conn) {
                return Ok(PooledConnection {
                    stream: Some(conn),
                    pool: Arc::clone(&self.inner),
                });
            }
            // Connection is dead - discard and try next
        }

        // Pool empty - create a new connection
        let conn = pool.create_connection()?;
        Ok(PooledConnection {
            stream: Some(conn),
            pool: Arc::clone(&self.inner),
        })
    }

    pub fn size(&self) -> usize {
        self.inner.lock().unwrap().connections.len()
    }
}
```

## Using the Connection Pool

```rust
use std::io::{Write, BufRead, BufReader};
use std::thread;

fn main() -> std::io::Result<()> {
    let pool = std::sync::Arc::new(Pool::new(
        "10.0.0.10:6379",    // Backend address
        5,                    // Initial connections
        20,                   // Max idle connections kept
        std::time::Duration::from_secs(10),
    )?);

    println!("Pool initialized with {} connections", pool.size());

    // Simulate 50 concurrent requests
    let mut handles = Vec::new();

    for i in 0..50 {
        let pool = std::sync::Arc::clone(&pool);
        let handle = thread::spawn(move || {
            let mut conn = match pool.get() {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("Thread {}: failed to get connection: {}", i, e);
                    return;
                }
            };

            // Use the connection
            conn.write_all(b"PING\r\n").ok();

            let mut response = String::new();
            let mut reader = BufReader::new(conn.stream());
            reader.read_line(&mut response).ok();

            println!("Thread {}: {}", i, response.trim());
            // conn is automatically returned to pool when dropped
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().ok();
    }

    println!("Pool size after requests: {}", pool.size());
    Ok(())
}
```

## Using the r2d2 Crate for Production Pools

For production use, the `r2d2` crate provides a battle-tested connection pool:

```toml
[dependencies]
r2d2 = "0.8"
```

```rust
// r2d2 coordinates checkout timeouts, max sizes, and lifecycle hooks
// Pair it with managers like r2d2_postgres or the r2d2 feature of redis-rs
```

## Conclusion

This custom pool demonstrates Rust's ownership model for safe shared state via `Arc<Mutex<>>`. The `PooledConnection` RAII guard automatically returns connections on drop, preventing leaks. For production workloads, prefer `r2d2` or `deadpool` which add protocol-aware connection health validation, total connection limits, max lifetime, and wait queues.
