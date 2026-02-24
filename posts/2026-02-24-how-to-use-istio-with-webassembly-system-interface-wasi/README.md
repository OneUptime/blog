# How to Use Istio with WebAssembly System Interface (WASI)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASI, Envoy, Kubernetes, Service Mesh

Description: How to extend Istio's Envoy proxy with WebAssembly plugins using WASI to add custom logic for request processing and traffic management.

---

Istio's Envoy proxy can be extended with WebAssembly (Wasm) plugins. This lets you add custom logic to the data plane without modifying Envoy's source code or rebuilding the proxy. With WASI (WebAssembly System Interface) support, these plugins can interact with system resources in a standardized way, making them more portable and capable.

If you need custom request/response transformation, specialized authentication, or business-specific traffic routing that Istio does not provide out of the box, Wasm plugins are the answer.

## How Wasm Plugins Work in Istio

Envoy has a built-in Wasm runtime that can load and execute Wasm modules. When a request passes through the proxy, the Wasm plugin gets called at specific points in the filter chain. The plugin can inspect headers, modify request bodies, add custom metrics, or make decisions about whether to allow or reject traffic.

The flow looks like this:

1. Client sends request
2. Envoy receives the request
3. Wasm plugin is invoked (can inspect/modify the request)
4. Envoy routes the request to the upstream service
5. Upstream responds
6. Wasm plugin is invoked again (can inspect/modify the response)
7. Client receives the response

## Creating a Wasm Plugin

You can write Wasm plugins in several languages. Rust and Go are the most common choices. Here is an example using the proxy-wasm SDK for Rust:

First, set up the project:

```bash
cargo new --lib my-istio-plugin
cd my-istio-plugin
```

Add dependencies to `Cargo.toml`:

```toml
[package]
name = "my-istio-plugin"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
proxy-wasm = "0.2.2"
log = "0.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

Write the plugin in `src/lib.rs`:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use log::info;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(CustomFilterRoot {
            config: String::new(),
        })
    });
}}

struct CustomFilterRoot {
    config: String,
}

impl Context for CustomFilterRoot {}

impl RootContext for CustomFilterRoot {
    fn on_configure(&mut self, _plugin_configuration_size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            self.config = String::from_utf8(config_bytes).unwrap_or_default();
        }
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(CustomFilter {
            config: self.config.clone(),
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct CustomFilter {
    config: String,
}

impl Context for CustomFilter {}

impl HttpContext for CustomFilter {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Add a custom header to every request
        self.set_http_request_header("x-custom-plugin", Some("processed"));

        // Log the request path
        if let Some(path) = self.get_http_request_header(":path") {
            info!("Request path: {}", path);
        }

        Action::Continue
    }

    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Add timing header to response
        self.set_http_response_header("x-plugin-version", Some("1.0"));
        Action::Continue
    }
}
```

Build the Wasm module:

```bash
# Add the wasm32 target
rustup target add wasm32-wasip1

# Build
cargo build --target wasm32-wasip1 --release

# The output file is at:
# target/wasm32-wasip1/release/my_istio_plugin.wasm
```

## Deploying the Wasm Plugin

You need to make the Wasm module accessible to the Envoy proxies. There are two main approaches.

### Option 1: Using an OCI Registry

Package and push the Wasm module to an OCI registry:

```bash
# Build and push to OCI registry (using the oras tool or similar)
oras push my-registry.com/istio-plugins/my-plugin:v1 \
  my_istio_plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

Then reference it in a WasmPlugin resource:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-custom-plugin
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://my-registry.com/istio-plugins/my-plugin:v1
  phase: AUTHN
  pluginConfig:
    max_header_size: "8192"
```

### Option 2: Using a ConfigMap or HTTP Server

For development and testing, you can serve the Wasm module from an HTTP server:

```bash
# Start a simple file server
kubectl create configmap wasm-plugin \
  --from-file=plugin.wasm=target/wasm32-wasip1/release/my_istio_plugin.wasm \
  -n production
```

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-custom-plugin
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  url: http://wasm-server.production.svc.cluster.local/plugin.wasm
  phase: AUTHN
```

## WasmPlugin Configuration Options

The WasmPlugin resource has several important fields:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  # Which workloads to apply the plugin to
  selector:
    matchLabels:
      app: my-service

  # Where to get the Wasm module
  url: oci://my-registry.com/my-plugin:v1

  # When in the filter chain to run (AUTHN, AUTHZ, STATS, or UNSPECIFIED)
  phase: AUTHN

  # Priority within the phase (lower numbers run first)
  priority: 10

  # Configuration passed to the plugin
  pluginConfig:
    key: value
    another_key: another_value

  # Image pull policy for OCI images
  imagePullPolicy: IfNotPresent

  # Apply to specific traffic direction
  match:
  - mode: SERVER  # SIDECAR_INBOUND traffic only
```

The `phase` field determines where in the filter chain the plugin runs:

- `AUTHN`: Runs during authentication (before authorization)
- `AUTHZ`: Runs during authorization
- `STATS`: Runs during stats collection (after the request is processed)

## Practical Use Cases

### Custom Authentication

```rust
impl HttpContext for AuthFilter {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Check for a custom API key
        match self.get_http_request_header("x-api-key") {
            Some(key) if self.is_valid_key(&key) => {
                self.set_http_request_header("x-authenticated", Some("true"));
                Action::Continue
            }
            _ => {
                self.send_http_response(
                    401,
                    vec![("content-type", "application/json")],
                    Some(b"{\"error\": \"unauthorized\"}"),
                );
                Action::Pause
            }
        }
    }
}
```

### Request/Response Transformation

```rust
impl HttpContext for TransformFilter {
    fn on_http_response_body(&mut self, body_size: usize, end_of_stream: bool) -> Action {
        if !end_of_stream {
            return Action::Pause;
        }

        if let Some(body) = self.get_http_response_body(0, body_size) {
            // Transform the response body
            let modified = transform_response(&body);
            self.set_http_response_body(0, body_size, &modified);
        }

        Action::Continue
    }
}
```

### Custom Metrics

```rust
impl HttpContext for MetricsFilter {
    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Increment a custom counter
        self.increment_metric(self.response_counter, 1);

        // Record latency
        if let Some(start_time) = self.request_start_time {
            let duration = self.get_current_time() - start_time;
            self.record_metric(self.latency_histogram, duration.as_millis() as u64);
        }

        Action::Continue
    }
}
```

## Debugging Wasm Plugins

When things go wrong with Wasm plugins, check the Envoy logs:

```bash
# Check for Wasm-related errors
kubectl logs my-pod -c istio-proxy | grep -i "wasm\|plugin"

# Enable debug logging for Wasm
istioctl proxy-config log my-pod --level wasm:debug

# Check if the plugin is loaded
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep "wasm"
```

Common issues:
- Wasm module fails to compile (check logs for compilation errors)
- Plugin panics (check for null pointer access or out-of-bounds errors)
- OCI pull failures (check image pull policy and registry credentials)

## Performance Considerations

Wasm plugins add overhead to every request they process. Measure the impact:

```bash
# Compare latency with and without the plugin
# With plugin
kubectl exec deploy/fortio -- fortio load -c 50 -qps 1000 -t 30s http://my-service:8080/test

# Remove the plugin
kubectl delete wasmplugin my-custom-plugin -n production

# Without plugin
kubectl exec deploy/fortio -- fortio load -c 50 -qps 1000 -t 30s http://my-service:8080/test
```

Wasm plugins add microseconds to milliseconds of latency per request depending on complexity. Keep plugins lean and avoid heavy processing in the hot path. If you need to make external calls (like to an auth server), use the async HTTP call API provided by proxy-wasm to avoid blocking the request.

Wasm plugins with WASI support give you a powerful, portable way to extend Istio without the complexity of custom Envoy builds. Start with simple plugins and iterate as your needs grow.
