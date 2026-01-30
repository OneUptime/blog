# How to Use Pin and Unpin in Async Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Async, Pin, Memory

Description: Learn how Pin and Unpin work in Rust's async system and when you need to use them for self-referential types.

---

When working with async Rust, you will inevitably encounter `Pin` and `Unpin`. These concepts can be confusing at first, but understanding them is essential for writing correct async code. This post explains why Pin exists, how it works, and when you need to use it.

## Why Pin Exists

The fundamental problem Pin solves relates to **self-referential types**. A self-referential type is a struct that contains a pointer to its own data. Consider this simplified example:

```rust
struct SelfReferential {
    data: String,
    ptr: *const String, // Points to `data`
}
```

If this struct is moved in memory, the `ptr` field would still point to the old location, creating a dangling pointer. This is undefined behavior in Rust.

Async blocks in Rust compile into state machines that can be self-referential. When you write:

```rust
async fn example() {
    let data = String::from("hello");
    some_async_operation(&data).await;
    println!("{}", data);
}
```

The compiler generates a struct that holds both `data` and a reference to it across the await point. If this struct were moved, the internal reference would become invalid.

## How Pin Works

`Pin<P>` is a wrapper around a pointer type `P` that prevents moving the pointed-to value. The key insight is that Pin does not prevent moves at the type level; instead, it prevents access to `&mut T`, which is required to move a value.

```rust
use std::pin::Pin;

fn cannot_move(pinned: Pin<&mut MyFuture>) {
    // Cannot call std::mem::swap or std::mem::replace
    // Cannot get &mut MyFuture from Pin<&mut MyFuture>
    // The value is effectively immovable
}
```

## Pin<Box<T>> vs Pin<&mut T>

There are two common ways to pin a value:

**Pin<Box<T>>** - Heap allocation with ownership:

```rust
use std::pin::Pin;
use std::future::Future;

fn spawn_task(future: Pin<Box<dyn Future<Output = ()>>>) {
    // The future is pinned on the heap
    // It will never move for its entire lifetime
}

// Creating a pinned box
let pinned = Box::pin(async {
    // async work
});
```

**Pin<&mut T>** - Stack pinning with a reference:

```rust
use std::pin::pin;

async fn example() {
    let future = async { 42 };
    let pinned = pin!(future);
    // `pinned` is Pin<&mut impl Future>
    // `future` cannot be accessed directly anymore
}
```

Use `Pin<Box<T>>` when you need ownership or dynamic dispatch. Use `Pin<&mut T>` for stack-local pinning with zero allocation overhead.

## The Unpin Trait

`Unpin` is an auto trait that marks types safe to move even when pinned. Most types in Rust are `Unpin` by default:

```rust
use std::marker::Unpin;

// These are all Unpin
fn example<T: Unpin>() {}

fn works() {
    example::<i32>();
    example::<String>();
    example::<Vec<u8>>();
}
```

Types that are `Unpin` can be freely moved even when wrapped in `Pin`. You can get `&mut T` from `Pin<&mut T>` if `T: Unpin`:

```rust
use std::pin::Pin;

fn can_move<T: Unpin>(mut pinned: Pin<&mut T>) -> &mut T {
    pinned.get_mut() // This works because T: Unpin
}
```

Futures created by async blocks are typically `!Unpin` (not Unpin) because they may be self-referential.

## Using the pin! Macro

The `pin!` macro (stabilized in Rust 1.68) provides ergonomic stack pinning:

```rust
use std::pin::pin;
use std::future::Future;

async fn process<F: Future<Output = i32>>(fut: F) -> i32 {
    let mut pinned = pin!(fut);
    // Use pinned.as_mut() to get Pin<&mut F>
    pinned.as_mut().await
}
```

Before `pin!` was stabilized, the `pin_mut!` macro from the `pin-utils` crate served the same purpose:

```rust
use pin_utils::pin_mut;

async fn old_style<F: Future<Output = i32>>(fut: F) -> i32 {
    pin_mut!(fut);
    fut.await
}
```

## Practical Async Example

Here is a real-world example using `select!` which requires pinned futures:

```rust
use tokio::select;
use std::pin::pin;
use std::time::Duration;

async fn fetch_data() -> String {
    tokio::time::sleep(Duration::from_secs(2)).await;
    String::from("data")
}

async fn with_timeout() -> Option<String> {
    let fetch = pin!(fetch_data());
    let timeout = pin!(tokio::time::sleep(Duration::from_secs(1)));

    select! {
        result = fetch => Some(result),
        _ = timeout => None,
    }
}
```

When implementing custom futures, you must handle Pin correctly:

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct MyFuture {
    // fields
}

impl Future for MyFuture {
    type Output = i32;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        // `self` is pinned, ensuring the future won't move
        // Use `self.get_mut()` only if Self: Unpin
        Poll::Ready(42)
    }
}
```

## Summary

Pin exists to make self-referential types safe in Rust, which is essential for async/await. Remember these key points:

- Use `Box::pin()` for heap-allocated pinned values
- Use the `pin!` macro for stack pinning
- Most types are `Unpin` and can be moved freely
- Async blocks produce `!Unpin` futures
- When implementing `Future`, you receive `Pin<&mut Self>`

Understanding Pin and Unpin unlocks the full power of async Rust and helps you write correct, efficient concurrent code.
