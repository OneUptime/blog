# How to Build a Feature Flag Service with Hot Reload in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Feature Flags, Hot Reload, Configuration, DevOps

Description: Learn how to build a production-ready feature flag service in Rust that supports hot reloading configuration without restarts. This guide covers file watching, thread-safe state management, and building a simple HTTP API.

---

Feature flags let you toggle functionality in production without deploying new code. They are essential for gradual rollouts, A/B testing, and quick rollbacks when something goes wrong. Building your own feature flag service gives you full control over your deployment strategy and removes external dependencies from your critical path.

In this guide, we will build a feature flag service in Rust that watches a configuration file and automatically reloads changes - no restarts required. The service exposes a simple HTTP API that your applications can query to check flag states.

---

## Why Rust for Feature Flags?

Feature flag services sit in the hot path of every request. Latency matters. Rust gives you predictable performance without garbage collection pauses. Its ownership model makes concurrent access patterns safe by default, which is exactly what you need when multiple threads read configuration while another thread updates it.

The ecosystem has mature crates for file watching and HTTP servers. We will use `notify` for detecting file changes and `axum` for the HTTP layer.

---

## Project Setup

Create a new Rust project and add the dependencies:

```bash
cargo new feature-flags
cd feature-flags
```

Add these dependencies to your `Cargo.toml`:

```toml
[package]
name = "feature-flags"
version = "0.1.0"
edition = "2021"

[dependencies]
# HTTP server framework
axum = "0.7"
# Async runtime
tokio = { version = "1", features = ["full"] }
# File system watcher
notify = "6.1"
# JSON serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
# Thread-safe reference counting
arc-swap = "1.6"
# Logging
tracing = "0.1"
tracing-subscriber = "0.3"
```

---

## Defining the Flag Structure

Start by defining what a feature flag looks like. Each flag has a name, an enabled state, and optional metadata for percentage rollouts:

```rust
// src/flags.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Represents a single feature flag with its configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFlag {
    pub name: String,
    pub enabled: bool,
    // Optional: percentage of users who should see this feature (0-100)
    #[serde(default)]
    pub rollout_percentage: Option<u8>,
    // Optional: specific user IDs that always get this feature
    #[serde(default)]
    pub allowed_users: Vec<String>,
}

// Container for all flags loaded from config
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FlagConfig {
    pub flags: HashMap<String, FeatureFlag>,
}

impl FlagConfig {
    // Load flags from a JSON file
    pub fn from_file(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: FlagConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    // Check if a flag is enabled for a given user
    pub fn is_enabled(&self, flag_name: &str, user_id: Option<&str>) -> bool {
        match self.flags.get(flag_name) {
            Some(flag) => {
                // Flag is globally disabled
                if !flag.enabled {
                    return false;
                }

                // Check if user is in the allowed list
                if let Some(uid) = user_id {
                    if flag.allowed_users.contains(&uid.to_string()) {
                        return true;
                    }
                }

                // Check rollout percentage
                match flag.rollout_percentage {
                    Some(pct) if pct < 100 => {
                        // Use user_id hash for consistent assignment
                        let hash = user_id
                            .map(|u| Self::simple_hash(u))
                            .unwrap_or(50);
                        hash < pct as u64
                    }
                    _ => true, // No percentage or 100% means enabled
                }
            }
            None => false, // Unknown flags default to disabled
        }
    }

    // Simple hash function for consistent user bucketing
    fn simple_hash(s: &str) -> u64 {
        s.bytes().fold(0u64, |acc, b| {
            acc.wrapping_mul(31).wrapping_add(b as u64)
        }) % 100
    }
}
```

---

## Thread-Safe State with ArcSwap

The tricky part is updating the configuration while other threads are reading it. We need lock-free reads for performance but atomic updates for correctness. The `arc-swap` crate solves this elegantly:

```rust
// src/state.rs
use arc_swap::ArcSwap;
use std::sync::Arc;
use crate::flags::FlagConfig;

// Shared application state that can be safely accessed from multiple threads
pub struct AppState {
    // ArcSwap allows atomic replacement of the inner Arc
    // Readers get the current Arc without blocking
    // Writers atomically swap in a new Arc
    pub config: ArcSwap<FlagConfig>,
    pub config_path: String,
}

impl AppState {
    pub fn new(config_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let config = FlagConfig::from_file(config_path)?;
        Ok(Self {
            config: ArcSwap::from_pointee(config),
            config_path: config_path.to_string(),
        })
    }

    // Reload configuration from disk
    // This is called when the file watcher detects changes
    pub fn reload(&self) -> Result<(), Box<dyn std::error::Error>> {
        let new_config = FlagConfig::from_file(&self.config_path)?;
        // Atomically swap the configuration
        // Existing readers continue with old config until they finish
        self.config.store(Arc::new(new_config));
        tracing::info!("Configuration reloaded successfully");
        Ok(())
    }

    // Get current configuration for reading
    pub fn get_config(&self) -> arc_swap::Guard<Arc<FlagConfig>> {
        self.config.load()
    }
}
```

The `ArcSwap` type gives us the best of both worlds. Readers call `load()` to get a guard that holds a reference to the current configuration. They can read as long as they need without blocking. Writers call `store()` to atomically replace the configuration. Old readers finish with the old config, new readers get the new one.

---

## File Watcher with Debouncing

Now we add the hot reload capability. The `notify` crate watches the file system and sends events when files change. We add debouncing to avoid reloading multiple times when editors save files:

```rust
// src/watcher.rs
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use crate::state::AppState;

// Start watching the config file for changes
pub async fn watch_config(state: Arc<AppState>) -> Result<(), Box<dyn std::error::Error>> {
    // Channel for receiving file system events
    let (tx, mut rx) = mpsc::channel(100);

    // Create a watcher that sends events to our channel
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Only care about modify events
                if event.kind.is_modify() {
                    let _ = tx.blocking_send(event);
                }
            }
        },
        Config::default().with_poll_interval(Duration::from_secs(1)),
    )?;

    // Watch the config file
    watcher.watch(
        std::path::Path::new(&state.config_path),
        RecursiveMode::NonRecursive,
    )?;

    tracing::info!("Watching {} for changes", state.config_path);

    // Debounce timer - wait for file changes to settle
    let debounce_duration = Duration::from_millis(500);
    let mut last_event = std::time::Instant::now();

    loop {
        tokio::select! {
            Some(_event) = rx.recv() => {
                let now = std::time::Instant::now();
                // Debounce: only reload if enough time has passed
                if now.duration_since(last_event) > debounce_duration {
                    last_event = now;
                    // Small delay to let the file finish writing
                    tokio::time::sleep(Duration::from_millis(100)).await;

                    if let Err(e) = state.reload() {
                        tracing::error!("Failed to reload config: {}", e);
                    }
                }
            }
        }
    }
}
```

The debouncing is important. Text editors often write files in multiple steps, triggering several events. Without debouncing, you would reload multiple times for a single save operation.

---

## HTTP API with Axum

The HTTP layer is straightforward with Axum. We expose two endpoints - one to check a single flag and one to get all flags:

```rust
// src/api.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::state::AppState;

// Query parameters for flag checks
#[derive(Deserialize)]
pub struct FlagQuery {
    user_id: Option<String>,
}

// Response for single flag check
#[derive(Serialize)]
pub struct FlagResponse {
    flag: String,
    enabled: bool,
}

// Response for all flags
#[derive(Serialize)]
pub struct AllFlagsResponse {
    flags: Vec<FlagResponse>,
}

// Check if a specific flag is enabled
async fn check_flag(
    State(state): State<Arc<AppState>>,
    Path(flag_name): Path<String>,
    Query(query): Query<FlagQuery>,
) -> Json<FlagResponse> {
    let config = state.get_config();
    let enabled = config.is_enabled(&flag_name, query.user_id.as_deref());

    Json(FlagResponse {
        flag: flag_name,
        enabled,
    })
}

// Get all flags and their states for a user
async fn get_all_flags(
    State(state): State<Arc<AppState>>,
    Query(query): Query<FlagQuery>,
) -> Json<AllFlagsResponse> {
    let config = state.get_config();
    let flags: Vec<FlagResponse> = config
        .flags
        .keys()
        .map(|name| {
            let enabled = config.is_enabled(name, query.user_id.as_deref());
            FlagResponse {
                flag: name.clone(),
                enabled,
            }
        })
        .collect();

    Json(AllFlagsResponse { flags })
}

// Health check endpoint
async fn health() -> StatusCode {
    StatusCode::OK
}

// Build the router with all endpoints
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/flags", get(get_all_flags))
        .route("/flags/:flag_name", get(check_flag))
        .with_state(state)
}
```

---

## Putting It All Together

The main function ties everything together. It loads the initial configuration, starts the file watcher in a background task, and runs the HTTP server:

```rust
// src/main.rs
mod api;
mod flags;
mod state;
mod watcher;

use std::sync::Arc;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Load initial configuration
    let config_path = std::env::var("CONFIG_PATH")
        .unwrap_or_else(|_| "config/flags.json".to_string());

    let state = Arc::new(state::AppState::new(&config_path)?);
    tracing::info!("Loaded configuration from {}", config_path);

    // Start file watcher in background
    let watcher_state = state.clone();
    tokio::spawn(async move {
        if let Err(e) = watcher::watch_config(watcher_state).await {
            tracing::error!("File watcher error: {}", e);
        }
    });

    // Start HTTP server
    let app = api::create_router(state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Server running on http://0.0.0.0:3000");

    axum::serve(listener, app).await?;
    Ok(())
}
```

---

## Example Configuration File

Create a `config/flags.json` file to test with:

```json
{
  "flags": {
    "new_checkout_flow": {
      "name": "new_checkout_flow",
      "enabled": true,
      "rollout_percentage": 25,
      "allowed_users": ["user_123", "user_456"]
    },
    "dark_mode": {
      "name": "dark_mode",
      "enabled": true,
      "rollout_percentage": null,
      "allowed_users": []
    },
    "experimental_search": {
      "name": "experimental_search",
      "enabled": false,
      "rollout_percentage": null,
      "allowed_users": []
    }
  }
}
```

---

## Testing the Service

Run the server and test the endpoints:

```bash
# Start the server
CONFIG_PATH=config/flags.json cargo run

# Check a specific flag
curl "http://localhost:3000/flags/dark_mode"
# {"flag":"dark_mode","enabled":true}

# Check with user context for rollout
curl "http://localhost:3000/flags/new_checkout_flow?user_id=user_789"
# {"flag":"new_checkout_flow","enabled":false}

# Allowed user always gets the feature
curl "http://localhost:3000/flags/new_checkout_flow?user_id=user_123"
# {"flag":"new_checkout_flow","enabled":true}

# Get all flags
curl "http://localhost:3000/flags?user_id=user_123"
```

Now edit the configuration file while the server is running. The changes take effect immediately without restarting the service.

---

## Production Considerations

Before deploying to production, consider these additions:

1. **Caching on the client side** - Have your applications cache flag values for a few seconds to reduce load on the flag service.

2. **Metrics** - Add counters for flag checks and track which flags are being queried most often.

3. **Validation** - Validate the configuration before accepting it. Reject invalid JSON or missing required fields.

4. **Backup config** - If the new configuration fails to load, keep the old one running instead of crashing.

5. **Multiple config sources** - Support loading from environment variables or a remote config store in addition to files.

---

## Wrapping Up

We built a feature flag service that reloads configuration without restarts. The key techniques were using `ArcSwap` for lock-free concurrent reads and `notify` for file system watching with debouncing.

This service handles the core use case of checking flags for users. You can extend it with persistence, a management UI, or integration with your deployment pipeline. The foundation is solid and the performance characteristics are predictable.

Feature flags are one of those tools that seem simple but pay dividends in deployment confidence and incident response speed. Having your own service means you control the latency, availability, and data.

---

*Looking for comprehensive observability alongside your feature flags? [OneUptime](https://oneuptime.com) provides monitoring, alerting, and incident management to help you deploy with confidence.*
