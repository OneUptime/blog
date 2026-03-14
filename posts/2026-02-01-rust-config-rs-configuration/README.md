# How to Handle Configuration with Config-rs in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Configuration, Config-rs, Environment Variables, TOML

Description: A practical guide to managing application configuration in Rust using config-rs with multiple sources and type safety.

---

Configuration management is one of those problems that seems simple until you actually have to deal with it in production. You need defaults, environment-specific overrides, secrets from environment variables, and ideally some way to validate everything at startup rather than crashing at 3 AM because someone typo'd a database URL.

In Rust, the `config-rs` crate handles all of this elegantly. It supports multiple configuration sources, layered overrides, and integrates seamlessly with serde for type-safe deserialization. Let's walk through setting it up properly.

## Setting Up Config-rs

First, add the dependencies to your `Cargo.toml`:

```toml
[dependencies]
config = "0.14"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

The `config` crate is the main library. We're pulling in `serde` with derive macros for automatic deserialization, and `serde_json` for JSON format support. You can swap JSON for TOML, YAML, or other formats depending on your preference.

## Defining Your Configuration Struct

Before loading any configuration, you need to define what your configuration looks like. This is where Rust's type system shines - you catch configuration errors at compile time rather than runtime.

```rust
// Define the shape of your configuration using serde's Deserialize trait.
// Each field maps to a configuration key, and nested structs create
// hierarchical configuration sections.
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Settings {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub timeout_seconds: u64,
}

#[derive(Debug, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
}
```

Notice how `workers` is wrapped in `Option<usize>`. This makes it optional in your configuration files - if it's missing, it deserializes to `None` rather than failing.

## Loading Configuration from a Single File

The simplest case is loading configuration from a single file. Here's how you do it:

```rust
// Load configuration from a single TOML file. The Config builder pattern
// lets you chain multiple sources together, but we're starting simple.
use config::{Config, File};

fn load_config() -> Result<Settings, config::ConfigError> {
    let settings = Config::builder()
        .add_source(File::with_name("config/default"))
        .build()?;
    
    settings.try_deserialize()
}
```

Config-rs automatically detects the file format from the extension. If you have `config/default.toml`, it parses TOML. If you have `config/default.json`, it parses JSON. No extra configuration needed.

Here's what the corresponding `config/default.toml` might look like:

```toml
[server]
host = "127.0.0.1"
port = 8080
workers = 4

[database]
url = "postgres://localhost/myapp"
max_connections = 10
timeout_seconds = 30

[logging]
level = "info"
format = "json"
```

## Layered Configuration with Multiple Sources

Real applications need more than one configuration source. You want sensible defaults, environment-specific overrides, and the ability to inject secrets via environment variables. Config-rs handles this through layering - later sources override earlier ones.

```rust
// Build configuration from multiple sources. Sources added later take
// precedence over earlier ones, so environment variables can override
// file-based configuration, and local overrides can override everything.
use config::{Config, File, Environment};
use std::env;

fn load_config() -> Result<Settings, config::ConfigError> {
    // Determine which environment we're running in
    let run_env = env::var("RUN_ENV").unwrap_or_else(|_| "development".into());
    
    let settings = Config::builder()
        // Start with default configuration
        .add_source(File::with_name("config/default"))
        
        // Layer environment-specific configuration on top
        // This file is optional - missing files don't cause errors
        .add_source(
            File::with_name(&format!("config/{}", run_env))
                .required(false)
        )
        
        // Local overrides for development (never commit this file)
        .add_source(
            File::with_name("config/local")
                .required(false)
        )
        
        // Environment variables take highest precedence
        // APP_SERVER__PORT=9000 would override server.port
        .add_source(
            Environment::with_prefix("APP")
                .separator("__")
        )
        
        .build()?;
    
    settings.try_deserialize()
}
```

The layering order matters. In this setup:

1. `config/default.toml` provides baseline values
2. `config/production.toml` or `config/development.toml` overrides environment-specific settings
3. `config/local.toml` lets developers customize without touching version-controlled files
4. Environment variables override everything - perfect for secrets and container deployments

## Environment Variable Mapping

The `Environment` source maps environment variables to configuration keys. The `separator("__")` tells config-rs to use double underscores for nested keys.

Given this configuration structure:

```rust
pub struct Settings {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
}
```

You can set values like this:

```bash
# Set server.port to 9000
export APP_SERVER__PORT=9000

# Set database.url (great for secrets)
export APP_DATABASE__URL="postgres://user:secret@prod-db/myapp"

# Set database.max_connections
export APP_DATABASE__MAX_CONNECTIONS=50
```

The prefix `APP_` prevents collisions with other environment variables. The double underscore `__` represents the dot separator in nested configuration.

## Environment-Specific Configuration Files

For each environment, create a configuration file that only contains the values that differ from defaults:

**config/development.toml:**
```toml
[logging]
level = "debug"
format = "pretty"

[database]
url = "postgres://localhost/myapp_dev"
```

**config/production.toml:**
```toml
[server]
workers = 16

[database]
max_connections = 100
timeout_seconds = 10

[logging]
level = "warn"
```

**config/staging.toml:**
```toml
[server]
workers = 8

[database]
max_connections = 50

[logging]
level = "info"
```

Keep these files minimal. Only override what actually changes between environments. This makes it obvious what's different and reduces the chance of configuration drift.

## Validating Configuration at Startup

One of the best things about deserializing to typed structs is validation. If a required value is missing or has the wrong type, you find out immediately at startup rather than when that code path executes.

```rust
// Validate configuration on application startup. This catches errors early
// and provides clear error messages before the application does any real work.
fn main() {
    let config = load_config().unwrap_or_else(|err| {
        eprintln!("Configuration error: {}", err);
        std::process::exit(1);
    });
    
    // Additional validation beyond type checking
    validate_config(&config).unwrap_or_else(|err| {
        eprintln!("Configuration validation failed: {}", err);
        std::process::exit(1);
    });
    
    println!("Configuration loaded successfully");
    println!("Server will listen on {}:{}", config.server.host, config.server.port);
    
    run_application(config);
}

// Custom validation logic for things that can't be expressed in types alone.
// For example, checking that ports are in valid ranges or URLs are well-formed.
fn validate_config(config: &Settings) -> Result<(), String> {
    if config.server.port < 1024 && config.server.port != 80 && config.server.port != 443 {
        return Err(format!(
            "Server port {} requires root privileges. Use a port >= 1024",
            config.server.port
        ));
    }
    
    if config.database.max_connections == 0 {
        return Err("Database max_connections must be greater than 0".into());
    }
    
    if config.database.timeout_seconds > 300 {
        return Err("Database timeout of more than 5 minutes is probably a mistake".into());
    }
    
    Ok(())
}
```

## Using Default Values in Structs

Sometimes you want defaults embedded in the struct definition itself, not just in configuration files. Serde's `default` attribute handles this:

```rust
// Use serde's default attribute to provide fallback values directly in the
// struct definition. This ensures the application always has sensible values
// even if configuration files are incomplete.
use serde::Deserialize;

fn default_port() -> u16 { 8080 }
fn default_host() -> String { "0.0.0.0".into() }
fn default_log_level() -> String { "info".into() }

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    #[serde(default = "default_host")]
    pub host: String,
    
    #[serde(default = "default_port")]
    pub port: u16,
    
    pub workers: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct LoggingConfig {
    #[serde(default = "default_log_level")]
    pub level: String,
    
    #[serde(default)]  // Uses String::default(), which is empty string
    pub format: String,
}
```

Now even if `[server]` section is completely missing from your config file, you'll get a valid `ServerConfig` with host `0.0.0.0` and port `8080`.

## Hot Reloading Configuration

For long-running applications, you might want to reload configuration without restarting. Config-rs doesn't have built-in hot reloading, but you can implement it with a file watcher:

```rust
// Hot reload configuration when files change. This is useful for long-running
// services where you want to adjust settings without downtime. Use with
// caution - some settings like database connections may require restarts anyway.
use std::sync::{Arc, RwLock};
use notify::{Watcher, RecursiveMode, watcher};
use std::sync::mpsc::channel;
use std::time::Duration;

pub struct ConfigManager {
    config: Arc<RwLock<Settings>>,
}

impl ConfigManager {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let config = load_config()?;
        
        Ok(Self {
            config: Arc::new(RwLock::new(config)),
        })
    }
    
    // Get a clone of the current configuration
    pub fn get(&self) -> Settings {
        self.config.read().unwrap().clone()
    }
    
    // Start watching for configuration file changes
    pub fn watch(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config = self.config.clone();
        let (tx, rx) = channel();
        
        let mut watcher = watcher(tx, Duration::from_secs(2))?;
        watcher.watch("config", RecursiveMode::Recursive)?;
        
        std::thread::spawn(move || {
            loop {
                match rx.recv() {
                    Ok(_event) => {
                        println!("Configuration file changed, reloading...");
                        match load_config() {
                            Ok(new_config) => {
                                let mut cfg = config.write().unwrap();
                                *cfg = new_config;
                                println!("Configuration reloaded successfully");
                            }
                            Err(e) => {
                                eprintln!("Failed to reload config: {}. Keeping old config.", e);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Watch error: {}", e);
                        break;
                    }
                }
            }
        });
        
        Ok(())
    }
}
```

Note the error handling in the reload path - if the new configuration is invalid, we keep the old one rather than crashing. This is critical for production stability.

## Handling Secrets Properly

Never put secrets in configuration files that get committed to version control. Instead, use environment variables for sensitive data:

```rust
// Configuration structure that separates secrets from regular configuration.
// Secrets should only come from environment variables, never from files.
#[derive(Debug, Deserialize)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub name: String,
    
    // These should only be set via environment variables
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: String,
}

impl DatabaseConfig {
    // Build a connection URL, ensuring secrets are provided
    pub fn connection_url(&self) -> Result<String, String> {
        if self.username.is_empty() || self.password.is_empty() {
            return Err(
                "Database credentials not configured. Set APP_DATABASE__USERNAME and APP_DATABASE__PASSWORD".into()
            );
        }
        
        Ok(format!(
            "postgres://{}:{}@{}:{}/{}",
            self.username, self.password, self.host, self.port, self.name
        ))
    }
}
```

In production, set credentials via environment variables or a secrets manager:

```bash
export APP_DATABASE__USERNAME="prod_user"
export APP_DATABASE__PASSWORD="$(vault read -field=password secret/database)"
```

## Putting It All Together

Here's a complete example that ties everything together:

```rust
// Complete configuration management setup with layered sources,
// environment-specific files, validation, and proper error handling.
use config::{Config, File, Environment};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    #[serde(default = "default_host")]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    pub workers: Option<usize>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    #[serde(default = "default_max_connections")]
    pub max_connections: u32,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
}

#[derive(Debug, Deserialize, Clone)]
pub struct LoggingConfig {
    #[serde(default = "default_log_level")]
    pub level: String,
    #[serde(default = "default_log_format")]
    pub format: String,
}

fn default_host() -> String { "0.0.0.0".into() }
fn default_port() -> u16 { 8080 }
fn default_max_connections() -> u32 { 10 }
fn default_timeout() -> u64 { 30 }
fn default_log_level() -> String { "info".into() }
fn default_log_format() -> String { "json".into() }

pub fn load_config() -> Result<Settings, config::ConfigError> {
    let run_env = env::var("RUN_ENV").unwrap_or_else(|_| "development".into());
    
    Config::builder()
        .add_source(File::with_name("config/default"))
        .add_source(File::with_name(&format!("config/{}", run_env)).required(false))
        .add_source(File::with_name("config/local").required(false))
        .add_source(Environment::with_prefix("APP").separator("__"))
        .build()?
        .try_deserialize()
}

fn main() {
    match load_config() {
        Ok(config) => {
            println!("Loaded configuration: {:?}", config);
            // Start your application with config
        }
        Err(e) => {
            eprintln!("Failed to load configuration: {}", e);
            std::process::exit(1);
        }
    }
}
```

## Key Takeaways

Configuration management doesn't have to be complicated. With config-rs:

- Define your configuration as typed Rust structs for compile-time safety
- Layer multiple sources with sensible precedence (defaults, environment files, local overrides, environment variables)
- Keep secrets out of files - use environment variables
- Validate early and fail fast at startup
- Use optional hot reloading for long-running services when appropriate

The combination of Rust's type system and config-rs's flexible source handling gives you configuration management that's both safe and practical. You catch errors at startup, not at 3 AM when that rarely-used code path finally executes with a malformed database URL.

---

*Monitor configuration changes with [OneUptime](https://oneuptime.com) - track when config affects application behavior.*
