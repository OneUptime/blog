# How to Build Custom Envoy Filters with Wasm in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Envoy, Wasm, Custom Filters

Description: How to build custom Envoy filters using WebAssembly for Istio, replacing fragile EnvoyFilter resources with portable Wasm plugins.

---

If you have been using EnvoyFilter resources to customize Envoy behavior in Istio, you know how fragile they can be. They patch Envoy's internal configuration directly, break across Envoy versions, and are hard to test. Wasm plugins provide a much better alternative for building custom Envoy filters. You get the same level of control over request and response processing, but with a stable API, portability across Envoy versions, and proper tooling for development and testing.

## Replacing EnvoyFilter with Wasm

A common EnvoyFilter pattern is adding a custom Lua filter:

```yaml
# The old way - fragile EnvoyFilter with Lua
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-header
  namespace: my-app
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_response(response_handle)
              response_handle:headers():add("x-custom-header", "my-value")
            end
```

The Wasm equivalent is cleaner and more maintainable:

```yaml
# The new way - WasmPlugin
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: add-header
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/plugins/add-header:v1.0
  pluginConfig:
    headers:
    - name: x-custom-header
      value: my-value
```

## Building a Request/Response Transformation Filter

Here is a complete Wasm filter in Rust that transforms requests and responses. It adds request IDs, strips sensitive headers, and adds timing information:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use std::time::Duration;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(TransformRoot {
            strip_headers: Vec::new(),
        })
    });
}}

struct TransformRoot {
    strip_headers: Vec<String>,
}

impl Context for TransformRoot {}

impl RootContext for TransformRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            if let Ok(config) = serde_json::from_slice::<serde_json::Value>(&config_bytes) {
                if let Some(headers) = config["strip_response_headers"].as_array() {
                    self.strip_headers = headers.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect();
                }
            }
        }
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(TransformHttp {
            strip_headers: self.strip_headers.clone(),
            request_start: 0,
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct TransformHttp {
    strip_headers: Vec<String>,
    request_start: u64,
}

impl Context for TransformHttp {}

impl HttpContext for TransformHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Record request start time
        self.request_start = self.get_current_time()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_millis() as u64;

        // Add a request ID if not present
        if self.get_http_request_header("x-request-id").is_none() {
            let id = format!("gen-{}", self.request_start);
            self.set_http_request_header("x-request-id", Some(&id));
        }

        Action::Continue
    }

    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Strip sensitive headers from responses
        for header in &self.strip_headers {
            self.set_http_response_header(header, None);
        }

        // Add processing time header
        let now = self.get_current_time()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_millis() as u64;
        let duration = now - self.request_start;
        self.add_http_response_header("x-processing-time-ms", &duration.to_string());

        Action::Continue
    }
}
```

Deploy it with configuration:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: request-transform
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/transform:v1.0
  pluginConfig:
    strip_response_headers:
    - x-envoy-upstream-service-time
    - server
    - x-powered-by
```

## Building a Request Validation Filter

This filter validates incoming requests against a schema:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;

struct ValidatorHttp {
    required_headers: Vec<String>,
    max_body_size: usize,
}

impl Context for ValidatorHttp {}

impl HttpContext for ValidatorHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Check required headers
        for header in &self.required_headers {
            if self.get_http_request_header(header).is_none() {
                self.send_http_response(
                    400,
                    vec![("content-type", "application/json")],
                    Some(format!(r#"{{"error":"missing required header: {}"}}"#, header).as_bytes()),
                );
                return Action::Pause;
            }
        }
        Action::Continue
    }

    fn on_http_request_body(&mut self, body_size: usize, end_of_stream: bool) -> Action {
        if !end_of_stream {
            return Action::Pause;  // Wait for the full body
        }

        if body_size > self.max_body_size {
            self.send_http_response(
                413,
                vec![("content-type", "application/json")],
                Some(format!(
                    r#"{{"error":"request body too large","max_size":{}}}"#,
                    self.max_body_size
                ).as_bytes()),
            );
            return Action::Pause;
        }

        Action::Continue
    }
}
```

Configuration:

```yaml
spec:
  pluginConfig:
    required_headers:
    - x-api-key
    - x-request-id
    max_body_size: 1048576  # 1MB
```

## Building a Custom Metrics Filter

You can define and emit custom metrics from Wasm plugins:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;

struct MetricsRoot {
    request_counter: u32,
    error_counter: u32,
}

impl RootContext for MetricsRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        self.request_counter = self.define_metric(
            MetricType::Counter,
            "custom_requests_total",
        ).unwrap();
        self.error_counter = self.define_metric(
            MetricType::Counter,
            "custom_errors_total",
        ).unwrap();
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(MetricsHttp {
            request_counter: self.request_counter,
            error_counter: self.error_counter,
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct MetricsHttp {
    request_counter: u32,
    error_counter: u32,
}

impl Context for MetricsHttp {}

impl HttpContext for MetricsHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        self.increment_metric(self.request_counter, 1);
        Action::Continue
    }

    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        if let Some(status) = self.get_http_response_header(":status") {
            if status.starts_with('5') {
                self.increment_metric(self.error_counter, 1);
            }
        }
        Action::Continue
    }
}
```

These custom metrics show up in Envoy's stats output and can be scraped by Prometheus.

## Building the Filter

Compile the filter to Wasm:

```bash
cargo build --target wasm32-wasi --release

# Optimize the binary
wasm-opt -O3 target/wasm32-wasi/release/my_filter.wasm -o my_filter.wasm
```

## Testing the Filter Locally

Before deploying, test with Envoy directly:

```yaml
# envoy-test.yaml
static_resources:
  listeners:
  - name: main
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
          http_filters:
          - name: envoy.filters.http.wasm
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
              config:
                vm_config:
                  runtime: envoy.wasm.runtime.v8
                  code:
                    local:
                      filename: /etc/envoy/my_filter.wasm
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

Run it:

```bash
docker run -v $(pwd):/etc/envoy envoyproxy/envoy:v1.31-latest -c /etc/envoy/envoy-test.yaml
```

## Summary

Building custom Envoy filters with Wasm in Istio gives you the same capabilities as EnvoyFilter resources and Lua scripts, but with a stable API, strong typing (when using Rust), and portability across Envoy versions. The proxy-wasm SDK provides access to headers, bodies, metrics, HTTP callouts, and shared state. You can build anything from simple header manipulation to complex request validation and custom metrics collection.
