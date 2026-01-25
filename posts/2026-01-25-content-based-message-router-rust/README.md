# How to Build a Content-Based Message Router in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Message Router, Content-Based Routing, Messaging, Architecture

Description: A practical guide to building a content-based message router in Rust that inspects message payloads and routes them to the appropriate handlers based on rules you define.

---

Message routing sits at the heart of most distributed systems. Whether you are building an event-driven microservices architecture, a notification pipeline, or a data ingestion system, you need a way to inspect incoming messages and send them to the right place. Content-based routing takes this a step further by examining the actual payload of each message to make routing decisions.

In this post, we will build a content-based message router in Rust from scratch. Rust is an excellent choice here because of its performance characteristics, strong type system, and memory safety guarantees - all crucial when processing high volumes of messages.

## What Is Content-Based Routing?

Unlike topic-based routing where messages go to predefined channels, content-based routing inspects the message body itself. A router might look at a field like `event_type`, check if a value exceeds a threshold, or match against a pattern. This flexibility comes at a cost - you need to parse and evaluate each message - but it enables routing logic that would be impossible with static topics alone.

Common use cases include:

- Routing orders to different fulfillment services based on item category
- Sending alerts to different channels based on severity level
- Directing user events to region-specific processors
- Filtering and transforming data streams before delivery

## Defining the Core Types

Let us start with the basic building blocks. We need a message structure, a way to define routing rules, and handlers that process routed messages.

```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

// A message with headers and a JSON body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub headers: HashMap<String, String>,
    pub body: Value,
}

// A rule that matches messages based on a JSON path and expected value
#[derive(Debug, Clone)]
pub struct RoutingRule {
    pub name: String,
    pub json_path: String,      // e.g., "event.type" or "priority"
    pub expected_value: Value,  // the value to match against
    pub handler_id: String,     // where to route matching messages
}
```

The `Message` struct uses `serde_json::Value` for the body, which lets us handle arbitrary JSON structures without knowing the schema at compile time. The `RoutingRule` uses a simple dot-notation path to navigate into nested JSON.

## Building the Router

The router maintains a list of rules and a registry of handlers. When a message arrives, it evaluates each rule in order and routes to the first matching handler.

```rust
use std::sync::Arc;

// Trait for message handlers
pub trait MessageHandler: Send + Sync {
    fn handle(&self, message: &Message) -> Result<(), RouterError>;
    fn id(&self) -> &str;
}

// Custom error type for routing failures
#[derive(Debug)]
pub enum RouterError {
    NoMatchingRule,
    HandlerNotFound(String),
    HandlerFailed(String),
    InvalidPath(String),
}

pub struct ContentRouter {
    rules: Vec<RoutingRule>,
    handlers: HashMap<String, Arc<dyn MessageHandler>>,
    default_handler: Option<Arc<dyn MessageHandler>>,
}

impl ContentRouter {
    pub fn new() -> Self {
        ContentRouter {
            rules: Vec::new(),
            handlers: HashMap::new(),
            default_handler: None,
        }
    }

    // Register a handler with a unique ID
    pub fn register_handler(&mut self, handler: Arc<dyn MessageHandler>) {
        self.handlers.insert(handler.id().to_string(), handler);
    }

    // Add a routing rule
    pub fn add_rule(&mut self, rule: RoutingRule) {
        self.rules.push(rule);
    }

    // Set a fallback handler for unmatched messages
    pub fn set_default_handler(&mut self, handler: Arc<dyn MessageHandler>) {
        self.default_handler = Some(handler);
    }
}
```

## Implementing Path Extraction

To evaluate rules, we need to extract values from nested JSON using dot notation. Here is a simple implementation:

```rust
impl ContentRouter {
    // Extract a value from the message body using dot notation
    // Example: "user.address.city" navigates into nested objects
    fn extract_value(&self, body: &Value, path: &str) -> Option<Value> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = body;

        for part in parts {
            match current.get(part) {
                Some(v) => current = v,
                None => return None,
            }
        }

        Some(current.clone())
    }

    // Check if a message matches a specific rule
    fn matches_rule(&self, message: &Message, rule: &RoutingRule) -> bool {
        // First check headers for the path
        if let Some(header_val) = message.headers.get(&rule.json_path) {
            if let Some(expected_str) = rule.expected_value.as_str() {
                return header_val == expected_str;
            }
        }

        // Then check the body
        match self.extract_value(&message.body, &rule.json_path) {
            Some(value) => value == rule.expected_value,
            None => false,
        }
    }
}
```

## The Routing Logic

Now we can implement the main routing method. It iterates through rules, finds a match, and dispatches to the appropriate handler:

```rust
impl ContentRouter {
    pub fn route(&self, message: &Message) -> Result<(), RouterError> {
        // Find the first matching rule
        for rule in &self.rules {
            if self.matches_rule(message, rule) {
                // Look up the handler for this rule
                let handler = self.handlers
                    .get(&rule.handler_id)
                    .ok_or_else(|| RouterError::HandlerNotFound(rule.handler_id.clone()))?;

                // Dispatch the message
                return handler.handle(message).map_err(|e| {
                    RouterError::HandlerFailed(format!("{:?}", e))
                });
            }
        }

        // No rule matched - try the default handler
        if let Some(ref handler) = self.default_handler {
            return handler.handle(message);
        }

        Err(RouterError::NoMatchingRule)
    }
}
```

## Creating Handlers

Handlers implement the `MessageHandler` trait. Here are two example handlers - one that logs messages and another that forwards them to an HTTP endpoint:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

// A simple handler that logs messages
pub struct LoggingHandler {
    id: String,
    counter: AtomicUsize,
}

impl LoggingHandler {
    pub fn new(id: &str) -> Self {
        LoggingHandler {
            id: id.to_string(),
            counter: AtomicUsize::new(0),
        }
    }

    pub fn message_count(&self) -> usize {
        self.counter.load(Ordering::Relaxed)
    }
}

impl MessageHandler for LoggingHandler {
    fn handle(&self, message: &Message) -> Result<(), RouterError> {
        let count = self.counter.fetch_add(1, Ordering::Relaxed);
        println!(
            "[{}] Message #{}: id={}, body={}",
            self.id, count, message.id, message.body
        );
        Ok(())
    }

    fn id(&self) -> &str {
        &self.id
    }
}
```

## Putting It All Together

Here is a complete example that sets up routing based on event types:

```rust
fn main() {
    // Create the router
    let mut router = ContentRouter::new();

    // Register handlers for different event types
    let order_handler = Arc::new(LoggingHandler::new("orders"));
    let user_handler = Arc::new(LoggingHandler::new("users"));
    let default_handler = Arc::new(LoggingHandler::new("default"));

    router.register_handler(order_handler);
    router.register_handler(user_handler);
    router.set_default_handler(default_handler);

    // Define routing rules
    router.add_rule(RoutingRule {
        name: "order_events".to_string(),
        json_path: "event_type".to_string(),
        expected_value: serde_json::json!("order.created"),
        handler_id: "orders".to_string(),
    });

    router.add_rule(RoutingRule {
        name: "user_events".to_string(),
        json_path: "event_type".to_string(),
        expected_value: serde_json::json!("user.signup"),
        handler_id: "users".to_string(),
    });

    // Route some messages
    let messages = vec![
        Message {
            id: "msg-001".to_string(),
            headers: HashMap::new(),
            body: serde_json::json!({
                "event_type": "order.created",
                "order_id": "12345",
                "amount": 99.99
            }),
        },
        Message {
            id: "msg-002".to_string(),
            headers: HashMap::new(),
            body: serde_json::json!({
                "event_type": "user.signup",
                "user_id": "u-789",
                "email": "user@example.com"
            }),
        },
        Message {
            id: "msg-003".to_string(),
            headers: HashMap::new(),
            body: serde_json::json!({
                "event_type": "unknown.event",
                "data": "something"
            }),
        },
    ];

    for msg in messages {
        match router.route(&msg) {
            Ok(()) => println!("Routed message {}", msg.id),
            Err(e) => eprintln!("Failed to route {}: {:?}", msg.id, e),
        }
    }
}
```

## Performance Considerations

When running this in production, keep a few things in mind:

1. **Rule ordering matters.** The router evaluates rules sequentially, so put your most common matches first to minimize comparisons.

2. **Consider caching parsed paths.** If you are processing thousands of messages per second, pre-parsing the JSON paths into a more efficient structure can help.

3. **Use async handlers for I/O.** The synchronous version shown here works for CPU-bound handlers, but network calls should use `async`/`await` with Tokio or async-std.

4. **Add metrics.** Track rule match rates, handler latencies, and unmatched message counts. This data is invaluable for tuning your routing rules.

## Extending the Router

The basic router can be extended in several ways:

- **Multiple rule matches:** Route to all matching handlers instead of just the first
- **Rule predicates:** Support operators like greater-than, contains, or regex matching
- **Dynamic rules:** Load routing configuration from a database or config file
- **Dead letter queues:** Persist unroutable messages for later inspection
- **Circuit breakers:** Temporarily disable handlers that are failing

Content-based routing is a powerful pattern that decouples message producers from consumers. With Rust's performance and safety guarantees, you can build routers that handle substantial throughput while keeping your codebase maintainable. Start simple, measure everything, and add complexity only when the data tells you it is needed.
