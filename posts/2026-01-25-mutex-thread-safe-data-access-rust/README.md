# How to Use Mutex for Thread-Safe Data Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Mutex, Concurrency, Thread Safety, Synchronization

Description: Learn how to use Mutex for thread-safe mutable access in Rust. Understand lock guards, poison handling, and best practices for concurrent programming.

---

`Mutex<T>` (mutual exclusion) provides thread-safe mutable access to data. Only one thread can access the data at a time. This guide covers how to use Mutex effectively in Rust concurrent programs.

## Basic Usage

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        // Lock the mutex to get mutable access
        let mut num = m.lock().unwrap();
        *num = 6;
        // Lock is automatically released when guard goes out of scope
    }

    println!("m = {:?}", m);
}
```

## Mutex with Threads

Combine with `Arc` for shared ownership across threads:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

## Lock Guards

The `lock()` method returns a `MutexGuard` that automatically releases the lock when dropped:

```rust
use std::sync::Mutex;

fn main() {
    let data = Mutex::new(vec![1, 2, 3]);

    // Explicit scope to control lock duration
    {
        let mut guard = data.lock().unwrap();
        guard.push(4);
        guard.push(5);
        // guard dropped here, lock released
    }

    // Can lock again
    {
        let guard = data.lock().unwrap();
        println!("Data: {:?}", *guard);
    }

    // Or use in-place operations
    data.lock().unwrap().push(6);
    println!("Final: {:?}", data.lock().unwrap());
}
```

## Handling Poisoned Mutexes

A Mutex becomes poisoned if a thread panics while holding the lock:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let data = Arc::new(Mutex::new(vec![1, 2, 3]));

    // Thread that will panic
    let data_clone = Arc::clone(&data);
    let handle = thread::spawn(move || {
        let _guard = data_clone.lock().unwrap();
        panic!("Oops!");  // Mutex becomes poisoned
    });

    let _ = handle.join();

    // Handle poisoned mutex
    match data.lock() {
        Ok(guard) => {
            println!("Data: {:?}", *guard);
        }
        Err(poisoned) => {
            // Can still access the data by recovering the guard
            let guard = poisoned.into_inner();
            println!("Recovered from poison: {:?}", *guard);
        }
    }

    // Or use unwrap_or_else to recover
    let guard = data.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    println!("Data: {:?}", *guard);
}
```

## Try Lock for Non-Blocking Access

Use `try_lock()` to attempt locking without blocking:

```rust
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

fn main() {
    let data = Arc::new(Mutex::new(0));

    let data1 = Arc::clone(&data);
    let handle = thread::spawn(move || {
        let _guard = data1.lock().unwrap();
        // Hold lock for a while
        thread::sleep(Duration::from_millis(100));
    });

    // Give the other thread time to acquire the lock
    thread::sleep(Duration::from_millis(10));

    // Try to lock without blocking
    match data.try_lock() {
        Ok(mut guard) => {
            *guard += 1;
            println!("Got the lock!");
        }
        Err(_) => {
            println!("Couldn't get the lock, doing something else...");
        }
    }

    handle.join().unwrap();
}
```

## Protecting Complex Data Structures

```rust
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::thread;

#[derive(Debug)]
struct Database {
    users: HashMap<u32, String>,
    next_id: u32,
}

impl Database {
    fn new() -> Self {
        Database {
            users: HashMap::new(),
            next_id: 1,
        }
    }

    fn add_user(&mut self, name: String) -> u32 {
        let id = self.next_id;
        self.users.insert(id, name);
        self.next_id += 1;
        id
    }

    fn get_user(&self, id: u32) -> Option<&String> {
        self.users.get(&id)
    }
}

fn main() {
    let db = Arc::new(Mutex::new(Database::new()));

    let mut handles = vec![];

    // Multiple writers
    for i in 0..5 {
        let db = Arc::clone(&db);
        handles.push(thread::spawn(move || {
            let mut db = db.lock().unwrap();
            let id = db.add_user(format!("User{}", i));
            println!("Created user {} with id {}", i, id);
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    // Read results
    let db = db.lock().unwrap();
    println!("Database: {:?}", *db);
}
```

## Deadlock Prevention

Avoid deadlocks by acquiring locks in consistent order:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let a = Arc::new(Mutex::new(1));
    let b = Arc::new(Mutex::new(2));

    // WRONG: Can deadlock if threads acquire in different order
    // Thread 1: locks a, then b
    // Thread 2: locks b, then a
    // Both wait forever

    // RIGHT: Always acquire in same order
    let a1 = Arc::clone(&a);
    let b1 = Arc::clone(&b);
    let handle1 = thread::spawn(move || {
        let _a = a1.lock().unwrap();
        let _b = b1.lock().unwrap();
        println!("Thread 1 has both locks");
    });

    let a2 = Arc::clone(&a);
    let b2 = Arc::clone(&b);
    let handle2 = thread::spawn(move || {
        let _a = a2.lock().unwrap();  // Same order as thread 1
        let _b = b2.lock().unwrap();
        println!("Thread 2 has both locks");
    });

    handle1.join().unwrap();
    handle2.join().unwrap();
}
```

## Fine-Grained Locking

Lock only what you need for better concurrency:

```rust
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::thread;

// Coarse-grained: one lock for entire map
struct CoarseCache {
    data: Mutex<HashMap<String, String>>,
}

// Fine-grained: lock per entry
struct FineCache {
    data: HashMap<String, Mutex<String>>,
}

// Better: sharded locks
struct ShardedCache {
    shards: Vec<Mutex<HashMap<String, String>>>,
}

impl ShardedCache {
    fn new(num_shards: usize) -> Self {
        let mut shards = Vec::with_capacity(num_shards);
        for _ in 0..num_shards {
            shards.push(Mutex::new(HashMap::new()));
        }
        ShardedCache { shards }
    }

    fn get_shard(&self, key: &str) -> &Mutex<HashMap<String, String>> {
        let hash = key.bytes().fold(0usize, |acc, b| acc.wrapping_add(b as usize));
        &self.shards[hash % self.shards.len()]
    }

    fn insert(&self, key: String, value: String) {
        let mut shard = self.get_shard(&key).lock().unwrap();
        shard.insert(key, value);
    }

    fn get(&self, key: &str) -> Option<String> {
        let shard = self.get_shard(key).lock().unwrap();
        shard.get(key).cloned()
    }
}

fn main() {
    let cache = Arc::new(ShardedCache::new(16));

    let mut handles = vec![];

    for i in 0..100 {
        let cache = Arc::clone(&cache);
        handles.push(thread::spawn(move || {
            let key = format!("key{}", i);
            let value = format!("value{}", i);
            cache.insert(key.clone(), value);
            println!("Inserted: {}", key);
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Value for key50: {:?}", cache.get("key50"));
}
```

## Mutex vs RwLock

| Feature | Mutex | RwLock |
|---------|-------|--------|
| Readers | One at a time | Multiple concurrent |
| Writers | One at a time | One at a time |
| Best for | Write-heavy | Read-heavy |

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));

    let mut handles = vec![];

    // Multiple readers can access concurrently
    for i in 0..5 {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            let read_guard = data.read().unwrap();
            println!("Reader {}: {:?}", i, *read_guard);
        }));
    }

    // Writers get exclusive access
    let data_writer = Arc::clone(&data);
    handles.push(thread::spawn(move || {
        let mut write_guard = data_writer.write().unwrap();
        write_guard.push(4);
        println!("Writer added element");
    }));

    for handle in handles {
        handle.join().unwrap();
    }
}
```

## Summary

| Pattern | Use Case |
|---------|----------|
| `Mutex<T>` | Exclusive mutable access |
| `Arc<Mutex<T>>` | Shared mutable access across threads |
| `try_lock()` | Non-blocking lock attempt |
| `into_inner()` on poison | Recover from panicked thread |
| Sharded locks | High-concurrency scenarios |
| `RwLock<T>` | Read-heavy workloads |

Mutex provides safe exclusive access to shared data. Always hold locks for the minimum necessary time, acquire multiple locks in consistent order to prevent deadlocks, and consider `RwLock` for read-heavy workloads.
