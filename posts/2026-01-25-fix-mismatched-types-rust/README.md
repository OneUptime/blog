# How to Fix "Mismatched types" Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Type System, Errors, Debugging, Type Conversion

Description: Learn how to diagnose and fix "mismatched types" errors in Rust. Understand type conversion, coercion, and common type system pitfalls.

---

The "mismatched types" error is one of the most frequent errors in Rust. It occurs when the compiler expects one type but finds another. This guide covers common causes and their solutions.

## Understanding the Error

```
error[E0308]: mismatched types
 --> src/main.rs:3:20
  |
3 |     let x: i32 = "hello";
  |            ---   ^^^^^^^ expected `i32`, found `&str`
  |            |
  |            expected due to this
```

The error shows what type was expected and what was found.

## Common Causes and Fixes

### Cause 1: Wrong Literal Type

```rust
fn main() {
    // Error: expected i32, found f64
    // let x: i32 = 3.14;

    // Fix 1: use correct type
    let x: f64 = 3.14;

    // Fix 2: convert (with possible loss)
    let x: i32 = 3.14 as i32;  // Truncates to 3

    // Fix 3: use integer literal
    let x: i32 = 3;

    // Suffix literals to specify type
    let a = 42i32;
    let b = 3.14f64;
    let c = 1_000_000u64;
}
```

### Cause 2: Integer Type Mismatch

```rust
fn takes_i32(x: i32) {
    println!("{}", x);
}

fn main() {
    let a: i64 = 100;

    // Error: expected i32, found i64
    // takes_i32(a);

    // Fix 1: use as for conversion
    takes_i32(a as i32);

    // Fix 2: use try_into for safe conversion
    use std::convert::TryInto;
    if let Ok(n) = a.try_into() {
        takes_i32(n);
    }

    // Fix 3: change original type
    let a: i32 = 100;
    takes_i32(a);
}
```

### Cause 3: String vs &str

```rust
fn takes_str(s: &str) {
    println!("{}", s);
}

fn takes_string(s: String) {
    println!("{}", s);
}

fn main() {
    let owned = String::from("hello");
    let borrowed = "world";

    // &str to String
    takes_string(borrowed.to_string());
    takes_string(String::from(borrowed));
    takes_string(borrowed.into());

    // String to &str
    takes_str(&owned);
    takes_str(owned.as_str());

    // Using Into/From
    fn flexible<S: Into<String>>(s: S) {
        let string: String = s.into();
        println!("{}", string);
    }

    flexible("literal");
    flexible(String::from("owned"));
}
```

### Cause 4: Option/Result Wrapping

```rust
fn main() {
    // Error: expected i32, found Option<i32>
    // let x: i32 = Some(5);

    // Fix 1: unwrap (only if certain)
    let x: i32 = Some(5).unwrap();

    // Fix 2: unwrap_or for default
    let x: i32 = Some(5).unwrap_or(0);

    // Fix 3: match or if let
    let opt = Some(5);
    let x: i32 = match opt {
        Some(n) => n,
        None => 0,
    };

    // Similarly for Result
    let result: Result<i32, &str> = Ok(42);

    // Error: expected i32, found Result
    // let x: i32 = result;

    // Fix: handle the Result
    let x: i32 = result.unwrap_or(0);
}
```

### Cause 5: Reference vs Value

```rust
fn main() {
    let x = 5;
    let r = &x;

    // Error: expected `i32`, found `&i32`
    // let y: i32 = r;

    // Fix 1: dereference
    let y: i32 = *r;

    // Fix 2: accept reference
    let y: &i32 = r;

    // Works with Copy types due to auto-deref in many contexts
    let sum = r + 1;  // Auto-deref for operators
    println!("{}", sum);

    // For non-Copy types
    let s = String::from("hello");
    let rs = &s;

    // Error: expected String, found &String
    // let s2: String = rs;

    // Fix 1: clone
    let s2: String = rs.clone();

    // Fix 2: accept reference
    let s2: &String = rs;
}
```

### Cause 6: Array vs Vec

```rust
fn takes_vec(v: Vec<i32>) {
    println!("{:?}", v);
}

fn takes_slice(s: &[i32]) {
    println!("{:?}", s);
}

fn main() {
    let arr = [1, 2, 3];
    let vec = vec![1, 2, 3];

    // Error: expected Vec, found [i32; 3]
    // takes_vec(arr);

    // Fix 1: convert array to vec
    takes_vec(arr.to_vec());
    takes_vec(Vec::from(arr));

    // Better: accept slice (works with both)
    takes_slice(&arr);
    takes_slice(&vec);
}
```

### Cause 7: Closure Type Mismatch

```rust
fn main() {
    // Each closure has unique anonymous type
    let add_one = |x| x + 1;
    let add_two = |x| x + 2;

    // Error: expected closure, found different closure
    // let funcs = [add_one, add_two];

    // Fix 1: use function pointers
    let add_one: fn(i32) -> i32 = |x| x + 1;
    let add_two: fn(i32) -> i32 = |x| x + 2;
    let funcs: [fn(i32) -> i32; 2] = [add_one, add_two];

    // Fix 2: use Box<dyn Fn>
    let add_one: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
    let add_two: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 2);
    let funcs: Vec<Box<dyn Fn(i32) -> i32>> = vec![add_one, add_two];
}
```

### Cause 8: Generic Type Inference

```rust
fn main() {
    // Error: cannot infer type
    // let v = Vec::new();

    // Fix 1: type annotation
    let v: Vec<i32> = Vec::new();

    // Fix 2: turbofish
    let v = Vec::<i32>::new();

    // Fix 3: let usage infer type
    let mut v = Vec::new();
    v.push(1i32);

    // Error with collect
    let nums: Vec<_> = "1,2,3"
        .split(',')
        .map(|s| s.parse::<i32>().unwrap())
        .collect();
}
```

### Cause 9: Tuple Element Type

```rust
fn main() {
    let tuple: (i32, String, bool) = (1, String::from("hello"), true);

    // Error: expected i32, found (i32, String, bool)
    // let x: i32 = tuple;

    // Fix: access tuple element
    let x: i32 = tuple.0;
    let s: String = tuple.1;
    let b: bool = tuple.2;

    // Destructuring
    let (x, s, b) = tuple;
}
```

### Cause 10: Return Type Mismatch

```rust
// Error: expected (), found i32
// fn bad() {
//     42  // Implicit return without semicolon
// }

// Fix 1: add return type
fn returns_i32() -> i32 {
    42
}

// Fix 2: add semicolon (returns unit)
fn returns_unit() {
    let _ = 42;
}

// Error: expected i32, found ()
// fn also_bad() -> i32 {
//     println!("hello");  // Last expression is ()
// }

// Fix: ensure last expression matches return type
fn fixed() -> i32 {
    println!("hello");
    42
}
```

## Type Conversion Summary

```rust
// Numeric conversions
let i: i32 = 42;
let f: f64 = i as f64;      // Widening (safe)
let j: i16 = i as i16;      // Narrowing (may truncate)

// String conversions
let s: &str = "hello";
let owned: String = s.to_string();
let owned: String = String::from(s);
let owned: String = s.into();
let borrowed: &str = &owned;

// Collection conversions
let arr: [i32; 3] = [1, 2, 3];
let vec: Vec<i32> = arr.to_vec();
let slice: &[i32] = &arr;
let slice: &[i32] = &vec;

// Option unwrapping
let opt: Option<i32> = Some(5);
let val: i32 = opt.unwrap();
let val: i32 = opt.unwrap_or(0);
let val: i32 = opt.unwrap_or_default();
```

## Summary

| Error Pattern | Common Fix |
|---------------|------------|
| Number type mismatch | Use `as` or specify literal suffix |
| String/&str mismatch | `.to_string()` or `&` |
| Option/Result wrapping | `.unwrap()` or pattern match |
| Reference/value mismatch | `*` to deref or `&` to reference |
| Array/Vec mismatch | Use slice `&[T]` in function signature |
| Return type mismatch | Add/fix return type annotation |

The mismatched types error tells you exactly what types are involved. Look at the expected and found types, then apply the appropriate conversion or fix your type annotations.
