# How to Fix 'Cannot borrow as mutable' Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Borrow Checker, Mutability, Errors, Debugging

Description: Learn how to diagnose and fix the common 'cannot borrow as mutable' error in Rust. Understand the borrowing rules and discover patterns to work with the borrow checker.

---

The "cannot borrow as mutable" error is one of the most common errors Rust developers encounter. It occurs when you try to mutate something that Rust's borrow checker considers off-limits. This guide explains the causes and solutions.

## Understanding the Error

The error appears in several forms:

```
error[E0596]: cannot borrow `x` as mutable, as it is not declared as mutable
error[E0502]: cannot borrow `x` as mutable because it is also borrowed as immutable
error[E0499]: cannot borrow `x` as mutable more than once at a time
```

Each has different causes and solutions.

## Case 1: Variable Not Declared as Mutable

The simplest case is forgetting `mut`:

```rust
fn main() {
    let x = 5;
    // x += 1;  // Error: cannot borrow as mutable

    // Fix: add mut
    let mut x = 5;
    x += 1;
    println!("x = {}", x);
}
```

For vectors and other collections:

```rust
fn main() {
    let v = vec![1, 2, 3];
    // v.push(4);  // Error

    // Fix: add mut
    let mut v = vec![1, 2, 3];
    v.push(4);
    println!("{:?}", v);
}
```

## Case 2: Mutable Reference to Immutable Variable

You cannot create a mutable reference to an immutable variable:

```rust
fn increment(n: &mut i32) {
    *n += 1;
}

fn main() {
    let x = 5;
    // increment(&mut x);  // Error: cannot borrow as mutable

    // Fix: declare x as mutable
    let mut x = 5;
    increment(&mut x);
    println!("x = {}", x);
}
```

## Case 3: Mutable and Immutable Borrows Overlap

This is the most common case. You cannot have mutable and immutable borrows active simultaneously:

```rust
fn main() {
    let mut v = vec![1, 2, 3];

    let first = &v[0];  // Immutable borrow
    // v.push(4);       // Error: mutable borrow while immutable borrow exists
    println!("First: {}", first);

    // Fix: end immutable borrow before mutable borrow
    // Either use first before mutating:
    let mut v = vec![1, 2, 3];
    let first = &v[0];
    println!("First: {}", first);  // Last use of first
    v.push(4);                     // Now mutation is OK
    println!("{:?}", v);

    // Or restructure the code:
    let mut v = vec![1, 2, 3];
    let first_value = v[0];  // Copy the value instead of borrowing
    v.push(4);
    println!("First was: {}", first_value);
}
```

## Case 4: Multiple Mutable Borrows

You can only have one mutable borrow at a time:

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &mut s;
    // let r2 = &mut s;  // Error: second mutable borrow
    // println!("{}, {}", r1, r2);

    // Fix 1: use the first borrow completely before creating second
    let mut s = String::from("hello");
    let r1 = &mut s;
    r1.push_str(" world");
    // r1 is no longer used, its borrow ends

    let r2 = &mut s;
    r2.push_str("!");
    println!("{}", s);

    // Fix 2: use explicit scopes
    let mut s = String::from("hello");
    {
        let r1 = &mut s;
        r1.push_str(" world");
    }  // r1 goes out of scope

    let r2 = &mut s;
    r2.push_str("!");
    println!("{}", s);
}
```

## Case 5: Borrowing in Loops

Loops create tricky borrow situations:

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];

    // Error: borrowing v in loop while also trying to mutate
    // for item in &v {
    //     if *item > 3 {
    //         v.push(*item * 2);  // Cannot mutate while iterating
    //     }
    // }

    // Fix 1: collect indices first, then mutate
    let indices: Vec<usize> = v.iter()
        .enumerate()
        .filter(|(_, &x)| x > 3)
        .map(|(i, _)| i)
        .collect();

    for &i in &indices {
        let value = v[i] * 2;
        v.push(value);
    }
    println!("{:?}", v);

    // Fix 2: use index-based loop
    let mut v = vec![1, 2, 3, 4, 5];
    let len = v.len();
    for i in 0..len {
        if v[i] > 3 {
            let new_val = v[i] * 2;
            v.push(new_val);
        }
    }
    println!("{:?}", v);
}
```

## Case 6: Struct Field Borrows

Borrowing different fields of a struct is allowed, but the compiler needs help:

```rust
struct Data {
    numbers: Vec<i32>,
    name: String,
}

impl Data {
    fn process(&mut self) {
        // This works - different fields
        self.numbers.push(1);
        self.name.push_str("!");
    }

    // This might not work through methods
    fn get_numbers(&self) -> &Vec<i32> {
        &self.numbers
    }

    fn add_number(&mut self, n: i32) {
        self.numbers.push(n);
    }

    fn combined(&mut self) {
        // Error: get_numbers borrows self, add_number needs &mut self
        // let nums = self.get_numbers();
        // self.add_number(nums[0]);

        // Fix: copy the value
        let first = self.numbers[0];  // Direct field access
        self.numbers.push(first);
    }
}
```

## Case 7: Closures Capturing Mutably

Closures that capture mutable references have restrictions:

```rust
fn main() {
    let mut counter = 0;

    // This closure captures counter mutably
    let mut increment = || {
        counter += 1;
    };

    increment();
    increment();
    // Cannot use counter here while closure exists
    // println!("{}", counter);  // Error if increment still in scope

    // Fix: let closure go out of scope
    {
        let mut increment = || {
            counter += 1;
        };
        increment();
        increment();
    }
    println!("Counter: {}", counter);

    // Or use the closure completely
    let mut counter = 0;
    let mut increment = || {
        counter += 1;
    };
    increment();
    increment();
    drop(increment);  // Explicit drop
    println!("Counter: {}", counter);
}
```

## Case 8: HashMap Entry Pattern

The entry API solves borrow issues with HashMaps:

```rust
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("key", 1);

    // Error pattern:
    // if !map.contains_key("key") {
    //     map.insert("key", 0);  // Borrow conflict
    // }
    // *map.get_mut("key").unwrap() += 1;

    // Fix: use entry API
    *map.entry("key").or_insert(0) += 1;
    println!("{:?}", map);
}
```

## Common Patterns for Fixing

### Pattern 1: Clone to Break Borrow

```rust
fn main() {
    let mut v = vec!["a".to_string(), "b".to_string()];

    // Clone to avoid borrow
    let first = v[0].clone();
    v.push(first);
    println!("{:?}", v);
}
```

### Pattern 2: Split Borrows

```rust
fn main() {
    let mut data = vec![1, 2, 3, 4, 5];

    // Split mutable borrow
    let (left, right) = data.split_at_mut(2);
    left[0] = 10;
    right[0] = 30;
    println!("{:?}", data);
}
```

### Pattern 3: RefCell for Runtime Borrow Checking

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(vec![1, 2, 3]);

    // Multiple runtime borrows possible
    {
        let r1 = data.borrow();
        let r2 = data.borrow();  // Multiple immutable OK
        println!("{:?} {:?}", r1, r2);
    }

    // Mutable borrow
    data.borrow_mut().push(4);
    println!("{:?}", data.borrow());
}
```

## Summary

| Error | Cause | Fix |
|-------|-------|-----|
| Not declared as mutable | Missing `mut` | Add `mut` to declaration |
| Mutable reference to immutable | Variable not `mut` | Declare variable as `mut` |
| Mutable + immutable overlap | Conflicting borrows | End immutable borrow first |
| Multiple mutable borrows | Two `&mut` at once | Sequential borrows or scopes |
| Loop mutation | Iterating while mutating | Index loop or collect first |

The borrow checker prevents data races and use-after-free bugs. When you encounter these errors, think about when borrows start and end, and restructure code to ensure mutable access is exclusive.
