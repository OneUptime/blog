# How to Use Smart Pointers in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Smart Pointers, Memory Management, Box, Rc, RefCell

Description: A comprehensive guide to smart pointers in Rust. Learn when and how to use Box, Rc, Arc, RefCell, and Mutex for flexible memory management and shared ownership.

---

Smart pointers are data structures that act like pointers but also have additional metadata and capabilities. Rust's standard library provides several smart pointers that enable patterns beyond what regular references allow. This guide covers the most common smart pointers and when to use each.

## Box: Heap Allocation

Box puts data on the heap instead of the stack. Use it for recursive types, large data, or when you need a fixed-size type.

```rust
// Recursive type requires Box
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    // Create a linked list: 1 -> 2 -> 3 -> Nil
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));

    // Simple heap allocation
    let boxed = Box::new(5);
    println!("Boxed value: {}", boxed);

    // Box for large data
    let large_array: Box<[i32; 10000]> = Box::new([0; 10000]);
    println!("Array length: {}", large_array.len());

    // Box for trait objects
    let printable: Box<dyn std::fmt::Display> = Box::new("hello");
    println!("{}", printable);
}
```

## Rc: Reference Counting

Rc enables multiple ownership of the same data. The data is dropped when the last Rc is dropped.

```rust
use std::rc::Rc;

// Multiple owners of a tree node
struct Node {
    value: i32,
    children: Vec<Rc<Node>>,
}

fn main() {
    // Basic Rc usage
    let data = Rc::new(String::from("hello"));
    let clone1 = Rc::clone(&data);  // Increment count
    let clone2 = Rc::clone(&data);

    println!("Reference count: {}", Rc::strong_count(&data));

    drop(clone1);
    println!("After drop: {}", Rc::strong_count(&data));

    // Shared ownership in graph structures
    let leaf = Rc::new(Node {
        value: 3,
        children: vec![],
    });

    // Both nodes share ownership of leaf
    let branch1 = Rc::new(Node {
        value: 1,
        children: vec![Rc::clone(&leaf)],
    });

    let branch2 = Rc::new(Node {
        value: 2,
        children: vec![Rc::clone(&leaf)],
    });

    println!("Leaf ref count: {}", Rc::strong_count(&leaf));
}
```

## Arc: Thread-Safe Reference Counting

Arc is like Rc but safe to share across threads.

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3, 4, 5]);

    let mut handles = vec![];

    for i in 0..3 {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            println!("Thread {}: {:?}", i, data);
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final ref count: {}", Arc::strong_count(&data));
}
```

## RefCell: Interior Mutability

RefCell allows mutation through shared references, with runtime borrow checking.

```rust
use std::cell::RefCell;

struct Counter {
    value: RefCell<i32>,
}

impl Counter {
    fn new() -> Self {
        Counter {
            value: RefCell::new(0),
        }
    }

    // Mutate through shared reference
    fn increment(&self) {
        *self.value.borrow_mut() += 1;
    }

    fn get(&self) -> i32 {
        *self.value.borrow()
    }
}

fn main() {
    let counter = Counter::new();

    counter.increment();
    counter.increment();
    counter.increment();

    println!("Count: {}", counter.get());

    // Multiple immutable borrows OK
    let borrow1 = counter.value.borrow();
    let borrow2 = counter.value.borrow();
    println!("{} {}", *borrow1, *borrow2);
    // Borrows dropped here

    // Can now mutably borrow
    *counter.value.borrow_mut() = 100;
}
```

## Combining Rc and RefCell

Rc<RefCell<T>> enables multiple owners with interior mutability.

```rust
use std::cell::RefCell;
use std::rc::Rc;

#[derive(Debug)]
struct Node {
    value: i32,
    parent: RefCell<Option<Rc<Node>>>,
    children: RefCell<Vec<Rc<Node>>>,
}

impl Node {
    fn new(value: i32) -> Rc<Self> {
        Rc::new(Node {
            value,
            parent: RefCell::new(None),
            children: RefCell::new(vec![]),
        })
    }

    fn add_child(parent: &Rc<Self>, child: &Rc<Self>) {
        // Add child to parent
        parent.children.borrow_mut().push(Rc::clone(child));

        // Set parent reference (creates cycle - be careful!)
        *child.parent.borrow_mut() = Some(Rc::clone(parent));
    }
}

fn main() {
    let root = Node::new(1);
    let child1 = Node::new(2);
    let child2 = Node::new(3);

    Node::add_child(&root, &child1);
    Node::add_child(&root, &child2);

    println!("Root children: {}", root.children.borrow().len());
    println!("Child1 has parent: {}", child1.parent.borrow().is_some());
}
```

## Weak References

Use Weak to break reference cycles and prevent memory leaks.

```rust
use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,  // Weak to prevent cycle
    children: RefCell<Vec<Rc<Node>>>,
}

impl Node {
    fn new(value: i32) -> Rc<Self> {
        Rc::new(Node {
            value,
            parent: RefCell::new(Weak::new()),
            children: RefCell::new(vec![]),
        })
    }

    fn add_child(parent: &Rc<Self>, child: &Rc<Self>) {
        parent.children.borrow_mut().push(Rc::clone(child));
        *child.parent.borrow_mut() = Rc::downgrade(parent);
    }

    fn parent_value(&self) -> Option<i32> {
        // upgrade() returns Some(Rc) if the parent still exists
        self.parent.borrow().upgrade().map(|p| p.value)
    }
}

fn main() {
    let parent = Node::new(1);
    let child = Node::new(2);

    println!("Strong count before: {}", Rc::strong_count(&parent));

    Node::add_child(&parent, &child);

    println!("Strong count after: {}", Rc::strong_count(&parent));
    println!("Child's parent value: {:?}", child.parent_value());

    drop(parent);

    // Parent is gone, Weak reference returns None
    println!("After parent drop: {:?}", child.parent_value());
}
```

## Mutex: Thread-Safe Interior Mutability

Mutex provides interior mutability across threads.

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                let mut num = counter.lock().unwrap();
                *num += 1;
                // Lock automatically released when num goes out of scope
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

## RwLock: Multiple Readers or Single Writer

RwLock allows multiple readers or a single writer.

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));
    let mut handles = vec![];

    // Multiple readers
    for i in 0..3 {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            let read = data.read().unwrap();
            println!("Reader {}: {:?}", i, *read);
        });
        handles.push(handle);
    }

    // Single writer
    {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            let mut write = data.write().unwrap();
            write.push(4);
            println!("Writer added element");
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final: {:?}", *data.read().unwrap());
}
```

## Cell: Copy Types Only

Cell provides interior mutability for Copy types without borrowing.

```rust
use std::cell::Cell;

struct Stats {
    calls: Cell<u32>,
    value: i32,
}

impl Stats {
    fn new(value: i32) -> Self {
        Stats {
            calls: Cell::new(0),
            value,
        }
    }

    fn get(&self) -> i32 {
        self.calls.set(self.calls.get() + 1);
        self.value
    }

    fn call_count(&self) -> u32 {
        self.calls.get()
    }
}

fn main() {
    let stats = Stats::new(42);

    println!("Value: {}", stats.get());
    println!("Value: {}", stats.get());
    println!("Value: {}", stats.get());

    println!("Total calls: {}", stats.call_count());
}
```

## Choosing the Right Smart Pointer

```
Do you need heap allocation?
├── Yes → Box<T>
└── No → Use regular value

Do you need multiple owners?
├── No → Box<T> or regular value
└── Yes → Is it single-threaded?
    ├── Yes → Rc<T>
    └── No → Arc<T>

Do you need interior mutability?
├── No → Use &mut or ownership
└── Yes → Is it single-threaded?
    ├── Yes → Is T: Copy?
    │   ├── Yes → Cell<T>
    │   └── No → RefCell<T>
    └── No → Need multiple readers?
        ├── Yes → RwLock<T>
        └── No → Mutex<T>
```

## Summary

| Smart Pointer | Use Case | Thread Safe |
|---------------|----------|-------------|
| `Box<T>` | Heap allocation, recursive types | N/A |
| `Rc<T>` | Multiple ownership, single thread | No |
| `Arc<T>` | Multiple ownership, multi thread | Yes |
| `RefCell<T>` | Interior mutability, single thread | No |
| `Cell<T>` | Interior mutability for Copy types | No |
| `Mutex<T>` | Interior mutability, multi thread | Yes |
| `RwLock<T>` | Multiple readers OR single writer | Yes |
| `Weak<T>` | Non-owning reference | Matches Rc/Arc |

Key patterns:

- `Rc<RefCell<T>>` for shared mutable data in single thread
- `Arc<Mutex<T>>` for shared mutable data across threads
- Use `Weak` to prevent reference cycles
- Prefer `Cell` over `RefCell` for Copy types

Smart pointers extend Rust's ownership system to handle complex scenarios while maintaining memory safety.
