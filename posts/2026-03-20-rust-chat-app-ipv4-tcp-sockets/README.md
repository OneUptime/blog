# How to Build a Chat Application in Rust Using IPv4 TCP Sockets (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, TCP, IPv4, Chat, Networking, Thread, Arc, Mutex

Description: Build a multi-user chat server in Rust using TcpListener, threads, and shared state with Arc and Mutex to broadcast messages between IPv4 clients.

## Introduction

A chat server in Rust demonstrates multi-threaded TCP socket programming, shared mutable state with `Arc<Mutex<>>`, and Rust's ownership model for safe concurrent access. This implementation supports multiple clients with username registration and broadcast messaging.

## Chat Server

```rust
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

type Clients = Arc<Mutex<HashMap<String, TcpStream>>>;

fn broadcast(clients: &Clients, message: &str, exclude: Option<&str>) {
    let mut client_map = clients.lock().unwrap();
    let mut to_remove = Vec::new();
    
    for (username, stream) in client_map.iter_mut() {
        if exclude.map_or(false, |ex| ex == username) {
            continue;
        }
        if let Err(_) = writeln!(stream, "{}", message) {
            to_remove.push(username.clone());
        }
    }
    
    // Remove disconnected clients
    for username in to_remove {
        client_map.remove(&username);
        println!("Removed disconnected client: {}", username);
    }
}

fn handle_client(stream: TcpStream, clients: Clients) {
    let peer = stream.peer_addr().unwrap().to_string();
    
    stream.set_read_timeout(Some(Duration::from_secs(300))).ok(); // 5-min idle timeout
    
    let reader_stream = stream.try_clone().unwrap();
    let mut reader = BufReader::new(&reader_stream);
    let mut write_stream = stream;
    
    // Step 1: Ask for username
    write!(write_stream, "Enter username: ").ok();
    
    let mut username = String::new();
    match reader.read_line(&mut username) {
        Ok(0) | Err(_) => return,
        Ok(_) => {}
    }
    
    let username = username.trim().to_string();
    
    if username.is_empty() || username.len() < 2 {
        let _ = writeln!(write_stream, "Username must be at least 2 characters");
        return;
    }
    
    // Check if username is taken and register the client
    {
        let mut map = clients.lock().unwrap();
        if map.contains_key(&username) {
            let _ = writeln!(write_stream, "Username '{}' is already taken", username);
            return;
        }
        map.insert(username.clone(), write_stream.try_clone().unwrap());
    }
    
    println!("{} joined from {}", username, peer);
    let _ = writeln!(write_stream, "Welcome, {}! Type /quit to exit.", username);
    
    broadcast(&clients, &format!("*** {} joined the chat ***", username), Some(&username));
    
    // Step 2: Message loop
    loop {
        let mut line = String::new();
        
        match reader.read_line(&mut line) {
            Ok(0) => {
                println!("{} disconnected", username);
                break;
            }
            Err(e) => {
                let kind = e.kind();
                if kind == std::io::ErrorKind::WouldBlock || kind == std::io::ErrorKind::TimedOut {
                    println!("{} idle timeout", username);
                } else {
                    eprintln!("{} read error: {}", username, e);
                }
                break;
            }
            Ok(_) => {}
        }
        
        let msg = line.trim().to_string();
        if msg.is_empty() { continue; }
        
        if msg == "/quit" || msg == "/exit" {
            let _ = writeln!(write_stream, "Goodbye, {}!", username);
            break;
        }
        
        if msg == "/who" {
            let map = clients.lock().unwrap();
            let user_list: Vec<&str> = map.keys().map(|s| s.as_str()).collect();
            let _ = writeln!(write_stream, "Online: {}", user_list.join(", "));
            continue;
        }
        
        // Broadcast the message
        let full_message = format!("{}: {}", username, msg);
        println!("{}", full_message);
        
        // Echo to sender
        let _ = writeln!(write_stream, "{}", full_message);
        
        // Broadcast to others
        broadcast(&clients, &full_message, Some(&username));
    }
    
    // Step 3: Clean up on disconnect
    {
        let mut map = clients.lock().unwrap();
        map.remove(&username);
    }
    
    broadcast(&clients, &format!("*** {} left the chat ***", username), None);
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:3000")?;
    println!("Chat server on port 3000");
    println!("Connect with: telnet 127.0.0.1 3000");
    
    let clients: Clients = Arc::new(Mutex::new(HashMap::new()));
    
    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                let clients = Arc::clone(&clients);
                thread::spawn(move || handle_client(s, clients));
            }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    
    Ok(())
}
```

## Running the Chat Server

```bash
cargo run

# Connect from multiple terminals

telnet 127.0.0.1 3000
# Or
nc 127.0.0.1 3000
```

## Key Rust Patterns Used

- **`Arc<Mutex<HashMap>>`**: Shared ownership (`Arc`) with mutual exclusion (`Mutex`) for the client map
- **`try_clone()`**: Duplicate `TcpStream` for separate read/write handles in the same thread
- **`BufReader`**: Efficient line-by-line reading without excessive syscalls
- **RAII cleanup**: MutexGuard automatically releases the lock when dropped

## Conclusion

This chat server demonstrates Rust's approach to safe concurrent programming. The `Arc<Mutex<>>` pattern ensures no data races on the shared client map, and Rust's borrow checker enforces these guarantees at compile time. For a production chat system, consider using `tokio` and async I/O for better scalability.
