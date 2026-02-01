# How to Build Real-time Applications with Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Real-time, WebSocket, Server-Sent Events, Async

Description: A practical guide to building real-time applications in Rust using WebSockets and Server-Sent Events.

---

Real-time applications are everywhere - from chat apps to live dashboards, stock tickers to collaborative editing tools. Rust, with its zero-cost abstractions and memory safety guarantees, has become a compelling choice for building these high-performance systems. In this guide, we'll walk through building real-time features using WebSockets and Server-Sent Events (SSE) in Rust.

## Why Rust for Real-time Applications?

Before diving into code, let's address why Rust makes sense here:

1. **Predictable latency** - No garbage collector means no surprise pauses
2. **Memory efficiency** - Handle thousands of concurrent connections without bloating memory
3. **Fearless concurrency** - The borrow checker catches race conditions at compile time
4. **Async/await support** - Modern async primitives with tokio make concurrent code readable

The trade-off is a steeper learning curve, but for real-time systems where every millisecond counts, Rust delivers.

## Setting Up the Project

Let's start with a Cargo.toml that includes everything we need:

```toml
[package]
name = "realtime-rust"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.35", features = ["full"] }
tokio-tungstenite = "0.21"
futures-util = "0.3"
axum = { version = "0.7", features = ["ws"] }
tower-http = { version = "0.5", features = ["cors"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.6", features = ["v4"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

We're using `axum` as our web framework because it integrates beautifully with tokio and provides first-class WebSocket support. `tokio-tungstenite` handles the WebSocket protocol details.

## Building a WebSocket Server

Let's build a real-time chat server. We'll start with the core structure for managing connections:

```rust
// This struct represents a single connected client
// We store the sender half of a channel to push messages to them
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    // Map of client ID to their message sender
    // RwLock allows multiple readers but exclusive writers
    pub clients: Arc<RwLock<HashMap<String, ClientInfo>>>,
    // Broadcast channel for sending messages to all clients
    pub broadcast_tx: broadcast::Sender<BroadcastMessage>,
}

pub struct ClientInfo {
    pub id: String,
    pub username: String,
    pub connected_at: std::time::Instant,
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct BroadcastMessage {
    pub sender_id: String,
    pub username: String,
    pub content: String,
    pub timestamp: u64,
}
```

Now let's set up the main server with WebSocket handling:

```rust
// Main entry point - sets up routes and starts the server
use axum::{
    extract::{State, WebSocketUpgrade},
    extract::ws::{Message, WebSocket},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};

#[tokio::main]
async fn main() {
    // Initialize logging for debugging connection issues
    tracing_subscriber::init();

    // Create broadcast channel with buffer for 100 messages
    // If a slow client falls behind by 100+ messages, they'll miss some
    let (broadcast_tx, _) = broadcast::channel(100);

    let state = AppState {
        clients: Arc::new(RwLock::new(HashMap::new())),
        broadcast_tx,
    };

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .route("/health", get(|| async { "OK" }))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Server running on port 3000");
    axum::serve(listener, app).await.unwrap();
}
```

The WebSocket handler upgrades HTTP connections and spawns a task per client:

```rust
// This function handles the initial WebSocket upgrade request
// The actual message handling happens in handle_socket
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    // Generate unique ID for this connection
    let client_id = Uuid::new_v4().to_string();
    
    // Split socket into sender and receiver halves
    // This lets us send and receive concurrently
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to broadcast channel to receive messages from other clients
    let mut broadcast_rx = state.broadcast_tx.subscribe();

    // Register this client
    {
        let mut clients = state.clients.write().await;
        clients.insert(client_id.clone(), ClientInfo {
            id: client_id.clone(),
            username: format!("user_{}", &client_id[..8]),
            connected_at: std::time::Instant::now(),
        });
    }

    tracing::info!("Client {} connected", client_id);

    // Spawn task to forward broadcast messages to this client
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = broadcast_rx.recv().await {
            let json = serde_json::to_string(&msg).unwrap();
            if sender.send(Message::Text(json)).await.is_err() {
                break; // Client disconnected
            }
        }
    });

    // Handle incoming messages from this client
    let client_id_clone = client_id.clone();
    let broadcast_tx = state.broadcast_tx.clone();
    
    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            // Broadcast message to all connected clients
            let broadcast_msg = BroadcastMessage {
                sender_id: client_id_clone.clone(),
                username: format!("user_{}", &client_id_clone[..8]),
                content: text,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            };
            let _ = broadcast_tx.send(broadcast_msg);
        }
    }

    // Clean up when client disconnects
    send_task.abort();
    state.clients.write().await.remove(&client_id);
    tracing::info!("Client {} disconnected", client_id);
}
```

## Implementing Heartbeats

WebSocket connections can silently die - firewalls drop idle connections, mobile networks switch, clients crash. Heartbeats detect dead connections so we can clean them up:

```rust
// Heartbeat configuration constants
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(90);

// Modified client info to track last activity
pub struct ClientInfo {
    pub id: String,
    pub username: String,
    pub connected_at: std::time::Instant,
    pub last_heartbeat: Arc<RwLock<std::time::Instant>>,
}

// Spawn a heartbeat task alongside the message handling
async fn handle_socket_with_heartbeat(socket: WebSocket, state: AppState) {
    let client_id = Uuid::new_v4().to_string();
    let (mut sender, mut receiver) = socket.split();
    
    // Wrap sender in Arc<Mutex> so heartbeat task can access it
    let sender = Arc::new(tokio::sync::Mutex::new(sender));
    let last_heartbeat = Arc::new(RwLock::new(std::time::Instant::now()));

    // Heartbeat task - sends ping and checks for timeout
    let heartbeat_sender = sender.clone();
    let heartbeat_time = last_heartbeat.clone();
    let heartbeat_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(HEARTBEAT_INTERVAL);
        loop {
            interval.tick().await;
            
            // Check if client has timed out
            let last = *heartbeat_time.read().await;
            if last.elapsed() > CLIENT_TIMEOUT {
                tracing::warn!("Client timed out");
                break;
            }

            // Send ping frame
            let mut sender = heartbeat_sender.lock().await;
            if sender.send(Message::Ping(vec![1, 2, 3])).await.is_err() {
                break;
            }
        }
    });

    // Message receiving loop - update heartbeat on any activity
    while let Some(Ok(msg)) = receiver.next().await {
        // Any message from client resets the heartbeat timer
        *last_heartbeat.write().await = std::time::Instant::now();

        match msg {
            Message::Pong(_) => {
                // Client responded to our ping - connection is alive
                tracing::debug!("Received pong from client");
            }
            Message::Text(text) => {
                // Handle chat message
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    heartbeat_task.abort();
}
```

## Server-Sent Events for One-Way Streaming

Sometimes you don't need bidirectional communication. For live dashboards or notification feeds, Server-Sent Events (SSE) are simpler and work over regular HTTP:

```rust
// SSE is perfect for streaming updates where clients don't send data back
use axum::response::sse::{Event, Sse};
use futures_util::stream::Stream;
use std::convert::Infallible;

async fn sse_handler(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // Create a stream that yields SSE events
    let mut broadcast_rx = state.broadcast_tx.subscribe();

    let stream = async_stream::stream! {
        loop {
            match broadcast_rx.recv().await {
                Ok(msg) => {
                    let json = serde_json::to_string(&msg).unwrap();
                    // SSE events have optional event type and required data
                    yield Ok(Event::default()
                        .event("message")
                        .data(json));
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    // Client fell behind - send notification
                    yield Ok(Event::default()
                        .event("lagged")
                        .data(format!("Missed {} messages", n)));
                }
                Err(_) => break,
            }
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive")
    )
}
```

Add the route to your router:

```rust
// SSE endpoint alongside WebSocket
let app = Router::new()
    .route("/ws", get(websocket_handler))
    .route("/events", get(sse_handler))
    .route("/health", get(|| async { "OK" }))
    .with_state(state);
```

The client-side JavaScript is straightforward:

```javascript
// Browser code to consume SSE stream
const eventSource = new EventSource('/events');

eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('New message:', data);
});

eventSource.addEventListener('lagged', (event) => {
    console.warn('Missed messages:', event.data);
});

eventSource.onerror = () => {
    console.error('SSE connection lost, reconnecting...');
};
```

## Connection Management at Scale

When you're handling thousands of connections, you need visibility into what's happening:

```rust
// Metrics endpoint to monitor connection health
use axum::Json;

#[derive(serde::Serialize)]
struct ConnectionMetrics {
    total_connections: usize,
    connections_by_age: ConnectionAgeBreakdown,
    broadcast_queue_size: usize,
}

#[derive(serde::Serialize)]
struct ConnectionAgeBreakdown {
    under_1_min: usize,
    under_5_min: usize,
    under_1_hour: usize,
    over_1_hour: usize,
}

async fn metrics_handler(State(state): State<AppState>) -> Json<ConnectionMetrics> {
    let clients = state.clients.read().await;
    let now = std::time::Instant::now();

    let mut breakdown = ConnectionAgeBreakdown {
        under_1_min: 0,
        under_5_min: 0,
        under_1_hour: 0,
        over_1_hour: 0,
    };

    for client in clients.values() {
        let age = now.duration_since(client.connected_at);
        if age < Duration::from_secs(60) {
            breakdown.under_1_min += 1;
        } else if age < Duration::from_secs(300) {
            breakdown.under_5_min += 1;
        } else if age < Duration::from_secs(3600) {
            breakdown.under_1_hour += 1;
        } else {
            breakdown.over_1_hour += 1;
        }
    }

    Json(ConnectionMetrics {
        total_connections: clients.len(),
        connections_by_age: breakdown,
        broadcast_queue_size: state.broadcast_tx.len(),
    })
}
```

## Scalability Considerations

A single Rust server can handle tens of thousands of concurrent WebSocket connections - but eventually you'll need multiple servers. Here are the patterns to consider:

**Redis Pub/Sub for Multi-Server Broadcasting**

Replace the in-memory broadcast channel with Redis when scaling horizontally:

```rust
// Redis pub/sub lets messages flow between server instances
use redis::AsyncCommands;

async fn publish_to_redis(
    redis: &mut redis::aio::Connection,
    channel: &str,
    message: &BroadcastMessage,
) -> redis::RedisResult<()> {
    let json = serde_json::to_string(message).unwrap();
    redis.publish(channel, json).await
}

// Each server subscribes to Redis and forwards to local clients
async fn subscribe_to_redis(
    redis_url: &str,
    local_broadcast: broadcast::Sender<BroadcastMessage>,
) {
    let client = redis::Client::open(redis_url).unwrap();
    let mut pubsub = client.get_async_connection().await.unwrap().into_pubsub();
    pubsub.subscribe("chat").await.unwrap();

    let mut stream = pubsub.on_message();
    while let Some(msg) = stream.next().await {
        let payload: String = msg.get_payload().unwrap();
        if let Ok(broadcast_msg) = serde_json::from_str(&payload) {
            let _ = local_broadcast.send(broadcast_msg);
        }
    }
}
```

**Connection Limits and Backpressure**

Protect your server from being overwhelmed:

```rust
// Middleware to limit concurrent connections
use std::sync::atomic::{AtomicUsize, Ordering};

static CONNECTION_COUNT: AtomicUsize = AtomicUsize::new(0);
const MAX_CONNECTIONS: usize = 10_000;

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let current = CONNECTION_COUNT.load(Ordering::SeqCst);
    if current >= MAX_CONNECTIONS {
        return (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            "Too many connections"
        ).into_response();
    }

    CONNECTION_COUNT.fetch_add(1, Ordering::SeqCst);
    
    ws.on_upgrade(|socket| async move {
        handle_socket(socket, state).await;
        CONNECTION_COUNT.fetch_sub(1, Ordering::SeqCst);
    }).into_response()
}
```

## Graceful Shutdown

Don't drop connections abruptly when deploying. Give clients time to reconnect:

```rust
// Graceful shutdown notifies clients before terminating
use tokio::signal;

#[tokio::main]
async fn main() {
    let (shutdown_tx, mut shutdown_rx) = broadcast::channel::<()>(1);
    
    // Pass shutdown receiver to connection handlers
    // so they can notify clients

    let server = axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            signal::ctrl_c().await.ok();
            tracing::info!("Shutdown signal received");
            
            // Notify all handlers to send close frames
            let _ = shutdown_tx.send(());
            
            // Give clients 5 seconds to disconnect gracefully
            tokio::time::sleep(Duration::from_secs(5)).await;
        });

    server.await.unwrap();
}
```

## Testing WebSocket Applications

Testing real-time code requires a client that can drive the protocol:

```rust
// Integration test using tokio-tungstenite as client
#[cfg(test)]
mod tests {
    use tokio_tungstenite::connect_async;
    use futures_util::{SinkExt, StreamExt};

    #[tokio::test]
    async fn test_echo_message() {
        // Start server in background
        let server = tokio::spawn(async { start_server().await });
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Connect as client
        let (mut ws, _) = connect_async("ws://localhost:3000/ws")
            .await
            .expect("Failed to connect");

        // Send message
        ws.send(Message::Text("Hello".into())).await.unwrap();

        // Receive broadcast (including our own message)
        if let Some(Ok(Message::Text(response))) = ws.next().await {
            let msg: BroadcastMessage = serde_json::from_str(&response).unwrap();
            assert_eq!(msg.content, "Hello");
        }

        server.abort();
    }
}
```

## Wrapping Up

Rust gives you the performance characteristics that real-time applications demand - predictable latency, efficient memory usage, and safe concurrency. The async ecosystem with tokio has matured significantly, and frameworks like axum make it practical to build production WebSocket services.

Key takeaways:

- Use `broadcast` channels for fan-out to multiple clients
- Implement heartbeats to detect zombie connections
- Consider SSE for simpler one-way streaming use cases
- Plan for horizontal scaling with Redis pub/sub
- Add metrics endpoints to monitor connection health
- Always implement graceful shutdown

The code in this post gives you a foundation to build on. Start simple, measure everything, and scale when the metrics tell you to.

---

*Monitor real-time Rust apps with [OneUptime](https://oneuptime.com) - track WebSocket connections and message latency.*
