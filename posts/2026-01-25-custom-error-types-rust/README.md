# How to Implement Custom Error Types in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Error Handling, Custom Errors, Traits, Result

Description: Learn how to implement custom error types in Rust with the Error trait. Build composable error types that work with the ? operator and provide meaningful error messages.

---

Custom error types make your Rust code more expressive and maintainable. Instead of using generic errors, you can create domain-specific errors that communicate exactly what went wrong. This guide shows how to implement custom errors correctly.

## Basic Custom Error

Implement `std::error::Error`, `Display`, and `Debug`:

```rust
use std::fmt;
use std::error::Error;

#[derive(Debug)]
struct ValidationError {
    field: String,
    message: String,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Validation error on '{}': {}", self.field, self.message)
    }
}

impl Error for ValidationError {}

fn validate_username(username: &str) -> Result<(), ValidationError> {
    if username.is_empty() {
        return Err(ValidationError {
            field: "username".to_string(),
            message: "cannot be empty".to_string(),
        });
    }
    if username.len() < 3 {
        return Err(ValidationError {
            field: "username".to_string(),
            message: "must be at least 3 characters".to_string(),
        });
    }
    Ok(())
}

fn main() {
    match validate_username("ab") {
        Ok(()) => println!("Valid"),
        Err(e) => println!("Error: {}", e),
    }
}
```

## Error Enum for Multiple Cases

Use an enum when your function can fail in different ways:

```rust
use std::fmt;
use std::error::Error;
use std::num::ParseIntError;
use std::io;

#[derive(Debug)]
enum ConfigError {
    IoError(io::Error),
    ParseError(ParseIntError),
    MissingField(String),
    InvalidValue { field: String, value: String },
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::IoError(e) => write!(f, "IO error: {}", e),
            ConfigError::ParseError(e) => write!(f, "Parse error: {}", e),
            ConfigError::MissingField(field) => write!(f, "Missing field: {}", field),
            ConfigError::InvalidValue { field, value } => {
                write!(f, "Invalid value '{}' for field '{}'", value, field)
            }
        }
    }
}

impl Error for ConfigError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            ConfigError::IoError(e) => Some(e),
            ConfigError::ParseError(e) => Some(e),
            _ => None,
        }
    }
}

// Enable ? operator conversion
impl From<io::Error> for ConfigError {
    fn from(err: io::Error) -> Self {
        ConfigError::IoError(err)
    }
}

impl From<ParseIntError> for ConfigError {
    fn from(err: ParseIntError) -> Self {
        ConfigError::ParseError(err)
    }
}

fn load_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)?;  // io::Error converts to ConfigError

    let port: u16 = content
        .lines()
        .find(|l| l.starts_with("port="))
        .ok_or_else(|| ConfigError::MissingField("port".to_string()))?
        .trim_start_matches("port=")
        .parse()?;  // ParseIntError converts to ConfigError

    Ok(Config { port })
}

struct Config {
    port: u16,
}

fn main() {
    match load_config("config.txt") {
        Ok(config) => println!("Port: {}", config.port),
        Err(e) => {
            println!("Error: {}", e);
            if let Some(source) = e.source() {
                println!("Caused by: {}", source);
            }
        }
    }
}
```

## Using thiserror Crate

The `thiserror` crate reduces boilerplate:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum AppError {
    #[error("Database connection failed: {0}")]
    DatabaseError(#[from] DatabaseError),

    #[error("Authentication failed for user '{username}'")]
    AuthError { username: String },

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {message}")]
    ValidationError { message: String },

    #[error(transparent)]
    IoError(#[from] std::io::Error),
}

#[derive(Error, Debug)]
#[error("Database error: {message}")]
struct DatabaseError {
    message: String,
}

fn authenticate(username: &str, password: &str) -> Result<User, AppError> {
    if username.is_empty() {
        return Err(AppError::ValidationError {
            message: "Username cannot be empty".to_string(),
        });
    }

    if password != "secret" {
        return Err(AppError::AuthError {
            username: username.to_string(),
        });
    }

    Ok(User { name: username.to_string() })
}

struct User {
    name: String,
}

fn main() {
    match authenticate("alice", "wrong") {
        Ok(user) => println!("Logged in: {}", user.name),
        Err(e) => println!("Failed: {}", e),
    }
}
```

## Error Context with anyhow

For applications (not libraries), `anyhow` provides easy error handling:

```rust
use anyhow::{Context, Result, bail, anyhow};

fn read_config(path: &str) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path))?;

    let config: Config = parse_config(&content)
        .with_context(|| "Failed to parse config")?;

    if config.port == 0 {
        bail!("Port cannot be zero");  // Quick error creation
    }

    Ok(config)
}

fn parse_config(content: &str) -> Result<Config> {
    // Parse logic here
    if content.is_empty() {
        return Err(anyhow!("Config content is empty"));
    }

    Ok(Config {
        port: 8080,
        host: "localhost".to_string(),
    })
}

struct Config {
    port: u16,
    host: String,
}

fn main() -> Result<()> {
    let config = read_config("config.toml")?;
    println!("Server: {}:{}", config.host, config.port);
    Ok(())
}
```

## Combining Library and Application Errors

```rust
// Library code - use specific error types
mod library {
    use thiserror::Error;

    #[derive(Error, Debug)]
    pub enum LibraryError {
        #[error("Invalid format: {0}")]
        FormatError(String),

        #[error("Processing failed: {0}")]
        ProcessingError(String),
    }

    pub fn process(data: &str) -> Result<String, LibraryError> {
        if data.is_empty() {
            return Err(LibraryError::FormatError("Empty input".to_string()));
        }
        Ok(data.to_uppercase())
    }
}

// Application code - wrap library errors
use anyhow::{Context, Result};

fn run_app() -> Result<()> {
    let input = "hello";

    let result = library::process(input)
        .with_context(|| format!("Failed to process: {}", input))?;

    println!("Result: {}", result);
    Ok(())
}

fn main() {
    if let Err(e) = run_app() {
        eprintln!("Error: {:#}", e);  // Pretty print error chain
        std::process::exit(1);
    }
}
```

## Error Conversion Chain

```rust
use std::fmt;
use std::error::Error;

// Low-level error
#[derive(Debug)]
struct ParseError {
    line: usize,
    message: String,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Parse error at line {}: {}", self.line, self.message)
    }
}

impl Error for ParseError {}

// Mid-level error
#[derive(Debug)]
struct ConfigError {
    source: ParseError,
    file: String,
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Config error in '{}': {}", self.file, self.source)
    }
}

impl Error for ConfigError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.source)
    }
}

// High-level error
#[derive(Debug)]
struct AppError {
    source: ConfigError,
    context: String,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.context, self.source)
    }
}

impl Error for AppError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.source)
    }
}

fn print_error_chain(error: &dyn Error) {
    println!("Error: {}", error);
    let mut source = error.source();
    while let Some(e) = source {
        println!("  Caused by: {}", e);
        source = e.source();
    }
}

fn main() {
    let error = AppError {
        context: "Application startup failed".to_string(),
        source: ConfigError {
            file: "app.conf".to_string(),
            source: ParseError {
                line: 42,
                message: "unexpected token".to_string(),
            },
        },
    };

    print_error_chain(&error);
}
```

## Best Practices

```rust
use std::fmt;
use std::error::Error;

// 1. Make errors specific and actionable
#[derive(Debug)]
enum UserError {
    NotFound { user_id: u64 },
    PermissionDenied { action: String, resource: String },
    InvalidInput { field: String, reason: String },
}

// 2. Implement Display for user-friendly messages
impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UserError::NotFound { user_id } => {
                write!(f, "User {} not found", user_id)
            }
            UserError::PermissionDenied { action, resource } => {
                write!(f, "Permission denied: cannot {} on {}", action, resource)
            }
            UserError::InvalidInput { field, reason } => {
                write!(f, "Invalid {}: {}", field, reason)
            }
        }
    }
}

// 3. Implement Error with proper source chain
impl Error for UserError {}

// 4. Provide constructors for common cases
impl UserError {
    fn not_found(user_id: u64) -> Self {
        UserError::NotFound { user_id }
    }

    fn permission_denied(action: impl Into<String>, resource: impl Into<String>) -> Self {
        UserError::PermissionDenied {
            action: action.into(),
            resource: resource.into(),
        }
    }
}

// 5. Add helper methods for error categorization
impl UserError {
    fn is_not_found(&self) -> bool {
        matches!(self, UserError::NotFound { .. })
    }

    fn is_permission_error(&self) -> bool {
        matches!(self, UserError::PermissionDenied { .. })
    }
}
```

## Summary

| Approach | Use Case |
|----------|----------|
| Manual impl | Full control, no dependencies |
| `thiserror` | Libraries, specific error types |
| `anyhow` | Applications, error context |
| Enum errors | Multiple failure modes |
| Struct errors | Single failure mode with data |

Custom error types make your code more maintainable and debuggable. For libraries, use `thiserror` to create specific, well-documented error types. For applications, consider `anyhow` for easy error handling with context. Always implement `Display` for human-readable messages and `Error::source()` for error chains.
