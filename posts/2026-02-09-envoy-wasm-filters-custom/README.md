# How to Configure Envoy WASM Filters for Custom Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, WASM, Service Mesh, Proxy, WebAssembly

Description: Learn how to build and deploy custom WASM filters in Envoy proxy for advanced request processing, security policies, and protocol extensions with practical examples.

---

WebAssembly (WASM) filters represent one of the most powerful extensibility mechanisms in Envoy proxy. Instead of modifying Envoy's core codebase or relying solely on built-in filters, WASM lets you write custom logic in languages like Rust, C++, or AssemblyScript, compile it to WASM bytecode, and run it directly within Envoy. This approach gives you near-native performance with strong sandboxing and portability across different Envoy versions and platforms.

WASM filters operate within Envoy's filter chain, intercepting HTTP requests and responses just like native filters. The difference is that WASM filters run in a secure sandbox with defined resource limits, making them safer for production deployments. You can use WASM filters for custom authentication, request transformation, protocol translation, or any processing logic that doesn't exist in Envoy's standard filter set.

## Understanding Envoy WASM Architecture

Envoy embeds a WASM runtime (typically V8 or WAVM) that executes your compiled WASM modules. Each filter instance runs in its own sandbox with limited access to Envoy internals through the proxy-wasm ABI (Application Binary Interface). This ABI defines how WASM code interacts with Envoy's host environment, including reading headers, accessing request bodies, making HTTP calls, and logging.

The proxy-wasm specification provides SDKs for multiple languages. The most mature is proxy-wasm-rust-sdk, but proxy-wasm-cpp-sdk and AssemblyScript versions also exist. Your WASM filter implements callback functions like `on_request_headers`, `on_request_body`, and `on_response_headers` that Envoy invokes at different stages of request processing.

## Building a Simple WASM Filter

Let's build a custom header injection filter in Rust. This filter adds a custom header to all requests passing through Envoy.

First, set up a new Rust project with the proxy-wasm SDK:

```rust
// Cargo.toml
[package]
name = "custom-header-filter"
version = "0.1.0"
edition = "2021"

[dependencies]
proxy-wasm = "0.2"
log = "0.4"

[lib]
crate-type = ["cdylib"]

[profile.release]
opt-level = 3
lto = true
```

Now implement the filter logic:

```rust
// src/lib.rs
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use log::info;

// Define the root context for configuration
struct CustomHeaderRoot;

impl Context for CustomHeaderRoot {}

impl RootContext for CustomHeaderRoot {
    fn on_vm_start(&mut self, _vm_configuration_size: usize) -> bool {
        info!("WASM filter initialized");
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(CustomHeaderFilter {
            request_id: 0,
        }))
    }
}

// Define the HTTP context for request processing
struct CustomHeaderFilter {
    request_id: u32,
}

impl Context for CustomHeaderFilter {}

impl HttpContext for CustomHeaderFilter {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Generate a unique request ID
        self.request_id = self.get_current_time_nanoseconds() as u32;

        // Add custom headers to the request
        self.set_http_request_header("X-Custom-Request-ID", Some(&self.request_id.to_string()));
        self.set_http_request_header("X-Processed-By", Some("custom-wasm-filter"));

        // Read existing headers for logging
        if let Some(path) = self.get_http_request_header(":path") {
            info!("Processing request to path: {}", path);
        }

        // Continue processing
        Action::Continue
    }

    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Add response header indicating filter processed the request
        self.set_http_response_header("X-Request-ID", Some(&self.request_id.to_string()));
        Action::Continue
    }
}

// Export the filter entry point
proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(CustomHeaderRoot)
    });
}}
```

Build the WASM module:

```bash
# Install the WASM target for Rust
rustup target add wasm32-unknown-unknown

# Build the filter
cargo build --target wasm32-unknown-unknown --release

# The compiled WASM file will be at:
# target/wasm32-unknown-unknown/release/custom_header_filter.wasm
```

## Configuring Envoy to Load WASM Filters

Now configure Envoy to load and execute your WASM filter. You can load WASM files from the local filesystem or fetch them remotely.

```yaml
# envoy-wasm-config.yaml
static_resources:
  listeners:
  - name: main_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: backend_service
          http_filters:
          # WASM filter configuration
          - name: envoy.filters.http.wasm
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
              config:
                # Configuration for the WASM VM
                vm_config:
                  runtime: "envoy.wasm.runtime.v8"
                  code:
                    local:
                      filename: "/etc/envoy/filters/custom_header_filter.wasm"
                  # VM-level configuration passed to on_vm_start
                  configuration:
                    "@type": "type.googleapis.com/google.protobuf.StringValue"
                    value: |
                      {
                        "enabled": true
                      }
                # Plugin configuration passed to filter instances
                configuration:
                  "@type": "type.googleapis.com/google.protobuf.StringValue"
                  value: |
                    {
                      "custom_prefix": "custom-wasm"
                    }
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_service
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend
                port_value: 8000

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

## Advanced WASM Filter Features

Let's enhance the filter with more advanced capabilities like reading request bodies and making external HTTP calls.

```rust
impl HttpContext for CustomHeaderFilter {
    fn on_http_request_body(&mut self, body_size: usize, end_of_stream: bool) -> Action {
        if !end_of_stream {
            // Wait for the entire body
            return Action::Pause;
        }

        // Read the request body
        if let Some(body_bytes) = self.get_http_request_body(0, body_size) {
            if let Ok(body_str) = std::str::from_utf8(&body_bytes) {
                info!("Request body: {}", body_str);

                // Validate or transform the body
                if body_str.contains("forbidden") {
                    self.send_http_response(
                        403,
                        vec![("content-type", "text/plain")],
                        Some(b"Forbidden content detected"),
                    );
                    return Action::Pause;
                }
            }
        }

        Action::Continue
    }

    fn on_http_call_response(
        &mut self,
        _token_id: u32,
        _num_headers: usize,
        body_size: usize,
        _num_trailers: usize,
    ) {
        // Handle response from external HTTP call
        if let Some(body) = self.get_http_call_response_body(0, body_size) {
            info!("External service response: {:?}", body);
        }
    }
}
```

## Loading WASM Filters from Remote URLs

For production deployments, you often want to fetch WASM modules from a remote location instead of bundling them with Envoy:

```yaml
http_filters:
- name: envoy.filters.http.wasm
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
    config:
      vm_config:
        runtime: "envoy.wasm.runtime.v8"
        code:
          remote:
            http_uri:
              uri: "https://storage.example.com/filters/custom_header_filter.wasm"
              cluster: wasm_storage_cluster
              timeout: 10s
            sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
          # Cache the WASM module locally
          retry_policy:
            num_retries: 3
```

You need to add a cluster for the remote storage:

```yaml
clusters:
- name: wasm_storage_cluster
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: wasm_storage_cluster
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: storage.example.com
              port_value: 443
  transport_socket:
    name: envoy.transport_sockets.tls
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
```

## Resource Limits and Performance

WASM filters run in a sandbox with resource limits. Configure these limits to prevent runaway filters from impacting Envoy:

```yaml
vm_config:
  runtime: "envoy.wasm.runtime.v8"
  environment_variables:
    host_env_keys:
    - "POD_NAME"
    - "POD_NAMESPACE"
  code:
    local:
      filename: "/etc/envoy/filters/custom_header_filter.wasm"
  # Resource limits for the WASM VM
  nack_on_code_cache_miss: true
  allow_precompiled: true
```

## Testing Your WASM Filter

Deploy Envoy with the WASM filter and test it:

```bash
# Start Envoy with the configuration
docker run -d \
  -v $(pwd)/envoy-wasm-config.yaml:/etc/envoy/envoy.yaml \
  -v $(pwd)/custom_header_filter.wasm:/etc/envoy/filters/custom_header_filter.wasm \
  -p 8080:8080 \
  -p 9901:9901 \
  envoyproxy/envoy:v1.29-latest

# Make a test request
curl -v http://localhost:8080/api/test

# Check for custom headers in the response
# You should see X-Custom-Request-ID and X-Processed-By headers
```

View filter logs in the Envoy admin interface:

```bash
# Check logs
curl http://localhost:9901/logging

# View stats for WASM filters
curl http://localhost:9901/stats | grep wasm
```

## Debugging WASM Filters

Debugging WASM can be challenging. Use these techniques:

1. Enable verbose logging in your WASM code using the log crate
2. Check Envoy's logs for WASM VM errors
3. Use the admin interface to inspect filter state
4. Add metrics using the proxy-wasm SDK's metrics API

```rust
// Add metrics to your filter
impl RootContext for CustomHeaderRoot {
    fn on_vm_start(&mut self, _vm_configuration_size: usize) -> bool {
        // Define custom metrics
        self.define_metric(MetricType::Counter, "requests_processed").unwrap();
        true
    }
}

impl HttpContext for CustomHeaderFilter {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Increment the counter
        self.increment_metric("requests_processed", 1);
        Action::Continue
    }
}
```

WASM filters unlock tremendous extensibility in Envoy without sacrificing safety or performance. Start with simple header manipulation, then gradually add more complex logic like authentication, rate limiting, or protocol translation as you become comfortable with the proxy-wasm API.
