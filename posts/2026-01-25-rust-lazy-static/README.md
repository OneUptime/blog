# How to Use lazy_static for Runtime Initialization in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, lazy_static, Statics, Initialization, Configuration

Description: Learn how to use lazy_static and once_cell for runtime-initialized global variables in Rust. This guide covers static initialization, thread safety, and best practices.

---

Rust's static variables must be initialized with constant expressions, which limits their usefulness for complex data. The lazy_static crate and the standard library's once_cell module allow you to initialize statics at runtime while maintaining thread safety.

## The Problem with Static Initialization

Static variables in Rust must be const-evaluable.

```rust
// This works - constant expression
static NUMBERS: [i32; 3] = [1, 2, 3];

// This does NOT work - requires runtime evaluation
// static REGEX: Regex = Regex::new(r"\d+").unwrap();
// error: calls in statics are limited to constant functions

// This also does NOT work
// static CONFIG: HashMap<String, String> = HashMap::new();
// error: HashMap::new is not a const fn (until recent Rust versions)

fn main() {
    println!("{:?}", NUMBERS);
}
```

## Using lazy_static

The lazy_static crate initializes values on first access.

```toml
# Cargo.toml
[dependencies]
lazy_static = "1.4"
regex = "1"
```

```rust
use lazy_static::lazy_static;
use regex::Regex;
use std::collections::HashMap;

lazy_static! {
    // Regex pattern - compiled once, reused
    static ref EMAIL_REGEX: Regex = Regex::new(
        r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    ).unwrap();

    // HashMap with initial values
    static ref CODES: HashMap<&'static str, i32> = {
        let mut m = HashMap::new();
        m.insert("OK", 200);
        m.insert("NOT_FOUND", 404);
        m.insert("SERVER_ERROR", 500);
        m
    };

    // Complex initialization
    static ref CONFIG: Config = Config::load_from_env();
}

struct Config {
    debug: bool,
    port: u16,
}

impl Config {
    fn load_from_env() -> Self {
        Config {
            debug: std::env::var("DEBUG").is_ok(),
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
        }
    }
}

fn is_valid_email(email: &str) -> bool {
    EMAIL_REGEX.is_match(email)
}

fn main() {
    println!("Valid email: {}", is_valid_email("test@example.com"));
    println!("OK code: {:?}", CODES.get("OK"));
    println!("Debug: {}, Port: {}", CONFIG.debug, CONFIG.port);
}
```

## Using once_cell (Standard Library)

Modern Rust includes once_cell in the standard library (stabilized in Rust 1.70+).

```rust
use std::sync::OnceLock;
use std::collections::HashMap;

// Static with OnceLock
static CONFIG: OnceLock<Config> = OnceLock::new();

struct Config {
    database_url: String,
    max_connections: u32,
}

fn get_config() -> &'static Config {
    CONFIG.get_or_init(|| {
        // Initialize on first call
        Config {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| String::from("postgres://localhost/db")),
            max_connections: 10,
        }
    })
}

// For non-static lazy initialization
use std::cell::OnceCell;

fn main() {
    let config = get_config();
    println!("Database: {}", config.database_url);

    // Second call returns same instance
    let config2 = get_config();
    println!("Connections: {}", config2.max_connections);

    // OnceCell for local lazy values
    let cell = OnceCell::new();
    let value = cell.get_or_init(|| expensive_computation());
    println!("Value: {}", value);
}

fn expensive_computation() -> i32 {
    println!("Computing...");
    42
}
```

## Thread-Safe Lazy Initialization

Both lazy_static and OnceLock are thread-safe.

```rust
use lazy_static::lazy_static;
use std::sync::Mutex;
use std::thread;

lazy_static! {
    // Thread-safe counter
    static ref COUNTER: Mutex<i32> = Mutex::new(0);

    // Read-only data (no mutex needed)
    static ref DATA: Vec<i32> = {
        println!("Initializing DATA...");
        (0..100).collect()
    };
}

fn main() {
    let mut handles = vec![];

    // Multiple threads incrementing counter
    for _ in 0..10 {
        let handle = thread::spawn(|| {
            for _ in 0..100 {
                let mut count = COUNTER.lock().unwrap();
                *count += 1;
            }
        });
        handles.push(handle);
    }

    // Multiple threads reading data
    for i in 0..3 {
        let handle = thread::spawn(move || {
            // DATA is initialized only once, on first access
            println!("Thread {} sees {} items", i, DATA.len());
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", *COUNTER.lock().unwrap());
}
```

## Common Patterns

### Configuration Loading

```rust
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::fs;

lazy_static! {
    static ref CONFIG: AppConfig = AppConfig::load();
}

struct AppConfig {
    settings: HashMap<String, String>,
}

impl AppConfig {
    fn load() -> Self {
        // Load from file, environment, or defaults
        let settings = fs::read_to_string("config.txt")
            .ok()
            .map(|content| {
                content
                    .lines()
                    .filter_map(|line| {
                        let parts: Vec<&str> = line.splitn(2, '=').collect();
                        if parts.len() == 2 {
                            Some((parts[0].to_string(), parts[1].to_string()))
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        AppConfig { settings }
    }

    fn get(&self, key: &str) -> Option<&String> {
        self.settings.get(key)
    }
}

fn main() {
    if let Some(value) = CONFIG.get("some_key") {
        println!("Value: {}", value);
    }
}
```

### Regex Collections

```rust
use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref PATTERNS: Patterns = Patterns::new();
}

struct Patterns {
    email: Regex,
    phone: Regex,
    url: Regex,
}

impl Patterns {
    fn new() -> Self {
        Patterns {
            email: Regex::new(r"^[\w.+-]+@[\w.-]+\.\w{2,}$").unwrap(),
            phone: Regex::new(r"^\+?1?\d{10,14}$").unwrap(),
            url: Regex::new(r"^https?://[\w.-]+(?:/[\w./-]*)?$").unwrap(),
        }
    }

    fn is_email(&self, s: &str) -> bool {
        self.email.is_match(s)
    }

    fn is_phone(&self, s: &str) -> bool {
        self.phone.is_match(s)
    }

    fn is_url(&self, s: &str) -> bool {
        self.url.is_match(s)
    }
}

fn main() {
    println!("Email valid: {}", PATTERNS.is_email("test@example.com"));
    println!("Phone valid: {}", PATTERNS.is_phone("+1234567890"));
    println!("URL valid: {}", PATTERNS.is_url("https://example.com/path"));
}
```

### Singleton Pattern

```rust
use lazy_static::lazy_static;
use std::sync::Mutex;

lazy_static! {
    static ref INSTANCE: Mutex<Database> = Mutex::new(Database::new());
}

struct Database {
    connections: u32,
}

impl Database {
    fn new() -> Self {
        println!("Creating database instance");
        Database { connections: 0 }
    }

    fn connect(&mut self) {
        self.connections += 1;
        println!("Connected. Total: {}", self.connections);
    }

    fn disconnect(&mut self) {
        if self.connections > 0 {
            self.connections -= 1;
        }
        println!("Disconnected. Total: {}", self.connections);
    }
}

fn main() {
    {
        let mut db = INSTANCE.lock().unwrap();
        db.connect();
        db.connect();
    }

    {
        let mut db = INSTANCE.lock().unwrap();
        db.disconnect();
    }
}
```

## Best Practices

### Do Not Overuse Global State

```rust
// Prefer dependency injection over globals
struct Service {
    config: Config,
}

impl Service {
    fn new(config: Config) -> Self {
        Service { config }
    }

    fn do_work(&self) {
        println!("Using config: {:?}", self.config.port);
    }
}

#[derive(Debug)]
struct Config {
    port: u16,
}

fn main() {
    let config = Config { port: 8080 };
    let service = Service::new(config);
    service.do_work();
}
```

### Use for Truly Global State

```rust
use lazy_static::lazy_static;
use std::sync::atomic::{AtomicU64, Ordering};

lazy_static! {
    // Counters and metrics
    static ref REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);

    // Pre-computed lookup tables
    static ref FIBONACCI: Vec<u64> = {
        let mut fib = vec![0, 1];
        for i in 2..100 {
            fib.push(fib[i - 1] + fib[i - 2]);
        }
        fib
    };
}

fn handle_request() {
    REQUEST_COUNT.fetch_add(1, Ordering::Relaxed);
}

fn get_fib(n: usize) -> Option<u64> {
    FIBONACCI.get(n).copied()
}

fn main() {
    handle_request();
    handle_request();
    println!("Requests: {}", REQUEST_COUNT.load(Ordering::Relaxed));
    println!("Fib(10): {:?}", get_fib(10));
}
```

## Choosing Between lazy_static and OnceLock

| Feature | lazy_static | OnceLock |
|---------|-------------|----------|
| Standard library | No (crate) | Yes (1.70+) |
| Macro-based | Yes | No |
| Custom types | Yes | Yes |
| Thread-safe | Yes | Yes |
| Non-static use | No | Yes (OnceCell) |

## Summary

lazy_static and OnceLock solve the problem of runtime-initialized static variables:

- Use `lazy_static!` macro for complex static initialization
- Use `OnceLock` from std for modern Rust projects
- Both are thread-safe and initialize only once
- First access triggers initialization

Common use cases:

- Compiled regular expressions
- Configuration loaded from files or environment
- Pre-computed lookup tables
- Connection pools and singletons

Prefer dependency injection when possible, and use lazy statics for truly global, immutable data that benefits from static storage.
