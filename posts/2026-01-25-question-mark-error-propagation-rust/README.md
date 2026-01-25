# How to Use the ? Operator for Error Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Error Handling, Result, Option, Operator

Description: Learn how to use the ? operator for clean error propagation in Rust. Understand how it works with Result and Option, and master error conversion patterns.

---

The `?` operator is Rust's syntax for propagating errors. Instead of verbose match statements, `?` provides concise error handling that makes your code cleaner and more readable.

## Basic Usage with Result

The `?` operator unwraps `Ok` values or returns `Err` early:

```rust
use std::fs::File;
use std::io::{self, Read};

// Without ? operator - verbose
fn read_file_verbose(path: &str) -> Result<String, io::Error> {
    let file = match File::open(path) {
        Ok(f) => f,
        Err(e) => return Err(e),
    };

    let mut contents = String::new();
    match file.read_to_string(&mut contents) {
        Ok(_) => Ok(contents),
        Err(e) => Err(e),
    }
}

// With ? operator - clean
fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

// Even more concise with chaining
fn read_file_chain(path: &str) -> Result<String, io::Error> {
    let mut contents = String::new();
    File::open(path)?.read_to_string(&mut contents)?;
    Ok(contents)
}
```

## How ? Works

The `?` operator:
1. If the value is `Ok(v)`, extracts `v`
2. If the value is `Err(e)`, returns `Err(e.into())` from the function

```rust
// What ? does behind the scenes
fn manual_question_mark<T, E>(result: Result<T, E>) -> Result<T, E> {
    match result {
        Ok(v) => v,       // Continue with value
        Err(e) => return Err(e.into()),  // Return early
    }
}
```

## Using ? with Option

The `?` operator also works with Option in functions returning Option:

```rust
fn parse_numbers(input: &str) -> Option<(i32, i32)> {
    let mut parts = input.split(',');

    let first = parts.next()?;      // Returns None if no first part
    let second = parts.next()?;     // Returns None if no second part

    let a = first.trim().parse().ok()?;   // Returns None if parse fails
    let b = second.trim().parse().ok()?;

    Some((a, b))
}

fn main() {
    println!("{:?}", parse_numbers("10, 20"));    // Some((10, 20))
    println!("{:?}", parse_numbers("10"));        // None
    println!("{:?}", parse_numbers("a, b"));      // None
}
```

## Error Conversion with From

The `?` operator automatically converts errors using the `From` trait:

```rust
use std::fs::File;
use std::io::{self, Read};
use std::num::ParseIntError;

#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(ParseIntError),
}

// Implement From for automatic conversion
impl From<io::Error> for AppError {
    fn from(err: io::Error) -> Self {
        AppError::Io(err)
    }
}

impl From<ParseIntError> for AppError {
    fn from(err: ParseIntError) -> Self {
        AppError::Parse(err)
    }
}

fn read_number_from_file(path: &str) -> Result<i32, AppError> {
    let mut contents = String::new();
    File::open(path)?.read_to_string(&mut contents)?;  // io::Error -> AppError
    let number = contents.trim().parse()?;             // ParseIntError -> AppError
    Ok(number)
}
```

## The main Function with ?

Use `Result` return type in main for ? in top-level code:

```rust
use std::error::Error;
use std::fs;

fn main() -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string("config.txt")?;
    let config: Config = parse_config(&contents)?;
    run_with_config(config)?;
    Ok(())
}

struct Config {
    // fields
}

fn parse_config(_s: &str) -> Result<Config, Box<dyn Error>> {
    Ok(Config {})
}

fn run_with_config(_config: Config) -> Result<(), Box<dyn Error>> {
    Ok(())
}
```

## Chaining with ?

Chain multiple fallible operations:

```rust
use std::collections::HashMap;

fn get_config_value(
    configs: &HashMap<String, HashMap<String, String>>,
    section: &str,
    key: &str,
) -> Option<&String> {
    configs.get(section)?.get(key)
}

fn parse_port(config: &str) -> Option<u16> {
    config
        .lines()
        .find(|line| line.starts_with("port="))?
        .strip_prefix("port=")?
        .trim()
        .parse()
        .ok()
}

fn main() {
    let config = "
host=localhost
port=8080
timeout=30
";

    println!("Port: {:?}", parse_port(config));
}
```

## Combining ? with Combinators

Use ? alongside Option/Result combinators:

```rust
fn process_user(user_id: &str) -> Result<UserInfo, String> {
    let id: u64 = user_id
        .parse()
        .map_err(|_| format!("Invalid user ID: {}", user_id))?;

    let user = fetch_user(id)
        .ok_or_else(|| format!("User {} not found", id))?;

    let profile = user
        .profile
        .as_ref()
        .ok_or("User has no profile")?;

    Ok(UserInfo {
        name: user.name.clone(),
        bio: profile.bio.clone(),
    })
}

struct User {
    name: String,
    profile: Option<Profile>,
}

struct Profile {
    bio: String,
}

struct UserInfo {
    name: String,
    bio: String,
}

fn fetch_user(id: u64) -> Option<User> {
    if id == 1 {
        Some(User {
            name: "Alice".to_string(),
            profile: Some(Profile {
                bio: "Rust developer".to_string(),
            }),
        })
    } else {
        None
    }
}
```

## Try Blocks (Nightly)

On nightly Rust, try blocks allow ? in expressions:

```rust
#![feature(try_blocks)]

fn main() {
    let result: Result<i32, &str> = try {
        let x = "10".parse::<i32>().map_err(|_| "parse failed")?;
        let y = "20".parse::<i32>().map_err(|_| "parse failed")?;
        x + y
    };

    println!("{:?}", result);
}
```

## Common Patterns

### Early Return Pattern

```rust
fn validate_and_process(input: &str) -> Result<Output, Error> {
    // Early returns for validation
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(Error::EmptyInput);
    }

    let parsed = trimmed.parse::<i32>()?;
    if parsed < 0 {
        return Err(Error::NegativeValue);
    }

    // Main processing
    Ok(process(parsed))
}
```

### Converting Option to Result

```rust
fn get_value(data: &[i32], index: usize) -> Result<i32, &'static str> {
    data.get(index)
        .copied()
        .ok_or("Index out of bounds")
}

fn find_user(users: &[User], name: &str) -> Result<&User, String> {
    users
        .iter()
        .find(|u| u.name == name)
        .ok_or_else(|| format!("User '{}' not found", name))
}
```

### Async Functions

```rust
async fn fetch_data(url: &str) -> Result<Data, FetchError> {
    let response = client.get(url).send().await?;
    let status = response.status();

    if !status.is_success() {
        return Err(FetchError::HttpError(status));
    }

    let data = response.json().await?;
    Ok(data)
}
```

## When Not to Use ?

```rust
// Don't use ? when you want to handle the error locally
fn maybe_parse(s: &str) -> i32 {
    // Bad: propagates error
    // s.parse()?

    // Good: handle locally with default
    s.parse().unwrap_or(0)
}

// Don't use ? when you need to transform the error specially
fn complex_error_handling(s: &str) -> Result<i32, MyError> {
    match s.parse::<i32>() {
        Ok(n) => Ok(n),
        Err(e) => {
            log::error!("Parse failed: {}", e);
            metrics::increment("parse_failures");
            Err(MyError::ParseFailed { input: s.to_string(), cause: e })
        }
    }
}
```

## Summary

| Pattern | Use Case |
|---------|----------|
| `?` with Result | Propagate errors up the call stack |
| `?` with Option | Propagate None up the call stack |
| `From` impl | Auto-convert error types |
| `.ok_or()?` | Convert Option to Result, then propagate |
| `.map_err()?` | Transform error before propagating |
| `main() -> Result` | Use ? in main function |

The `?` operator makes error handling in Rust concise and readable. It automatically propagates errors while allowing conversion through the `From` trait. Use it to write clean, linear code that handles errors properly without verbose matching.
