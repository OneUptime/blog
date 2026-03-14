# How to Use async/await in Rust with tokio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Async, Tokio, Concurrency, Performance

Description: A practical guide to asynchronous programming in Rust using tokio. Learn async/await syntax, spawning tasks, channels, and building concurrent applications.

---

Asynchronous programming lets you write concurrent code without the complexity of manual thread management. Rust's async/await syntax, combined with the tokio runtime, provides excellent performance for I/O-bound applications. This guide covers everything from basics to advanced patterns.

## Setting Up Tokio

First, add tokio to your `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

The "full" feature enables all tokio components. For production, you might enable only the features you need.

## Basic async/await

An async function returns a Future that must be awaited or spawned on a runtime.

```rust
use tokio::time::{sleep, Duration};

// Async functions return a Future
async fn fetch_data(id: u32) -> String {
    // Simulate network delay
    sleep(Duration::from_millis(100)).await;
    format!("Data for id {}", id)
}

async fn process_request() {
    let data = fetch_data(42).await;
    println!("Received: {}", data);
}

// The main function needs the tokio runtime
#[tokio::main]
async fn main() {
    process_request().await;
}
```

## Running Concurrent Tasks

Use `tokio::join!` to run multiple futures concurrently and wait for all of them.

```rust
use tokio::time::{sleep, Duration};

async fn fetch_user(id: u32) -> String {
    sleep(Duration::from_millis(100)).await;
    format!("User {}", id)
}

async fn fetch_orders(user_id: u32) -> Vec<String> {
    sleep(Duration::from_millis(150)).await;
    vec![format!("Order 1 for user {}", user_id)]
}

async fn fetch_preferences(user_id: u32) -> String {
    sleep(Duration::from_millis(80)).await;
    format!("Preferences for user {}", user_id)
}

#[tokio::main]
async fn main() {
    let user_id = 42;

    // Run all three requests concurrently
    // Total time is ~150ms (the longest), not 330ms (sum of all)
    let (user, orders, prefs) = tokio::join!(
        fetch_user(user_id),
        fetch_orders(user_id),
        fetch_preferences(user_id)
    );

    println!("User: {}", user);
    println!("Orders: {:?}", orders);
    println!("Preferences: {}", prefs);
}
```

## Spawning Background Tasks

Use `tokio::spawn` to run tasks independently without waiting for them.

```rust
use tokio::time::{sleep, Duration};

async fn background_job(name: &'static str) {
    for i in 1..=3 {
        println!("{}: iteration {}", name, i);
        sleep(Duration::from_millis(100)).await;
    }
}

#[tokio::main]
async fn main() {
    // Spawn tasks that run in the background
    let handle1 = tokio::spawn(background_job("Task A"));
    let handle2 = tokio::spawn(background_job("Task B"));

    // Do other work while tasks run
    println!("Main: doing other work");
    sleep(Duration::from_millis(50)).await;

    // Wait for tasks to complete
    handle1.await.unwrap();
    handle2.await.unwrap();

    println!("All tasks completed");
}
```

## Handling Timeouts

Wrap operations with `tokio::time::timeout` to prevent them from running forever.

```rust
use tokio::time::{timeout, sleep, Duration};

async fn slow_operation() -> String {
    sleep(Duration::from_secs(5)).await;
    String::from("completed")
}

#[tokio::main]
async fn main() {
    // Set a 1 second timeout
    match timeout(Duration::from_secs(1), slow_operation()).await {
        Ok(result) => println!("Success: {}", result),
        Err(_) => println!("Operation timed out"),
    }

    // Timeout returns Result<T, Elapsed>
    let result = timeout(Duration::from_millis(100), async {
        sleep(Duration::from_millis(50)).await;
        42
    }).await;

    match result {
        Ok(value) => println!("Got value: {}", value),
        Err(_) => println!("Timed out"),
    }
}
```

## Using Channels for Communication

Tokio provides async channels for communication between tasks.

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    // Create a channel with buffer size 32
    let (tx, mut rx) = mpsc::channel::<String>(32);

    // Clone sender for multiple producers
    let tx2 = tx.clone();

    // Producer 1
    tokio::spawn(async move {
        for i in 1..=3 {
            tx.send(format!("Message {} from producer 1", i)).await.unwrap();
        }
    });

    // Producer 2
    tokio::spawn(async move {
        for i in 1..=3 {
            tx2.send(format!("Message {} from producer 2", i)).await.unwrap();
        }
    });

    // Consumer
    while let Some(message) = rx.recv().await {
        println!("Received: {}", message);
    }
}
```

### Oneshot Channels for Single Responses

Use `oneshot` when you need to send exactly one value.

```rust
use tokio::sync::oneshot;

async fn compute_value(respond_to: oneshot::Sender<i32>) {
    // Do some computation
    let result = 42;
    // Send the result back (this consumes the sender)
    let _ = respond_to.send(result);
}

#[tokio::main]
async fn main() {
    let (tx, rx) = oneshot::channel();

    tokio::spawn(compute_value(tx));

    // Wait for the result
    match rx.await {
        Ok(value) => println!("Got: {}", value),
        Err(_) => println!("Sender dropped"),
    }
}
```

### Broadcast Channels

Use broadcast for multiple consumers receiving the same messages.

```rust
use tokio::sync::broadcast;

#[tokio::main]
async fn main() {
    let (tx, _rx) = broadcast::channel::<String>(16);

    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tokio::spawn(async move {
        while let Ok(msg) = rx1.recv().await {
            println!("Receiver 1: {}", msg);
        }
    });

    tokio::spawn(async move {
        while let Ok(msg) = rx2.recv().await {
            println!("Receiver 2: {}", msg);
        }
    });

    tx.send("Hello everyone!".to_string()).unwrap();
    tx.send("Goodbye!".to_string()).unwrap();

    // Give receivers time to process
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}
```

## Working with async I/O

Tokio provides async versions of standard I/O operations.

```rust
use tokio::fs::File;
use tokio::io::{self, AsyncReadExt, AsyncWriteExt};

#[tokio::main]
async fn main() -> io::Result<()> {
    // Write to a file asynchronously
    let mut file = File::create("example.txt").await?;
    file.write_all(b"Hello, async world!").await?;
    file.flush().await?;

    // Read from a file asynchronously
    let mut file = File::open("example.txt").await?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).await?;
    println!("File contents: {}", contents);

    // Clean up
    tokio::fs::remove_file("example.txt").await?;

    Ok(())
}
```

## TCP Server Example

Here is a complete async TCP echo server:

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn handle_client(mut socket: TcpStream) {
    let mut buffer = [0u8; 1024];

    loop {
        // Read data from the client
        let bytes_read = match socket.read(&mut buffer).await {
            Ok(0) => return,  // Connection closed
            Ok(n) => n,
            Err(e) => {
                eprintln!("Failed to read: {}", e);
                return;
            }
        };

        // Echo the data back
        if let Err(e) = socket.write_all(&buffer[..bytes_read]).await {
            eprintln!("Failed to write: {}", e);
            return;
        }
    }
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("Server listening on port 8080");

    loop {
        let (socket, addr) = listener.accept().await?;
        println!("New connection from: {}", addr);

        // Spawn a new task for each connection
        tokio::spawn(handle_client(socket));
    }
}
```

## Graceful Shutdown

Handle shutdown signals properly in async applications.

```rust
use tokio::signal;
use tokio::sync::broadcast;

async fn run_server(mut shutdown: broadcast::Receiver<()>) {
    loop {
        tokio::select! {
            _ = async {
                // Simulate server work
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                println!("Server: processing request");
            } => {}
            _ = shutdown.recv() => {
                println!("Server: shutting down");
                break;
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let (shutdown_tx, _) = broadcast::channel::<()>(1);

    let server_shutdown = shutdown_tx.subscribe();
    let server_handle = tokio::spawn(run_server(server_shutdown));

    // Wait for Ctrl+C
    println!("Press Ctrl+C to shutdown");
    signal::ctrl_c().await.expect("Failed to listen for ctrl+c");

    // Signal shutdown
    println!("Shutdown signal received");
    let _ = shutdown_tx.send(());

    // Wait for server to finish
    let _ = server_handle.await;
    println!("Server stopped");
}
```

## Using select! for Racing Futures

The `select!` macro runs multiple futures and returns when the first one completes.

```rust
use tokio::time::{sleep, Duration};
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(1);

    tokio::spawn(async move {
        sleep(Duration::from_millis(200)).await;
        let _ = tx.send("Message arrived!".to_string()).await;
    });

    // Race between receiving a message and a timeout
    tokio::select! {
        Some(msg) = rx.recv() => {
            println!("Received: {}", msg);
        }
        _ = sleep(Duration::from_millis(100)) => {
            println!("Timed out waiting for message");
        }
    }
}
```

## Shared State with Mutex

Use `tokio::sync::Mutex` for async-safe shared state.

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

struct Counter {
    value: u64,
}

#[tokio::main]
async fn main() {
    let counter = Arc::new(Mutex::new(Counter { value: 0 }));

    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = tokio::spawn(async move {
            for _ in 0..100 {
                let mut guard = counter.lock().await;
                guard.value += 1;
                // Lock is released when guard goes out of scope
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.await.unwrap();
    }

    let final_value = counter.lock().await.value;
    println!("Final count: {}", final_value); // Should be 1000
}
```

## Error Handling in Async Code

Async functions work naturally with `Result` and the `?` operator.

```rust
use std::io;

async fn fetch_data(url: &str) -> Result<String, io::Error> {
    // Simulate potential failure
    if url.is_empty() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "Empty URL"));
    }
    Ok(format!("Data from {}", url))
}

async fn process() -> Result<(), io::Error> {
    let data = fetch_data("https://example.com").await?;
    println!("Got: {}", data);
    Ok(())
}

#[tokio::main]
async fn main() {
    if let Err(e) = process().await {
        eprintln!("Error: {}", e);
    }
}
```

## Summary

Rust's async/await with tokio provides:

- Non-blocking I/O with familiar syntax
- Efficient task scheduling without OS thread overhead
- Channels for safe communication between tasks
- Timeouts and cancellation support
- Graceful shutdown handling

Key points to remember:

- Use `#[tokio::main]` to set up the runtime
- Use `await` to pause and resume futures
- Use `tokio::spawn` for background tasks
- Use channels for task communication
- Use `select!` to race multiple futures

Async Rust is well-suited for network services, web servers, and any application that spends time waiting for I/O.
