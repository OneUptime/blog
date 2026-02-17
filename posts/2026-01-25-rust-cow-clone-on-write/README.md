# How to Use Cow (Clone on Write) in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Cow, Memory Management, Performance, Smart Pointers

Description: Learn how to use Cow (Clone on Write) in Rust for efficient memory management. This guide covers when borrowed data can be used and when cloning is necessary.

---

Cow (Clone on Write) is a smart pointer that provides efficient handling of data that is usually borrowed but sometimes needs to be owned. It delays cloning until mutation is actually required, optimizing memory usage in common scenarios.

## Understanding Cow

Cow can hold either borrowed data or owned data, and clones the borrowed data only when modification is needed.

```rust
use std::borrow::Cow;

fn main() {
    // Cow can hold borrowed data
    let borrowed: Cow<str> = Cow::Borrowed("hello");

    // Or owned data
    let owned: Cow<str> = Cow::Owned(String::from("world"));

    // Both can be used the same way
    println!("{} {}", borrowed, owned);

    // Cow implements Deref, so you can use str methods
    println!("Length: {}", borrowed.len());
    println!("Uppercase: {}", borrowed.to_uppercase());
}
```

## When to Use Cow

Cow is ideal when:

1. You receive data that is usually not modified
2. Some cases require modification
3. You want to avoid unnecessary cloning

```rust
use std::borrow::Cow;

// Function that sometimes modifies input
fn process_text(input: &str) -> Cow<str> {
    if input.contains("bad") {
        // Need to modify - clone and own
        Cow::Owned(input.replace("bad", "good"))
    } else {
        // No modification - just borrow
        Cow::Borrowed(input)
    }
}

fn main() {
    let text1 = "This is good text";
    let text2 = "This is bad text";

    let result1 = process_text(text1);
    let result2 = process_text(text2);

    println!("Result 1: {} (borrowed: {})", result1, matches!(result1, Cow::Borrowed(_)));
    println!("Result 2: {} (borrowed: {})", result2, matches!(result2, Cow::Borrowed(_)));
}
```

## Common Use Cases

### Conditional String Transformation

```rust
use std::borrow::Cow;

fn normalize_path(path: &str) -> Cow<str> {
    if path.starts_with("./") {
        Cow::Owned(path[2..].to_string())
    } else if path.starts_with("/") {
        Cow::Borrowed(path)
    } else {
        Cow::Owned(format!("/{}", path))
    }
}

fn escape_html(input: &str) -> Cow<str> {
    // Check if escaping is needed
    if !input.contains(['<', '>', '&', '"', '\'']) {
        return Cow::Borrowed(input);
    }

    // Only allocate when necessary
    let mut output = String::with_capacity(input.len());
    for c in input.chars() {
        match c {
            '<' => output.push_str("&lt;"),
            '>' => output.push_str("&gt;"),
            '&' => output.push_str("&amp;"),
            '"' => output.push_str("&quot;"),
            '\'' => output.push_str("&#39;"),
            _ => output.push(c),
        }
    }
    Cow::Owned(output)
}

fn main() {
    // No escaping needed - no allocation
    let safe = "Hello, world!";
    let escaped_safe = escape_html(safe);
    println!("{} (borrowed: {})", escaped_safe, matches!(escaped_safe, Cow::Borrowed(_)));

    // Escaping needed - allocation happens
    let unsafe_html = "<script>alert('xss')</script>";
    let escaped_unsafe = escape_html(unsafe_html);
    println!("{} (owned: {})", escaped_unsafe, matches!(escaped_unsafe, Cow::Owned(_)));
}
```

### Configuration with Defaults

```rust
use std::borrow::Cow;

struct Config<'a> {
    host: Cow<'a, str>,
    port: u16,
    path: Cow<'a, str>,
}

impl<'a> Config<'a> {
    fn new() -> Self {
        Config {
            host: Cow::Borrowed("localhost"),
            port: 8080,
            path: Cow::Borrowed("/"),
        }
    }

    fn with_host(mut self, host: &'a str) -> Self {
        self.host = Cow::Borrowed(host);
        self
    }

    fn with_host_owned(mut self, host: String) -> Self {
        self.host = Cow::Owned(host);
        self
    }

    fn with_port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }
}

fn main() {
    // Uses default borrowed values
    let config1 = Config::new();
    println!("Host: {}", config1.host);

    // Custom borrowed value
    let config2 = Config::new().with_host("example.com");
    println!("Host: {}", config2.host);

    // Custom owned value
    let host = format!("{}.example.com", "api");
    let config3 = Config::new().with_host_owned(host);
    println!("Host: {}", config3.host);
}
```

### Function Parameters

```rust
use std::borrow::Cow;

// Accept both &str and String
fn log_message(message: impl Into<Cow<'static, str>>) {
    let message: Cow<'static, str> = message.into();
    println!("[LOG] {}", message);
}

fn main() {
    // Pass string literal (borrowed)
    log_message("Static message");

    // Pass owned String
    log_message(String::from("Dynamic message"));

    // From Cow directly
    let cow: Cow<str> = Cow::Borrowed("Cow message");
    log_message(cow);
}
```

### Error Messages

```rust
use std::borrow::Cow;
use std::error::Error;
use std::fmt;

#[derive(Debug)]
struct AppError {
    message: Cow<'static, str>,
}

impl AppError {
    fn new<Str: Into<Cow<'static, str>>>(message: Str) -> Self {
        AppError { message: message.into() }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Error for AppError {}

fn divide(a: i32, b: i32) -> Result<i32, AppError> {
    if b == 0 {
        // Static message - no allocation
        return Err(AppError::new("Division by zero"));
    }
    if a < 0 || b < 0 {
        // Dynamic message - allocation needed
        return Err(AppError::new(format!(
            "Negative numbers not allowed: {} / {}", a, b
        )));
    }
    Ok(a / b)
}

fn main() {
    println!("{:?}", divide(10, 2));
    println!("{:?}", divide(10, 0));
    println!("{:?}", divide(-5, 2));
}
```

## Working with Cow

### Converting to Owned

```rust
use std::borrow::Cow;

fn main() {
    let borrowed: Cow<str> = Cow::Borrowed("hello");

    // Convert to owned String
    let owned: String = borrowed.into_owned();
    println!("{}", owned);

    // to_mut clones if borrowed, returns mutable reference
    let mut cow: Cow<str> = Cow::Borrowed("hello");
    cow.to_mut().push_str(" world");
    println!("{}", cow);

    // After to_mut, it's owned
    assert!(matches!(cow, Cow::Owned(_)));
}
```

### Checking Variant

```rust
use std::borrow::Cow;

fn main() {
    let borrowed: Cow<str> = Cow::Borrowed("hello");
    let owned: Cow<str> = Cow::Owned(String::from("world"));

    // Check which variant
    println!("Borrowed is borrowed: {}", matches!(borrowed, Cow::Borrowed(_)));
    println!("Owned is owned: {}", matches!(owned, Cow::Owned(_)));

    // Or use is_borrowed() method (available for Cow)
    // println!("borrowed.is_borrowed(): {}", borrowed.is_borrowed());
}
```

### Cow with Other Types

```rust
use std::borrow::Cow;

fn main() {
    // Cow works with any type that implements ToOwned
    let borrowed_slice: Cow<[i32]> = Cow::Borrowed(&[1, 2, 3]);
    let owned_vec: Cow<[i32]> = Cow::Owned(vec![4, 5, 6]);

    println!("Borrowed: {:?}", &*borrowed_slice);
    println!("Owned: {:?}", &*owned_vec);

    // Path operations
    use std::path::Path;
    let borrowed_path: Cow<Path> = Cow::Borrowed(Path::new("/usr/bin"));
    println!("Path: {}", borrowed_path.display());
}
```

## Performance Considerations

```rust
use std::borrow::Cow;

// Without Cow - always allocates
fn process_always_clone(input: &str) -> String {
    if input.contains("bad") {
        input.replace("bad", "good")
    } else {
        input.to_string()  // Unnecessary allocation!
    }
}

// With Cow - allocates only when needed
fn process_cow(input: &str) -> Cow<str> {
    if input.contains("bad") {
        Cow::Owned(input.replace("bad", "good"))
    } else {
        Cow::Borrowed(input)  // No allocation
    }
}

fn main() {
    let inputs = vec![
        "good text",
        "more good text",
        "bad text here",
        "another good one",
    ];

    // Most inputs don't need modification
    // Cow avoids cloning for the common case
    for input in &inputs {
        let result = process_cow(input);
        println!("{}", result);
    }
}
```

## Cow in APIs

```rust
use std::borrow::Cow;

// Public API that accepts flexible input
pub fn greet<'a>(name: impl Into<Cow<'a, str>>) -> String {
    let name = name.into();
    format!("Hello, {}!", name)
}

fn main() {
    // All these work
    println!("{}", greet("World"));
    println!("{}", greet(String::from("Rust")));
    println!("{}", greet(Cow::Borrowed("Alice")));
}
```

## Summary

Cow (Clone on Write) optimizes memory usage for data that is:

| Scenario | Cow Variant | Allocation |
|----------|-------------|------------|
| Data not modified | Borrowed | None |
| Data needs modification | Owned | On first mutation |
| Starting with owned data | Owned | Already allocated |

Key methods:

- `Cow::Borrowed(data)` - wrap borrowed reference
- `Cow::Owned(data)` - wrap owned data
- `.into_owned()` - get owned version (clones if borrowed)
- `.to_mut()` - get mutable reference (clones if borrowed)

Best practices:

- Use Cow when data is usually read-only
- Return `Cow<str>` instead of `String` when modification is rare
- Use `Into<Cow>` for flexible function parameters
- Remember Cow implements Deref, so borrowed methods work

Cow is perfect for APIs that need to handle both borrowed and owned data efficiently.
