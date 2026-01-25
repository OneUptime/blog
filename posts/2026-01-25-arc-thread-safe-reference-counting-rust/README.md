# How to Use Arc for Thread-Safe Reference Counting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Arc, Concurrency, Thread Safety, Smart Pointers

Description: Learn how to use Arc (Atomic Reference Counting) for shared ownership across threads in Rust. Understand when to use Arc versus Rc and how to combine Arc with Mutex.

---

`Arc<T>` (Atomic Reference Counted) is Rust's thread-safe reference counting smart pointer. When you need multiple threads to share ownership of data, Arc provides safe concurrent access through atomic reference counting.

## Arc vs Rc

| Feature | Rc | Arc |
|---------|-----|-----|
| Thread-safe | No | Yes |
| Performance | Faster | Slightly slower |
| Use case | Single-threaded | Multi-threaded |
| Implementation | Non-atomic counter | Atomic counter |

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    // Arc for shared ownership across threads
    let data = Arc::new(vec![1, 2, 3, 4, 5]);

    let mut handles = vec![];

    for i in 0..3 {
        // Clone Arc, not the data (increments reference count)
        let data_clone = Arc::clone(&data);

        let handle = thread::spawn(move || {
            println!("Thread {} sees: {:?}", i, data_clone);
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Reference count: {}", Arc::strong_count(&data));
}
```

## Basic Usage

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let numbers = Arc::new(vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Spawn threads to sum different parts
    let numbers1 = Arc::clone(&numbers);
    let handle1 = thread::spawn(move || {
        let sum: i32 = numbers1.iter().take(5).sum();
        println!("First half sum: {}", sum);
        sum
    });

    let numbers2 = Arc::clone(&numbers);
    let handle2 = thread::spawn(move || {
        let sum: i32 = numbers2.iter().skip(5).sum();
        println!("Second half sum: {}", sum);
        sum
    });

    let sum1 = handle1.join().unwrap();
    let sum2 = handle2.join().unwrap();

    println!("Total sum: {}", sum1 + sum2);
}
```

## Arc with Mutex for Mutable Shared State

Arc provides shared ownership but not mutation. Combine with Mutex for thread-safe mutation:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Shared mutable counter
    let counter = Arc::new(Mutex::new(0));

    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);

        let handle = thread::spawn(move || {
            // Lock the mutex to get mutable access
            let mut num = counter_clone.lock().unwrap();
            *num += 1;
            // Lock is automatically released when guard goes out of scope
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", *counter.lock().unwrap());
}
```

## Arc with RwLock for Read-Heavy Workloads

When reads outnumber writes, use RwLock:

```rust
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Duration;

fn main() {
    let config = Arc::new(RwLock::new(AppConfig {
        max_connections: 100,
        timeout_seconds: 30,
        debug_mode: false,
    }));

    let mut handles = vec![];

    // Multiple readers
    for i in 0..5 {
        let config_clone = Arc::clone(&config);
        handles.push(thread::spawn(move || {
            for _ in 0..3 {
                let cfg = config_clone.read().unwrap();
                println!(
                    "Reader {}: max_connections = {}",
                    i, cfg.max_connections
                );
                thread::sleep(Duration::from_millis(10));
            }
        }));
    }

    // One writer
    let config_writer = Arc::clone(&config);
    handles.push(thread::spawn(move || {
        thread::sleep(Duration::from_millis(25));
        let mut cfg = config_writer.write().unwrap();
        cfg.max_connections = 200;
        println!("Writer: updated max_connections to 200");
    }));

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final config: {:?}", config.read().unwrap());
}

#[derive(Debug)]
struct AppConfig {
    max_connections: u32,
    timeout_seconds: u32,
    debug_mode: bool,
}
```

## Shared Data Structures

```rust
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::thread;

fn main() {
    // Shared cache
    let cache: Arc<Mutex<HashMap<String, i32>>> = Arc::new(Mutex::new(HashMap::new()));

    let mut handles = vec![];

    // Writer threads
    for i in 0..5 {
        let cache_clone = Arc::clone(&cache);
        handles.push(thread::spawn(move || {
            let mut cache = cache_clone.lock().unwrap();
            cache.insert(format!("key_{}", i), i * 10);
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    // Read results
    let cache = cache.lock().unwrap();
    println!("Cache contents: {:?}", *cache);
}
```

## Thread Pool Pattern

```rust
use std::sync::{Arc, Mutex};
use std::thread;

struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<std::sync::mpsc::Sender<Job>>,
}

type Job = Box<dyn FnOnce() + Send + 'static>;

struct Worker {
    id: usize,
    thread: Option<thread::JoinHandle<()>>,
}

impl ThreadPool {
    fn new(size: usize) -> Self {
        let (sender, receiver) = std::sync::mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            let receiver = Arc::clone(&receiver);
            let thread = thread::spawn(move || loop {
                let job = receiver.lock().unwrap().recv();
                match job {
                    Ok(job) => {
                        println!("Worker {} executing job", id);
                        job();
                    }
                    Err(_) => {
                        println!("Worker {} shutting down", id);
                        break;
                    }
                }
            });
            workers.push(Worker {
                id,
                thread: Some(thread),
            });
        }

        ThreadPool {
            workers,
            sender: Some(sender),
        }
    }

    fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);
        self.sender.as_ref().unwrap().send(job).unwrap();
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        drop(self.sender.take());
        for worker in &mut self.workers {
            if let Some(thread) = worker.thread.take() {
                thread.join().unwrap();
            }
        }
    }
}

fn main() {
    let pool = ThreadPool::new(4);
    let counter = Arc::new(Mutex::new(0));

    for _ in 0..8 {
        let counter = Arc::clone(&counter);
        pool.execute(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
            println!("Counter: {}", *num);
        });
    }

    drop(pool);  // Wait for all jobs to complete

    println!("Final counter: {}", *counter.lock().unwrap());
}
```

## Weak References with Arc

Use `Weak` to break reference cycles:

```rust
use std::sync::{Arc, Weak, Mutex};

struct Node {
    value: i32,
    parent: Mutex<Weak<Node>>,
    children: Mutex<Vec<Arc<Node>>>,
}

impl Node {
    fn new(value: i32) -> Arc<Self> {
        Arc::new(Node {
            value,
            parent: Mutex::new(Weak::new()),
            children: Mutex::new(Vec::new()),
        })
    }
}

fn main() {
    let root = Node::new(1);
    let child = Node::new(2);

    // Set parent (weak reference)
    *child.parent.lock().unwrap() = Arc::downgrade(&root);

    // Add child (strong reference)
    root.children.lock().unwrap().push(Arc::clone(&child));

    // Access parent through weak reference
    if let Some(parent) = child.parent.lock().unwrap().upgrade() {
        println!("Child's parent value: {}", parent.value);
    }

    println!("Root strong count: {}", Arc::strong_count(&root));
    println!("Root weak count: {}", Arc::weak_count(&root));
}
```

## Performance Considerations

```rust
use std::sync::{Arc, Mutex, RwLock};
use std::time::Instant;
use std::thread;

fn main() {
    let iterations = 100_000;
    let threads = 4;

    // Benchmark Mutex (write-heavy)
    let counter = Arc::new(Mutex::new(0u64));
    let start = Instant::now();

    let handles: Vec<_> = (0..threads)
        .map(|_| {
            let counter = Arc::clone(&counter);
            thread::spawn(move || {
                for _ in 0..(iterations / threads) {
                    *counter.lock().unwrap() += 1;
                }
            })
        })
        .collect();

    for h in handles { h.join().unwrap(); }
    println!("Mutex time: {:?}", start.elapsed());

    // Benchmark RwLock (read-heavy)
    let data = Arc::new(RwLock::new(vec![1, 2, 3, 4, 5]));
    let start = Instant::now();

    let handles: Vec<_> = (0..threads)
        .map(|_| {
            let data = Arc::clone(&data);
            thread::spawn(move || {
                for _ in 0..(iterations / threads) {
                    let _sum: i32 = data.read().unwrap().iter().sum();
                }
            })
        })
        .collect();

    for h in handles { h.join().unwrap(); }
    println!("RwLock read time: {:?}", start.elapsed());
}
```

## Summary

| Pattern | Use Case |
|---------|----------|
| `Arc<T>` | Immutable shared data across threads |
| `Arc<Mutex<T>>` | Mutable shared data, any access pattern |
| `Arc<RwLock<T>>` | Mutable shared data, read-heavy |
| `Weak<T>` | Break reference cycles |

Arc provides safe shared ownership across threads through atomic reference counting. Combine it with Mutex for exclusive access or RwLock for concurrent reads. The atomic operations add small overhead compared to Rc, but enable safe concurrent programming.
