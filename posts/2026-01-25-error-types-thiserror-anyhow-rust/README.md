# How to Design Error Types with thiserror and anyhow in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Error Handling, thiserror, anyhow, Best Practices

Description: A practical guide to designing clean error types in Rust using thiserror for libraries and anyhow for applications, with real-world patterns and examples.

---

Error handling in Rust is one of those things that feels elegant once you understand it, but getting there takes some work. The language gives you `Result<T, E>` and the `?` operator, but the question of *what* to put in that `E` slot is where many developers get stuck. Two crates have emerged as the standard answer: `thiserror` for libraries and `anyhow` for applications. Here's how to use them effectively.

## The Problem with Standard Error Handling

Before diving into the crates, let's understand why they exist. Consider a function that reads a config file and parses it as JSON:

```rust
use std::fs;
use std::io;

fn load_config(path: &str) -> Result<Config, ???> {
    let contents = fs::read_to_string(path)?;  // Returns io::Error
    let config: Config = serde_json::from_str(&contents)?;  // Returns serde_json::Error
    Ok(config)
}
```

What type goes in the `???` slot? You could use `Box<dyn std::error::Error>`, but that throws away type information. You could create a manual enum, but that requires a lot of boilerplate. This is where `thiserror` and `anyhow` come in.

## thiserror: Structured Errors for Libraries

When you're writing a library, callers need to know what can go wrong. They might want to handle a file-not-found error differently from a parse error. `thiserror` lets you define custom error types with minimal boilerplate.

Add it to your `Cargo.toml`:

```toml
[dependencies]
thiserror = "1.0"
```

Now define your error type:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("failed to read config file: {0}")]
    IoError(#[from] std::io::Error),

    #[error("failed to parse config: {0}")]
    ParseError(#[from] serde_json::Error),

    #[error("missing required field: {field}")]
    MissingField { field: String },

    #[error("invalid value for {field}: expected {expected}, got {actual}")]
    InvalidValue {
        field: String,
        expected: String,
        actual: String,
    },
}
```

The `#[from]` attribute automatically implements `From<T>` for that variant, so the `?` operator works seamlessly:

```rust
pub fn load_config(path: &str) -> Result<Config, ConfigError> {
    let contents = fs::read_to_string(path)?;  // Converts io::Error to ConfigError::IoError
    let config: Config = serde_json::from_str(&contents)?;  // Converts to ConfigError::ParseError

    // Custom validation
    if config.database_url.is_empty() {
        return Err(ConfigError::MissingField {
            field: "database_url".to_string(),
        });
    }

    Ok(config)
}
```

Callers can now pattern match on specific error variants:

```rust
match load_config("app.json") {
    Ok(config) => println!("Loaded config successfully"),
    Err(ConfigError::IoError(e)) if e.kind() == io::ErrorKind::NotFound => {
        println!("Config file not found, using defaults");
    }
    Err(ConfigError::MissingField { field }) => {
        println!("Please add the '{}' field to your config", field);
    }
    Err(e) => return Err(e.into()),
}
```

### Wrapping Errors with Context

Sometimes you want to add context without creating a new variant. Use the `#[source]` attribute to preserve the error chain:

```rust
#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("connection failed to {host}:{port}")]
    ConnectionFailed {
        host: String,
        port: u16,
        #[source]
        source: std::io::Error,
    },

    #[error("query failed: {query}")]
    QueryFailed {
        query: String,
        #[source]
        source: sqlx::Error,
    },
}
```

This preserves the full error chain, so tools that walk the error source chain will show the underlying cause.

## anyhow: Quick and Flexible Errors for Applications

When you're writing an application (not a library), you often don't need callers to handle specific error variants. You just want to propagate errors up and eventually log or display them. `anyhow` is perfect for this.

```toml
[dependencies]
anyhow = "1.0"
```

The `anyhow::Error` type can hold any error that implements `std::error::Error`:

```rust
use anyhow::{Result, Context};

fn load_and_validate_config() -> Result<Config> {
    let config = load_config("app.json")
        .context("failed to load application config")?;

    validate_database_connection(&config.database_url)
        .context("database configuration is invalid")?;

    Ok(config)
}
```

The `context` method adds human-readable context to errors. When you print the error, you get a full chain:

```
Error: failed to load application config

Caused by:
    0: failed to read config file: app.json
    1: No such file or directory (os error 2)
```

### Creating Ad-hoc Errors

Sometimes you need to create an error on the spot. Use the `anyhow!` macro or `bail!` for early returns:

```rust
use anyhow::{anyhow, bail, Result};

fn parse_port(input: &str) -> Result<u16> {
    let port: u16 = input.parse()
        .map_err(|_| anyhow!("invalid port number: {}", input))?;

    if port == 0 {
        bail!("port cannot be zero");
    }

    if port < 1024 {
        bail!("ports below 1024 require root privileges");
    }

    Ok(port)
}
```

### Downcasting to Specific Types

Even with `anyhow`, you can still check for specific error types when needed:

```rust
fn handle_startup_error(error: anyhow::Error) {
    // Check if it's a specific error type
    if let Some(io_err) = error.downcast_ref::<std::io::Error>() {
        if io_err.kind() == std::io::ErrorKind::PermissionDenied {
            eprintln!("Permission denied. Try running with sudo.");
            return;
        }
    }

    // Generic handling
    eprintln!("Startup failed: {:?}", error);
}
```

## When to Use Which

The rule of thumb is straightforward:

- **Use `thiserror`** when you're writing a library or a module that others will consume. Your callers need to know what can fail and handle specific cases.
- **Use `anyhow`** when you're writing application code where errors eventually get logged or displayed to users. You care about the message, not the type.

Many projects use both. Your internal libraries use `thiserror` to define clear error types, while your `main.rs` and top-level application code uses `anyhow` to aggregate and display them.

## A Real-World Pattern

Here's a pattern we use frequently. Define library errors with `thiserror`:

```rust
// In src/database/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("connection pool exhausted")]
    PoolExhausted,

    #[error("query timeout after {0} seconds")]
    Timeout(u64),

    #[error("record not found: {table}/{id}")]
    NotFound { table: String, id: String },

    #[error(transparent)]
    Other(#[from] sqlx::Error),
}
```

Then in application code, wrap with `anyhow` for context:

```rust
// In src/main.rs
use anyhow::{Result, Context};

async fn run_server() -> Result<()> {
    let db = Database::connect(&config.database_url)
        .await
        .context("failed to connect to database")?;

    let user = db.get_user(user_id)
        .await
        .with_context(|| format!("failed to fetch user {}", user_id))?;

    // ... rest of the application
    Ok(())
}

fn main() {
    if let Err(e) = run_server() {
        // Print full error chain
        eprintln!("Error: {:#}", e);
        std::process::exit(1);
    }
}
```

## Common Mistakes to Avoid

**Don't use `anyhow` in library public APIs.** Your users lose the ability to match on specific errors. Keep `anyhow` for internal application logic.

**Don't create too many error variants.** If you have 20 variants and callers always handle them the same way, you've over-engineered. Group related errors or use `#[error(transparent)]` to wrap underlying errors.

**Don't forget the error chain.** Always use `#[source]` or `#[from]` to preserve the underlying cause. Losing context makes debugging painful.

**Don't ignore the `Debug` derive.** Always derive `Debug` on your error types. The `{:?}` formatter is essential for logging and debugging.

## Conclusion

Rust's error handling can feel verbose at first, but `thiserror` and `anyhow` make it manageable. Use `thiserror` to give library consumers clear, matchable error types. Use `anyhow` to keep application code clean and focused on the happy path. The combination gives you both type safety and ergonomics, which is exactly what good Rust code should feel like.

Start with these patterns in your next project, and error handling will become one of the parts of Rust you actually enjoy.
