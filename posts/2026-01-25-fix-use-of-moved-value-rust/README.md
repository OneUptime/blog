# How to Fix "Use of moved value" Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Ownership, Move Semantics, Errors, Debugging

Description: Learn how to diagnose and fix "use of moved value" errors in Rust. Understand move semantics and discover patterns to work with ownership correctly.

---

The "use of moved value" error is one of Rust's most common ownership errors. It occurs when you try to use a value after its ownership has been transferred somewhere else. This guide explains the error and provides practical solutions.

## Understanding the Error

In Rust, assignment moves ownership for non-Copy types:

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;  // Ownership moves from s1 to s2

    // println!("{}", s1);  // Error: value used here after move
    println!("{}", s2);  // OK: s2 owns the value
}
```

Error message:

```
error[E0382]: use of moved value: `s1`
 --> src/main.rs:5:20
  |
2 |     let s1 = String::from("hello");
  |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
3 |     let s2 = s1;
  |              -- value moved here
4 |
5 |     println!("{}", s1);
  |                    ^^ value used here after move
```

## Copy vs Move Types

Types implementing `Copy` are copied, not moved:

```rust
fn main() {
    // Copy types - both variables remain valid
    let x = 5;
    let y = x;
    println!("x = {}, y = {}", x, y);  // Both work

    let a = true;
    let b = a;
    println!("a = {}, b = {}", a, b);  // Both work

    // Move types - only new owner is valid
    let s1 = String::from("hello");
    let s2 = s1;
    // println!("{}", s1);  // Error: moved
    println!("{}", s2);

    let v1 = vec![1, 2, 3];
    let v2 = v1;
    // println!("{:?}", v1);  // Error: moved
    println!("{:?}", v2);
}
```

Copy types include: integers, floats, booleans, characters, tuples of Copy types, arrays of Copy types.

## Fix 1: Clone the Value

Create an independent copy:

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();  // Deep copy

    println!("s1 = {}", s1);  // Works
    println!("s2 = {}", s2);  // Works

    // Both are independent
    let mut s1 = String::from("hello");
    let s2 = s1.clone();
    s1.push_str(" world");

    println!("s1 = {}", s1);  // "hello world"
    println!("s2 = {}", s2);  // "hello"
}
```

## Fix 2: Use References (Borrowing)

Borrow without taking ownership:

```rust
fn main() {
    let s = String::from("hello");

    print_string(&s);  // Borrow
    print_string(&s);  // Can borrow again
    println!("Still have: {}", s);  // Original still valid
}

fn print_string(s: &String) {
    println!("{}", s);
}
```

## Fix 3: Return Ownership

Have functions return ownership back:

```rust
fn main() {
    let s = String::from("hello");
    let s = add_suffix(s);  // Move in, get ownership back
    println!("{}", s);
}

fn add_suffix(mut s: String) -> String {
    s.push_str(" world");
    s  // Return ownership
}
```

## Fix 4: Scope the Move

Limit where the move happens:

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    // Process without consuming
    let sum: i32 = v.iter().sum();
    println!("Sum: {}", sum);

    // v still valid
    println!("Vector: {:?}", v);

    // Now consume if needed
    let doubled: Vec<i32> = v.into_iter().map(|x| x * 2).collect();
    // v is now moved
    println!("Doubled: {:?}", doubled);
}
```

## Moves in Function Calls

Passing to functions moves ownership:

```rust
fn main() {
    let s = String::from("hello");

    takes_ownership(s);  // s is moved
    // println!("{}", s);  // Error: moved

    // Fix 1: Clone before call
    let s = String::from("hello");
    takes_ownership(s.clone());
    println!("{}", s);  // OK

    // Fix 2: Borrow instead
    let s = String::from("hello");
    borrows(&s);
    println!("{}", s);  // OK
}

fn takes_ownership(s: String) {
    println!("Took: {}", s);
}

fn borrows(s: &String) {
    println!("Borrowed: {}", s);
}
```

## Moves in Loops

Loop iterations can move values:

```rust
fn main() {
    let v = vec![String::from("a"), String::from("b")];

    // This moves each element
    for s in v {
        println!("{}", s);
    }
    // println!("{:?}", v);  // Error: v was moved

    // Fix 1: Iterate over references
    let v = vec![String::from("a"), String::from("b")];
    for s in &v {
        println!("{}", s);
    }
    println!("{:?}", v);  // OK

    // Fix 2: Clone before iterating
    let v = vec![String::from("a"), String::from("b")];
    for s in v.clone() {
        println!("{}", s);
    }
    println!("{:?}", v);  // OK
}
```

## Moves in Closures

Closures can capture values by move:

```rust
fn main() {
    let s = String::from("hello");

    // move keyword forces capture by move
    let closure = move || {
        println!("{}", s);
    };

    // println!("{}", s);  // Error: s was moved into closure
    closure();

    // Fix 1: Clone before moving
    let s = String::from("hello");
    let s_clone = s.clone();
    let closure = move || {
        println!("{}", s_clone);
    };
    println!("{}", s);  // OK
    closure();

    // Fix 2: Don't use move if possible
    let s = String::from("hello");
    let closure = || {
        println!("{}", s);  // Borrows s
    };
    closure();
    println!("{}", s);  // OK
}
```

## Conditional Moves

Moves in one branch affect other branches:

```rust
fn main() {
    let s = String::from("hello");
    let condition = true;

    if condition {
        let _s2 = s;  // s moved here
    }
    // println!("{}", s);  // Error: might have been moved

    // Fix 1: Clone
    let s = String::from("hello");
    if condition {
        let _s2 = s.clone();
    }
    println!("{}", s);  // OK

    // Fix 2: Restructure logic
    let s = String::from("hello");
    let result = if condition {
        s  // Move to result
    } else {
        s  // Move to result either way
    };
    println!("{}", result);
}
```

## Moves and Option/Result

Common patterns with Option:

```rust
fn main() {
    let opt = Some(String::from("hello"));

    // Taking from Option moves the value
    if let Some(s) = opt {
        println!("{}", s);
    }
    // println!("{:?}", opt);  // Error: moved

    // Fix 1: Use as_ref()
    let opt = Some(String::from("hello"));
    if let Some(s) = opt.as_ref() {
        println!("{}", s);
    }
    println!("{:?}", opt);  // OK

    // Fix 2: Clone from Option
    let opt = Some(String::from("hello"));
    if let Some(s) = opt.clone() {
        println!("{}", s);
    }
    println!("{:?}", opt);  // OK

    // Fix 3: Use take() for intentional move
    let mut opt = Some(String::from("hello"));
    if let Some(s) = opt.take() {
        println!("{}", s);
    }
    println!("{:?}", opt);  // None
}
```

## Summary Table

| Scenario | Fix |
|----------|-----|
| Need independent copy | `clone()` |
| Just need to read | Use `&` reference |
| Function needs ownership | Return value back |
| Loop iteration | Use `&collection` or `iter()` |
| Closure capture | Clone before move, or don't use `move` |
| Optional value | `as_ref()`, `clone()`, or `take()` |
| Conditional | Restructure or clone |

## Prevention Tips

1. **Start with references**: Use `&` by default, only take ownership when needed
2. **Understand your types**: Know which types are Copy vs Move
3. **Check function signatures**: Does the function take `T`, `&T`, or `&mut T`?
4. **Be careful with closures**: `move` closures consume captured variables
5. **Use iterators wisely**: `iter()` borrows, `into_iter()` moves

The move system prevents use-after-free bugs. When you see this error, decide whether you need a copy, a borrow, or to restructure your code to handle ownership transfer explicitly.
