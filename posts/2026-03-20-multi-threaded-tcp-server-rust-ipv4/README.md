# How to Implement a Multi-Threaded TCP Server in Rust for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, TCP, Multi-Threaded, IPv4, Arc, Mutex, Networking

Description: Learn how to build a multi-threaded IPv4 TCP server in Rust using threads and shared state with Arc/Mutex for concurrent client handling.

## Threaded TCP Server with Shared State

```rust
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;

// Shared state: maps client ID to their address
type ClientMap = Arc<Mutex<HashMap<u64, String>>>;

fn handle_client(stream: TcpStream, client_id: u64, clients: ClientMap) {
    let addr = stream.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    println!("[#{}] Connected: {}", client_id, addr);

    // Register client
    {
        let mut map = clients.lock().unwrap();
        map.insert(client_id, addr.clone());
    }

    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut writer = stream;
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => break,  // EOF
            Ok(_) => {
                let trimmed = line.trim();
                println!("[#{}] {}", client_id, trimmed);

                // Show active clients
                let count = clients.lock().unwrap().len();
                let response = format!("Echo [clients: {}]: {}\n", count, trimmed);
                if writer.write_all(response.as_bytes()).is_err() {
                    break;
                }
            }
            Err(e) => {
                eprintln!("[#{}] Read error: {}", client_id, e);
                break;
            }
        }
    }

    // Deregister client
    {
        let mut map = clients.lock().unwrap();
        map.remove(&client_id);
    }
    println!("[#{}] Disconnected: {}", client_id, addr);
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:9000")?;
    let clients: ClientMap = Arc::new(Mutex::new(HashMap::new()));
    let mut client_counter: u64 = 0;

    println!("Multi-threaded server on port 9000");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                client_counter += 1;
                let id = client_counter;
                let clients_clone = Arc::clone(&clients);

                thread::spawn(move || handle_client(stream, id, clients_clone));
            }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    Ok(())
}
```

## Thread Pool with Channels

```rust
use std::net::{TcpListener, TcpStream};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::io::{Read, Write};

struct ThreadPool {
    _workers: Vec<thread::JoinHandle<()>>,
    sender: mpsc::Sender<TcpStream>,
}

impl ThreadPool {
    fn new(size: usize) -> Self {
        let (sender, receiver) = mpsc::channel::<TcpStream>();
        let receiver = Arc::new(Mutex::new(receiver));

        let workers = (0..size).map(|id| {
            let rx = Arc::clone(&receiver);
            thread::spawn(move || loop {
                let stream = rx.lock().unwrap().recv();
                match stream {
                    Ok(mut s) => {
                        println!("[worker {}] Handling {:?}", id, s.peer_addr());
                        let mut buf = vec![0u8; 4096];
                        loop {
                            match s.read(&mut buf) {
                                Ok(0) => break,
                                Ok(n) => { let _ = s.write_all(&buf[..n]); }
                                Err(_) => break,
                            }
                        }
                    }
                    Err(_) => break,  // Channel disconnected
                }
            })
        }).collect();

        ThreadPool { _workers: workers, sender }
    }

    fn execute(&self, stream: TcpStream) {
        self.sender.send(stream).unwrap();
    }
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:9000")?;
    let pool = ThreadPool::new(8);

    println!("Thread pool server (8 workers)");
    for stream in listener.incoming().flatten() {
        pool.execute(stream);
    }
    Ok(())
}
```

## Graceful Shutdown with AtomicBool

```rust
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::net::TcpListener;
use std::thread;
use std::time::Duration;

fn main() -> std::io::Result<()> {
    let running = Arc::new(AtomicBool::new(true));
    let r = Arc::clone(&running);

    // Handle Ctrl+C
    ctrlc::set_handler(move || {
        println!("\nShutting down...");
        r.store(false, Ordering::SeqCst);
    }).expect("Error setting Ctrl-C handler");

    let listener = TcpListener::bind("0.0.0.0:9000")?;
    listener.set_nonblocking(true)?;

    while running.load(Ordering::SeqCst) {
        match listener.accept() {
            Ok((stream, _)) => { thread::spawn(move || handle_stream(stream)); }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }

    println!("Server stopped");
    Ok(())
}
```

## Conclusion

Rust multi-threaded TCP servers use `thread::spawn` per connection with `Arc<Mutex<T>>` for shared state. The thread pool pattern uses `mpsc::channel` to distribute work across a fixed number of worker threads, preventing resource exhaustion. For graceful shutdown, use `AtomicBool` as a stop flag and non-blocking `accept()` to check it regularly.
