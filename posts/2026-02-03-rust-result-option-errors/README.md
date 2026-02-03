# How to Handle Errors with Result and Option in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Error Handling, Result, Option, Safety

Description: Master Rust error handling with Result and Option types. This guide covers pattern matching, the ? operator, combinators, and building robust error handling strategies.

---

Rust takes a fundamentally different approach to error handling compared to most languages. Instead of exceptions that can be thrown anywhere and caught (or not) somewhere else, Rust uses types to represent the possibility of failure. This design makes errors explicit, composable, and impossible to ignore. The two core types for this are `Option<T>` for values that might not exist, and `Result<T, E>` for operations that might fail.

## The Problem with Traditional Error Handling

In many languages, errors are handled through exceptions or null values:

```python
# Python: hidden exceptions
def read_config(path):
    with open(path) as f:  # Could raise FileNotFoundError
        return json.load(f)  # Could raise JSONDecodeError

config = read_config("settings.json")  # Caller might not handle errors
```

These approaches share a common flaw: the type signature does not communicate that failure is possible. Rust solves this by encoding fallibility directly in the type system.

## Understanding Option: Values That Might Not Exist

The `Option<T>` type represents a value that may or may not be present:

```rust
// Option is defined in the standard library as:
enum Option<T> {
    Some(T),  // A value exists
    None,     // No value exists
}
```

### Basic Option Usage

```rust
// A function that might not find what it is looking for
fn find_user_by_email(email: &str) -> Option<User> {
    let users = vec![
        User { id: 1, email: "alice@example.com".to_string(), name: "Alice".to_string() },
        User { id: 2, email: "bob@example.com".to_string(), name: "Bob".to_string() },
    ];

    // iter().find() returns Option<&User>
    users.into_iter().find(|u| u.email == email)
}

#[derive(Clone, Debug)]
struct User {
    id: u32,
    email: String,
    name: String,
}

fn main() {
    // Using pattern matching to handle Option
    match find_user_by_email("alice@example.com") {
        Some(user) => println!("Found user: {}", user.name),
        None => println!("User not found"),
    }

    // Using if let for simpler cases
    if let Some(user) = find_user_by_email("bob@example.com") {
        println!("Bob's ID is: {}", user.id);
    }
}
```

### Option with Collections

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // first() returns Option<&T>
    let first = numbers.first();
    println!("First element: {:?}", first); // Some(1)

    // get() returns Option<&T> for safe indexing
    let third = numbers.get(2);
    println!("Third element: {:?}", third); // Some(3)

    // Out of bounds returns None instead of panicking
    let tenth = numbers.get(9);
    println!("Tenth element: {:?}", tenth); // None

    // Finding elements
    let even = numbers.iter().find(|&&x| x % 2 == 0);
    println!("First even: {:?}", even); // Some(2)
}
```

### Option Methods for Transformation

```rust
fn main() {
    let some_number: Option<i32> = Some(5);
    let no_number: Option<i32> = None;

    // map: Transform the inner value if it exists
    let doubled = some_number.map(|x| x * 2);
    println!("Doubled: {:?}", doubled); // Some(10)

    // and_then (flatMap): Chain operations that return Option
    fn safe_divide(a: i32, b: i32) -> Option<i32> {
        if b == 0 { None } else { Some(a / b) }
    }

    let result = some_number
        .and_then(|x| safe_divide(100, x))  // 100 / 5 = 20
        .and_then(|x| safe_divide(x, 2));   // 20 / 2 = 10
    println!("Chained division: {:?}", result); // Some(10)

    // filter: Keep the value only if it matches a predicate
    let large = some_number.filter(|&x| x > 10);
    println!("Large number: {:?}", large); // None (5 is not > 10)
}
```

### Providing Default Values

```rust
fn main() {
    let config_port: Option<u16> = None;
    let custom_port: Option<u16> = Some(8080);

    // unwrap_or: Provide a default value
    let port1 = config_port.unwrap_or(3000);
    println!("Port 1: {}", port1); // 3000

    // unwrap_or_else: Compute default lazily
    let port2 = config_port.unwrap_or_else(|| {
        println!("Computing default port...");
        3000
    });

    // unwrap_or_default: Use the type's Default implementation
    let name: Option<String> = None;
    let default_name = name.unwrap_or_default(); // Empty string

    // or: Provide an alternative Option
    let primary: Option<&str> = None;
    let fallback: Option<&str> = Some("fallback.example.com");
    let host = primary.or(fallback);
    println!("Host: {:?}", host); // Some("fallback.example.com")
}
```

## Understanding Result: Operations That Can Fail

While `Option` represents the absence of a value, `Result` represents an operation that can succeed or fail with an error:

```rust
// Result is defined in the standard library as:
enum Result<T, E> {
    Ok(T),   // Operation succeeded with value T
    Err(E),  // Operation failed with error E
}
```

### Basic Result Usage

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_file_contents(path: &str) -> Result<String, io::Error> {
    let mut file = match File::open(path) {
        Ok(file) => file,
        Err(e) => return Err(e),
    };

    let mut contents = String::new();
    match file.read_to_string(&mut contents) {
        Ok(_) => Ok(contents),
        Err(e) => Err(e),
    }
}

fn main() {
    match read_file_contents("config.txt") {
        Ok(contents) => println!("File contents:\n{}", contents),
        Err(e) => eprintln!("Error reading file: {}", e),
    }
}
```

### The ? Operator: Propagating Errors Elegantly

The previous example is verbose. Rust provides the `?` operator to propagate errors automatically:

```rust
use std::fs::File;
use std::io::{self, Read};

// Same function, much cleaner with ?
fn read_file_contents(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;  // Returns early if Err
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;  // Returns early if Err
    Ok(contents)
}

// Even more concise using method chaining
fn read_file_contents_v2(path: &str) -> Result<String, io::Error> {
    let mut contents = String::new();
    File::open(path)?.read_to_string(&mut contents)?;
    Ok(contents)
}
```

### The ? Operator with Option

The `?` operator also works with `Option`, returning `None` early:

```rust
fn get_user_city(user_id: u32) -> Option<String> {
    let users = get_users();

    // Each ? returns None if the Option is None
    let user = users.get(&user_id)?;
    let address = user.address.as_ref()?;
    let city = address.city.clone()?;

    Some(city)
}
```

## Result Methods and Combinators

Just like `Option`, `Result` has many useful methods:

```rust
fn main() {
    let success: Result<i32, &str> = Ok(42);
    let failure: Result<i32, &str> = Err("something went wrong");

    // map: Transform the success value
    let doubled = success.map(|x| x * 2);
    println!("Doubled: {:?}", doubled); // Ok(84)

    // map_err: Transform the error value
    let better_error = failure.map_err(|e| format!("Error: {}", e));

    // and_then: Chain fallible operations
    let chained = "21".parse::<i32>().and_then(|n| Ok(n * 2));
    println!("Chained: {:?}", chained); // Ok(42)

    // unwrap_or works like Option
    let value = failure.unwrap_or(0);
    println!("With default: {}", value); // 0

    // ok(): Convert Result to Option, discarding the error
    let as_option = success.ok();
    println!("As Option: {:?}", as_option); // Some(42)
}
```

### Converting Between Option and Result

```rust
fn main() {
    // Option to Result with ok_or
    let maybe_value: Option<i32> = Some(42);
    let result: Result<i32, &str> = maybe_value.ok_or("value was missing");

    let none_value: Option<i32> = None;
    let result2: Result<i32, &str> = none_value.ok_or("value was missing");
    println!("None to Result: {:?}", result2); // Err("value was missing")

    // ok_or_else for lazy error construction
    let result3: Result<i32, String> = none_value.ok_or_else(|| {
        format!("Missing value at timestamp {}", 1234567890)
    });
}
```

## Creating Custom Error Types

For real applications, you will want to define your own error types:

```rust
use std::fmt;
use std::io;
use std::num::ParseIntError;

// Define a custom error enum
#[derive(Debug)]
enum ConfigError {
    IoError(io::Error),
    ParseError(ParseIntError),
    MissingField(String),
    InvalidValue { field: String, value: String, reason: String },
}

// Implement Display for user-friendly error messages
impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::IoError(e) => write!(f, "IO error: {}", e),
            ConfigError::ParseError(e) => write!(f, "Parse error: {}", e),
            ConfigError::MissingField(field) => write!(f, "Missing required field: {}", field),
            ConfigError::InvalidValue { field, value, reason } => {
                write!(f, "Invalid value '{}' for field '{}': {}", value, field, reason)
            }
        }
    }
}

// Implement std::error::Error for compatibility
impl std::error::Error for ConfigError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ConfigError::IoError(e) => Some(e),
            ConfigError::ParseError(e) => Some(e),
            _ => None,
        }
    }
}

// Implement From traits for automatic conversion with ?
impl From<io::Error> for ConfigError {
    fn from(error: io::Error) -> Self {
        ConfigError::IoError(error)
    }
}

impl From<ParseIntError> for ConfigError {
    fn from(error: ParseIntError) -> Self {
        ConfigError::ParseError(error)
    }
}

// Now we can use ? with different error types
fn load_config(path: &str) -> Result<Config, ConfigError> {
    let contents = std::fs::read_to_string(path)?; // io::Error -> ConfigError
    // ... parsing logic
    Ok(Config { host: "localhost".to_string(), port: 8080 })
}

struct Config {
    host: String,
    port: u16,
}
```

## Using thiserror for Cleaner Custom Errors

The `thiserror` crate eliminates boilerplate when defining custom errors:

```rust
use thiserror::Error;
use std::io;
use std::num::ParseIntError;

#[derive(Error, Debug)]
enum ConfigError {
    #[error("IO error reading config")]
    IoError(#[from] io::Error),

    #[error("Failed to parse integer value")]
    ParseError(#[from] ParseIntError),

    #[error("Missing required field: {0}")]
    MissingField(String),

    #[error("Invalid value '{value}' for field '{field}': {reason}")]
    InvalidValue {
        field: String,
        value: String,
        reason: String,
    },
}

// thiserror generates Display, Error, and From impls automatically
```

### Nested Error Types with thiserror

```rust
use thiserror::Error;

// Database errors
#[derive(Error, Debug)]
enum DatabaseError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Record not found: {entity} with id {id}")]
    NotFound { entity: String, id: String },
}

// API errors that can wrap database errors
#[derive(Error, Debug)]
enum ApiError {
    #[error("Database error")]
    Database(#[from] DatabaseError),

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[error("Unauthorized")]
    Unauthorized,
}

// The From impl allows automatic conversion
fn get_user(id: &str) -> Result<User, ApiError> {
    let user = find_user_in_db(id)?; // DatabaseError -> ApiError
    Ok(user)
}
```

## Using anyhow for Application Code

While `thiserror` is great for libraries, `anyhow` simplifies error handling in applications:

```rust
use anyhow::{Context, Result, bail, ensure};

// Result is anyhow::Result<T>, which is Result<T, anyhow::Error>
fn load_config(path: &str) -> Result<Config> {
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path))?;

    let config: Config = parse_config(&contents)
        .context("Failed to parse config")?;

    // Use ensure! for validation
    ensure!(config.port > 0, "Port must be greater than 0");

    // Use bail! for early returns with errors
    if config.host.is_empty() {
        bail!("Host cannot be empty");
    }

    Ok(config)
}

fn main() -> Result<()> {
    // anyhow::Result works great in main()
    let config = load_config("server.conf")?;
    println!("Config loaded: {:?}", config);
    Ok(())
}
```

### anyhow Error Chain and Debugging

```rust
use anyhow::{Context, Result};

fn process_order(order_id: &str) -> Result<()> {
    let order = fetch_order(order_id)
        .with_context(|| format!("Failed to process order {}", order_id))?;

    validate_order(&order).context("Order validation failed")?;
    charge_payment(&order).context("Payment processing failed")?;

    Ok(())
}

fn main() {
    if let Err(e) = process_order("bad") {
        // Print the error with full context chain
        eprintln!("Error: {}", e);

        // Print the full chain for debugging
        eprintln!("\nFull error chain:");
        for (i, cause) in e.chain().enumerate() {
            eprintln!("  {}: {}", i, cause);
        }
    }
}
```

## Best Practices for Error Handling

### 1. Use the Type System to Prevent Errors

```rust
// Instead of runtime validation...
fn bad_create_user(age: i32) -> Result<User, &'static str> {
    if age < 0 { return Err("Age cannot be negative"); }
    Ok(User { age: age as u32 })
}

// Use types that make invalid states unrepresentable
struct Age(u32);

impl Age {
    fn new(value: u32) -> Option<Age> {
        if value > 150 { None } else { Some(Age(value)) }
    }
}

fn good_create_user(age: Age) -> User {
    // No validation needed: Age is always valid
    User { age: age.0 }
}
```

### 2. Provide Context with Errors

```rust
use anyhow::{Context, Result};
use std::path::Path;

// Bad: loses context
fn bad_read_config() -> Result<String> {
    Ok(std::fs::read_to_string("config.toml")?)
}

// Good: adds context
fn good_read_config(path: &Path) -> Result<String> {
    std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config from {}", path.display()))
}
```

### 3. Handle Errors at the Right Level

```rust
use anyhow::{Context, Result};

// Low-level function: return Result, let caller decide
fn parse_port(s: &str) -> Result<u16> {
    s.parse().context("Invalid port number")
}

// Mid-level function: add context, propagate
fn load_server_config() -> Result<ServerConfig> {
    let port_str = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let port = parse_port(&port_str).context("Failed to parse PORT")?;
    Ok(ServerConfig { port })
}

// High-level function: handle errors appropriately
fn main() {
    match load_server_config() {
        Ok(config) => println!("Starting on port {}", config.port),
        Err(e) => {
            eprintln!("Configuration error: {:#}", e);
            std::process::exit(1);
        }
    }
}
```

### 4. Avoid unwrap() in Production Code

```rust
fn main() {
    // Bad: panics on error
    let config = std::fs::read_to_string("config.toml").unwrap();

    // Good: handle the error
    let config = match std::fs::read_to_string("config.toml") {
        Ok(contents) => contents,
        Err(e) => {
            eprintln!("Failed to read config: {}", e);
            std::process::exit(1);
        }
    };

    // Good: use a default
    let config = std::fs::read_to_string("config.toml")
        .unwrap_or_else(|_| String::from("default_setting=true"));
}
```

### 5. Use Early Returns for Cleaner Code

```rust
use anyhow::{bail, ensure, Result};

// Clean validation with ensure! and bail!
fn validate_order(order: &Order) -> Result<()> {
    ensure!(!order.items.is_empty(), "Order must have at least one item");
    ensure!(order.total > 0, "Order total cannot be zero");

    if order.customer_id.is_empty() {
        bail!("Customer ID is required");
    }

    Ok(())
}
```

## Real-World Example: HTTP API Error Handling

```rust
use thiserror::Error;

// Domain errors with thiserror
#[derive(Error, Debug)]
enum ServiceError {
    #[error("User not found: {0}")]
    UserNotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Database error")]
    Database(#[source] Box<dyn std::error::Error + Send + Sync>),
}

// HTTP response representation
struct HttpResponse {
    status: u16,
    body: String,
}

// Convert ServiceError to HTTP responses
impl From<ServiceError> for HttpResponse {
    fn from(error: ServiceError) -> Self {
        match &error {
            ServiceError::UserNotFound(id) => HttpResponse {
                status: 404,
                body: format!(r#"{{"error": "User {} not found"}}"#, id),
            },
            ServiceError::InvalidInput(msg) => HttpResponse {
                status: 400,
                body: format!(r#"{{"error": "{}"}}"#, msg),
            },
            ServiceError::Database(e) => {
                eprintln!("Database error: {}", e); // Log actual error
                HttpResponse {
                    status: 500,
                    body: r#"{"error": "Internal server error"}"#.to_string(),
                }
            }
        }
    }
}

// HTTP handler
fn handle_get_user(service: &UserService, id: &str) -> HttpResponse {
    match service.get_user(id) {
        Ok(user) => HttpResponse {
            status: 200,
            body: format!(r#"{{"id": "{}", "name": "{}"}}"#, user.id, user.name),
        },
        Err(e) => e.into(),
    }
}
```

## Summary

| Concept | Use Case | Example |
|---------|----------|---------|
| `Option<T>` | Value might not exist | `HashMap::get()`, `Vec::first()` |
| `Result<T, E>` | Operation might fail | File I/O, parsing, network calls |
| `?` operator | Propagate errors up the call stack | `file.read_to_string(&mut s)?` |
| `map` / `and_then` | Transform success values | `opt.map(\|x\| x * 2)` |
| `unwrap_or` | Provide default values | `opt.unwrap_or(default)` |
| `thiserror` | Define library error types | Custom error enums with derives |
| `anyhow` | Application error handling | `Result<T>` with context |

Rust's error handling may feel verbose at first, but it provides guarantees that other languages cannot. Every possible failure is visible in the type signature, the compiler ensures you handle errors, and the tools like `?`, `thiserror`, and `anyhow` make it ergonomic in practice.

---

## Monitor Your Rust Services with OneUptime

Building reliable Rust applications is only half the battle. You need visibility into how they behave in production. OneUptime provides comprehensive monitoring for your Rust services:

- **Uptime Monitoring**: Know immediately when your services go down
- **Performance Metrics**: Track response times and throughput
- **Error Tracking**: Capture and analyze errors with full context
- **Alerting**: Get notified through Slack, PagerDuty, or custom webhooks
- **Status Pages**: Keep your users informed during incidents

OneUptime is open source and can be self-hosted or used as a managed service. Start monitoring your Rust applications today at [oneuptime.com](https://oneuptime.com).
