# How to Build a Lock-Free Data Structure in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Concurrency, Lock-Free, Performance

Description: Learn how to build lock-free data structures in Rust using atomics and compare-and-swap operations for high-performance concurrency.

---

Lock-free data structures are essential for building high-performance concurrent systems. Unlike traditional mutex-based approaches, lock-free algorithms allow multiple threads to make progress without blocking each other. Rust's ownership model and strong type system make it an excellent language for implementing these complex data structures safely.

## Understanding Atomic Types in Rust

Rust provides atomic types in the `std::sync::atomic` module. These types support operations that complete in a single, indivisible step, making them the foundation of lock-free programming.

```rust
use std::sync::atomic::{AtomicPtr, AtomicUsize, Ordering};

// Common atomic types
let counter: AtomicUsize = AtomicUsize::new(0);
let ptr: AtomicPtr<Node> = AtomicPtr::new(std::ptr::null_mut());
```

## Memory Ordering Semantics

Memory ordering determines how atomic operations synchronize memory across threads. Rust provides several ordering options:

- **Relaxed**: No synchronization guarantees, only atomicity
- **Acquire**: Prevents reordering of subsequent reads/writes before this load
- **Release**: Prevents reordering of previous reads/writes after this store
- **AcqRel**: Combines Acquire and Release semantics
- **SeqCst**: Strongest ordering with a total global order

```rust
// Reading with Acquire ensures we see all writes before the Release store
let value = atomic_var.load(Ordering::Acquire);

// Writing with Release ensures all previous writes are visible
atomic_var.store(new_value, Ordering::Release);
```

## The Compare-and-Swap Operation

The `compare_exchange` operation is the cornerstone of lock-free programming. It atomically compares the current value with an expected value and, if they match, replaces it with a new value.

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

let counter = AtomicUsize::new(5);

// Try to change 5 to 10
match counter.compare_exchange(5, 10, Ordering::SeqCst, Ordering::SeqCst) {
    Ok(old) => println!("Changed from {} to 10", old),
    Err(current) => println!("Failed, current value is {}", current),
}
```

## The ABA Problem

A critical challenge in lock-free programming is the ABA problem. This occurs when a value changes from A to B and back to A between a thread's read and its compare-and-swap attempt. The CAS succeeds even though the data structure may have changed significantly.

Solutions include:
- **Tagged pointers**: Attach a version counter to pointers
- **Hazard pointers**: Track which nodes are being accessed
- **Epoch-based reclamation**: Use the `crossbeam-epoch` crate

## Memory Reclamation with crossbeam-epoch

The `crossbeam-epoch` crate provides safe memory reclamation for lock-free data structures. It uses epoch-based garbage collection to determine when memory can be safely freed.

```rust
use crossbeam_epoch::{self as epoch, Atomic, Owned, Shared};
use std::sync::atomic::Ordering;

struct Node<T> {
    data: T,
    next: Atomic<Node<T>>,
}

impl<T> Node<T> {
    fn new(data: T) -> Self {
        Node {
            data,
            next: Atomic::null(),
        }
    }
}
```

## Building a Lock-Free Stack

Let's implement a complete lock-free stack using Treiber's algorithm with crossbeam-epoch for safe memory management:

```rust
use crossbeam_epoch::{self as epoch, Atomic, Owned, Shared};
use std::sync::atomic::Ordering;

pub struct LockFreeStack<T> {
    head: Atomic<Node<T>>,
}

struct Node<T> {
    data: T,
    next: Atomic<Node<T>>,
}

impl<T> LockFreeStack<T> {
    pub fn new() -> Self {
        LockFreeStack {
            head: Atomic::null(),
        }
    }

    pub fn push(&self, data: T) {
        let mut node = Owned::new(Node {
            data,
            next: Atomic::null(),
        });

        let guard = epoch::pin();

        loop {
            let head = self.head.load(Ordering::Relaxed, &guard);
            node.next.store(head, Ordering::Relaxed);

            match self.head.compare_exchange(
                head,
                node,
                Ordering::Release,
                Ordering::Relaxed,
                &guard,
            ) {
                Ok(_) => break,
                Err(e) => node = e.new,
            }
        }
    }

    pub fn pop(&self) -> Option<T> {
        let guard = epoch::pin();

        loop {
            let head = self.head.load(Ordering::Acquire, &guard);

            match unsafe { head.as_ref() } {
                None => return None,
                Some(h) => {
                    let next = h.next.load(Ordering::Relaxed, &guard);

                    if self.head
                        .compare_exchange(
                            head,
                            next,
                            Ordering::Release,
                            Ordering::Relaxed,
                            &guard,
                        )
                        .is_ok()
                    {
                        unsafe {
                            guard.defer_destroy(head);
                            return Some(std::ptr::read(&h.data));
                        }
                    }
                }
            }
        }
    }
}

unsafe impl<T: Send> Send for LockFreeStack<T> {}
unsafe impl<T: Send> Sync for LockFreeStack<T> {}
```

## Using the Lock-Free Stack

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let stack = Arc::new(LockFreeStack::new());
    let mut handles = vec![];

    // Spawn producer threads
    for i in 0..4 {
        let stack = Arc::clone(&stack);
        handles.push(thread::spawn(move || {
            for j in 0..1000 {
                stack.push(i * 1000 + j);
            }
        }));
    }

    // Wait for all threads
    for handle in handles {
        handle.join().unwrap();
    }

    // Pop all elements
    let mut count = 0;
    while stack.pop().is_some() {
        count += 1;
    }
    println!("Popped {} elements", count);
}
```

## Performance Considerations

Lock-free data structures excel under high contention where traditional locks would cause significant blocking. However, they come with trade-offs:

1. **Complexity**: Lock-free algorithms are harder to implement correctly
2. **Memory overhead**: Epoch-based reclamation may delay memory freeing
3. **Fairness**: No guarantee of bounded waiting times

For most applications, consider using the battle-tested implementations in the `crossbeam` crate family, which provides lock-free queues, deques, and channels optimized for real-world use.

## Conclusion

Building lock-free data structures in Rust requires understanding atomic operations, memory ordering, and safe memory reclamation. The combination of Rust's type system and crates like `crossbeam-epoch` makes it possible to implement these advanced concurrent data structures with confidence. Start with the provided stack implementation, experiment with different orderings, and gradually build your understanding of this powerful concurrency paradigm.
