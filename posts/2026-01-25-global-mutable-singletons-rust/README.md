# How to Create Global Mutable Singletons in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Design Patterns, Concurrency, Static, Global State

Description: Learn how to create global mutable singletons in Rust using lazy_static, once_cell, and the new std::sync::OnceLock. Understand the trade-offs and best practices for managing global state safely.

---

Global mutable state is often discouraged in Rust because the ownership system makes it tricky to implement safely. However, there are legitimate use cases like configuration management, connection pools, and caches where you need a single instance accessible from anywhere. This guide covers the safe patterns for creating global mutable singletons in Rust.

## The Problem with Global State in Rust

Rust's ownership rules prevent multiple mutable references to the same data. For global state, this creates a challenge: how do you allow mutation from different parts of your program without data races?

```rust
// This won't compile - static mut is unsafe and discouraged
static mut COUNTER: i32 = 0;

fn increment() {
    // Requires unsafe block and is prone to data races
    unsafe {
        COUNTER += 1;
    }
}
```

The compiler rightfully rejects patterns that could lead to undefined behavior. Instead, we need synchronization primitives.

## Using lazy_static for Initialization

The `lazy_static` crate provides a macro for lazily initialized statics. Combined with a Mutex, you can create a thread-safe global singleton.

```rust
use lazy_static::lazy_static;
use std::sync::Mutex;
use std::collections::HashMap;

// Define a global configuration store
// lazy_static ensures initialization happens once on first access
lazy_static! {
    static ref CONFIG: Mutex<HashMap<String, String>> = {
        let mut map = HashMap::new();
        map.insert("database_url".to_string(), "localhost:5432".to_string());
        map.insert("max_connections".to_string(), "100".to_string());
        Mutex::new(map)
    };
}

fn get_config(key: &str) -> Option<String> {
    // Lock the mutex to read
    let config = CONFIG.lock().unwrap();
    config.get(key).cloned()
}

fn set_config(key: &str, value: &str) {
    // Lock the mutex to write
    let mut config = CONFIG.lock().unwrap();
    config.insert(key.to_string(), value.to_string());
}

fn main() {
    // Reading configuration
    if let Some(url) = get_config("database_url") {
        println!("Database URL: {}", url);
    }

    // Updating configuration
    set_config("max_connections", "200");

    // Verify the update
    println!("Max connections: {:?}", get_config("max_connections"));
}
```

The Mutex ensures only one thread can access the data at a time, preventing data races.

## Modern Approach with once_cell

The `once_cell` crate offers a cleaner API that has been partially stabilized in the standard library. It provides `OnceCell` for single-threaded contexts and `Lazy` for convenient lazy initialization.

```rust
use once_cell::sync::Lazy;
use std::sync::Mutex;

// Global application state using once_cell
// Lazy combines initialization logic with the static declaration
static APP_STATE: Lazy<Mutex<AppState>> = Lazy::new(|| {
    Mutex::new(AppState {
        initialized: true,
        request_count: 0,
        last_error: None,
    })
});

#[derive(Debug)]
struct AppState {
    initialized: bool,
    request_count: u64,
    last_error: Option<String>,
}

fn handle_request() {
    let mut state = APP_STATE.lock().unwrap();
    state.request_count += 1;
    println!("Handled request #{}", state.request_count);
}

fn record_error(error: &str) {
    let mut state = APP_STATE.lock().unwrap();
    state.last_error = Some(error.to_string());
}

fn get_stats() -> (u64, Option<String>) {
    let state = APP_STATE.lock().unwrap();
    (state.request_count, state.last_error.clone())
}
```

## Standard Library OnceLock (Rust 1.70+)

Starting with Rust 1.70, you can use `std::sync::OnceLock` without external dependencies. This is now the recommended approach for new projects.

```rust
use std::sync::{OnceLock, Mutex};

// Using standard library OnceLock
// No external crate needed for Rust 1.70+
static DATABASE_POOL: OnceLock<Mutex<ConnectionPool>> = OnceLock::new();

struct ConnectionPool {
    connections: Vec<Connection>,
    max_size: usize,
}

struct Connection {
    id: u32,
    in_use: bool,
}

impl ConnectionPool {
    fn new(size: usize) -> Self {
        let connections = (0..size)
            .map(|id| Connection { id: id as u32, in_use: false })
            .collect();

        ConnectionPool {
            connections,
            max_size: size,
        }
    }

    fn acquire(&mut self) -> Option<u32> {
        for conn in &mut self.connections {
            if !conn.in_use {
                conn.in_use = true;
                return Some(conn.id);
            }
        }
        None
    }

    fn release(&mut self, id: u32) {
        if let Some(conn) = self.connections.iter_mut().find(|c| c.id == id) {
            conn.in_use = false;
        }
    }
}

// Initialize the pool on first use
fn get_pool() -> &'static Mutex<ConnectionPool> {
    DATABASE_POOL.get_or_init(|| {
        println!("Initializing connection pool...");
        Mutex::new(ConnectionPool::new(10))
    })
}

fn with_connection<F, R>(f: F) -> Option<R>
where
    F: FnOnce(u32) -> R,
{
    let pool = get_pool();
    let mut guard = pool.lock().unwrap();

    if let Some(conn_id) = guard.acquire() {
        drop(guard); // Release the lock while using the connection

        let result = f(conn_id);

        // Return the connection
        let mut guard = pool.lock().unwrap();
        guard.release(conn_id);

        Some(result)
    } else {
        None
    }
}
```

## RwLock for Read-Heavy Workloads

When reads significantly outnumber writes, use `RwLock` instead of `Mutex` to allow concurrent read access.

```rust
use std::sync::{OnceLock, RwLock};
use std::collections::HashMap;

// Cache with RwLock for concurrent reads
// Multiple threads can read simultaneously
// Only one thread can write, blocking all readers
static CACHE: OnceLock<RwLock<HashMap<String, CacheEntry>>> = OnceLock::new();

#[derive(Clone)]
struct CacheEntry {
    value: String,
    created_at: u64,
    ttl_seconds: u64,
}

fn get_cache() -> &'static RwLock<HashMap<String, CacheEntry>> {
    CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

fn cache_get(key: &str) -> Option<String> {
    // Read lock allows multiple concurrent readers
    let cache = get_cache().read().unwrap();

    cache.get(key).and_then(|entry| {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Check if entry has expired
        if now - entry.created_at < entry.ttl_seconds {
            Some(entry.value.clone())
        } else {
            None
        }
    })
}

fn cache_set(key: &str, value: &str, ttl_seconds: u64) {
    // Write lock blocks all other access
    let mut cache = get_cache().write().unwrap();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    cache.insert(key.to_string(), CacheEntry {
        value: value.to_string(),
        created_at: now,
        ttl_seconds,
    });
}

fn cache_stats() -> (usize, usize) {
    let cache = get_cache().read().unwrap();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let total = cache.len();
    let valid = cache.values()
        .filter(|e| now - e.created_at < e.ttl_seconds)
        .count();

    (total, valid)
}
```

## Atomic Types for Simple Values

For simple numeric values, atomic types provide lock-free thread-safe mutation.

```rust
use std::sync::atomic::{AtomicU64, AtomicBool, Ordering};

// Atomic counters for metrics
// No locking required, uses CPU atomic instructions
static REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);
static ERROR_COUNT: AtomicU64 = AtomicU64::new(0);
static IS_HEALTHY: AtomicBool = AtomicBool::new(true);

fn record_request(success: bool) {
    // Relaxed ordering is sufficient for counters
    REQUEST_COUNT.fetch_add(1, Ordering::Relaxed);

    if !success {
        ERROR_COUNT.fetch_add(1, Ordering::Relaxed);

        // Mark unhealthy if error rate exceeds threshold
        let errors = ERROR_COUNT.load(Ordering::Relaxed);
        let total = REQUEST_COUNT.load(Ordering::Relaxed);

        if total > 100 && errors as f64 / total as f64 > 0.1 {
            IS_HEALTHY.store(false, Ordering::Release);
        }
    }
}

fn get_metrics() -> (u64, u64, bool) {
    (
        REQUEST_COUNT.load(Ordering::Relaxed),
        ERROR_COUNT.load(Ordering::Relaxed),
        IS_HEALTHY.load(Ordering::Acquire),
    )
}

fn reset_metrics() {
    REQUEST_COUNT.store(0, Ordering::Relaxed);
    ERROR_COUNT.store(0, Ordering::Relaxed);
    IS_HEALTHY.store(true, Ordering::Release);
}
```

## Best Practices

| Pattern | Use Case | Thread Safety |
|---------|----------|---------------|
| `OnceLock<Mutex<T>>` | General mutable singleton | Full mutual exclusion |
| `OnceLock<RwLock<T>>` | Read-heavy workloads | Concurrent reads, exclusive writes |
| `AtomicU64`, `AtomicBool` | Simple counters/flags | Lock-free |
| `lazy_static!` | Legacy code, complex init | Depends on inner type |

**Guidelines for global state:**

1. Prefer passing dependencies explicitly over global state when possible
2. Use `OnceLock` from std for Rust 1.70+ projects
3. Choose `RwLock` over `Mutex` when reads are much more frequent than writes
4. Use atomic types for simple numeric counters
5. Always handle lock poisoning in production code
6. Consider using dependency injection frameworks for complex applications

## Handling Lock Poisoning

When a thread panics while holding a lock, the lock becomes poisoned. Production code should handle this case.

```rust
use std::sync::{OnceLock, Mutex, PoisonError};

static DATA: OnceLock<Mutex<Vec<String>>> = OnceLock::new();

fn get_data() -> &'static Mutex<Vec<String>> {
    DATA.get_or_init(|| Mutex::new(Vec::new()))
}

fn safe_push(item: String) -> Result<(), String> {
    let data = get_data();

    // Handle poisoned lock by recovering the data
    let mut guard = data.lock().unwrap_or_else(|poisoned| {
        eprintln!("Lock was poisoned, recovering...");
        poisoned.into_inner()
    });

    guard.push(item);
    Ok(())
}
```

## Summary

Global mutable singletons in Rust require explicit synchronization. The modern approach using `std::sync::OnceLock` with `Mutex` or `RwLock` provides safe, ergonomic access to shared state. For simple values, atomic types offer lock-free performance. While global state should be used sparingly, these patterns ensure thread safety when you need it.
