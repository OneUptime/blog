# How to Implement Long-Polling for Chat Apps in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Long Polling, Chat, Real-time, HTTP

Description: A practical guide to implementing long-polling in Rust for chat applications, covering async request handling, timeout management, and message broadcasting with Axum and Tokio.

---

Building real-time features doesn't always require WebSockets. Long-polling is a battle-tested technique that works everywhere HTTP works, and Rust's async ecosystem makes it surprisingly clean to implement. In this post, we'll walk through building a long-polling backend for a chat application using Axum and Tokio.

## Why Long-Polling?

WebSockets are great, but they come with baggage. Proxies can be unfriendly to persistent connections. Load balancers need special configuration. Some corporate firewalls block upgrade requests entirely. Long-polling sidesteps all of this by using plain HTTP requests that hang until there's something to send back.

The trade-off is more connections and slightly higher latency. For many chat applications - especially internal tools, support widgets, or apps with moderate message volume - that's a perfectly acceptable trade.

## The Basic Flow

Long-polling works like this:

1. Client sends a GET request asking for new messages
2. Server holds the request open until a new message arrives or a timeout occurs
3. Server responds with the message (or an empty response on timeout)
4. Client immediately sends another request

The key is making step 2 efficient. You don't want to burn CPU cycles checking for messages in a loop. Instead, you want the task to sleep until something wakes it up.

## Setting Up the Project

We'll use Axum for the HTTP layer and Tokio for async runtime and synchronization primitives. Add these to your `Cargo.toml`:

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
```

## The Message Store

First, let's create a shared state that holds messages and can notify waiting clients when new ones arrive:

```rust
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub user: String,
    pub content: String,
    pub timestamp: u64,
}

pub struct ChatState {
    // Store recent messages for clients that reconnect
    messages: RwLock<Vec<ChatMessage>>,
    // Broadcast channel to notify waiting poll requests
    notifier: broadcast::Sender<ChatMessage>,
}

impl ChatState {
    pub fn new() -> Arc<Self> {
        // Buffer size of 100 means we can have 100 unread messages
        // before slower receivers start missing them
        let (tx, _) = broadcast::channel(100);

        Arc::new(Self {
            messages: RwLock::new(Vec::new()),
            notifier: tx,
        })
    }

    pub async fn add_message(&self, msg: ChatMessage) {
        // Store the message
        let mut messages = self.messages.write().await;
        messages.push(msg.clone());

        // Keep only the last 1000 messages to bound memory
        if messages.len() > 1000 {
            messages.drain(0..100);
        }

        // Notify all waiting poll requests
        // Ignore errors - they just mean no one is listening
        let _ = self.notifier.send(msg);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ChatMessage> {
        self.notifier.subscribe()
    }

    pub async fn get_messages_since(&self, last_id: Option<&str>) -> Vec<ChatMessage> {
        let messages = self.messages.read().await;

        match last_id {
            Some(id) => {
                // Find the position of the last seen message
                if let Some(pos) = messages.iter().position(|m| m.id == id) {
                    messages[pos + 1..].to_vec()
                } else {
                    // ID not found, return recent messages
                    messages.iter().rev().take(50).cloned().collect()
                }
            }
            None => {
                // No last ID, return recent messages
                messages.iter().rev().take(50).cloned().collect()
            }
        }
    }
}
```

The broadcast channel is the key ingredient here. When a new message arrives, we send it through the channel. Any poll requests that are waiting will receive it and can respond immediately.

## The Long-Poll Endpoint

Now for the interesting part. The poll endpoint needs to:

1. Check if there are already new messages to return
2. If not, wait for a notification or a timeout
3. Return whatever we have (or empty on timeout)

```rust
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use std::time::Duration;
use tokio::time::timeout;

#[derive(Deserialize)]
pub struct PollQuery {
    last_id: Option<String>,
}

#[derive(Serialize)]
pub struct PollResponse {
    messages: Vec<ChatMessage>,
}

pub async fn poll_messages(
    State(state): State<Arc<ChatState>>,
    Query(query): Query<PollQuery>,
) -> Json<PollResponse> {
    // First, check if there are already new messages
    let existing = state.get_messages_since(query.last_id.as_deref()).await;

    if !existing.is_empty() {
        return Json(PollResponse { messages: existing });
    }

    // No new messages - subscribe and wait
    let mut receiver = state.subscribe();

    // Wait up to 30 seconds for a new message
    let poll_timeout = Duration::from_secs(30);

    match timeout(poll_timeout, receiver.recv()).await {
        Ok(Ok(msg)) => {
            // Got a message, return it
            Json(PollResponse { messages: vec![msg] })
        }
        Ok(Err(_)) => {
            // Channel closed or lagged - return empty
            Json(PollResponse { messages: vec![] })
        }
        Err(_) => {
            // Timeout - return empty, client will reconnect
            Json(PollResponse { messages: vec![] })
        }
    }
}
```

The timeout is important. Without it, requests would hang indefinitely if no messages arrive. A 30-second timeout is a reasonable default - long enough to reduce connection churn, short enough that clients don't appear unresponsive.

## The Send Message Endpoint

Sending messages is straightforward. Accept the message, store it, and the broadcast channel takes care of notifying waiting clients:

```rust
#[derive(Deserialize)]
pub struct SendMessageRequest {
    user: String,
    content: String,
}

pub async fn send_message(
    State(state): State<Arc<ChatState>>,
    Json(request): Json<SendMessageRequest>,
) -> StatusCode {
    let msg = ChatMessage {
        id: uuid::Uuid::new_v4().to_string(),
        user: request.user,
        content: request.content,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };

    state.add_message(msg).await;
    StatusCode::CREATED
}
```

## Wiring It Together

Here's the complete server setup:

```rust
use axum::{routing::{get, post}, Router};

#[tokio::main]
async fn main() {
    let state = ChatState::new();

    let app = Router::new()
        .route("/poll", get(poll_messages))
        .route("/send", post(send_message))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
```

## Handling Edge Cases

Real production code needs a few more considerations.

**Connection limits**: Each long-poll request holds a connection open. Set appropriate limits on your server and use a reverse proxy like nginx to handle connection pooling.

**Client identification**: In a real chat app, you'd want to track which user each poll request belongs to. Add authentication middleware and filter messages accordingly.

**Message ordering**: The broadcast channel preserves ordering per sender, but if you have multiple instances behind a load balancer, you'll need a shared message store like Redis with pub/sub.

**Graceful shutdown**: When the server shuts down, close the broadcast channel so waiting requests return immediately instead of timing out.

## Performance Considerations

Long-polling in Rust is efficient because async tasks waiting on a channel don't consume CPU. They're parked until the channel receives data. With Tokio's work-stealing scheduler, you can handle thousands of waiting poll requests with minimal resource usage.

That said, measure your specific use case. If you're dealing with thousands of messages per second, WebSockets might be worth the operational complexity. For moderate traffic, long-polling is simpler to deploy and debug.

## Wrapping Up

Long-polling isn't glamorous, but it's reliable. Rust's async primitives - especially broadcast channels and timeouts - make the implementation clean and efficient. The pattern shown here scales well and works through the gnarliest corporate proxies.

Start with long-polling if you're unsure. You can always upgrade to WebSockets later if the polling overhead becomes a problem. Often, it never does.
