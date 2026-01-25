# How to Implement Hot Configuration Reloading in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Configuration, Hot Reload, arc-swap, DevOps

Description: Learn how to build configuration systems in Rust that update without restarting your application, using arc-swap for lock-free atomic swaps and file watchers for automatic detection.

---

There comes a point in every long-running service where you need to change a configuration value without bringing the whole thing down. Maybe you need to bump a rate limit, toggle a feature flag, or update database connection pool sizes. Restarting works, but it is not always an option when you are running production traffic.

This guide walks through building a hot-reloadable configuration system in Rust. We will start simple and build up to a production-ready solution using `arc-swap` for lock-free reads and `notify` for file watching.

## The Problem with Naive Approaches

Your first instinct might be to wrap configuration in a `Mutex` or `RwLock`:

```rust
use std::sync::{Arc, RwLock};

// This works but has problems at scale
struct AppState {
    config: Arc<RwLock<Config>>,
}

fn get_timeout(state: &AppState) -> u64 {
    // Every read acquires a lock - contention under load
    state.config.read().unwrap().timeout_ms
}
```

This approach works for low-traffic services, but locks create contention. Every request that reads configuration competes for the same lock. Under heavy load, this becomes a bottleneck.

## Enter arc-swap: Lock-Free Configuration

The `arc-swap` crate provides atomic operations on `Arc` pointers. Readers get the current configuration without any locking. Writers atomically swap in new configurations. Old configurations are automatically cleaned up when all readers finish with them.

Add the dependencies to your `Cargo.toml`:

```toml
[dependencies]
arc-swap = "1.6"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
notify = "6.1"
tokio = { version = "1", features = ["full"] }
```

Here is the basic structure:

```rust
use arc_swap::ArcSwap;
use serde::Deserialize;
use std::sync::Arc;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub server_port: u16,
    pub timeout_ms: u64,
    pub max_connections: usize,
    pub feature_flags: FeatureFlags,
}

#[derive(Debug, Deserialize, Clone)]
pub struct FeatureFlags {
    pub enable_caching: bool,
    pub enable_rate_limiting: bool,
    pub rate_limit_per_second: u32,
}

// ArcSwap allows atomic swaps of Arc pointers
// Readers never block - they get a snapshot of current config
pub struct ConfigManager {
    config: ArcSwap<Config>,
    path: String,
}

impl ConfigManager {
    pub fn new(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let config = Self::load_from_file(path)?;
        Ok(Self {
            config: ArcSwap::from_pointee(config),
            path: path.to_string(),
        })
    }

    fn load_from_file(path: &str) -> Result<Config, Box<dyn std::error::Error>> {
        let contents = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&contents)?;
        Ok(config)
    }

    // Load returns an Arc guard - very cheap, no locking
    pub fn get(&self) -> arc_swap::Guard<Arc<Config>> {
        self.config.load()
    }

    // Atomic swap - readers see either old or new, never partial
    pub fn reload(&self) -> Result<(), Box<dyn std::error::Error>> {
        let new_config = Self::load_from_file(&self.path)?;
        self.config.store(Arc::new(new_config));
        Ok(())
    }
}
```

The key insight here is that `load()` returns a guard that holds a reference to the current configuration. This is essentially free - no locks, no atomic increments beyond the initial load. Multiple threads can call `get()` simultaneously without any coordination.

## Adding File Watching

Manually calling `reload()` works, but automatic detection is better. The `notify` crate watches files for changes and triggers callbacks:

```rust
use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;
use std::time::Duration;

impl ConfigManager {
    // Spawns a background thread that watches for file changes
    // and automatically reloads configuration
    pub fn watch_for_changes(
        manager: Arc<ConfigManager>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let (tx, rx) = channel();

        let mut watcher = RecommendedWatcher::new(
            move |res| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            NotifyConfig::default().with_poll_interval(Duration::from_secs(2)),
        )?;

        let path = manager.path.clone();
        watcher.watch(Path::new(&path), RecursiveMode::NonRecursive)?;

        // Spawn watcher thread
        std::thread::spawn(move || {
            // Keep watcher alive
            let _watcher = watcher;

            for event in rx {
                // Filter for modify events only
                if event.kind.is_modify() {
                    println!("Config file changed, reloading...");

                    // Small delay to ensure file write is complete
                    std::thread::sleep(Duration::from_millis(100));

                    match manager.reload() {
                        Ok(()) => println!("Configuration reloaded successfully"),
                        Err(e) => eprintln!("Failed to reload config: {}", e),
                    }
                }
            }
        });

        Ok(())
    }
}
```

One subtle issue: file systems often generate multiple events for a single save operation. Editors may write to a temporary file and rename, or truncate and rewrite. The small delay helps avoid parsing a partially-written file.

## Validation Before Swap

Never swap in invalid configuration. Validate everything before the atomic swap:

```rust
impl Config {
    // Validate configuration before accepting it
    pub fn validate(&self) -> Result<(), String> {
        if self.server_port == 0 {
            return Err("server_port must be non-zero".into());
        }

        if self.timeout_ms == 0 {
            return Err("timeout_ms must be non-zero".into());
        }

        if self.max_connections == 0 {
            return Err("max_connections must be non-zero".into());
        }

        if self.feature_flags.enable_rate_limiting
            && self.feature_flags.rate_limit_per_second == 0
        {
            return Err("rate_limit_per_second must be set when rate limiting is enabled".into());
        }

        Ok(())
    }
}

impl ConfigManager {
    pub fn reload_with_validation(&self) -> Result<(), Box<dyn std::error::Error>> {
        let new_config = Self::load_from_file(&self.path)?;

        // Validate before swapping - never expose invalid config
        new_config.validate()?;

        self.config.store(Arc::new(new_config));
        Ok(())
    }
}
```

If validation fails, the old configuration stays active. Your service keeps running with known-good values instead of crashing or behaving unpredictably.

## Using Configuration in Request Handlers

Here is how this fits into a web service. Each request gets a snapshot of the current configuration:

```rust
use std::sync::Arc;

// Application state shared across all request handlers
pub struct AppState {
    pub config: Arc<ConfigManager>,
    // ... other shared state
}

// Example handler using Axum-style patterns
async fn handle_request(state: Arc<AppState>) -> String {
    // Get current config - lock-free, very fast
    let config = state.config.get();

    // Use configuration values
    if config.feature_flags.enable_rate_limiting {
        // Check rate limit using config.feature_flags.rate_limit_per_second
    }

    // Config snapshot is consistent for entire request
    // Even if config reloads mid-request, this handler sees
    // the same values throughout
    format!("Timeout is {} ms", config.timeout_ms)
}
```

The configuration snapshot stays consistent for the entire request duration. If someone reloads the configuration while your handler is running, your handler still sees the original values. The next request gets the new configuration. This prevents weird bugs where half your request uses old values and half uses new values.

## Callbacks for Configuration Changes

Sometimes you need to react to configuration changes, not just read new values. Maybe you need to resize a connection pool or update a cache TTL:

```rust
use std::sync::Mutex;

type ConfigCallback = Box<dyn Fn(&Config, &Config) + Send + Sync>;

pub struct ConfigManagerWithCallbacks {
    config: ArcSwap<Config>,
    path: String,
    callbacks: Mutex<Vec<ConfigCallback>>,
}

impl ConfigManagerWithCallbacks {
    pub fn on_change<F>(&self, callback: F)
    where
        F: Fn(&Config, &Config) + Send + Sync + 'static,
    {
        self.callbacks.lock().unwrap().push(Box::new(callback));
    }

    pub fn reload(&self) -> Result<(), Box<dyn std::error::Error>> {
        let old_config = self.config.load();
        let new_config = Self::load_from_file(&self.path)?;

        new_config.validate()?;

        let new_arc = Arc::new(new_config);
        self.config.store(Arc::clone(&new_arc));

        // Notify all registered callbacks
        let callbacks = self.callbacks.lock().unwrap();
        for callback in callbacks.iter() {
            callback(&old_config, &new_arc);
        }

        Ok(())
    }
}

// Usage example
fn setup_callbacks(config_manager: &ConfigManagerWithCallbacks) {
    config_manager.on_change(|old, new| {
        if old.max_connections != new.max_connections {
            println!(
                "Connection pool size changed: {} -> {}",
                old.max_connections, new.max_connections
            );
            // Trigger pool resize here
        }
    });

    config_manager.on_change(|old, new| {
        if old.feature_flags.enable_caching != new.feature_flags.enable_caching {
            println!("Caching toggled, clearing cache...");
            // Clear cache here
        }
    });
}
```

Callbacks receive both old and new configuration, so you can detect what actually changed and react accordingly.

## Graceful Reload via Signal Handling

For Unix systems, SIGHUP is the traditional signal for configuration reload:

```rust
use tokio::signal::unix::{signal, SignalKind};

async fn setup_signal_handler(config_manager: Arc<ConfigManager>) {
    let mut sighup = signal(SignalKind::hangup()).expect("Failed to register SIGHUP handler");

    tokio::spawn(async move {
        loop {
            sighup.recv().await;
            println!("Received SIGHUP, reloading configuration...");

            match config_manager.reload() {
                Ok(()) => println!("Configuration reloaded via SIGHUP"),
                Err(e) => eprintln!("Failed to reload configuration: {}", e),
            }
        }
    });
}
```

Now you can reload configuration with `kill -HUP <pid>` without touching the config file watcher.

## Testing Hot Reload

Test that reloads actually work and that invalid configurations get rejected:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_reload_updates_values() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(file, r#"{{
            "server_port": 8080,
            "timeout_ms": 1000,
            "max_connections": 100,
            "feature_flags": {{
                "enable_caching": false,
                "enable_rate_limiting": false,
                "rate_limit_per_second": 0
            }}
        }}"#).unwrap();

        let manager = ConfigManager::new(file.path().to_str().unwrap()).unwrap();
        assert_eq!(manager.get().timeout_ms, 1000);

        // Update file
        file.reopen().unwrap();
        writeln!(file, r#"{{
            "server_port": 8080,
            "timeout_ms": 2000,
            "max_connections": 100,
            "feature_flags": {{
                "enable_caching": false,
                "enable_rate_limiting": false,
                "rate_limit_per_second": 0
            }}
        }}"#).unwrap();

        manager.reload().unwrap();
        assert_eq!(manager.get().timeout_ms, 2000);
    }

    #[test]
    fn test_invalid_config_rejected() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(file, r#"{{
            "server_port": 8080,
            "timeout_ms": 1000,
            "max_connections": 100,
            "feature_flags": {{
                "enable_caching": false,
                "enable_rate_limiting": false,
                "rate_limit_per_second": 0
            }}
        }}"#).unwrap();

        let manager = ConfigManager::new(file.path().to_str().unwrap()).unwrap();

        // Write invalid config
        file.reopen().unwrap();
        writeln!(file, r#"{{
            "server_port": 0,
            "timeout_ms": 1000,
            "max_connections": 100,
            "feature_flags": {{
                "enable_caching": false,
                "enable_rate_limiting": false,
                "rate_limit_per_second": 0
            }}
        }}"#).unwrap();

        // Reload should fail, old config preserved
        assert!(manager.reload_with_validation().is_err());
        assert_eq!(manager.get().server_port, 8080);
    }
}
```

## Summary

Building hot-reloadable configuration in Rust comes down to a few key pieces:

- Use `arc-swap` for lock-free reads and atomic swaps
- Watch config files with `notify` for automatic detection
- Always validate before swapping to keep your service running with good values
- Use callbacks when you need to react to changes, not just read new values
- Handle SIGHUP for manual reload triggers
- Test both successful reloads and rejection of invalid configurations

The beauty of this approach is that readers never block and never see partial updates. Your service keeps serving requests at full speed while configuration updates happen atomically in the background.
