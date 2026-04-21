# How to Create a TCP Server in Rust Using std::net::TcpListener with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, TCP, TcpListener, IPv4, Networking, Server

Description: Learn how to create a TCP server in Rust using std::net::TcpListener that listens on an IPv4 address and handles client connections with threads.

## Basic TCP Echo Server

```rust
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;

fn handle_client(stream: TcpStream) {
    let addr = stream.peer_addr().unwrap();
    println!("Client connected: {}", addr);

    // BufReader wraps the stream for line-by-line reading
    let mut reader = BufReader::new(stream.try_clone().expect("Failed to clone stream"));
    let mut writer = stream;

    let mut line = String::new();
    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => {
                // 0 bytes = EOF (client disconnected)
                println!("Client disconnected: {}", addr);
                break;
            }
            Ok(_) => {
                print!("[{}] Received: {}", addr, line);
                // Echo back
                if let Err(e) = writer.write_all(line.as_bytes()) {
                    eprintln!("[{}] Write error: {}", addr, e);
                    break;
                }
            }
            Err(e) => {
                eprintln!("[{}] Read error: {}", addr, e);
                break;
            }
        }
    }
}

fn main() -> std::io::Result<()> {
    // "0.0.0.0:9000" binds to all IPv4 interfaces
    let listener = TcpListener::bind("0.0.0.0:9000")?;
    println!("Server listening on {}", listener.local_addr()?);

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                // Spawn a new thread per connection
                thread::spawn(|| handle_client(stream));
            }
            Err(e) => {
                eprintln!("Accept error: {}", e);
            }
        }
    }
    Ok(())
}
```

## Binding to a Specific IPv4 Address

```rust
use std::net::TcpListener;

// Bind to a specific interface
let listener = TcpListener::bind("192.168.1.50:9000")?;

// Or to loopback only
let listener = TcpListener::bind("127.0.0.1:9000")?;
```

## Using a Thread Pool

```rust
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;

struct ThreadPool {
    _workers: Vec<thread::JoinHandle<()>>,
    sender: std::sync::mpsc::Sender<TcpStream>,
}

impl ThreadPool {
    fn new(size: usize) -> Self {
        let (sender, receiver) = std::sync::mpsc::channel::<TcpStream>();
        let receiver = Arc::new(Mutex::new(receiver));
        let mut workers = Vec::with_capacity(size);

        for _ in 0..size {
            let rx = Arc::clone(&receiver);
            workers.push(thread::spawn(move || {
                loop {
                    let stream = rx.lock().unwrap().recv();
                    match stream {
                        Ok(s) => handle_client(s),
                        Err(_) => break,  // Channel closed
                    }
                }
            }));
        }

        ThreadPool { _workers: workers, sender }
    }

    fn execute(&self, stream: TcpStream) {
        self.sender.send(stream).expect("Failed to send to pool");
    }
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:9000")?;
    let pool = ThreadPool::new(10);

    println!("Server with thread pool on port 9000");

    for stream in listener.incoming() {
        if let Ok(stream) = stream {
            pool.execute(stream);
        }
    }
    Ok(())
}
```

## Setting Socket Options

```rust
use std::net::TcpStream;
use std::time::Duration;

fn configure_client(stream: &TcpStream) -> std::io::Result<()> {
    // Set read timeout
    stream.set_read_timeout(Some(Duration::from_secs(30)))?;
    // Set write timeout
    stream.set_write_timeout(Some(Duration::from_secs(10)))?;
    // Disable Nagle's algorithm for low-latency
    stream.set_nodelay(true)?;
    // For TCP keepalive, use the socket2 crate for full control
    Ok(())
}
```

## Conclusion

Rust's `TcpListener::bind("0.0.0.0:9000")` creates an IPv4 TCP server. Use `for stream in listener.incoming()` to accept connections in a loop, and `thread::spawn` to handle each client concurrently. For production workloads, use a thread pool (`std::sync::mpsc`) to limit the number of handler threads, and use a bounded queue such as `std::sync::mpsc::sync_channel` if you need backpressure; or switch to async Tokio for higher concurrency.
