# How to Build a Redis Cluster Client with Failover in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Redis, Cluster, Failover, High Availability

Description: A practical guide to building a Redis cluster client in Rust that handles node failures gracefully, with automatic failover, connection pooling, and retry logic.

---

Running Redis in cluster mode gives you horizontal scaling and fault tolerance, but your client code needs to handle the complexity that comes with it. Nodes fail, slots move, and connections drop. This guide walks through building a Redis cluster client in Rust that handles these scenarios without dropping requests.

## Understanding Redis Cluster Basics

Redis Cluster distributes data across multiple nodes using hash slots. There are 16,384 slots total, and each key maps to one of them. When you connect to a cluster, your client needs to:

1. Discover all nodes and their slot assignments
2. Route commands to the correct node
3. Handle MOVED and ASK redirections
4. Detect failures and update the topology

The `redis` crate provides cluster support out of the box, but understanding what happens underneath helps when things go wrong.

## Setting Up the Project

Start with a new Rust project and add the necessary dependencies:

```toml
# Cargo.toml
[package]
name = "redis-cluster-client"
version = "0.1.0"
edition = "2021"

[dependencies]
redis = { version = "0.24", features = ["cluster", "tokio-comp", "connection-manager"] }
tokio = { version = "1", features = ["full"] }
thiserror = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
```

## Basic Cluster Connection

The simplest way to connect to a Redis cluster uses the built-in cluster client. This handles slot discovery and command routing automatically.

```rust
use redis::cluster::ClusterClient;
use redis::AsyncCommands;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to multiple seed nodes for redundancy
    // The client will discover the full topology from any available node
    let nodes = vec![
        "redis://10.0.0.1:6379",
        "redis://10.0.0.2:6379",
        "redis://10.0.0.3:6379",
    ];

    let client = ClusterClient::new(nodes)?;
    let mut connection = client.get_async_connection().await?;

    // Commands are automatically routed to the correct node
    connection.set("user:1001", "alice").await?;
    let name: String = connection.get("user:1001").await?;

    println!("Retrieved: {}", name);
    Ok(())
}
```

This works for simple cases, but production systems need more control over failure handling.

## Building a Resilient Client Wrapper

Let's build a wrapper that adds connection pooling, automatic retries, and health monitoring.

```rust
use redis::cluster::{ClusterClient, ClusterConnection};
use redis::{AsyncCommands, RedisError, RedisResult};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::sleep;
use tracing::{error, info, warn};

// Custom error types for better error handling
#[derive(Debug, thiserror::Error)]
pub enum ClusterError {
    #[error("Redis error: {0}")]
    Redis(#[from] RedisError),

    #[error("All retries exhausted after {attempts} attempts")]
    RetriesExhausted { attempts: u32 },

    #[error("Cluster unavailable: no healthy nodes")]
    ClusterUnavailable,

    #[error("Connection timeout after {0:?}")]
    Timeout(Duration),
}

// Configuration for retry behavior and timeouts
#[derive(Clone)]
pub struct ClusterConfig {
    pub nodes: Vec<String>,
    pub max_retries: u32,
    pub base_retry_delay: Duration,
    pub max_retry_delay: Duration,
    pub connection_timeout: Duration,
    pub read_timeout: Duration,
}

impl Default for ClusterConfig {
    fn default() -> Self {
        Self {
            nodes: vec![],
            max_retries: 3,
            base_retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(5),
            connection_timeout: Duration::from_secs(5),
            read_timeout: Duration::from_secs(3),
        }
    }
}
```

## Implementing the Failover Client

The core of our client maintains a connection and rebuilds it when failures occur.

```rust
pub struct FailoverClient {
    client: ClusterClient,
    connection: Arc<RwLock<Option<redis::cluster_async::ClusterConnection>>>,
    config: ClusterConfig,
}

impl FailoverClient {
    pub async fn new(config: ClusterConfig) -> Result<Self, ClusterError> {
        let client = ClusterClient::builder(config.nodes.clone())
            .connection_timeout(config.connection_timeout)
            .read_timeout(config.read_timeout)
            .build()?;

        let connection = client.get_async_connection().await?;

        info!("Connected to Redis cluster with {} seed nodes", config.nodes.len());

        Ok(Self {
            client,
            connection: Arc::new(RwLock::new(Some(connection))),
            config,
        })
    }

    // Reconnect after a failure - this refreshes the cluster topology
    async fn reconnect(&self) -> Result<(), ClusterError> {
        let mut conn_guard = self.connection.write().await;

        // Double-check pattern: another task might have reconnected already
        if conn_guard.is_some() {
            // Test if the existing connection works
            let mut test_conn = conn_guard.take().unwrap();
            let ping_result: RedisResult<String> = redis::cmd("PING")
                .query_async(&mut test_conn)
                .await;

            if ping_result.is_ok() {
                *conn_guard = Some(test_conn);
                return Ok(());
            }
        }

        info!("Reconnecting to Redis cluster...");

        // Retry connection with exponential backoff
        let mut delay = self.config.base_retry_delay;

        for attempt in 1..=self.config.max_retries {
            match self.client.get_async_connection().await {
                Ok(new_conn) => {
                    *conn_guard = Some(new_conn);
                    info!("Reconnected to Redis cluster on attempt {}", attempt);
                    return Ok(());
                }
                Err(e) => {
                    warn!("Reconnection attempt {} failed: {}", attempt, e);

                    if attempt < self.config.max_retries {
                        sleep(delay).await;
                        delay = std::cmp::min(delay * 2, self.config.max_retry_delay);
                    }
                }
            }
        }

        error!("Failed to reconnect after {} attempts", self.config.max_retries);
        Err(ClusterError::ClusterUnavailable)
    }
}
```

## Adding Retry Logic for Operations

Each operation should retry transparently when it hits a transient failure.

```rust
impl FailoverClient {
    // Execute a command with automatic retry on failure
    pub async fn execute<T, F, Fut>(&self, operation: F) -> Result<T, ClusterError>
    where
        F: Fn(redis::cluster_async::ClusterConnection) -> Fut + Clone,
        Fut: std::future::Future<Output = RedisResult<(redis::cluster_async::ClusterConnection, T)>>,
    {
        let mut delay = self.config.base_retry_delay;

        for attempt in 1..=self.config.max_retries {
            // Get the connection
            let conn = {
                let guard = self.connection.read().await;
                match &*guard {
                    Some(c) => c.clone(),
                    None => {
                        drop(guard);
                        self.reconnect().await?;
                        let guard = self.connection.read().await;
                        guard.as_ref().unwrap().clone()
                    }
                }
            };

            // Try the operation
            match operation(conn).await {
                Ok((new_conn, result)) => {
                    // Update connection and return result
                    let mut guard = self.connection.write().await;
                    *guard = Some(new_conn);
                    return Ok(result);
                }
                Err(e) => {
                    // Check if this error is retryable
                    if Self::is_retryable(&e) {
                        warn!(
                            "Operation failed (attempt {}/{}): {}",
                            attempt, self.config.max_retries, e
                        );

                        // Clear connection to force reconnect
                        {
                            let mut guard = self.connection.write().await;
                            *guard = None;
                        }

                        if attempt < self.config.max_retries {
                            sleep(delay).await;
                            delay = std::cmp::min(delay * 2, self.config.max_retry_delay);
                            self.reconnect().await?;
                        }
                    } else {
                        // Non-retryable error, fail immediately
                        return Err(ClusterError::Redis(e));
                    }
                }
            }
        }

        Err(ClusterError::RetriesExhausted {
            attempts: self.config.max_retries,
        })
    }

    // Determine if an error warrants a retry
    fn is_retryable(error: &RedisError) -> bool {
        use redis::ErrorKind;

        matches!(
            error.kind(),
            ErrorKind::IoError
                | ErrorKind::ClusterConnectionNotFound
                | ErrorKind::ClusterDown
                | ErrorKind::MasterDown
                | ErrorKind::BusyLoadingError
        )
    }
}
```

## Convenient Methods for Common Operations

Wrap the execute method with type-safe helpers for common Redis commands.

```rust
impl FailoverClient {
    pub async fn get<K, V>(&self, key: K) -> Result<Option<V>, ClusterError>
    where
        K: redis::ToRedisArgs + Send + Sync + Clone + 'static,
        V: redis::FromRedisValue + Send + 'static,
    {
        let key = key.clone();
        self.execute(move |mut conn| {
            let k = key.clone();
            async move {
                let result: RedisResult<Option<V>> = conn.get(&k).await;
                result.map(|v| (conn, v))
            }
        })
        .await
    }

    pub async fn set<K, V>(&self, key: K, value: V) -> Result<(), ClusterError>
    where
        K: redis::ToRedisArgs + Send + Sync + Clone + 'static,
        V: redis::ToRedisArgs + Send + Sync + Clone + 'static,
    {
        let key = key.clone();
        let value = value.clone();
        self.execute(move |mut conn| {
            let k = key.clone();
            let v = value.clone();
            async move {
                let result: RedisResult<()> = conn.set(&k, &v).await;
                result.map(|_| (conn, ()))
            }
        })
        .await
    }

    pub async fn set_ex<K, V>(&self, key: K, value: V, seconds: u64) -> Result<(), ClusterError>
    where
        K: redis::ToRedisArgs + Send + Sync + Clone + 'static,
        V: redis::ToRedisArgs + Send + Sync + Clone + 'static,
    {
        let key = key.clone();
        let value = value.clone();
        self.execute(move |mut conn| {
            let k = key.clone();
            let v = value.clone();
            async move {
                let result: RedisResult<()> = conn.set_ex(&k, &v, seconds).await;
                result.map(|_| (conn, ()))
            }
        })
        .await
    }

    pub async fn del<K>(&self, key: K) -> Result<bool, ClusterError>
    where
        K: redis::ToRedisArgs + Send + Sync + Clone + 'static,
    {
        let key = key.clone();
        self.execute(move |mut conn| {
            let k = key.clone();
            async move {
                let result: RedisResult<i64> = conn.del(&k).await;
                result.map(|count| (conn, count > 0))
            }
        })
        .await
    }
}
```

## Health Checking and Monitoring

Add a health check method that verifies cluster connectivity and reports node status.

```rust
impl FailoverClient {
    // Check cluster health by pinging the connection
    pub async fn health_check(&self) -> Result<bool, ClusterError> {
        self.execute(|mut conn| async move {
            let result: RedisResult<String> = redis::cmd("PING")
                .query_async(&mut conn)
                .await;
            result.map(|pong| (conn, pong == "PONG"))
        })
        .await
    }

    // Get cluster info for monitoring dashboards
    pub async fn cluster_info(&self) -> Result<String, ClusterError> {
        self.execute(|mut conn| async move {
            let result: RedisResult<String> = redis::cmd("CLUSTER")
                .arg("INFO")
                .query_async(&mut conn)
                .await;
            result.map(|info| (conn, info))
        })
        .await
    }
}
```

## Putting It All Together

Here's a complete example showing the client in action.

```rust
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Configure the client
    let config = ClusterConfig {
        nodes: vec![
            "redis://10.0.0.1:6379".to_string(),
            "redis://10.0.0.2:6379".to_string(),
            "redis://10.0.0.3:6379".to_string(),
        ],
        max_retries: 5,
        base_retry_delay: Duration::from_millis(100),
        max_retry_delay: Duration::from_secs(10),
        connection_timeout: Duration::from_secs(5),
        read_timeout: Duration::from_secs(3),
    };

    // Create the failover client
    let client = FailoverClient::new(config).await?;

    // Run health check
    if client.health_check().await? {
        info!("Cluster is healthy");
    }

    // Store some data with expiration
    client.set_ex("session:abc123", "user_data_here", 3600).await?;

    // Retrieve data - will retry automatically if a node fails mid-request
    match client.get::<_, String>("session:abc123").await? {
        Some(data) => println!("Session data: {}", data),
        None => println!("Session not found"),
    }

    // Clean up
    client.del("session:abc123").await?;

    Ok(())
}
```

## Handling Cluster Resharding

When slots move between nodes during resharding, you'll see MOVED or ASK errors. The `redis` crate handles these automatically by following redirections, but you should be aware of them in your logs. During heavy resharding, you might see brief latency spikes as the client updates its slot map.

For very large clusters or frequent topology changes, consider running a background task that periodically refreshes the slot mapping:

```rust
// Background task to keep topology fresh
pub fn start_topology_refresh(client: Arc<FailoverClient>, interval: Duration) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(interval);

        loop {
            ticker.tick().await;

            // Health check forces a topology refresh on reconnect
            if let Err(e) = client.health_check().await {
                warn!("Topology refresh health check failed: {}", e);
            }
        }
    });
}
```

## Summary

Building a resilient Redis cluster client in Rust requires handling several failure modes: node failures, network partitions, slot migrations, and connection timeouts. The key patterns are:

- Connect to multiple seed nodes so you can discover the cluster from any available node
- Implement exponential backoff for retries to avoid overwhelming a recovering cluster
- Classify errors as retryable or fatal to fail fast when appropriate
- Keep health checks running to detect problems before they impact requests
- Log enough detail to debug issues without flooding your logs

The `redis` crate does most of the heavy lifting for cluster-aware routing. Your job is wrapping it with the retry logic and monitoring that production systems need.
