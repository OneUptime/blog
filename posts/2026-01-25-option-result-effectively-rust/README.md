# How to Use Option and Result Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Option, Result, Error Handling, Functional Programming

Description: Learn how to use Option and Result types effectively in Rust. Master combinators, pattern matching, and the ? operator for clean, expressive error handling.

---

`Option` and `Result` are Rust's primary types for handling absence and errors. Instead of null pointers or exceptions, Rust makes you explicitly handle these cases. This guide shows how to use them effectively.

## Option Basics

`Option<T>` represents a value that may or may not exist:

```rust
fn main() {
    let some_number: Option<i32> = Some(5);
    let no_number: Option<i32> = None;

    // Pattern matching
    match some_number {
        Some(n) => println!("Got: {}", n),
        None => println!("Got nothing"),
    }

    // if let for single case
    if let Some(n) = some_number {
        println!("Number is: {}", n);
    }

    // while let for iteration
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("Popped: {}", top);
    }
}
```

## Result Basics

`Result<T, E>` represents success or failure:

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_file("hello.txt") {
        Ok(contents) => println!("File contents: {}", contents),
        Err(e) => println!("Error reading file: {}", e),
    }
}
```

## Option Combinators

Combinators transform Options without explicit matching:

```rust
fn main() {
    let x: Option<i32> = Some(5);
    let y: Option<i32> = None;

    // map: transform the inner value
    let doubled = x.map(|n| n * 2);  // Some(10)
    let doubled_none = y.map(|n| n * 2);  // None

    // and_then (flatMap): chain operations that return Option
    let result = x
        .and_then(|n| if n > 0 { Some(n * 2) } else { None })
        .and_then(|n| Some(n + 1));
    println!("Chained: {:?}", result);  // Some(11)

    // filter: keep Some only if predicate passes
    let filtered = x.filter(|&n| n > 3);  // Some(5)
    let filtered_out = x.filter(|&n| n > 10);  // None

    // unwrap_or: provide default
    let value = y.unwrap_or(0);  // 0
    let value = y.unwrap_or_default();  // 0 for i32

    // unwrap_or_else: lazy default
    let value = y.unwrap_or_else(|| {
        println!("Computing default...");
        expensive_default()
    });

    // ok_or: convert Option to Result
    let result: Result<i32, &str> = x.ok_or("No value");
}

fn expensive_default() -> i32 {
    42
}
```

## Result Combinators

```rust
fn main() {
    let ok: Result<i32, &str> = Ok(5);
    let err: Result<i32, &str> = Err("failed");

    // map: transform success value
    let doubled = ok.map(|n| n * 2);  // Ok(10)
    let doubled_err = err.map(|n| n * 2);  // Err("failed")

    // map_err: transform error value
    let new_err = err.map_err(|e| format!("Error: {}", e));

    // and_then: chain fallible operations
    let result = ok
        .and_then(|n| if n > 0 { Ok(n * 2) } else { Err("negative") })
        .and_then(|n| Ok(n.to_string()));

    // unwrap_or, unwrap_or_else: same as Option
    let value = err.unwrap_or(0);  // 0

    // ok: convert Result to Option (discarding error)
    let opt: Option<i32> = ok.ok();  // Some(5)
    let opt: Option<i32> = err.ok();  // None

    // err: get the error as Option
    let e: Option<&str> = err.err();  // Some("failed")
}
```

## The ? Operator

Propagate errors with `?`:

```rust
use std::fs::File;
use std::io::{self, Read, Write};

fn copy_file(from: &str, to: &str) -> Result<(), io::Error> {
    let mut source = File::open(from)?;  // Returns early on error
    let mut dest = File::create(to)?;

    let mut contents = String::new();
    source.read_to_string(&mut contents)?;
    dest.write_all(contents.as_bytes())?;

    Ok(())
}

// ? also works with Option in functions returning Option
fn first_char(s: &str) -> Option<char> {
    let first_word = s.split_whitespace().next()?;
    first_word.chars().next()
}

fn main() {
    if let Err(e) = copy_file("source.txt", "dest.txt") {
        eprintln!("Copy failed: {}", e);
    }

    println!("First char: {:?}", first_char("hello world"));
}
```

## Practical Patterns

### Parsing with Options

```rust
fn parse_config(input: &str) -> Option<Config> {
    let mut lines = input.lines();

    let host = lines.next()?.trim();
    let port: u16 = lines.next()?.trim().parse().ok()?;
    let timeout: u64 = lines.next()?.trim().parse().ok()?;

    Some(Config {
        host: host.to_string(),
        port,
        timeout,
    })
}

struct Config {
    host: String,
    port: u16,
    timeout: u64,
}

fn main() {
    let input = "localhost\n8080\n30";
    if let Some(config) = parse_config(input) {
        println!("Host: {}, Port: {}", config.host, config.port);
    }
}
```

### Collecting Results

```rust
fn main() {
    let strings = vec!["1", "2", "3", "4"];

    // Collect into Result<Vec<_>, _>
    // Short-circuits on first error
    let numbers: Result<Vec<i32>, _> = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();

    println!("Numbers: {:?}", numbers);

    // With invalid input
    let strings = vec!["1", "two", "3"];
    let numbers: Result<Vec<i32>, _> = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();

    println!("Numbers: {:?}", numbers);  // Err(ParseIntError)

    // Partition successes and failures
    let (successes, failures): (Vec<_>, Vec<_>) = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .partition(Result::is_ok);

    let successes: Vec<i32> = successes.into_iter().map(Result::unwrap).collect();
    let failures: Vec<_> = failures.into_iter().map(Result::unwrap_err).collect();

    println!("Successes: {:?}", successes);
    println!("Failures: {:?}", failures);
}
```

### Option/Result Chaining

```rust
#[derive(Debug)]
struct User {
    name: String,
    email: Option<String>,
}

#[derive(Debug)]
struct Database {
    users: Vec<User>,
}

impl Database {
    fn find_user(&self, name: &str) -> Option<&User> {
        self.users.iter().find(|u| u.name == name)
    }
}

fn get_user_email(db: &Database, name: &str) -> Option<&str> {
    db.find_user(name)?
        .email
        .as_ref()
        .map(|s| s.as_str())
}

// Using and_then for more complex logic
fn get_domain(db: &Database, name: &str) -> Option<&str> {
    db.find_user(name)
        .and_then(|u| u.email.as_ref())
        .and_then(|email| email.split('@').nth(1))
}

fn main() {
    let db = Database {
        users: vec![
            User {
                name: "Alice".to_string(),
                email: Some("alice@example.com".to_string()),
            },
            User {
                name: "Bob".to_string(),
                email: None,
            },
        ],
    };

    println!("Alice's email: {:?}", get_user_email(&db, "Alice"));
    println!("Bob's email: {:?}", get_user_email(&db, "Bob"));
    println!("Alice's domain: {:?}", get_domain(&db, "Alice"));
}
```

### Converting Between Option and Result

```rust
fn main() {
    // Option to Result
    let opt: Option<i32> = Some(5);
    let result: Result<i32, &str> = opt.ok_or("Value was None");

    // Lazy error creation
    let result = opt.ok_or_else(|| format!("Missing value at {}", "location"));

    // Result to Option
    let result: Result<i32, &str> = Ok(5);
    let opt: Option<i32> = result.ok();  // Discards error

    // Keep both success and error as Options
    let (success, error) = match result {
        Ok(v) => (Some(v), None),
        Err(e) => (None, Some(e)),
    };

    // transpose: Option<Result<T, E>> <-> Result<Option<T>, E>
    let opt_result: Option<Result<i32, &str>> = Some(Ok(5));
    let result_opt: Result<Option<i32>, &str> = opt_result.transpose();
    println!("Transposed: {:?}", result_opt);  // Ok(Some(5))
}
```

## Summary

| Method | Option | Result | Purpose |
|--------|--------|--------|---------|
| `map` | Yes | Yes | Transform inner value |
| `and_then` | Yes | Yes | Chain fallible operations |
| `unwrap_or` | Yes | Yes | Provide default |
| `ok_or` | Yes | - | Convert to Result |
| `ok`/`err` | - | Yes | Convert to Option |
| `?` operator | Yes | Yes | Early return on None/Err |
| `transpose` | Yes | Yes | Swap Option and Result |

Option and Result are powerful tools for expressing fallibility. Use combinators for clean, chainable transformations. Use `?` for propagation. Avoid `unwrap()` in production code unless you are certain the value exists.
