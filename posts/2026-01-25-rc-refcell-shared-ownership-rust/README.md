# How to Use Rc and RefCell for Shared Ownership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Rc, RefCell, Smart Pointers, Shared Ownership

Description: Learn how to use Rc for reference-counted shared ownership and RefCell for interior mutability in Rust. Build data structures with multiple owners and runtime borrow checking.

---

Rust's ownership rules normally require single ownership. When you need multiple owners of the same data in single-threaded contexts, use `Rc` (Reference Counted). When you also need to mutate shared data, combine it with `RefCell` for interior mutability.

## Understanding Rc

`Rc<T>` provides shared ownership through reference counting:

```rust
use std::rc::Rc;

fn main() {
    // Create reference-counted string
    let a = Rc::new(String::from("hello"));
    println!("Count after a: {}", Rc::strong_count(&a));  // 1

    // Clone creates another owner, increments count
    let b = Rc::clone(&a);
    println!("Count after b: {}", Rc::strong_count(&a));  // 2

    let c = Rc::clone(&a);
    println!("Count after c: {}", Rc::strong_count(&a));  // 3

    // All point to same data
    println!("a: {}, b: {}, c: {}", a, b, c);

    // When c goes out of scope, count decreases
    drop(c);
    println!("Count after dropping c: {}", Rc::strong_count(&a));  // 2
}
```

## When to Use Rc

Use Rc when multiple parts of your program need to read the same data:

```rust
use std::rc::Rc;

#[derive(Debug)]
struct Node {
    value: i32,
    children: Vec<Rc<Node>>,
}

fn main() {
    // Shared node referenced by multiple parents
    let shared_child = Rc::new(Node {
        value: 1,
        children: vec![],
    });

    let parent1 = Node {
        value: 10,
        children: vec![Rc::clone(&shared_child)],
    };

    let parent2 = Node {
        value: 20,
        children: vec![Rc::clone(&shared_child)],
    };

    println!("Parent1: {:?}", parent1);
    println!("Parent2: {:?}", parent2);
    println!("Shared child references: {}", Rc::strong_count(&shared_child));
}
```

## Understanding RefCell

`RefCell<T>` enables interior mutability with runtime borrow checking:

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(5);

    // Borrow immutably
    {
        let borrowed = data.borrow();
        println!("Borrowed: {}", borrowed);
        // Multiple immutable borrows OK
        let borrowed2 = data.borrow();
        println!("Borrowed2: {}", borrowed2);
    }  // Borrows end

    // Borrow mutably
    {
        let mut borrowed_mut = data.borrow_mut();
        *borrowed_mut += 1;
        println!("After mutation: {}", borrowed_mut);
    }

    println!("Final: {}", data.borrow());
}
```

### Runtime Borrow Checking

RefCell panics if you violate borrow rules at runtime:

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(5);

    let borrow1 = data.borrow();

    // This will panic! Cannot borrow mutably while immutably borrowed
    // let borrow_mut = data.borrow_mut();

    // Use try_borrow_mut for non-panicking version
    match data.try_borrow_mut() {
        Ok(mut val) => *val += 1,
        Err(_) => println!("Cannot borrow mutably right now"),
    }

    drop(borrow1);  // Release immutable borrow

    // Now mutable borrow works
    *data.borrow_mut() += 1;
    println!("Final: {}", data.borrow());
}
```

## Combining Rc and RefCell

The combination `Rc<RefCell<T>>` gives you multiple owners with interior mutability:

```rust
use std::rc::Rc;
use std::cell::RefCell;

fn main() {
    // Shared mutable data
    let shared_data = Rc::new(RefCell::new(vec![1, 2, 3]));

    // Multiple owners
    let owner1 = Rc::clone(&shared_data);
    let owner2 = Rc::clone(&shared_data);

    // Any owner can mutate
    owner1.borrow_mut().push(4);
    owner2.borrow_mut().push(5);

    // All owners see the changes
    println!("Data: {:?}", shared_data.borrow());
    println!("Via owner1: {:?}", owner1.borrow());
    println!("Via owner2: {:?}", owner2.borrow());
}
```

## Practical Example: Observer Pattern

```rust
use std::rc::Rc;
use std::cell::RefCell;

trait Observer {
    fn notify(&self, value: i32);
}

struct Subject {
    observers: Vec<Rc<dyn Observer>>,
    value: i32,
}

impl Subject {
    fn new() -> Self {
        Subject {
            observers: Vec::new(),
            value: 0,
        }
    }

    fn add_observer(&mut self, observer: Rc<dyn Observer>) {
        self.observers.push(observer);
    }

    fn set_value(&mut self, value: i32) {
        self.value = value;
        self.notify_observers();
    }

    fn notify_observers(&self) {
        for observer in &self.observers {
            observer.notify(self.value);
        }
    }
}

struct Logger {
    name: String,
    log: RefCell<Vec<i32>>,  // Interior mutability for logging
}

impl Logger {
    fn new(name: &str) -> Self {
        Logger {
            name: name.to_string(),
            log: RefCell::new(Vec::new()),
        }
    }

    fn get_log(&self) -> Vec<i32> {
        self.log.borrow().clone()
    }
}

impl Observer for Logger {
    fn notify(&self, value: i32) {
        println!("{} received: {}", self.name, value);
        self.log.borrow_mut().push(value);  // Mutate through &self
    }
}

fn main() {
    let logger1 = Rc::new(Logger::new("Logger1"));
    let logger2 = Rc::new(Logger::new("Logger2"));

    let mut subject = Subject::new();
    subject.add_observer(logger1.clone());
    subject.add_observer(logger2.clone());

    subject.set_value(10);
    subject.set_value(20);
    subject.set_value(30);

    println!("Logger1 history: {:?}", logger1.get_log());
    println!("Logger2 history: {:?}", logger2.get_log());
}
```

## Graph with Cycles

Handle cyclic references with `Weak`:

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

#[derive(Debug)]
struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,      // Weak reference to parent
    children: RefCell<Vec<Rc<Node>>>, // Strong references to children
}

impl Node {
    fn new(value: i32) -> Rc<Self> {
        Rc::new(Node {
            value,
            parent: RefCell::new(Weak::new()),
            children: RefCell::new(Vec::new()),
        })
    }

    fn add_child(parent: &Rc<Node>, child: &Rc<Node>) {
        // Set child's parent
        *child.parent.borrow_mut() = Rc::downgrade(parent);
        // Add child to parent's children
        parent.children.borrow_mut().push(Rc::clone(child));
    }
}

fn main() {
    let root = Node::new(1);
    let child1 = Node::new(2);
    let child2 = Node::new(3);

    Node::add_child(&root, &child1);
    Node::add_child(&root, &child2);

    // Child can access parent through upgrade
    if let Some(parent) = child1.parent.borrow().upgrade() {
        println!("Child1's parent value: {}", parent.value);
    }

    println!("Root children count: {}", root.children.borrow().len());
    println!("Root strong count: {}", Rc::strong_count(&root));
    println!("Root weak count: {}", Rc::weak_count(&root));
}
```

## RefCell vs Mutex

| Feature | RefCell | Mutex |
|---------|---------|-------|
| Thread-safe | No | Yes |
| Borrow checking | Runtime | Runtime |
| Performance | Faster | Slower |
| Deadlock | Panics | Can deadlock |

```rust
use std::cell::RefCell;
// For multi-threaded code, use Arc<Mutex<T>> instead

fn single_threaded() {
    let data = RefCell::new(vec![1, 2, 3]);

    // Fast, single-threaded only
    data.borrow_mut().push(4);
}

// For multi-threaded code
use std::sync::{Arc, Mutex};

fn multi_threaded() {
    let data = Arc::new(Mutex::new(vec![1, 2, 3]));

    let data_clone = Arc::clone(&data);
    std::thread::spawn(move || {
        data_clone.lock().unwrap().push(4);
    });
}
```

## Common Patterns

### Shared Configuration

```rust
use std::rc::Rc;
use std::cell::RefCell;

struct Config {
    debug: bool,
    max_retries: u32,
}

struct Service {
    config: Rc<RefCell<Config>>,
}

impl Service {
    fn new(config: Rc<RefCell<Config>>) -> Self {
        Service { config }
    }

    fn run(&self) {
        let cfg = self.config.borrow();
        if cfg.debug {
            println!("Debug mode, max retries: {}", cfg.max_retries);
        }
    }
}

fn main() {
    let config = Rc::new(RefCell::new(Config {
        debug: true,
        max_retries: 3,
    }));

    let service1 = Service::new(Rc::clone(&config));
    let service2 = Service::new(Rc::clone(&config));

    service1.run();
    service2.run();

    // Update config - all services see change
    config.borrow_mut().max_retries = 5;

    service1.run();
}
```

## Summary

| Type | Purpose | Thread Safe |
|------|---------|-------------|
| `Rc<T>` | Multiple owners, immutable | No |
| `RefCell<T>` | Interior mutability | No |
| `Rc<RefCell<T>>` | Multiple owners, mutable | No |
| `Weak<T>` | Break reference cycles | No |
| `Arc<Mutex<T>>` | Multi-threaded equivalent | Yes |

Use `Rc<RefCell<T>>` when you need multiple owners that can all mutate the shared data in single-threaded code. Be careful about runtime panics from borrow rule violations and use `Weak` to prevent reference cycles.
