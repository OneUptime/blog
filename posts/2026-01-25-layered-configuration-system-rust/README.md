# How to Build a Layered Configuration System in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Configuration, config-rs, Environment Variables, Best Practices

Description: Learn how to build a flexible, production-ready configuration system in Rust using layered sources like defaults, config files, and environment variables with the config-rs crate.

---

Configuration management is one of those things you do not think about until it becomes a problem. Hardcoded values scattered across your codebase, environment variables that may or may not exist, and config files that differ between development and production - it gets messy fast. A layered configuration system solves this by establishing a clear hierarchy of configuration sources, where each layer can override the previous one.

In this guide, we will build a practical configuration system in Rust using the `config` crate (also known as config-rs). By the end, you will have a setup that pulls configuration from multiple sources with predictable override behavior.

## Why Layered Configuration?

Consider a typical application that needs a database URL. In development, you want `localhost`. In staging, it points to a test database. In production, it comes from an environment variable injected by your orchestration platform. A layered system handles this naturally:

1. **Default values** - Sensible fallbacks baked into the code
2. **Base config file** - Shared settings across all environments
3. **Environment-specific files** - Override settings per environment
4. **Environment variables** - Final overrides for secrets and deployment-specific values

Each layer builds on the previous one. Environment variables always win because they are set at runtime and often contain secrets that should never touch version control.

## Setting Up the Project

First, add the necessary dependencies to your `Cargo.toml`:

```toml
[dependencies]
config = "0.14"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

The `config` crate does the heavy lifting for parsing and merging configuration sources. Serde handles serialization into your Rust structs.

## Defining Your Configuration Structure

Start by defining what your configuration looks like. Using strongly-typed structs catches configuration errors at startup rather than runtime:

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: usize,
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub timeout_seconds: u64,
}

#[derive(Debug, Deserialize, Clone)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
}
```

This structure gives you compile-time guarantees about what configuration values exist and their types.

## Building the Configuration Loader

Here is where the layering happens. We will build the configuration step by step, with each source potentially overriding the previous:

```rust
use config::{Config, ConfigError, Environment, File};
use std::env;

impl AppConfig {
    pub fn load() -> Result<Self, ConfigError> {
        // Determine which environment we are running in
        let run_mode = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let config = Config::builder()
            // Layer 1: Start with default values
            .set_default("server.host", "127.0.0.1")?
            .set_default("server.port", 8080)?
            .set_default("server.workers", 4)?
            .set_default("database.max_connections", 10)?
            .set_default("database.timeout_seconds", 30)?
            .set_default("logging.level", "info")?
            .set_default("logging.format", "json")?

            // Layer 2: Merge in the base configuration file
            .add_source(File::with_name("config/base").required(false))

            // Layer 3: Merge in environment-specific configuration
            .add_source(File::with_name(&format!("config/{}", run_mode)).required(false))

            // Layer 4: Merge in local overrides (not committed to git)
            .add_source(File::with_name("config/local").required(false))

            // Layer 5: Environment variables with APP_ prefix
            // APP_SERVER__PORT=3000 maps to server.port
            .add_source(
                Environment::with_prefix("APP")
                    .prefix_separator("_")
                    .separator("__")
            )

            .build()?;

        // Deserialize into our strongly-typed struct
        config.try_deserialize()
    }
}
```

Notice the double underscore in the environment variable separator. This allows `APP_SERVER__PORT` to map to the nested `server.port` field. The single underscore separates the prefix, while the double underscore separates nested keys.

## Creating Configuration Files

Set up your configuration files following the TOML format. Create a `config` directory with these files:

**config/base.toml** - Shared settings:

```toml
[logging]
format = "json"

[database]
max_connections = 20
timeout_seconds = 30
```

**config/development.toml** - Development overrides:

```toml
[server]
host = "127.0.0.1"
port = 3000
workers = 2

[database]
url = "postgres://localhost/myapp_dev"

[logging]
level = "debug"
```

**config/production.toml** - Production settings:

```toml
[server]
host = "0.0.0.0"
port = 8080
workers = 16

[database]
max_connections = 100
timeout_seconds = 10

[logging]
level = "warn"
```

The database URL is intentionally missing from production.toml. It should come from an environment variable, never from a file that might end up in version control.

## Using the Configuration

Here is how you wire it all together in your main function:

```rust
fn main() {
    // Load configuration - fail fast if something is wrong
    let config = AppConfig::load().expect("Failed to load configuration");

    println!("Starting server on {}:{}", config.server.host, config.server.port);
    println!("Database: {}", config.database.url);
    println!("Log level: {}", config.logging.level);

    // Pass config to your application components
    start_server(&config);
}

fn start_server(config: &AppConfig) {
    // Your server initialization code here
}
```

## Validating Configuration at Startup

The type system catches many errors, but you might want additional validation. Add a validation method to your config:

```rust
impl AppConfig {
    pub fn validate(&self) -> Result<(), String> {
        // Check that the database URL is not empty
        if self.database.url.is_empty() {
            return Err("database.url cannot be empty".to_string());
        }

        // Validate port range
        if self.server.port == 0 {
            return Err("server.port must be greater than 0".to_string());
        }

        // Validate worker count
        if self.server.workers == 0 {
            return Err("server.workers must be at least 1".to_string());
        }

        // Validate log level
        let valid_levels = ["trace", "debug", "info", "warn", "error"];
        if !valid_levels.contains(&self.logging.level.to_lowercase().as_str()) {
            return Err(format!(
                "logging.level must be one of: {}",
                valid_levels.join(", ")
            ));
        }

        Ok(())
    }
}
```

Call this right after loading:

```rust
let config = AppConfig::load().expect("Failed to load configuration");
config.validate().expect("Invalid configuration");
```

## Handling Secrets Properly

Never put secrets in configuration files. Use environment variables or a secrets manager. Here is a pattern that makes this explicit:

```rust
#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub timeout_seconds: u64,
    // Password comes separately from secrets manager
    #[serde(skip)]
    pub password: Option<String>,
}

impl AppConfig {
    pub fn load_with_secrets() -> Result<Self, ConfigError> {
        let mut config = Self::load()?;

        // Load secrets from environment or secrets manager
        if let Ok(db_password) = env::var("DATABASE_PASSWORD") {
            config.database.password = Some(db_password);
        }

        Ok(config)
    }
}
```

## Testing with Different Configurations

For testing, you can override configuration programmatically:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> AppConfig {
        AppConfig {
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 0, // Random available port
                workers: 1,
            },
            database: DatabaseConfig {
                url: "postgres://localhost/myapp_test".to_string(),
                max_connections: 5,
                timeout_seconds: 5,
            },
            logging: LoggingConfig {
                level: "debug".to_string(),
                format: "pretty".to_string(),
            },
        }
    }

    #[test]
    fn test_server_initialization() {
        let config = test_config();
        assert_eq!(config.server.workers, 1);
    }
}
```

## Summary

A layered configuration system brings order to the chaos of managing settings across environments. The key principles are:

- Use strongly-typed structs for compile-time safety
- Layer sources from most general (defaults) to most specific (environment variables)
- Keep secrets out of files - use environment variables
- Validate configuration at startup to fail fast
- Make environment-specific overrides explicit in separate files

The config-rs crate handles the complexity of merging multiple sources while your Rust structs ensure type safety. This combination gives you flexibility during development and confidence in production.
