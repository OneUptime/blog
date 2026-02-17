# How to Fix 'Temporary value dropped while borrowed' Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Lifetimes, Borrow Checker, Memory Safety, Error Handling

Description: Learn how to fix the 'temporary value dropped while borrowed' error in Rust. This guide explains why it happens and shows practical solutions for common scenarios.

---

The "temporary value dropped while borrowed" error occurs when you try to keep a reference to a value that gets destroyed too soon. This is Rust's borrow checker protecting you from dangling references. Understanding this error helps you write safer code and work effectively with Rust's ownership system.

## Understanding the Problem

A temporary value is created during expression evaluation and destroyed at the end of the statement. If you take a reference to it, that reference becomes invalid.

```rust
fn main() {
    // Problem: String::from creates a temporary value
    // The reference outlives the temporary

    // let s: &str = &String::from("hello"); // Error!

    // The temporary String is created and immediately dropped
    // leaving 's' pointing to freed memory
}
```

The error message looks like this:

```
error[E0716]: temporary value dropped while borrowed
 --> src/main.rs:2:19
  |
2 |     let s: &str = &String::from("hello");
  |                    ^^^^^^^^^^^^^^^^^^^^^ - temporary value is freed at the end of this statement
  |                    |
  |                    creates a temporary value which is freed while still in use
3 |     println!("{}", s);
  |                    - borrow later used here
```

## Solution 1: Store the Owned Value

The most common fix is to store the owned value in a variable first.

```rust
fn main() {
    // Store the owned value, then borrow
    let owned = String::from("hello");
    let borrowed: &str = &owned;

    println!("{}", borrowed);

    // owned lives until end of scope
    // borrowed is valid as long as owned exists
}
```

## Solution 2: Extend Temporary Lifetime

In some cases, Rust extends the lifetime of temporaries assigned to a `let` binding.

```rust
fn main() {
    // This works because the temporary's lifetime is extended
    let s: &str = "hello";  // String literals have 'static lifetime
    println!("{}", s);

    // For non-literals, use owned value
    let s: String = format!("hello {}", "world");
    let reference: &str = &s;
    println!("{}", reference);
}
```

## Common Scenarios and Fixes

### Method Chains Returning References

```rust
struct Data {
    value: String,
}

impl Data {
    fn get_value(&self) -> &str {
        &self.value
    }
}

fn create_data() -> Data {
    Data { value: String::from("test") }
}

fn main() {
    // Problem: Temporary Data is dropped
    // let v = create_data().get_value(); // Error!

    // Solution: Store the owned value first
    let data = create_data();
    let v = data.get_value();
    println!("{}", v);
}
```

### Lock Guards

```rust
use std::sync::Mutex;

fn main() {
    let mutex = Mutex::new(vec![1, 2, 3]);

    // Problem: Lock guard is dropped
    // let first = mutex.lock().unwrap().first(); // Error!

    // Solution 1: Store the guard
    let guard = mutex.lock().unwrap();
    let first = guard.first();
    println!("{:?}", first);
    drop(guard);  // Explicitly drop when done

    // Solution 2: Clone the value
    let first = mutex.lock().unwrap().first().cloned();
    println!("{:?}", first);
}
```

### Option and Result Unwrapping

```rust
fn get_optional() -> Option<String> {
    Some(String::from("value"))
}

fn main() {
    // Problem: Option<String> is temporary
    // let s: &str = get_optional().unwrap().as_str(); // Error!

    // Solution 1: Store the Option
    let opt = get_optional();
    if let Some(ref s) = opt {
        println!("{}", s);
    }

    // Solution 2: Store the unwrapped value
    let s = get_optional().unwrap();
    let s_ref: &str = &s;
    println!("{}", s_ref);

    // Solution 3: Use map for transformations
    let len = get_optional().map(|s| s.len());
    println!("{:?}", len);
}
```

### HashMap Entry

```rust
use std::collections::HashMap;

fn main() {
    let mut map: HashMap<&str, String> = HashMap::new();

    // Problem: Temporary key
    // let key = String::from("key");
    // map.insert(&key, String::from("value")); // Error if key is dropped

    // Solution 1: Use owned keys
    let mut map: HashMap<String, String> = HashMap::new();
    map.insert(String::from("key"), String::from("value"));

    // Solution 2: Use string literals (static lifetime)
    let mut map: HashMap<&'static str, String> = HashMap::new();
    map.insert("key", String::from("value"));

    // Solution 3: Store keys separately
    let keys: Vec<String> = vec![String::from("key1"), String::from("key2")];
    let mut map: HashMap<&str, i32> = HashMap::new();
    for key in &keys {
        map.insert(key, 42);
    }
}
```

### Format Strings

```rust
fn main() {
    // Problem: format! creates a temporary String
    // let s: &str = &format!("hello {}", 42); // Error!

    // Solution 1: Store the String
    let formatted = format!("hello {}", 42);
    let s: &str = &formatted;
    println!("{}", s);

    // Solution 2: Use directly without storing reference
    println!("{}", format!("hello {}", 42));
}
```

### Iterator Adapters

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Problem: filter creates a temporary iterator
    // let first = numbers.iter()
    //     .filter(|x| **x > 2)
    //     .next(); // This works

    // But this pattern can cause issues:
    fn get_filtered<'a>(nums: &'a [i32]) -> impl Iterator<Item = &'a i32> {
        nums.iter().filter(|x| **x > 2)
    }

    // Solution: Collect when you need to store results
    let filtered: Vec<&i32> = numbers.iter()
        .filter(|x| **x > 2)
        .collect();
    println!("{:?}", filtered);
}
```

### Struct Fields

```rust
// Problem: Storing references to temporaries in structs

struct Config<'a> {
    name: &'a str,
}

fn main() {
    // Error: Temporary String
    // let config = Config { name: &String::from("app") };

    // Solution 1: Use owned data
    struct ConfigOwned {
        name: String,
    }
    let config = ConfigOwned { name: String::from("app") };

    // Solution 2: Use 'static lifetime
    let config = Config { name: "app" };  // String literal

    // Solution 3: Store owned value first
    let name = String::from("app");
    let config = Config { name: &name };
}
```

## Advanced Patterns

### Using Cow for Flexible Ownership

```rust
use std::borrow::Cow;

fn process(input: &str) -> Cow<str> {
    if input.contains("bad") {
        // Return owned when modification needed
        Cow::Owned(input.replace("bad", "good"))
    } else {
        // Return borrowed when possible
        Cow::Borrowed(input)
    }
}

fn main() {
    let result = process("this is bad");
    println!("{}", result);  // Works regardless of variant

    // Cow avoids the temporary problem by being flexible
    let owned_or_borrowed = process("hello");
    let s: &str = &owned_or_borrowed;
    println!("{}", s);
}
```

### Returning References from Functions

```rust
// Problem: Returning reference to local variable

// fn bad_return() -> &str {
//     let s = String::from("hello");
//     &s  // Error: s is dropped when function returns
// }

// Solution 1: Return owned value
fn good_return_owned() -> String {
    String::from("hello")
}

// Solution 2: Take a reference as parameter
fn good_return_ref<'a>(s: &'a str) -> &'a str {
    &s[0..5]
}

// Solution 3: Return static reference
fn good_return_static() -> &'static str {
    "hello"
}

fn main() {
    let s = good_return_owned();
    println!("{}", s);

    let input = String::from("hello world");
    let slice = good_return_ref(&input);
    println!("{}", slice);

    let static_str = good_return_static();
    println!("{}", static_str);
}
```

### Using Interior Mutability

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(String::from("hello"));

    // Problem: Borrow from RefCell is temporary
    // let s: &str = &data.borrow(); // Error: Ref<String> is dropped

    // Solution 1: Use the borrow in a smaller scope
    {
        let borrowed = data.borrow();
        println!("{}", &*borrowed);
    }  // borrowed dropped here

    // Solution 2: Clone if you need the value
    let cloned = data.borrow().clone();
    println!("{}", cloned);
}
```

## Debugging Tips

When you see this error:

1. Identify the temporary value being created
2. Find where the reference is being used after the temporary would be dropped
3. Choose a solution:
   - Store the owned value in a variable
   - Clone the data if ownership transfer is acceptable
   - Restructure code to use values within smaller scopes
   - Use owned types instead of references in data structures

```rust
fn main() {
    // The compiler error shows you exactly what is happening:
    //
    // error[E0716]: temporary value dropped while borrowed
    //    |
    //    |     let s: &str = &String::from("hello");
    //    |                    ^^^^^^^^^^^^^^^^^^^^^ creates temporary
    //    |     println!("{}", s);
    //    |                    - borrow used here

    // Always store owned values before borrowing
    let owned = String::from("hello");
    let borrowed: &str = &owned;
    println!("{}", borrowed);
}
```

## Summary

The "temporary value dropped while borrowed" error protects you from dangling references. Key solutions:

- Store owned values in variables before borrowing
- Use owned types in structs instead of references when practical
- Clone values when you need independent copies
- Use `Cow` for flexible ownership patterns
- Return owned values from functions instead of references to locals

Understanding temporary lifetimes is essential for writing correct Rust code. The borrow checker catches these errors at compile time, preventing undefined behavior that would occur in other languages.
