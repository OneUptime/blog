# How to Build Event-Driven Systems in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Event-Driven, Architecture, Async, Message Passing

Description: A practical guide to building event-driven systems in Rust using channels, async streams, and message brokers.

---

Event-driven architecture has become the backbone of modern distributed systems. From real-time analytics pipelines to microservices communication, events provide a decoupled and scalable way to build software. Rust, with its zero-cost abstractions and memory safety guarantees, is particularly well-suited for building high-performance event-driven systems.

In this guide, we will walk through building event-driven systems in Rust - from basic channel-based communication to integrating with external message brokers like RabbitMQ and Kafka.

## Understanding Event-Driven Architecture

Event-driven architecture (EDA) is a design pattern where the flow of the program is determined by events - significant changes in state or occurrences that the system needs to react to. Instead of components calling each other directly, they communicate through events.

The core components of an event-driven system are:

- **Event Producers**: Components that detect state changes and emit events
- **Event Consumers**: Components that subscribe to and process events
- **Event Channels/Brokers**: The infrastructure that routes events from producers to consumers
- **Events**: Immutable records of something that happened

This architecture provides several benefits: loose coupling between components, better scalability, easier addition of new features, and natural support for asynchronous processing.

## Defining Events in Rust

The first step in building an event-driven system is defining your events. Rust's enum type is perfect for this purpose because it provides type safety and exhaustive pattern matching.

Here we define an event enum representing different actions in an order processing system. Each variant carries the relevant data for that event type.

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderEvent {
    Created {
        order_id: Uuid,
        customer_id: Uuid,
        items: Vec<OrderItem>,
        timestamp: DateTime<Utc>,
    },
    PaymentReceived {
        order_id: Uuid,
        amount: f64,
        payment_method: String,
        timestamp: DateTime<Utc>,
    },
    Shipped {
        order_id: Uuid,
        tracking_number: String,
        carrier: String,
        timestamp: DateTime<Utc>,
    },
    Delivered {
        order_id: Uuid,
        timestamp: DateTime<Utc>,
    },
    Cancelled {
        order_id: Uuid,
        reason: String,
        timestamp: DateTime<Utc>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_id: Uuid,
    pub quantity: u32,
    pub price: f64,
}
```

## Using Channels for Event Passing

Rust's standard library provides channels for communication between threads through `std::sync::mpsc`. For async code, Tokio offers more powerful channel implementations.

### Synchronous Channels with mpsc

This example demonstrates basic event passing using the standard library's multi-producer, single-consumer channel. Multiple producers can send events while a single consumer processes them.

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    // Create a channel with sender and receiver endpoints
    let (tx, rx) = mpsc::channel::<OrderEvent>();
    
    // Clone the sender for multiple producers
    let tx2 = tx.clone();
    
    // First producer thread - creates an order
    let producer1 = thread::spawn(move || {
        let event = OrderEvent::Created {
            order_id: Uuid::new_v4(),
            customer_id: Uuid::new_v4(),
            items: vec![OrderItem {
                product_id: Uuid::new_v4(),
                quantity: 2,
                price: 29.99,
            }],
            timestamp: Utc::now(),
        };
        tx.send(event).expect("Failed to send event");
    });
    
    // Second producer thread - records a payment
    let producer2 = thread::spawn(move || {
        let event = OrderEvent::PaymentReceived {
            order_id: Uuid::new_v4(),
            amount: 59.98,
            payment_method: "credit_card".to_string(),
            timestamp: Utc::now(),
        };
        tx2.send(event).expect("Failed to send event");
    });
    
    // Consumer processes all incoming events
    for event in rx {
        match event {
            OrderEvent::Created { order_id, .. } => {
                println!("Processing new order: {}", order_id);
            }
            OrderEvent::PaymentReceived { order_id, amount, .. } => {
                println!("Payment of ${} received for order: {}", amount, order_id);
            }
            _ => {}
        }
    }
    
    producer1.join().unwrap();
    producer2.join().unwrap();
}
```

### Async Channels with Tokio

For async applications, Tokio's channels provide non-blocking communication. The `broadcast` channel is particularly useful when multiple consumers need to receive the same events.

```rust
use tokio::sync::broadcast;

#[tokio::main]
async fn main() {
    // Create a broadcast channel with buffer capacity of 100 events
    let (tx, _rx) = broadcast::channel::<OrderEvent>(100);
    
    // Subscribe multiple receivers to the same channel
    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();
    
    // Spawn the first consumer task - handles logging
    let logger = tokio::spawn(async move {
        while let Ok(event) = rx1.recv().await {
            println!("[LOGGER] Event received: {:?}", event);
        }
    });
    
    // Spawn the second consumer task - handles analytics
    let analytics = tokio::spawn(async move {
        while let Ok(event) = rx2.recv().await {
            if let OrderEvent::PaymentReceived { amount, .. } = event {
                println!("[ANALYTICS] Revenue tracked: ${}", amount);
            }
        }
    });
    
    // Send an event that both consumers will receive
    let event = OrderEvent::PaymentReceived {
        order_id: Uuid::new_v4(),
        amount: 99.99,
        payment_method: "paypal".to_string(),
        timestamp: Utc::now(),
    };
    tx.send(event).expect("Failed to broadcast event");
    
    // Give consumers time to process
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}
```

## Building Async Event Handlers

A robust event-driven system needs well-structured event handlers. Here is a pattern for building composable async event handlers using traits.

Define a trait that all event handlers must implement. This allows for polymorphic handling and easy testing through mock implementations.

```rust
use async_trait::async_trait;

#[async_trait]
pub trait EventHandler: Send + Sync {
    async fn handle(&self, event: &OrderEvent) -> Result<(), HandlerError>;
    fn can_handle(&self, event: &OrderEvent) -> bool;
}

#[derive(Debug)]
pub struct HandlerError {
    pub message: String,
    pub retryable: bool,
}

// Handler for inventory updates when orders are created
pub struct InventoryHandler {
    inventory_service: InventoryService,
}

#[async_trait]
impl EventHandler for InventoryHandler {
    async fn handle(&self, event: &OrderEvent) -> Result<(), HandlerError> {
        if let OrderEvent::Created { items, .. } = event {
            for item in items {
                self.inventory_service
                    .reserve(item.product_id, item.quantity)
                    .await
                    .map_err(|e| HandlerError {
                        message: e.to_string(),
                        retryable: true,
                    })?;
            }
        }
        Ok(())
    }
    
    fn can_handle(&self, event: &OrderEvent) -> bool {
        matches!(event, OrderEvent::Created { .. })
    }
}

// Handler for sending notification emails
pub struct NotificationHandler {
    email_service: EmailService,
}

#[async_trait]
impl EventHandler for NotificationHandler {
    async fn handle(&self, event: &OrderEvent) -> Result<(), HandlerError> {
        match event {
            OrderEvent::Shipped { order_id, tracking_number, carrier, .. } => {
                self.email_service
                    .send_shipping_notification(*order_id, tracking_number, carrier)
                    .await
                    .map_err(|e| HandlerError {
                        message: e.to_string(),
                        retryable: false,
                    })?;
            }
            OrderEvent::Delivered { order_id, .. } => {
                self.email_service
                    .send_delivery_confirmation(*order_id)
                    .await
                    .map_err(|e| HandlerError {
                        message: e.to_string(),
                        retryable: false,
                    })?;
            }
            _ => {}
        }
        Ok(())
    }
    
    fn can_handle(&self, event: &OrderEvent) -> bool {
        matches!(event, OrderEvent::Shipped { .. } | OrderEvent::Delivered { .. })
    }
}
```

## Implementing Pub/Sub Patterns

The publish-subscribe pattern allows for flexible event routing. Here is an implementation of an event bus that routes events to registered handlers.

This event bus maintains a list of handlers and dispatches events to all handlers that can process them. It runs handlers concurrently for better throughput.

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct EventBus {
    handlers: RwLock<Vec<Arc<dyn EventHandler>>>,
}

impl EventBus {
    pub fn new() -> Self {
        Self {
            handlers: RwLock::new(Vec::new()),
        }
    }
    
    // Register a new handler with the event bus
    pub async fn subscribe(&self, handler: Arc<dyn EventHandler>) {
        let mut handlers = self.handlers.write().await;
        handlers.push(handler);
    }
    
    // Publish an event to all capable handlers
    pub async fn publish(&self, event: &OrderEvent) -> Vec<Result<(), HandlerError>> {
        let handlers = self.handlers.read().await;
        
        // Collect handlers that can process this event
        let applicable_handlers: Vec<_> = handlers
            .iter()
            .filter(|h| h.can_handle(event))
            .cloned()
            .collect();
        
        // Run all applicable handlers concurrently
        let futures: Vec<_> = applicable_handlers
            .iter()
            .map(|handler| handler.handle(event))
            .collect();
        
        futures::future::join_all(futures).await
    }
}

// Usage example showing how to wire up the event bus
async fn setup_event_bus() -> EventBus {
    let bus = EventBus::new();
    
    let inventory_handler = Arc::new(InventoryHandler {
        inventory_service: InventoryService::new(),
    });
    
    let notification_handler = Arc::new(NotificationHandler {
        email_service: EmailService::new(),
    });
    
    bus.subscribe(inventory_handler).await;
    bus.subscribe(notification_handler).await;
    
    bus
}
```

## Event Sourcing Basics

Event sourcing stores the state of an entity as a sequence of events rather than just the current state. This provides a complete audit trail and enables temporal queries.

Here is a basic event store implementation that persists events and can rebuild state by replaying them.

```rust
use std::collections::HashMap;
use tokio::sync::RwLock;

pub struct EventStore {
    // In production, use a proper database like PostgreSQL or EventStoreDB
    events: RwLock<HashMap<Uuid, Vec<OrderEvent>>>,
}

impl EventStore {
    pub fn new() -> Self {
        Self {
            events: RwLock::new(HashMap::new()),
        }
    }
    
    // Append a new event to the store
    pub async fn append(&self, aggregate_id: Uuid, event: OrderEvent) {
        let mut events = self.events.write().await;
        events.entry(aggregate_id).or_default().push(event);
    }
    
    // Retrieve all events for a given aggregate
    pub async fn get_events(&self, aggregate_id: Uuid) -> Vec<OrderEvent> {
        let events = self.events.read().await;
        events.get(&aggregate_id).cloned().unwrap_or_default()
    }
    
    // Rebuild the current state by replaying all events
    pub async fn rebuild_state(&self, order_id: Uuid) -> Option<OrderState> {
        let events = self.get_events(order_id).await;
        
        if events.is_empty() {
            return None;
        }
        
        let mut state = OrderState::default();
        
        for event in events {
            state.apply(&event);
        }
        
        Some(state)
    }
}

#[derive(Debug, Default)]
pub struct OrderState {
    pub order_id: Option<Uuid>,
    pub status: OrderStatus,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub tracking_number: Option<String>,
}

#[derive(Debug, Default, PartialEq)]
pub enum OrderStatus {
    #[default]
    Pending,
    Paid,
    Shipped,
    Delivered,
    Cancelled,
}

impl OrderState {
    // Apply an event to update the current state
    pub fn apply(&mut self, event: &OrderEvent) {
        match event {
            OrderEvent::Created { order_id, items, .. } => {
                self.order_id = Some(*order_id);
                self.total_amount = items.iter().map(|i| i.price * i.quantity as f64).sum();
                self.status = OrderStatus::Pending;
            }
            OrderEvent::PaymentReceived { amount, .. } => {
                self.paid_amount += amount;
                if self.paid_amount >= self.total_amount {
                    self.status = OrderStatus::Paid;
                }
            }
            OrderEvent::Shipped { tracking_number, .. } => {
                self.tracking_number = Some(tracking_number.clone());
                self.status = OrderStatus::Shipped;
            }
            OrderEvent::Delivered { .. } => {
                self.status = OrderStatus::Delivered;
            }
            OrderEvent::Cancelled { .. } => {
                self.status = OrderStatus::Cancelled;
            }
        }
    }
}
```

## Integrating with Message Brokers

For distributed systems, you need external message brokers. Here is how to integrate with RabbitMQ using the `lapin` crate.

This producer publishes events to a RabbitMQ exchange, making them available to any connected consumers across your distributed system.

```rust
use lapin::{
    options::*, publisher_confirm::Confirmation, types::FieldTable,
    BasicProperties, Channel, Connection, ConnectionProperties,
};

pub struct RabbitMQProducer {
    channel: Channel,
    exchange: String,
}

impl RabbitMQProducer {
    pub async fn new(amqp_url: &str, exchange: &str) -> Result<Self, lapin::Error> {
        let conn = Connection::connect(amqp_url, ConnectionProperties::default()).await?;
        let channel = conn.create_channel().await?;
        
        // Declare a topic exchange for flexible routing
        channel
            .exchange_declare(
                exchange,
                lapin::ExchangeKind::Topic,
                ExchangeDeclareOptions::default(),
                FieldTable::default(),
            )
            .await?;
        
        Ok(Self {
            channel,
            exchange: exchange.to_string(),
        })
    }
    
    pub async fn publish(&self, event: &OrderEvent) -> Result<(), lapin::Error> {
        // Determine routing key based on event type
        let routing_key = match event {
            OrderEvent::Created { .. } => "order.created",
            OrderEvent::PaymentReceived { .. } => "order.payment",
            OrderEvent::Shipped { .. } => "order.shipped",
            OrderEvent::Delivered { .. } => "order.delivered",
            OrderEvent::Cancelled { .. } => "order.cancelled",
        };
        
        let payload = serde_json::to_vec(event).expect("Failed to serialize event");
        
        let confirm = self
            .channel
            .basic_publish(
                &self.exchange,
                routing_key,
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_content_type("application/json".into())
                    .with_delivery_mode(2), // Persistent delivery
            )
            .await?
            .await?;
        
        match confirm {
            Confirmation::Ack(_) => Ok(()),
            _ => Err(lapin::Error::InvalidChannelState(
                lapin::ChannelState::Closed,
            )),
        }
    }
}
```

Here is the consumer side that processes events from a RabbitMQ queue with proper acknowledgment handling.

```rust
use futures_lite::stream::StreamExt;

pub struct RabbitMQConsumer {
    channel: Channel,
}

impl RabbitMQConsumer {
    pub async fn new(amqp_url: &str) -> Result<Self, lapin::Error> {
        let conn = Connection::connect(amqp_url, ConnectionProperties::default()).await?;
        let channel = conn.create_channel().await?;
        
        Ok(Self { channel })
    }
    
    pub async fn subscribe<F, Fut>(
        &self,
        queue: &str,
        exchange: &str,
        routing_pattern: &str,
        handler: F,
    ) -> Result<(), lapin::Error>
    where
        F: Fn(OrderEvent) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<(), HandlerError>> + Send,
    {
        // Declare the queue for this consumer
        self.channel
            .queue_declare(queue, QueueDeclareOptions::default(), FieldTable::default())
            .await?;
        
        // Bind the queue to the exchange with the routing pattern
        self.channel
            .queue_bind(
                queue,
                exchange,
                routing_pattern,
                QueueBindOptions::default(),
                FieldTable::default(),
            )
            .await?;
        
        let mut consumer = self
            .channel
            .basic_consume(
                queue,
                "consumer",
                BasicConsumeOptions::default(),
                FieldTable::default(),
            )
            .await?;
        
        // Process messages as they arrive
        while let Some(delivery) = consumer.next().await {
            if let Ok(delivery) = delivery {
                let event: OrderEvent = serde_json::from_slice(&delivery.data)
                    .expect("Failed to deserialize event");
                
                match handler(event).await {
                    Ok(_) => {
                        // Acknowledge successful processing
                        delivery.ack(BasicAckOptions::default()).await?;
                    }
                    Err(e) if e.retryable => {
                        // Requeue for retry on transient failures
                        delivery
                            .nack(BasicNackOptions { requeue: true, ..Default::default() })
                            .await?;
                    }
                    Err(_) => {
                        // Dead-letter on permanent failures
                        delivery
                            .nack(BasicNackOptions { requeue: false, ..Default::default() })
                            .await?;
                    }
                }
            }
        }
        
        Ok(())
    }
}
```

## Error Handling and Resilience

Production event-driven systems need robust error handling. Here is a retry mechanism with exponential backoff for handling transient failures.

```rust
use std::time::Duration;
use tokio::time::sleep;

pub async fn with_retry<F, Fut, T>(
    mut operation: F,
    max_retries: u32,
    initial_delay: Duration,
) -> Result<T, HandlerError>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, HandlerError>>,
{
    let mut retries = 0;
    let mut delay = initial_delay;
    
    loop {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) if e.retryable && retries < max_retries => {
                retries += 1;
                println!(
                    "Operation failed, retrying in {:?} (attempt {}/{}): {}",
                    delay, retries, max_retries, e.message
                );
                sleep(delay).await;
                // Exponential backoff with jitter
                delay = delay * 2 + Duration::from_millis(rand::random::<u64>() % 100);
            }
            Err(e) => return Err(e),
        }
    }
}
```

## Monitoring Event Processing

Once your event-driven system is running, you need visibility into its behavior. Track metrics like event throughput, processing latency, and error rates.

This metrics collector tracks key performance indicators for your event processing pipeline.

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

pub struct EventMetrics {
    events_processed: AtomicU64,
    events_failed: AtomicU64,
    total_processing_time_ms: AtomicU64,
}

impl EventMetrics {
    pub fn new() -> Self {
        Self {
            events_processed: AtomicU64::new(0),
            events_failed: AtomicU64::new(0),
            total_processing_time_ms: AtomicU64::new(0),
        }
    }
    
    pub fn record_success(&self, processing_time: Duration) {
        self.events_processed.fetch_add(1, Ordering::Relaxed);
        self.total_processing_time_ms
            .fetch_add(processing_time.as_millis() as u64, Ordering::Relaxed);
    }
    
    pub fn record_failure(&self) {
        self.events_failed.fetch_add(1, Ordering::Relaxed);
    }
    
    pub fn get_stats(&self) -> MetricsSnapshot {
        let processed = self.events_processed.load(Ordering::Relaxed);
        let failed = self.events_failed.load(Ordering::Relaxed);
        let total_time = self.total_processing_time_ms.load(Ordering::Relaxed);
        
        MetricsSnapshot {
            events_processed: processed,
            events_failed: failed,
            avg_processing_time_ms: if processed > 0 {
                total_time as f64 / processed as f64
            } else {
                0.0
            },
        }
    }
}

#[derive(Debug)]
pub struct MetricsSnapshot {
    pub events_processed: u64,
    pub events_failed: u64,
    pub avg_processing_time_ms: f64,
}
```

## Wrapping Up

Building event-driven systems in Rust combines the language's safety guarantees with the architectural benefits of event-based communication. We covered the fundamentals - from defining events as enums to using channels for in-process communication, building async event handlers, implementing pub/sub patterns, and integrating with external message brokers.

Key takeaways for building production-ready event-driven systems:

1. Use Rust's type system to model events precisely
2. Choose the right channel type based on your concurrency needs
3. Implement proper error handling with retry mechanisms
4. Consider event sourcing for audit requirements
5. Monitor your event processing pipeline closely

The patterns shown here scale from simple single-process applications to distributed microservices architectures. Start simple with channels, and add external message brokers when you need cross-service communication or persistence guarantees.

---

*Monitor event-driven Rust systems with [OneUptime](https://oneuptime.com) - track event processing rates and latencies.*
