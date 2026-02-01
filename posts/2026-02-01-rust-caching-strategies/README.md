# How to Implement Caching Strategies in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Caching, Performance, Redis, In-Memory

Description: A practical guide to implementing caching in Rust using in-memory caches, LRU algorithms, and Redis integration.

---

Caching is one of those things that sounds simple until you actually need to implement it properly. You think "I'll just throw things in a HashMap" and suddenly you're debugging memory leaks at 3 AM because your cache grew to consume 80% of your server's RAM. Been there.

Rust gives us some excellent tools for building robust caching systems. The ownership model that initially feels restrictive actually prevents many common caching bugs - like returning references to evicted entries or race conditions in concurrent access. Let's build some real caching solutions.

## Starting Simple: HashMap as a Cache

The most basic cache is just a HashMap wrapped in some access logic. This works fine for small datasets that don't need eviction.

Here's a basic cache struct that stores string values with string keys:

```rust
use std::collections::HashMap;
use std::sync::RwLock;

// A thread-safe cache using RwLock for concurrent read access
// RwLock allows multiple readers OR one writer - perfect for read-heavy caches
pub struct SimpleCache {
    store: RwLock<HashMap<String, String>>,
}

impl SimpleCache {
    pub fn new() -> Self {
        SimpleCache {
            store: RwLock::new(HashMap::new()),
        }
    }

    // Get a value from cache - returns Option since key might not exist
    // Uses read lock so multiple threads can read simultaneously
    pub fn get(&self, key: &str) -> Option<String> {
        let store = self.store.read().unwrap();
        store.get(key).cloned()
    }

    // Insert a value - requires exclusive write lock
    pub fn set(&self, key: String, value: String) {
        let mut store = self.store.write().unwrap();
        store.insert(key, value);
    }

    // Remove a specific key from cache
    pub fn delete(&self, key: &str) -> Option<String> {
        let mut store = self.store.write().unwrap();
        store.remove(key)
    }
}
```

This handles concurrent access but has an obvious problem - unbounded growth. Every insert adds to memory usage, and nothing ever gets removed unless explicitly deleted. For a user session cache or configuration cache with known bounds, this might be acceptable. For anything else, you need eviction.

## Building an LRU Cache from Scratch

LRU (Least Recently Used) eviction removes the oldest accessed item when the cache reaches capacity. The trick is tracking access order efficiently. A naive approach would iterate the whole cache on every access - that's O(n) and kills performance.

The standard solution combines a HashMap for O(1) lookups with a doubly-linked list for O(1) reordering. When you access an item, move it to the front of the list. When you need to evict, remove from the back.

Here's a working implementation:

```rust
use std::collections::HashMap;
use std::ptr::NonNull;

// Node in our doubly-linked list
// Each node holds the key (for removal from HashMap) and the cached value
struct Node<K, V> {
    key: K,
    value: V,
    prev: Option<NonNull<Node<K, V>>>,
    next: Option<NonNull<Node<K, V>>>,
}

pub struct LruCache<K, V> {
    capacity: usize,
    map: HashMap<K, NonNull<Node<K, V>>>,
    // head is most recently used, tail is least recently used
    head: Option<NonNull<Node<K, V>>>,
    tail: Option<NonNull<Node<K, V>>>,
}

impl<K: Clone + Eq + std::hash::Hash, V> LruCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "Cache capacity must be positive");
        LruCache {
            capacity,
            map: HashMap::with_capacity(capacity),
            head: None,
            tail: None,
        }
    }

    // Move an existing node to the front (most recently used position)
    // This is called on every get() to update access order
    fn move_to_front(&mut self, mut node: NonNull<Node<K, V>>) {
        unsafe {
            let node_ref = node.as_mut();
            
            // Already at front - nothing to do
            if self.head == Some(node) {
                return;
            }

            // Unlink from current position
            if let Some(mut prev) = node_ref.prev {
                prev.as_mut().next = node_ref.next;
            }
            if let Some(mut next) = node_ref.next {
                next.as_mut().prev = node_ref.prev;
            }
            
            // Update tail if we're moving the tail node
            if self.tail == Some(node) {
                self.tail = node_ref.prev;
            }

            // Link at front
            node_ref.prev = None;
            node_ref.next = self.head;
            
            if let Some(mut head) = self.head {
                head.as_mut().prev = Some(node);
            }
            self.head = Some(node);
            
            if self.tail.is_none() {
                self.tail = Some(node);
            }
        }
    }

    // Remove and return the least recently used item (from tail)
    fn evict_lru(&mut self) -> Option<(K, V)> {
        self.tail.map(|tail| unsafe {
            let node = Box::from_raw(tail.as_ptr());
            
            self.map.remove(&node.key);
            self.tail = node.prev;
            
            if let Some(mut new_tail) = self.tail {
                new_tail.as_mut().next = None;
            } else {
                self.head = None;
            }
            
            (node.key, node.value)
        })
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        if let Some(&node) = self.map.get(key) {
            self.move_to_front(node);
            unsafe { Some(&node.as_ref().value) }
        } else {
            None
        }
    }

    pub fn put(&mut self, key: K, value: V) {
        // If key exists, update value and move to front
        if let Some(&node) = self.map.get(&key) {
            unsafe {
                (*node.as_ptr()).value = value;
            }
            self.move_to_front(node);
            return;
        }

        // Evict if at capacity
        if self.map.len() >= self.capacity {
            self.evict_lru();
        }

        // Create new node and insert at front
        let node = Box::new(Node {
            key: key.clone(),
            value,
            prev: None,
            next: self.head,
        });
        
        let node_ptr = NonNull::new(Box::into_raw(node)).unwrap();
        
        if let Some(mut head) = self.head {
            unsafe {
                head.as_mut().prev = Some(node_ptr);
            }
        }
        
        self.head = Some(node_ptr);
        if self.tail.is_none() {
            self.tail = Some(node_ptr);
        }
        
        self.map.insert(key, node_ptr);
    }
}

// Clean up allocated nodes when cache is dropped
impl<K, V> Drop for LruCache<K, V> {
    fn drop(&mut self) {
        while self.evict_lru().is_some() {}
    }
}
```

This works, but look at all that unsafe code. Linked lists in Rust are notoriously tricky because of ownership rules. For production use, reach for a battle-tested crate instead.

## Using Moka for Production Caching

Moka is the go-to caching library for Rust. It provides concurrent, high-performance caches with features like TTL, size-based eviction, and async support out of the box.

Add it to your Cargo.toml:

```toml
[dependencies]
moka = { version = "0.12", features = ["future"] }
tokio = { version = "1", features = ["full"] }
```

Here's a practical example with TTL and maximum entry count:

```rust
use moka::future::Cache;
use std::time::Duration;

// User data we want to cache - must be Clone for moka
#[derive(Clone, Debug)]
struct UserProfile {
    id: u64,
    username: String,
    email: String,
}

// Build a cache with 10,000 max entries and 5-minute TTL
// Entries expire 5 minutes after last write, not last access
async fn create_user_cache() -> Cache<u64, UserProfile> {
    Cache::builder()
        .max_capacity(10_000)
        .time_to_live(Duration::from_secs(300))
        // time_to_idle evicts if not accessed - useful for session caches
        .time_to_idle(Duration::from_secs(60))
        // Callback when entries are evicted - great for metrics
        .eviction_listener(|key, value, cause| {
            println!("Evicted user {}: {:?} - cause: {:?}", key, value.username, cause);
        })
        .build()
}

async fn demo_moka_cache() {
    let cache = create_user_cache().await;
    
    // Insert user profile
    let user = UserProfile {
        id: 42,
        username: "rustacean".to_string(),
        email: "rust@example.com".to_string(),
    };
    cache.insert(42, user).await;
    
    // Retrieve - returns Option<UserProfile>
    if let Some(profile) = cache.get(&42).await {
        println!("Found user: {}", profile.username);
    }
    
    // get_with is powerful - fetch from source if not cached
    // The closure only runs on cache miss
    let profile = cache.get_with(99, async {
        // Simulate database fetch
        println!("Cache miss - fetching from database");
        UserProfile {
            id: 99,
            username: "new_user".to_string(),
            email: "new@example.com".to_string(),
        }
    }).await;
    
    // Second call returns cached value - no database hit
    let cached = cache.get_with(99, async {
        panic!("This should never run - value is cached");
    }).await;
    
    // Invalidate specific entry
    cache.invalidate(&42).await;
    
    // Clear everything
    cache.invalidate_all();
}
```

Moka handles all the concurrency concerns internally using a lock-free design. Multiple threads can read and write without blocking each other in most cases.

## Redis Integration with redis-rs

In-memory caches don't survive restarts and can't be shared across multiple application instances. Redis solves both problems. The redis-rs crate provides a solid Rust client.

```toml
[dependencies]
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Here's a Redis cache wrapper with serialization:

```rust
use redis::{AsyncCommands, Client};
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;

pub struct RedisCache {
    client: Client,
}

impl RedisCache {
    // Connect to Redis - connection string format: redis://host:port
    pub fn new(redis_url: &str) -> Result<Self, redis::RedisError> {
        let client = Client::open(redis_url)?;
        Ok(RedisCache { client })
    }

    // Get a value, deserializing from JSON
    // Returns None if key doesn't exist or deserialization fails
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Option<T> {
        let mut conn = self.client.get_multiplexed_async_connection().await.ok()?;
        let value: Option<String> = conn.get(key).await.ok()?;
        value.and_then(|v| serde_json::from_str(&v).ok())
    }

    // Set a value with TTL - serializes to JSON
    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl: Duration,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let serialized = serde_json::to_string(value)?;
        
        // SETEX sets value with expiration in one atomic operation
        conn.set_ex(key, serialized, ttl.as_secs()).await?;
        Ok(())
    }

    // Delete a key - useful for cache invalidation
    pub async fn delete(&self, key: &str) -> Result<bool, redis::RedisError> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let deleted: i32 = conn.del(key).await?;
        Ok(deleted > 0)
    }

    // Check remaining TTL - returns None if key doesn't exist
    pub async fn ttl(&self, key: &str) -> Option<i64> {
        let mut conn = self.client.get_multiplexed_async_connection().await.ok()?;
        let ttl: i64 = conn.ttl(key).await.ok()?;
        if ttl >= 0 { Some(ttl) } else { None }
    }
}
```

## Implementing the Cache-Aside Pattern

Cache-aside (or lazy-loading) is the most common caching pattern. The application checks the cache first; on a miss, it fetches from the source, stores in cache, then returns. This keeps the cache populated with actually-requested data.

Here's a complete implementation combining moka for local caching and Redis for distributed caching:

```rust
use moka::future::Cache;
use std::future::Future;
use std::hash::Hash;
use std::sync::Arc;
use std::time::Duration;

// Two-tier cache: fast local cache backed by Redis
// Local cache reduces Redis round trips for hot data
pub struct TieredCache<K, V> {
    local: Cache<K, V>,
    redis: Arc<RedisCache>,
    prefix: String,
    ttl: Duration,
}

impl<K, V> TieredCache<K, V>
where
    K: Clone + Eq + Hash + Send + Sync + ToString + 'static,
    V: Clone + Send + Sync + serde::Serialize + serde::de::DeserializeOwned + 'static,
{
    pub fn new(redis: Arc<RedisCache>, prefix: &str, local_capacity: u64, ttl: Duration) -> Self {
        TieredCache {
            local: Cache::builder()
                .max_capacity(local_capacity)
                // Local TTL slightly shorter to ensure Redis is source of truth
                .time_to_live(ttl.saturating_sub(Duration::from_secs(10)))
                .build(),
            redis,
            prefix: prefix.to_string(),
            ttl,
        }
    }

    fn redis_key(&self, key: &K) -> String {
        format!("{}:{}", self.prefix, key.to_string())
    }

    // The main cache-aside method
    // Checks local -> Redis -> calls fetch_fn as last resort
    pub async fn get_or_fetch<F, Fut>(&self, key: K, fetch_fn: F) -> Option<V>
    where
        F: FnOnce() -> Fut,
        Fut: Future<Output = Option<V>>,
    {
        // Level 1: Check local cache
        if let Some(value) = self.local.get(&key).await {
            return Some(value);
        }

        // Level 2: Check Redis
        let redis_key = self.redis_key(&key);
        if let Some(value) = self.redis.get::<V>(&redis_key).await {
            // Populate local cache for next time
            self.local.insert(key, value.clone()).await;
            return Some(value);
        }

        // Level 3: Fetch from source
        let value = fetch_fn().await?;
        
        // Populate both cache levels
        let _ = self.redis.set(&redis_key, &value, self.ttl).await;
        self.local.insert(key, value.clone()).await;
        
        Some(value)
    }

    // Invalidate across all tiers - critical for data consistency
    pub async fn invalidate(&self, key: &K) {
        self.local.invalidate(key).await;
        let _ = self.redis.delete(&self.redis_key(key)).await;
    }
}
```

## Handling TTL and Expiration

TTL (Time To Live) prevents stale data but introduces complexity. What happens when multiple requests hit an expired cache entry simultaneously? They all miss and hammer your database - this is called cache stampede.

Here's a pattern using probabilistic early expiration to prevent stampedes:

```rust
use rand::Rng;
use std::time::{Duration, Instant};

struct CacheEntry<V> {
    value: V,
    created_at: Instant,
    ttl: Duration,
}

impl<V> CacheEntry<V> {
    // Check if entry should be refreshed early to prevent stampede
    // Uses exponential decay - refresh probability increases as expiration approaches
    fn should_refresh_early(&self) -> bool {
        let elapsed = self.created_at.elapsed();
        let remaining = self.ttl.saturating_sub(elapsed);
        
        // Don't refresh if more than 20% TTL remaining
        if remaining > self.ttl / 5 {
            return false;
        }
        
        // Probability increases as we approach expiration
        // At 20% remaining: ~5% chance, at 5% remaining: ~20% chance
        let remaining_ratio = remaining.as_secs_f64() / self.ttl.as_secs_f64();
        let refresh_probability = 0.05 / remaining_ratio.max(0.01);
        
        rand::thread_rng().gen_bool(refresh_probability.min(1.0))
    }
    
    fn is_expired(&self) -> bool {
        self.created_at.elapsed() >= self.ttl
    }
}
```

## Monitoring Your Cache

A cache you can't measure is a cache that will eventually cause problems. Track these metrics:

- Hit rate: percentage of requests served from cache
- Miss rate: percentage requiring source fetch
- Eviction rate: how often capacity limits force removals
- Latency: time to get/set values

Here's a wrapper that tracks basic metrics:

```rust
use std::sync::atomic::{AtomicU64, Ordering};

pub struct MeteredCache<C> {
    inner: C,
    hits: AtomicU64,
    misses: AtomicU64,
}

impl<C> MeteredCache<C> {
    pub fn new(cache: C) -> Self {
        MeteredCache {
            inner: cache,
            hits: AtomicU64::new(0),
            misses: AtomicU64::new(0),
        }
    }

    pub fn record_hit(&self) {
        self.hits.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_miss(&self) {
        self.misses.fetch_add(1, Ordering::Relaxed);
    }

    pub fn hit_rate(&self) -> f64 {
        let hits = self.hits.load(Ordering::Relaxed);
        let misses = self.misses.load(Ordering::Relaxed);
        let total = hits + misses;
        if total == 0 {
            return 0.0;
        }
        hits as f64 / total as f64
    }

    // Expose metrics for your monitoring system
    pub fn metrics(&self) -> CacheMetrics {
        CacheMetrics {
            hits: self.hits.load(Ordering::Relaxed),
            misses: self.misses.load(Ordering::Relaxed),
            hit_rate: self.hit_rate(),
        }
    }
}

#[derive(Debug)]
pub struct CacheMetrics {
    pub hits: u64,
    pub misses: u64,
    pub hit_rate: f64,
}
```

## Wrapping Up

Caching in Rust doesn't have to be complicated. Start with the simplest solution that meets your needs:

- HashMap with RwLock for small, bounded datasets
- Moka for production-grade in-memory caching with TTL
- Redis for distributed caching across multiple instances
- Two-tier caching when you need both speed and distribution

The key is understanding your access patterns. Read-heavy workloads benefit most from caching. Write-heavy workloads need careful invalidation strategies. And always measure - assumptions about cache effectiveness are usually wrong until proven with real data.

---

*Monitor cache performance with [OneUptime](https://oneuptime.com) - track hit rates and cache efficiency.*
