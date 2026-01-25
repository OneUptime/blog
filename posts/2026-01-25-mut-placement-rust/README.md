# How to Understand mut Placement in Rust References

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Mutability, References, Ownership, Syntax

Description: Learn the difference between &mut T and let mut in Rust. Understand where mut goes in variable declarations, references, and patterns for correct mutability control.

---

The placement of `mut` in Rust determines what can be mutated. Getting this right is essential for correct Rust code. This guide clarifies the different positions where `mut` appears and what each one means.

## Two Kinds of Mutability

Rust has two distinct concepts:

1. **Binding mutability**: Can you reassign the variable?
2. **Reference mutability**: Can you mutate through the reference?

```rust
fn main() {
    // Immutable binding to immutable reference
    let x = &5;
    // x = &6;       // Error: cannot reassign
    // *x = 6;       // Error: cannot mutate through &

    // Mutable binding to immutable reference
    let mut x = &5;
    x = &6;          // OK: can reassign binding
    // *x = 6;       // Error: still cannot mutate through &

    // Immutable binding to mutable reference
    let mut value = 5;
    let x = &mut value;
    *x = 6;          // OK: can mutate through &mut
    // x = &mut other; // Error: cannot reassign binding

    // Mutable binding to mutable reference
    let mut value1 = 5;
    let mut value2 = 10;
    let mut x = &mut value1;
    *x = 6;          // OK: can mutate through &mut
    x = &mut value2; // OK: can reassign binding
    *x = 11;

    println!("value1: {}, value2: {}", value1, value2);
}
```

## The Four Combinations

| Declaration | Reassign Binding | Mutate Data |
|------------|------------------|-------------|
| `let x = &T` | No | No |
| `let mut x = &T` | Yes | No |
| `let x = &mut T` | No | Yes |
| `let mut x = &mut T` | Yes | Yes |

```rust
fn main() {
    let a = 1;
    let b = 2;
    let mut c = 3;
    let mut d = 4;

    // Case 1: let x = &T
    let r1 = &a;
    println!("r1: {}", r1);
    // r1 = &b;  // Error: cannot reassign
    // *r1 = 5;  // Error: cannot mutate

    // Case 2: let mut x = &T
    let mut r2 = &a;
    println!("r2: {}", r2);
    r2 = &b;  // OK: reassign to different reference
    println!("r2 now: {}", r2);
    // *r2 = 5;  // Error: cannot mutate through &T

    // Case 3: let x = &mut T
    let r3 = &mut c;
    *r3 = 30;  // OK: mutate through &mut
    println!("c: {}", c);
    // r3 = &mut d;  // Error: cannot reassign binding

    // Case 4: let mut x = &mut T
    let mut r4 = &mut c;
    *r4 = 300;  // OK: mutate through &mut
    r4 = &mut d;  // OK: reassign binding
    *r4 = 400;
    println!("c: {}, d: {}", c, d);
}
```

## In Function Parameters

Function parameters follow the same rules:

```rust
// Immutable reference - can only read
fn read_only(value: &i32) {
    println!("Value: {}", value);
    // *value = 10;  // Error
}

// Mutable reference - can modify
fn modify(value: &mut i32) {
    *value += 1;
}

// Owned value - can reassign locally with mut
fn take_ownership(mut value: i32) {
    value += 1;  // This is a local copy
    println!("Modified locally: {}", value);
}

// Mutable reference that can be reassigned locally
fn complex(mut value: &mut i32) {
    *value += 1;
    // value = &mut other;  // Could reassign if we had another
}

fn main() {
    let x = 5;
    read_only(&x);

    let mut y = 10;
    modify(&mut y);
    println!("y after modify: {}", y);

    let z = 15;
    take_ownership(z);
    println!("z unchanged: {}", z);
}
```

## In Patterns

The `mut` keyword in patterns makes the bound variable mutable:

```rust
fn main() {
    let pair = (1, 2);

    // Destructure with mutable bindings
    let (mut x, y) = pair;
    x += 10;
    println!("x: {}, y: {}", x, y);

    // In match expressions
    let value = Some(5);
    match value {
        Some(mut n) => {
            n += 1;  // Can modify the copy
            println!("Modified: {}", n);
        }
        None => {}
    }

    // In if-let
    if let Some(mut n) = value {
        n *= 2;
        println!("Doubled: {}", n);
    }

    // With references in patterns
    let mut data = vec![1, 2, 3];
    if let Some(first) = data.first_mut() {
        *first = 100;  // first is &mut i32
    }
    println!("data: {:?}", data);
}
```

## Reference to Mutable vs Mutable Reference

These are different types:

```rust
fn main() {
    let mut x = 5;

    // &mut i32: reference that allows mutation
    let r: &mut i32 = &mut x;
    *r = 10;

    // &i32: reference that does not allow mutation
    // Even if the original is mut, the reference is not
    let r2: &i32 = &x;
    println!("r2: {}", r2);
    // *r2 = 15;  // Error

    // The mut on x allows us to take &mut references
    // But &x is always immutable through that reference
}
```

## Mutable References in Structs

```rust
struct Container {
    value: i32,
}

impl Container {
    // &self - immutable access
    fn get(&self) -> i32 {
        self.value
    }

    // &mut self - mutable access
    fn set(&mut self, value: i32) {
        self.value = value;
    }

    // self - takes ownership
    fn consume(self) -> i32 {
        self.value
    }

    // mut self - owned but locally mutable
    fn modify_and_return(mut self) -> Self {
        self.value *= 2;
        self
    }
}

fn main() {
    let c1 = Container { value: 5 };
    println!("c1: {}", c1.get());

    let mut c2 = Container { value: 10 };
    c2.set(20);
    println!("c2: {}", c2.get());

    let c3 = Container { value: 15 };
    let c3 = c3.modify_and_return();
    println!("c3: {}", c3.get());
}
```

## Common Mistakes

### Mistake 1: Forgetting mut on the Variable

```rust
fn main() {
    let x = 5;
    // let r = &mut x;  // Error: cannot borrow as mutable

    let mut x = 5;  // Need mut here
    let r = &mut x;  // Now this works
    *r = 10;
}
```

### Mistake 2: Trying to Mutate Through &T

```rust
fn increment(n: &i32) {
    // *n += 1;  // Error: cannot mutate through &i32
}

fn increment_correct(n: &mut i32) {
    *n += 1;  // OK with &mut i32
}
```

### Mistake 3: Reassigning Without Binding mut

```rust
fn main() {
    let r = &5;
    // r = &6;  // Error: cannot reassign

    let mut r = &5;  // Add mut to binding
    r = &6;  // Now works
}
```

## Interior Mutability Pattern

When you need mutation through shared references, use interior mutability:

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    // RefCell allows mutation through shared reference
    let data = RefCell::new(5);

    // Multiple shared references
    let r1 = &data;
    let r2 = &data;

    // But can still mutate
    *r1.borrow_mut() += 1;
    *r2.borrow_mut() += 1;

    println!("data: {}", data.borrow());

    // Rc<RefCell<T>> for shared ownership with mutation
    let shared = Rc::new(RefCell::new(vec![1, 2, 3]));
    let clone = Rc::clone(&shared);

    shared.borrow_mut().push(4);
    clone.borrow_mut().push(5);

    println!("shared: {:?}", shared.borrow());
}
```

## Summary

| Syntax | Meaning |
|--------|---------|
| `let x = value` | Immutable binding |
| `let mut x = value` | Mutable binding (can reassign) |
| `&T` | Immutable reference (cannot mutate through it) |
| `&mut T` | Mutable reference (can mutate through it) |
| `let x = &mut T` | Immutable binding to mutable reference |
| `let mut x = &mut T` | Mutable binding to mutable reference |
| `fn f(&self)` | Method takes immutable reference to self |
| `fn f(&mut self)` | Method takes mutable reference to self |

Understanding where `mut` goes and what it controls is fundamental to Rust. The binding mutability (`let mut`) and reference mutability (`&mut`) are independent concepts that combine in different ways. Master these distinctions to write correct Rust code.
