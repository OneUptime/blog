# How to Build a Scalable WebSocket Server with Tokio in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, WebSocket, Tokio, Real-time, Scalability

Description: Learn how to build a production-ready WebSocket server in Rust using Tokio and the tungstenite library. This guide covers connection management, broadcasting, and scaling patterns for high-performance real-time applications.

---

> WebSocket servers in Rust offer exceptional performance and memory safety. Tokio provides the async runtime foundation, while libraries like tokio-tungstenite handle the WebSocket protocol. Together, they let you build servers that handle thousands of concurrent connections with minimal overhead.

Real-time applications like chat systems, live dashboards, gaming backends, and collaborative tools all benefit from Rust's speed and reliability. Let's build one from scratch.

---

## Setting Up Your Project

First, create a new Rust project and add the required dependencies. We'll use tokio for async runtime, tokio-tungstenite for WebSocket support, and futures-util for stream utilities.

```toml
# Cargo.toml
[package]
name = "websocket-server"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.35", features = ["full"] }  # Async runtime with all features
tokio-tungstenite = "0.21"  # WebSocket implementation for Tokio
futures-util = "0.3"  # Stream and sink utilities
serde = { version = "1.0", features = ["derive"] }  # JSON serialization
serde_json = "1.0"  # JSON parsing
uuid = { version = "1.6", features = ["v4"] }  # Unique client IDs
```

---

## Basic WebSocket Server

This minimal example accepts WebSocket connections and echoes messages back. The server listens on a TCP port and upgrades HTTP connections to WebSocket.

```rust
// src/main.rs
// Basic WebSocket echo server
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_async;
use futures_util::{StreamExt, SinkExt};

#[tokio::main]
async fn main() {
    // Bind TCP listener on port 8080
    let listener = TcpListener::bind("127.0.0.1:8080")
        .await
        .expect("Failed to bind");

    println!("WebSocket server listening on ws://127.0.0.1:8080");

    // Accept connections in a loop
    while let Ok((stream, addr)) = listener.accept().await {
        println!("New connection from: {}", addr);
        // Spawn a task for each connection (non-blocking)
        tokio::spawn(handle_connection(stream));
    }
}

async fn handle_connection(stream: TcpStream) {
    // Upgrade TCP connection to WebSocket
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    // Split into sender and receiver halves
    let (mut write, mut read) = ws_stream.split();

    // Echo messages back to client
    while let Some(message) = read.next().await {
        match message {
            Ok(msg) => {
                if msg.is_text() || msg.is_binary() {
                    // Send the message back
                    if write.send(msg).await.is_err() {
                        break;  // Client disconnected
                    }
                }
            }
            Err(_) => break,  // Connection error
        }
    }

    println!("Connection closed");
}
```

---

## Connection Manager with Broadcasting

For multi-client scenarios, you need a connection manager that tracks all active connections and provides broadcasting capabilities. We use Tokio's mpsc channels and a shared state protected by RwLock.

```rust
// src/connection_manager.rs
// Thread-safe connection manager for multiple clients
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::tungstenite::Message;

// Type alias for the sender half of a client channel
type ClientSender = mpsc::UnboundedSender<Message>;

#[derive(Clone)]
pub struct ConnectionManager {
    // Map of client_id to their message channel
    connections: Arc<RwLock<HashMap<String, ClientSender>>>,
    // Room memberships: room_name -> set of client_ids
    rooms: Arc<RwLock<HashMap<String, Vec<String>>>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    // Register a new client and return a receiver for outgoing messages
    pub async fn add_client(&self, client_id: String) -> mpsc::UnboundedReceiver<Message> {
        let (tx, rx) = mpsc::unbounded_channel();
        self.connections.write().await.insert(client_id.clone(), tx);
        println!("Client {} connected. Total: {}",
            client_id,
            self.connections.read().await.len()
        );
        rx
    }

    // Remove a client and clean up room memberships
    pub async fn remove_client(&self, client_id: &str) {
        self.connections.write().await.remove(client_id);

        // Remove from all rooms
        let mut rooms = self.rooms.write().await;
        for members in rooms.values_mut() {
            members.retain(|id| id != client_id);
        }

        println!("Client {} disconnected", client_id);
    }

    // Send a message to a specific client
    pub async fn send_to_client(&self, client_id: &str, message: Message) -> bool {
        if let Some(tx) = self.connections.read().await.get(client_id) {
            tx.send(message).is_ok()
        } else {
            false
        }
    }

    // Broadcast to all connected clients
    pub async fn broadcast(&self, message: Message, exclude: Option<&str>) {
        let connections = self.connections.read().await;
        for (client_id, tx) in connections.iter() {
            // Skip the excluded client (usually the sender)
            if exclude.map_or(true, |ex| ex != client_id) {
                let _ = tx.send(message.clone());
            }
        }
    }

    // Add client to a room
    pub async fn join_room(&self, client_id: &str, room: &str) {
        let mut rooms = self.rooms.write().await;
        rooms.entry(room.to_string())
            .or_insert_with(Vec::new)
            .push(client_id.to_string());
    }

    // Broadcast to all clients in a room
    pub async fn broadcast_to_room(&self, room: &str, message: Message, exclude: Option<&str>) {
        let rooms = self.rooms.read().await;
        let connections = self.connections.read().await;

        if let Some(members) = rooms.get(room) {
            for client_id in members {
                if exclude.map_or(true, |ex| ex != client_id) {
                    if let Some(tx) = connections.get(client_id) {
                        let _ = tx.send(message.clone());
                    }
                }
            }
        }
    }
}
```

---

## Handling Client Connections

Each client connection runs in its own task. We spawn two tasks per client: one for reading incoming messages and one for writing outgoing messages from the channel.

```rust
// src/client.rs
// Client connection handler with read/write separation
use crate::connection_manager::ConnectionManager;
use futures_util::{StreamExt, SinkExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
struct IncomingMessage {
    msg_type: String,
    content: Option<String>,
    room: Option<String>,
}

#[derive(Serialize)]
struct OutgoingMessage {
    msg_type: String,
    from: String,
    content: String,
}

pub async fn handle_client(stream: TcpStream, manager: ConnectionManager) {
    // Upgrade to WebSocket
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("Handshake error: {}", e);
            return;
        }
    };

    // Generate unique client ID
    let client_id = Uuid::new_v4().to_string();

    // Register client and get outgoing message receiver
    let mut rx = manager.add_client(client_id.clone()).await;

    // Split WebSocket stream
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Clone manager and client_id for the write task
    let manager_clone = manager.clone();
    let client_id_clone = client_id.clone();

    // Task for sending messages to client
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;  // Connection closed
            }
        }
    });

    // Task for receiving messages from client
    let recv_task = tokio::spawn(async move {
        while let Some(result) = ws_receiver.next().await {
            match result {
                Ok(Message::Text(text)) => {
                    // Parse incoming JSON message
                    if let Ok(incoming) = serde_json::from_str::<IncomingMessage>(&text) {
                        handle_message(&manager_clone, &client_id_clone, incoming).await;
                    }
                }
                Ok(Message::Close(_)) => break,
                Err(_) => break,
                _ => {}  // Ignore ping/pong/binary
            }
        }

        // Client disconnected, clean up
        manager_clone.remove_client(&client_id_clone).await;
    });

    // Wait for either task to finish
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }
}

async fn handle_message(manager: &ConnectionManager, client_id: &str, msg: IncomingMessage) {
    match msg.msg_type.as_str() {
        "chat" => {
            // Broadcast chat message to everyone
            let outgoing = OutgoingMessage {
                msg_type: "chat".to_string(),
                from: client_id.to_string(),
                content: msg.content.unwrap_or_default(),
            };
            let json = serde_json::to_string(&outgoing).unwrap();
            manager.broadcast(Message::Text(json), Some(client_id)).await;
        }
        "join_room" => {
            if let Some(room) = msg.room {
                manager.join_room(client_id, &room).await;
            }
        }
        "room_message" => {
            if let (Some(room), Some(content)) = (msg.room, msg.content) {
                let outgoing = OutgoingMessage {
                    msg_type: "room_message".to_string(),
                    from: client_id.to_string(),
                    content,
                };
                let json = serde_json::to_string(&outgoing).unwrap();
                manager.broadcast_to_room(&room, Message::Text(json), Some(client_id)).await;
            }
        }
        _ => {}
    }
}
```

---

## Main Server with Graceful Shutdown

The main server ties everything together. It handles graceful shutdown so clients receive proper close frames when the server stops.

```rust
// src/main.rs
// Production WebSocket server with graceful shutdown
mod connection_manager;
mod client;

use connection_manager::ConnectionManager;
use tokio::net::TcpListener;
use tokio::signal;

#[tokio::main]
async fn main() {
    // Initialize connection manager (shared across all connections)
    let manager = ConnectionManager::new();

    // Bind TCP listener
    let listener = TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind port 8080");

    println!("WebSocket server running on ws://0.0.0.0:8080");

    // Accept connections until shutdown signal
    loop {
        tokio::select! {
            // Accept new connection
            accept_result = listener.accept() => {
                match accept_result {
                    Ok((stream, addr)) => {
                        println!("New connection from {}", addr);
                        let mgr = manager.clone();
                        tokio::spawn(client::handle_client(stream, mgr));
                    }
                    Err(e) => eprintln!("Accept error: {}", e),
                }
            }
            // Handle Ctrl+C
            _ = signal::ctrl_c() => {
                println!("Shutdown signal received");
                break;
            }
        }
    }

    println!("Server shutting down");
}
```

---

## Scaling with Multiple Workers

For better CPU utilization, you can run multiple Tokio worker threads. The runtime automatically distributes tasks across workers. For extreme scalability, consider running multiple server processes behind a load balancer with sticky sessions.

```rust
// Runtime configuration for high-concurrency servers
#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() {
    // Server code here
    // Tokio will distribute tasks across 4 worker threads
}
```

---

## Performance Tips

When building production WebSocket servers in Rust, keep these patterns in mind:

1. **Use unbounded channels sparingly** - For production, consider bounded channels with backpressure to prevent memory exhaustion from slow clients.

2. **Batch broadcasts** - If you're sending many messages, batch them to reduce lock contention on the connections map.

3. **Connection limits** - Set a maximum connection count to prevent resource exhaustion.

4. **Heartbeat timeouts** - Implement ping/pong handling to detect dead connections early.

5. **Message size limits** - Reject messages above a certain size to prevent denial of service.

---

## Conclusion

Building WebSocket servers in Rust with Tokio gives you excellent performance and memory safety guarantees. The combination of async/await, channels, and the tungstenite library makes it straightforward to build servers that handle thousands of concurrent connections.

Key takeaways:

- **Tokio's async runtime** provides efficient I/O multiplexing
- **Channels** decouple message handling from connection management
- **RwLock** allows concurrent reads with exclusive writes
- **Task spawning** keeps connections independent

Start with the basic echo server, add the connection manager as you need broadcasting, and scale up from there.

---

*Building real-time applications? [OneUptime](https://oneuptime.com) provides monitoring for WebSocket servers and real-time infrastructure.*
