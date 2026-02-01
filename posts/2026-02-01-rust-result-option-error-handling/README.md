# How to Implement Error Handling with Result and Option Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Error Handling, Result, Option, Best Practices

Description: A practical guide to error handling in Rust using Result and Option types with the ? operator and custom error types.

---

Rust takes a different approach to error handling than most programming languages. Instead of exceptions that can be thrown from anywhere and caught somewhere up the call stack, Rust uses explicit return types that force you to deal with errors at compile time. This design choice eliminates entire categories of bugs and makes your code more predictable.

In this guide, we will explore Result and Option types, learn how to use them effectively, and build up to creating custom error types for production applications.

## The Two Core Types: Option and Result

Rust provides two enums for handling the absence of values and recoverable errors.

### Option: When a Value Might Not Exist

Option represents a value that might or might not be present. It has two variants:

```rust
// Option is defined as:
// enum Option<T> {
//     Some(T),  // Contains a value of type T
//     None,     // Represents absence of a value
// }

// A function that searches for a user by ID
// Returns Some(User) if found, None if not found
fn find_user(id: u64) -> Option<User> {
    let users = get_all_users();
    
    // iter().find() returns Option<&User>
    // cloned() converts Option<&User> to Option<User>
    users.iter().find(|u| u.id == id).cloned()
}

// Using the function
fn main() {
    match find_user(42) {
        Some(user) => println!("Found user: {}", user.name),
        None => println!("User not found"),
    }
}
```

### Result: When an Operation Might Fail

Result represents the outcome of an operation that can succeed or fail with an error:

```rust
// Result is defined as:
// enum Result<T, E> {
//     Ok(T),   // Success - contains the value
//     Err(E),  // Failure - contains the error
// }

use std::fs::File;
use std::io::{self, Read};

// Function that reads a file and returns its contents
// Returns Ok(String) on success, Err(io::Error) on failure
fn read_file_contents(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}
```

## The ? Operator: Propagating Errors Elegantly

The `?` operator is syntactic sugar that makes error propagation clean and readable. When you append `?` to a Result or Option, it does the following:

- If the value is Ok(v) or Some(v), it unwraps and returns v
- If the value is Err(e) or None, it returns early from the function with that error

```rust
use std::fs::File;
use std::io::{self, Read};

// Without the ? operator - verbose and repetitive
fn read_username_verbose(path: &str) -> Result<String, io::Error> {
    let file_result = File::open(path);
    
    let mut file = match file_result {
        Ok(f) => f,
        Err(e) => return Err(e),
    };
    
    let mut username = String::new();
    
    match file.read_to_string(&mut username) {
        Ok(_) => Ok(username),
        Err(e) => Err(e),
    }
}

// With the ? operator - clean and concise
fn read_username_clean(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut username = String::new();
    file.read_to_string(&mut username)?;
    Ok(username)
}

// Even more concise with method chaining
fn read_username_chained(path: &str) -> Result<String, io::Error> {
    let mut contents = String::new();
    File::open(path)?.read_to_string(&mut contents)?;
    Ok(contents)
}
```

The `?` operator also works with Option types, but only in functions that return Option:

```rust
// Using ? with Option types
// Returns None if any step in the chain produces None
fn get_user_city(user_id: u64) -> Option<String> {
    let user = find_user(user_id)?;
    let address = user.address?;
    let city = address.city?;
    Some(city)
}
```

## unwrap vs expect: When to Use Each

Both `unwrap()` and `expect()` will panic if called on None or Err, but they serve different purposes.

### unwrap: Quick and Dirty

Use `unwrap()` only when you are absolutely certain the value exists, or during prototyping:

```rust
// Using unwrap - panics with a generic message if None
fn main() {
    // Only use this when you KNOW the value exists
    let config_path = std::env::var("CONFIG_PATH").unwrap();
    
    // Safe to unwrap a value you just checked
    let numbers = vec![1, 2, 3];
    if !numbers.is_empty() {
        let first = numbers.first().unwrap();
        println!("First number: {}", first);
    }
}
```

### expect: Self-Documenting Panics

Use `expect()` to provide context about why the value should exist:

```rust
// Using expect - panics with your custom message
fn main() {
    // The message explains why this should never fail
    let port: u16 = std::env::var("PORT")
        .expect("PORT environment variable must be set")
        .parse()
        .expect("PORT must be a valid number");
    
    // Good for configuration that must be present at startup
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL is required for the application to run");
}
```

In production code, prefer proper error handling over unwrap/expect whenever possible.

## Combinators: map, and_then, and Friends

Combinators let you transform and chain Option and Result values without explicit matching.

### map: Transform the Inner Value

`map()` applies a function to the inner value if it exists:

```rust
// map transforms Some(T) to Some(U), leaves None as None
fn get_username_length(user_id: u64) -> Option<usize> {
    // find_user returns Option<User>
    // map transforms User to usize (the length)
    find_user(user_id).map(|user| user.name.len())
}

// map also works with Result
// Transforms Ok(T) to Ok(U), leaves Err unchanged
fn read_file_length(path: &str) -> Result<usize, io::Error> {
    std::fs::read_to_string(path).map(|contents| contents.len())
}
```

### and_then: Chain Operations That Might Fail

`and_then()` (also called flatmap in other languages) chains operations that return Option or Result:

```rust
// and_then is useful when each step can fail
// It flattens Option<Option<T>> to Option<T>
fn get_user_email_domain(user_id: u64) -> Option<String> {
    find_user(user_id)
        .and_then(|user| user.email)  // Option<String>
        .and_then(|email| {
            // Split email and get domain part
            email.split('@').nth(1).map(String::from)
        })
}

// Real-world example: parsing nested optional data
fn parse_config_port(config: &Config) -> Option<u16> {
    config
        .get("server")              // Option<&Value>
        .and_then(|v| v.get("port")) // Option<&Value>
        .and_then(|v| v.as_u64())    // Option<u64>
        .map(|n| n as u16)           // Option<u16>
}
```

### Other Useful Combinators

```rust
// unwrap_or: provide a default value
let port = env::var("PORT")
    .ok()                    // Convert Result to Option
    .and_then(|p| p.parse().ok())
    .unwrap_or(8080);        // Use 8080 if anything fails

// unwrap_or_else: compute default lazily
let config = load_config()
    .unwrap_or_else(|_| Config::default());

// ok_or: convert Option to Result
fn find_user_or_error(id: u64) -> Result<User, String> {
    find_user(id).ok_or(format!("User {} not found", id))
}

// map_err: transform the error type
fn parse_port(s: &str) -> Result<u16, String> {
    s.parse::<u16>()
        .map_err(|e| format!("Invalid port '{}': {}", s, e))
}
```

## Creating Custom Error Types

For production applications, you will want custom error types that provide context and can represent multiple failure modes.

### Manual Implementation

```rust
use std::fmt;
use std::io;

// Define an enum with all possible error variants
#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    DatabaseError(String),
    IoError(io::Error),
    ValidationError { field: String, message: String },
}

// Implement Display for user-friendly error messages
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(resource) => {
                write!(f, "Resource not found: {}", resource)
            }
            AppError::DatabaseError(msg) => {
                write!(f, "Database error: {}", msg)
            }
            AppError::IoError(err) => {
                write!(f, "IO error: {}", err)
            }
            AppError::ValidationError { field, message } => {
                write!(f, "Validation failed for '{}': {}", field, message)
            }
        }
    }
}

// Implement std::error::Error for compatibility
impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            AppError::IoError(err) => Some(err),
            _ => None,
        }
    }
}

// Implement From for automatic conversion with ?
impl From<io::Error> for AppError {
    fn from(err: io::Error) -> Self {
        AppError::IoError(err)
    }
}
```

### Using thiserror for Cleaner Definitions

The thiserror crate eliminates boilerplate while keeping type safety:

```rust
use thiserror::Error;

// thiserror generates Display and Error implementations
#[derive(Error, Debug)]
pub enum UserServiceError {
    // The #[error] attribute defines the Display message
    #[error("User with ID {0} not found")]
    NotFound(u64),
    
    // Use #[from] to auto-implement From trait
    #[error("Database query failed")]
    Database(#[from] sqlx::Error),
    
    // Wrap other errors with source tracking
    #[error("Failed to hash password")]
    PasswordHash(#[source] argon2::Error),
    
    // Structured error with multiple fields
    #[error("Validation failed for field '{field}': {reason}")]
    Validation { field: String, reason: String },
}

// Usage in a service function
pub async fn create_user(input: CreateUserInput) -> Result<User, UserServiceError> {
    // Validation
    if input.email.is_empty() {
        return Err(UserServiceError::Validation {
            field: "email".to_string(),
            reason: "Email cannot be empty".to_string(),
        });
    }
    
    // Database operation - sqlx::Error auto-converts via #[from]
    let user = sqlx::query_as!(User, "INSERT INTO users ...")
        .fetch_one(&pool)
        .await?;
    
    Ok(user)
}
```

### Using anyhow for Application Code

For application code where you do not need to match on specific error types, anyhow provides a convenient catch-all:

```rust
use anyhow::{Context, Result, bail, ensure};

// anyhow::Result<T> is shorthand for Result<T, anyhow::Error>
pub async fn process_order(order_id: u64) -> Result<Order> {
    // context() adds information to errors
    let order = fetch_order(order_id)
        .await
        .context("Failed to fetch order from database")?;
    
    // ensure! is like assert! but returns an error
    ensure!(order.status != "cancelled", "Cannot process cancelled order");
    
    // bail! returns an error immediately
    if order.items.is_empty() {
        bail!("Order {} has no items", order_id);
    }
    
    // with_context() for lazy context creation
    let payment = charge_payment(&order)
        .await
        .with_context(|| format!("Payment failed for order {}", order_id))?;
    
    Ok(order)
}

// In main or at boundaries, you can print the full error chain
fn main() {
    if let Err(err) = run_app() {
        // Prints error and all its causes
        eprintln!("Error: {:?}", err);
        std::process::exit(1);
    }
}
```

## Best Practices for Production Code

### 1. Use thiserror for Libraries, anyhow for Applications

```rust
// In a library crate - use thiserror for precise error types
// Callers can match on specific variants
#[derive(thiserror::Error, Debug)]
pub enum ConfigError {
    #[error("Config file not found at {0}")]
    NotFound(PathBuf),
    #[error("Invalid TOML syntax")]
    ParseError(#[from] toml::de::Error),
}

// In an application crate - use anyhow for convenience
// You care about the message, not matching on types
use anyhow::Result;

fn main() -> Result<()> {
    let config = load_config()?;
    run_server(config)?;
    Ok(())
}
```

### 2. Add Context to Errors

Always add context that helps with debugging:

```rust
use anyhow::Context;

// Bad - no context about what failed
let data = std::fs::read_to_string(path)?;

// Good - clear context for debugging
let data = std::fs::read_to_string(path)
    .with_context(|| format!("Failed to read config file: {}", path))?;
```

### 3. Avoid unwrap in Production Code

Replace unwrap with proper error handling or expect with clear messages:

```rust
// Avoid this
let value = some_option.unwrap();

// Better - handle the None case
let value = some_option.ok_or_else(|| AppError::NotFound("value".into()))?;

// Or use expect if panic is acceptable with clear reasoning
let value = some_option.expect("Value must exist because we validated input earlier");
```

### 4. Use Type Aliases for Readability

```rust
// Define a type alias for your error type
pub type Result<T> = std::result::Result<T, AppError>;

// Now function signatures are cleaner
pub fn create_user(input: CreateUserInput) -> Result<User> {
    // ...
}
```

## Putting It All Together

Here is a complete example showing these patterns in a real service:

```rust
use thiserror::Error;
use anyhow::Context;

// Domain-specific error type for the user service
#[derive(Error, Debug)]
pub enum UserError {
    #[error("User not found: {0}")]
    NotFound(u64),
    
    #[error("Email already registered: {0}")]
    DuplicateEmail(String),
    
    #[error("Database error")]
    Database(#[from] sqlx::Error),
}

pub type UserResult<T> = Result<T, UserError>;

pub struct UserService {
    pool: sqlx::PgPool,
}

impl UserService {
    // Returns domain-specific error
    pub async fn get_user(&self, id: u64) -> UserResult<User> {
        sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id as i64)
            .fetch_optional(&self.pool)
            .await?
            .ok_or(UserError::NotFound(id))
    }
    
    // Combines multiple operations
    pub async fn update_email(&self, id: u64, email: String) -> UserResult<User> {
        // Check if email is taken
        let existing = sqlx::query!("SELECT id FROM users WHERE email = $1", &email)
            .fetch_optional(&self.pool)
            .await?;
        
        if existing.is_some() {
            return Err(UserError::DuplicateEmail(email));
        }
        
        // Update the user
        sqlx::query_as!(
            User,
            "UPDATE users SET email = $1 WHERE id = $2 RETURNING *",
            email,
            id as i64
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(UserError::NotFound(id))
    }
}
```

## Summary

Rust's approach to error handling might feel verbose at first, but it pays dividends in reliability. By making errors explicit in the type system, you catch issues at compile time rather than runtime. The key takeaways:

- Use Option for values that might not exist
- Use Result for operations that can fail
- The ? operator makes error propagation clean
- Prefer expect over unwrap when you need to panic
- Use combinators like map and and_then for transformations
- Use thiserror for library error types
- Use anyhow for application error handling
- Always add context to help with debugging

Start with these patterns in your next Rust project, and you will write more robust code with fewer runtime surprises.

---

*Track errors in your Rust applications with [OneUptime](https://oneuptime.com) - monitor error rates and debug issues faster.*
