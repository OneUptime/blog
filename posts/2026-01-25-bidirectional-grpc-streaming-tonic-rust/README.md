# How to Build Bidirectional gRPC Streaming with tonic in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, gRPC, tonic, Streaming, Bidirectional

Description: Learn how to implement bidirectional streaming gRPC services in Rust using tonic, with practical examples covering protocol definitions, server implementation, client handling, and error management.

---

Bidirectional streaming is one of gRPC's most powerful features. Unlike traditional request-response APIs, both client and server can send messages independently and concurrently over a single connection. This makes it perfect for real-time applications like chat systems, live data feeds, collaborative editing, and game servers. In Rust, tonic provides a clean async interface for building these services with strong type safety and excellent performance.

## Project Setup

Start by creating a new Rust project and adding the required dependencies.

```bash
cargo new grpc-streaming
cd grpc-streaming
```

Add these dependencies to your `Cargo.toml`:

```toml
[package]
name = "grpc-streaming"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "server"
path = "src/server.rs"

[[bin]]
name = "client"
path = "src/client.rs"

[dependencies]
tonic = "0.12"
prost = "0.13"
tokio = { version = "1.0", features = ["macros", "rt-multi-thread"] }
tokio-stream = "0.1"
futures = "0.3"

[build-dependencies]
tonic-build = "0.12"
```

## Protocol Definition

Create a `proto` directory and define your service in `proto/chat.proto`. This example builds a simple chat service where clients can stream messages to the server while receiving messages from other participants.

```protobuf
syntax = "proto3";

package chat;

// Chat service with bidirectional streaming
service ChatService {
    // Both client and server stream messages simultaneously
    rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

message ChatMessage {
    string user = 1;
    string content = 2;
    int64 timestamp = 3;
}
```

Create `build.rs` in your project root to compile the proto file:

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Compile proto files at build time
    // Generated code goes to OUT_DIR (target/debug/build/...)
    tonic_build::compile_protos("proto/chat.proto")?;
    Ok(())
}
```

## Server Implementation

The server needs to handle multiple concurrent client connections, broadcasting messages between them. Here's a complete implementation using Tokio's broadcast channel for message distribution.

Create `src/server.rs`:

```rust
use futures::StreamExt;
use std::pin::Pin;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tonic::{Request, Response, Status, Streaming};

// Include the generated proto code
pub mod chat {
    tonic::include_proto!("chat");
}

use chat::chat_service_server::{ChatService, ChatServiceServer};
use chat::ChatMessage;

// Type alias for the response stream - makes the code cleaner
type ResponseStream = Pin<Box<dyn futures::Stream<Item = Result<ChatMessage, Status>> + Send>>;

pub struct ChatServer {
    // Broadcast channel sender - clone this for each new connection
    // The channel distributes messages to all subscribers
    tx: broadcast::Sender<ChatMessage>,
}

impl ChatServer {
    fn new() -> Self {
        // Create channel with buffer for 100 messages
        // Old messages are dropped if a slow receiver falls behind
        let (tx, _rx) = broadcast::channel(100);
        ChatServer { tx }
    }
}

#[tonic::async_trait]
impl ChatService for ChatServer {
    type ChatStream = ResponseStream;

    async fn chat(
        &self,
        request: Request<Streaming<ChatMessage>>,
    ) -> Result<Response<Self::ChatStream>, Status> {
        // Get the incoming message stream from the client
        let mut inbound = request.into_inner();

        // Clone sender so we can move it into the spawned task
        let tx = self.tx.clone();

        // Subscribe to receive messages from other clients
        let rx = self.tx.subscribe();

        // Spawn a task to handle incoming messages from this client
        // This runs independently from the outbound stream
        tokio::spawn(async move {
            // Process each message the client sends
            while let Some(result) = inbound.next().await {
                match result {
                    Ok(msg) => {
                        println!("[{}]: {}", msg.user, msg.content);
                        // Broadcast to all connected clients
                        // Ignore send errors - happens when no receivers exist
                        let _ = tx.send(msg);
                    }
                    Err(e) => {
                        // Client disconnected or sent invalid data
                        eprintln!("Error receiving message: {}", e);
                        break;
                    }
                }
            }
            println!("Client disconnected");
        });

        // Convert broadcast receiver to a Stream that yields Result<ChatMessage, Status>
        // BroadcastStream handles the async iteration for us
        let outbound = BroadcastStream::new(rx).filter_map(|result| async move {
            match result {
                Ok(msg) => Some(Ok(msg)),
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    // Client fell behind - log and continue
                    eprintln!("Receiver lagged by {} messages", n);
                    None
                }
                Err(broadcast::error::RecvError::Closed) => None,
            }
        });

        Ok(Response::new(Box::pin(outbound)))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50051".parse()?;
    let chat_server = ChatServer::new();

    println!("Chat server listening on {}", addr);

    tonic::transport::Server::builder()
        .add_service(ChatServiceServer::new(chat_server))
        .serve(addr)
        .await?;

    Ok(())
}
```

## Client Implementation

The client maintains two concurrent tasks - one for sending user input and one for receiving messages from the server. Create `src/client.rs`:

```rust
use futures::StreamExt;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio_stream::wrappers::ReceiverStream;
use tonic::Request;

pub mod chat {
    tonic::include_proto!("chat");
}

use chat::chat_service_client::ChatServiceClient;
use chat::ChatMessage;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to the gRPC server
    let mut client = ChatServiceClient::connect("http://[::1]:50051").await?;

    // Get username from command line or use default
    let username = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "anonymous".to_string());

    println!("Connected as '{}'. Type messages and press Enter to send.", username);

    // Create a channel to send messages to the gRPC stream
    // The receiver becomes the outbound stream to the server
    let (tx, rx) = tokio::sync::mpsc::channel::<ChatMessage>(32);

    // Spawn task to read user input from stdin
    let username_clone = username.clone();
    tokio::spawn(async move {
        let stdin = tokio::io::stdin();
        let reader = BufReader::new(stdin);
        let mut lines = reader.lines();

        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }

            let msg = ChatMessage {
                user: username_clone.clone(),
                content: line,
                timestamp: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64,
            };

            // Send to the gRPC stream - exit if channel closed
            if tx.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Convert the receiver to a stream for the gRPC call
    let outbound = ReceiverStream::new(rx);

    // Start the bidirectional stream
    let response = client.chat(Request::new(outbound)).await?;
    let mut inbound = response.into_inner();

    // Process incoming messages from the server
    while let Some(result) = inbound.next().await {
        match result {
            Ok(msg) => {
                // Skip our own messages to avoid echo
                if msg.user != username {
                    println!("[{}]: {}", msg.user, msg.content);
                }
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                break;
            }
        }
    }

    Ok(())
}
```

## Running the Example

Build and run the server in one terminal:

```bash
cargo run --bin server
```

Open additional terminals for clients:

```bash
cargo run --bin client alice
cargo run --bin client bob
```

Messages typed in one client window appear in all other connected clients.

## Error Handling and Reconnection

Production applications need robust error handling. Here's a client wrapper that handles disconnections and retries:

```rust
use std::time::Duration;
use tokio::time::sleep;

async fn connect_with_retry(
    addr: &str,
    max_retries: u32,
) -> Result<ChatServiceClient<tonic::transport::Channel>, Box<dyn std::error::Error>> {
    let mut attempts = 0;

    loop {
        match ChatServiceClient::connect(addr.to_string()).await {
            Ok(client) => return Ok(client),
            Err(e) => {
                attempts += 1;
                if attempts >= max_retries {
                    return Err(Box::new(e));
                }
                // Exponential backoff with cap at 30 seconds
                let delay = Duration::from_secs(2u64.pow(attempts).min(30));
                eprintln!("Connection failed, retrying in {:?}...", delay);
                sleep(delay).await;
            }
        }
    }
}
```

## Flow Control and Backpressure

gRPC handles flow control at the HTTP/2 level, but your application should also manage backpressure. The broadcast channel in our server drops old messages when receivers lag. For applications where message loss is unacceptable, consider using bounded channels with different strategies:

```rust
use tokio::sync::mpsc;

// Per-client message queue with explicit backpressure
struct ClientConnection {
    // Bounded channel - send blocks when full
    tx: mpsc::Sender<ChatMessage>,
}

impl ClientConnection {
    fn new(buffer_size: usize) -> (Self, mpsc::Receiver<ChatMessage>) {
        let (tx, rx) = mpsc::channel(buffer_size);
        (ClientConnection { tx }, rx)
    }

    async fn send(&self, msg: ChatMessage) -> Result<(), mpsc::error::SendError<ChatMessage>> {
        // This awaits until space is available
        // For non-blocking behavior, use try_send instead
        self.tx.send(msg).await
    }
}
```

## Adding Metadata and Authentication

Pass authentication tokens or other metadata using gRPC headers:

```rust
// Client - add authorization header
let mut request = Request::new(outbound);
request.metadata_mut().insert(
    "authorization",
    "Bearer your-token-here".parse().unwrap(),
);
let response = client.chat(request).await?;

// Server - extract and validate metadata
async fn chat(
    &self,
    request: Request<Streaming<ChatMessage>>,
) -> Result<Response<Self::ChatStream>, Status> {
    // Check authorization before processing
    let token = request
        .metadata()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| Status::unauthenticated("Missing authorization"))?;

    if !validate_token(token) {
        return Err(Status::permission_denied("Invalid token"));
    }

    // Continue with stream handling...
}
```

## Performance Considerations

Tonic uses Tokio for async I/O, so it scales well across many concurrent connections. A few tips for production deployments:

Keep messages small. Large messages tie up the connection and increase latency for other messages. For bulk data transfer, consider unary calls or file uploads instead.

Monitor channel buffer sizes. Full buffers cause either dropped messages or blocked senders depending on your channel type. Track these metrics to right-size your buffers.

Use connection pooling on the client side. Tonic's Channel type already handles this, but be aware of the overhead when creating new connections.

## Summary

Bidirectional streaming with tonic gives you a powerful foundation for real-time Rust applications. The combination of gRPC's efficient binary protocol, HTTP/2 multiplexing, and Rust's async ecosystem handles high-throughput scenarios with minimal overhead.

The key patterns to remember: use channels to bridge between gRPC streams and your application logic, handle errors at stream boundaries, and design for backpressure from the start. With these building blocks, you can build chat systems, live dashboards, multiplayer games, or any application needing persistent bidirectional communication.
