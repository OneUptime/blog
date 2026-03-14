# How to Write Wasm Plugins in Rust for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Rust, Envoy, Proxy-wasm

Description: A comprehensive guide to writing WebAssembly plugins for Istio in Rust using the proxy-wasm SDK, covering project setup, patterns, and best practices.

---

Rust is the most mature language for writing Wasm plugins for Istio. The proxy-wasm Rust SDK is well-maintained, produces small binaries, and gives you memory safety without a garbage collector - which matters when your code runs inside a proxy handling production traffic. This post covers everything from project setup to advanced patterns.

## Why Rust for Wasm Plugins

Rust has several advantages for Wasm plugin development:

- **No garbage collector**: Wasm modules compiled from Rust are small and have predictable performance
- **Memory safety**: The compiler catches memory bugs before they become production incidents
- **Mature SDK**: The proxy-wasm Rust SDK (`proxy-wasm` crate) is the reference implementation
- **Small binaries**: Typical plugins compile to 100KB-500KB
- **Strong ecosystem**: serde_json for JSON parsing, regex for pattern matching, and many other crates work in Wasm

## Project Setup

```bash
# Install Rust if you have not already
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the wasm32-wasi target
rustup target add wasm32-wasi

# Create a new library project
cargo new --lib istio-wasm-plugin
cd istio-wasm-plugin
```

Set up `Cargo.toml`:

```toml
[package]
name = "istio-wasm-plugin"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
proxy-wasm = "0.2"
log = "0.4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
opt-level = "s"       # Optimize for size
lto = true            # Link-time optimization
strip = "debuginfo"   # Remove debug info
```

The `crate-type = ["cdylib"]` is required to produce a shared library that compiles to a Wasm module. The release profile settings keep the binary small.

## Understanding the Plugin Architecture

A Wasm plugin in Rust has three main components:

1. **Root Context** - Created once per plugin instance. Handles configuration and creates HTTP contexts.
2. **HTTP Context** - Created for each HTTP request. Handles request/response processing.
3. **Context trait** - Base trait for handling async callbacks (HTTP callouts, timers).

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;

// Entry point
proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(MyPluginRoot::default())
    });
}}

// Root context - handles configuration
#[derive(Default)]
struct MyPluginRoot {
    config: PluginConfig,
}

// HTTP context - handles individual requests
struct MyPluginHttp {
    config: PluginConfig,
}
```

## Configuration Handling Pattern

A clean pattern for handling plugin configuration:

```rust
use serde::Deserialize;

#[derive(Default, Clone, Deserialize)]
struct PluginConfig {
    #[serde(default)]
    enabled: bool,
    #[serde(default = "default_header")]
    header_name: String,
    #[serde(default)]
    allowed_paths: Vec<String>,
    #[serde(default = "default_timeout")]
    timeout_ms: u64,
}

fn default_header() -> String {
    "x-custom".to_string()
}

fn default_timeout() -> u64 {
    5000
}

impl Context for MyPluginRoot {}

impl RootContext for MyPluginRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        let config_bytes = match self.get_plugin_configuration() {
            Some(bytes) => bytes,
            None => {
                log::info!("No configuration provided, using defaults");
                self.config = PluginConfig::default();
                return true;
            }
        };

        match serde_json::from_slice::<PluginConfig>(&config_bytes) {
            Ok(config) => {
                log::info!("Plugin configured: enabled={}, header={}", config.enabled, config.header_name);
                self.config = config;
                true
            }
            Err(e) => {
                log::error!("Failed to parse configuration: {}", e);
                false
            }
        }
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        if !self.config.enabled {
            return None;  // Plugin disabled, do not create HTTP context
        }
        Some(Box::new(MyPluginHttp {
            config: self.config.clone(),
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}
```

## Request Processing Patterns

**Reading and modifying headers:**

```rust
impl HttpContext for MyPluginHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Read a header
        let user_agent = self.get_http_request_header("user-agent")
            .unwrap_or_else(|| "unknown".to_string());

        // Set a header (replaces if exists)
        self.set_http_request_header("x-processed-by", Some("wasm-plugin"));

        // Add a header (does not replace existing)
        self.add_http_request_header("x-trace-id", &format!("trace-{}", self.context_id));

        // Remove a header
        self.set_http_request_header("x-internal-only", None);

        // Get all headers
        let all_headers = self.get_http_request_headers();
        for (name, value) in &all_headers {
            log::debug!("Header: {}={}", name, value);
        }

        Action::Continue
    }
}
```

**Processing request body:**

```rust
fn on_http_request_body(&mut self, body_size: usize, end_of_stream: bool) -> Action {
    // Wait until we have the full body
    if !end_of_stream {
        return Action::Pause;
    }

    // Read the body
    if let Some(body) = self.get_http_request_body(0, body_size) {
        // Process the body
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&body) {
            log::info!("Request body has {} fields", json.as_object().map_or(0, |o| o.len()));
        }

        // Optionally modify the body
        // self.set_http_request_body(0, body_size, new_body.as_bytes());
    }

    Action::Continue
}
```

**Sending custom responses:**

```rust
fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
    let path = self.get_http_request_header(":path").unwrap_or_default();

    if path == "/blocked" {
        self.send_http_response(
            403,
            vec![
                ("content-type", "application/json"),
                ("x-blocked-by", "wasm-plugin"),
            ],
            Some(br#"{"error":"forbidden","reason":"path is blocked"}"#),
        );
        return Action::Pause;
    }

    Action::Continue
}
```

## Making HTTP Callouts

Wasm plugins can call external services asynchronously:

```rust
impl HttpContext for MyPluginHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Make an HTTP callout to an external service
        match self.dispatch_http_call(
            "ext-service.default.svc.cluster.local",
            vec![
                (":method", "GET"),
                (":path", "/check"),
                (":authority", "ext-service.default.svc.cluster.local"),
            ],
            None,
            vec![],
            std::time::Duration::from_millis(500),
        ) {
            Ok(_) => Action::Pause,  // Pause until callout returns
            Err(e) => {
                log::error!("Callout failed: {:?}", e);
                Action::Continue  // Continue without the callout
            }
        }
    }
}

impl Context for MyPluginHttp {
    fn on_http_call_response(
        &mut self,
        _token_id: u32,
        _num_headers: usize,
        body_size: usize,
        _num_trailers: usize,
    ) {
        let status = self.get_http_call_response_header(":status")
            .unwrap_or_else(|| "0".to_string());

        if status == "200" {
            // Callout succeeded, resume the original request
            self.resume_http_request();
        } else {
            // Callout failed, reject the request
            self.send_http_response(502, vec![], Some(b"upstream check failed"));
        }
    }
}
```

## Using Shared Data

Share data between plugin instances within the same Envoy process:

```rust
// Write shared data
let counter: u64 = 42;
self.set_shared_data("my_counter", Some(&counter.to_le_bytes()), None)
    .unwrap_or_else(|e| log::error!("Failed to set shared data: {:?}", e));

// Read shared data
if let (Some(data), _cas) = self.get_shared_data("my_counter") {
    if data.len() >= 8 {
        let counter = u64::from_le_bytes(data[0..8].try_into().unwrap());
        log::info!("Counter value: {}", counter);
    }
}
```

## Custom Metrics

Define and update Prometheus-compatible metrics:

```rust
impl RootContext for MyPluginRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        self.request_counter = self.define_metric(
            MetricType::Counter,
            "wasm_plugin_requests_total"
        ).unwrap();

        self.latency_histogram = self.define_metric(
            MetricType::Histogram,
            "wasm_plugin_latency_ms"
        ).unwrap();

        true
    }
}

impl HttpContext for MyPluginHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        self.increment_metric(self.request_counter, 1);
        Action::Continue
    }

    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        let duration = self.calculate_duration();
        self.record_metric(self.latency_histogram, duration);
        Action::Continue
    }
}
```

## Building and Optimizing

```bash
# Build for release
cargo build --target wasm32-wasi --release

# Check size
ls -lh target/wasm32-wasi/release/istio_wasm_plugin.wasm

# Optimize with wasm-opt
wasm-opt -O3 target/wasm32-wasi/release/istio_wasm_plugin.wasm -o plugin.wasm

# Final size check
ls -lh plugin.wasm
```

## Best Practices

1. **Always handle None/Err cases** - Headers can be missing, bodies can be empty, JSON can be malformed
2. **Keep dependencies minimal** - Every crate adds to binary size
3. **Use serde with derive** - It makes configuration parsing clean and type-safe
4. **Avoid panics** - Use `.unwrap_or_default()` instead of `.unwrap()`
5. **Log at appropriate levels** - Use `debug` for detailed tracing, `info` for normal operations, `error` for failures
6. **Test with real Envoy** - The Wasm VM in Envoy may behave differently from native execution

## Summary

Rust is the best language for writing Istio Wasm plugins. The proxy-wasm SDK provides typed access to all Envoy functionality through the RootContext, HttpContext, and Context traits. Use serde for configuration parsing, handle errors defensively, keep dependencies minimal for small binary sizes, and always compile with `--release` and `wasm-opt` for production.
