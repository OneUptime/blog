# How to Fix "Value borrowed here after move" Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Ownership, Move Semantics, Errors, Debugging

Description: Learn how to diagnose and fix "value borrowed here after move" errors in Rust. Understand move semantics and discover patterns to work with ownership correctly.

---

The "value borrowed here after move" error occurs when you try to use a value after its ownership has been transferred elsewhere. This guide explains why moves happen and how to fix these errors.

## Understanding Moves

In Rust, assignment and passing values to functions moves ownership by default for non-Copy types:

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;  // s1 is moved to s2

    // println!("{}", s1);  // Error: value borrowed here after move
    println!("{}", s2);  // OK: s2 owns the data
}
```

The error message:

```
error[E0382]: borrow of moved value: `s1`
 --> src/main.rs:5:20
  |
2 |     let s1 = String::from("hello");
  |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
3 |     let s2 = s1;
  |              -- value moved here
4 |
5 |     println!("{}", s1);
  |                    ^^ value borrowed here after move
```

## Types That Move vs Copy

Copy types (integers, floats, bools, chars, tuples of Copy types) are copied, not moved:

```rust
fn main() {
    // Copy types - both variables valid
    let x = 5;
    let y = x;
    println!("x = {}, y = {}", x, y);  // Both work

    // Move types - only new owner valid
    let s1 = String::from("hello");
    let s2 = s1;
    // println!("{}", s1);  // Error
    println!("{}", s2);  // OK

    // Vec moves
    let v1 = vec![1, 2, 3];
    let v2 = v1;
    // println!("{:?}", v1);  // Error
    println!("{:?}", v2);  // OK
}
```

## Fix 1: Clone the Value

Make a copy when you need the original to remain valid:

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();  // Deep copy

    println!("s1 = {}", s1);  // OK: s1 still valid
    println!("s2 = {}", s2);  // OK: s2 is independent copy
}
```

Be aware that clone can be expensive for large data:

```rust
fn main() {
    let large_vec: Vec<i32> = (0..1_000_000).collect();

    // Expensive - copies all 1 million integers
    let copy = large_vec.clone();

    // Prefer borrowing when possible
    process(&large_vec);  // No copy, just reference
}

fn process(data: &[i32]) {
    println!("Processing {} items", data.len());
}
```

## Fix 2: Borrow Instead of Move

Use references to borrow without taking ownership:

```rust
fn main() {
    let s = String::from("hello");

    // Borrow with &
    print_string(&s);  // Pass reference
    println!("s is still valid: {}", s);  // s still usable

    // Multiple borrows are fine
    print_string(&s);
    print_string(&s);
}

fn print_string(s: &String) {
    println!("{}", s);
}

// Even better: accept &str for flexibility
fn print_str(s: &str) {
    println!("{}", s);
}
```

## Fix 3: Return Ownership

Have functions return ownership back:

```rust
fn main() {
    let s = String::from("hello");

    // Move s in, get new ownership back
    let s = append_world(s);
    println!("{}", s);
}

fn append_world(mut s: String) -> String {
    s.push_str(" world");
    s
}
```

Or use mutable references to modify in place:

```rust
fn main() {
    let mut s = String::from("hello");

    // Borrow mutably, no ownership transfer
    append_world(&mut s);
    println!("{}", s);  // s still owned here
}

fn append_world(s: &mut String) {
    s.push_str(" world");
}
```

## Fix 4: Use Option::take

For optional values, use take to get ownership while leaving None:

```rust
fn main() {
    let mut maybe_string: Option<String> = Some(String::from("hello"));

    // Take the value out, leaving None
    if let Some(s) = maybe_string.take() {
        println!("Took: {}", s);
    }

    println!("Now: {:?}", maybe_string);  // None
}
```

## Fix 5: Use std::mem::replace

Replace a value and get the old one:

```rust
use std::mem;

fn main() {
    let mut s = String::from("hello");

    // Replace s with new value, get old value back
    let old = mem::replace(&mut s, String::from("world"));

    println!("Old: {}", old);
    println!("New: {}", s);
}
```

## Moves in Loops

Loop variables are moved each iteration:

```rust
fn main() {
    let strings = vec![
        String::from("a"),
        String::from("b"),
        String::from("c"),
    ];

    // This moves each string out of the vec
    for s in strings {
        println!("{}", s);
    }
    // println!("{:?}", strings);  // Error: strings was moved

    // Fix 1: Iterate over references
    let strings = vec![
        String::from("a"),
        String::from("b"),
        String::from("c"),
    ];

    for s in &strings {
        println!("{}", s);
    }
    println!("{:?}", strings);  // OK: strings still valid

    // Fix 2: Clone the vec
    let strings = vec![
        String::from("a"),
        String::from("b"),
        String::from("c"),
    ];

    for s in strings.clone() {
        println!("{}", s);
    }
    println!("{:?}", strings);  // OK: original intact
}
```

## Moves in Match Expressions

Pattern matching can move values:

```rust
fn main() {
    let opt = Some(String::from("hello"));

    match opt {
        Some(s) => println!("{}", s),  // s is moved out
        None => println!("none"),
    }
    // println!("{:?}", opt);  // Error: opt was moved

    // Fix 1: Match on reference
    let opt = Some(String::from("hello"));

    match &opt {
        Some(s) => println!("{}", s),  // s is &String
        None => println!("none"),
    }
    println!("{:?}", opt);  // OK

    // Fix 2: Use if let with reference
    let opt = Some(String::from("hello"));

    if let Some(ref s) = opt {
        println!("{}", s);
    }
    println!("{:?}", opt);  // OK

    // Fix 3: Use as_ref()
    let opt = Some(String::from("hello"));

    if let Some(s) = opt.as_ref() {
        println!("{}", s);
    }
    println!("{:?}", opt);  // OK
}
```

## Moves in Closures

Closures can capture by move:

```rust
fn main() {
    let s = String::from("hello");

    // Closure captures s by reference by default
    let print = || println!("{}", s);
    print();
    println!("{}", s);  // OK

    // Force move with `move` keyword
    let s = String::from("hello");
    let print = move || println!("{}", s);
    print();
    // println!("{}", s);  // Error: s was moved into closure

    // Fix: clone before moving
    let s = String::from("hello");
    let s_clone = s.clone();
    let print = move || println!("{}", s_clone);
    print();
    println!("{}", s);  // OK: original still valid
}
```

## Struct Field Moves

Moving a field out of a struct requires special handling:

```rust
struct Container {
    data: String,
    count: i32,
}

fn main() {
    let c = Container {
        data: String::from("hello"),
        count: 5,
    };

    // Moving one field makes entire struct unusable
    let data = c.data;  // data moved
    // println!("{}", c.count);  // Error: c partially moved

    // Fix 1: Use references
    let c = Container {
        data: String::from("hello"),
        count: 5,
    };
    let data = &c.data;
    println!("{}, {}", data, c.count);

    // Fix 2: Replace field
    let mut c = Container {
        data: String::from("hello"),
        count: 5,
    };
    let data = std::mem::take(&mut c.data);  // Replaces with default
    println!("{}, {}", data, c.count);  // c still usable
}
```

## Summary

| Solution | When to Use |
|----------|-------------|
| `clone()` | Need independent copy, data not huge |
| `&` / `&mut` | Only need to read/modify, not own |
| Return ownership | Function transforms and returns |
| `Option::take` | Extract from Option |
| `mem::replace` | Swap out values |
| `ref` in patterns | Match without moving |

The borrow checker prevents use-after-move bugs. When you see this error, decide whether you need a copy, a borrow, or to restructure your code to handle ownership differently.
