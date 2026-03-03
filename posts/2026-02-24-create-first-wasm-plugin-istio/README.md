# How to Create Your First Wasm Plugin for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASM, Rust, Envoy, Tutorial

Description: A step-by-step tutorial for building your first WebAssembly plugin for Istio using Rust and the proxy-wasm SDK.

---

Building your first Wasm plugin for Istio is easier than you might think. You pick a language with a proxy-wasm SDK, write your filter logic, compile it to a .wasm file, and deploy it with an Istio WasmPlugin resource. This tutorial walks through the entire process using Rust, which has the most mature proxy-wasm SDK.

## Setting Up Your Development Environment

You need a few tools installed:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the wasm32 target
rustup target add wasm32-wasi

# Verify the target is installed
rustup target list --installed | grep wasm32
```

## Creating the Project

Create a new Rust library project:

```bash
cargo new --lib my-first-plugin
cd my-first-plugin
```

Update `Cargo.toml` to include the proxy-wasm SDK and set the crate type to cdylib (which produces a shared library that can be compiled to Wasm):

```toml
[package]
name = "my-first-plugin"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
proxy-wasm = "0.2"
log = "0.4"
```

## Writing the Plugin

Open `src/lib.rs` and replace its contents. This example plugin adds a custom response header to every HTTP response:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use log::info;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(MyPluginRoot {
            header_name: String::new(),
            header_value: String::new(),
        })
    });
}}

struct MyPluginRoot {
    header_name: String,
    header_value: String,
}

impl Context for MyPluginRoot {}

impl RootContext for MyPluginRoot {
    fn on_configure(&mut self, _plugin_configuration_size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            let config_str = String::from_utf8(config_bytes).unwrap_or_default();
            // Parse simple key=value config
            for line in config_str.lines() {
                if let Some((key, value)) = line.split_once('=') {
                    match key.trim() {
                        "header_name" => self.header_name = value.trim().to_string(),
                        "header_value" => self.header_value = value.trim().to_string(),
                        _ => {}
                    }
                }
            }
        }
        if self.header_name.is_empty() {
            self.header_name = "x-wasm-plugin".to_string();
        }
        if self.header_value.is_empty() {
            self.header_value = "my-first-plugin".to_string();
        }
        info!("Plugin configured: {}={}", self.header_name, self.header_value);
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(MyPluginHttp {
            header_name: self.header_name.clone(),
            header_value: self.header_value.clone(),
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct MyPluginHttp {
    header_name: String,
    header_value: String,
}

impl Context for MyPluginHttp {}

impl HttpContext for MyPluginHttp {
    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        self.add_http_response_header(&self.header_name, &self.header_value);
        Action::Continue
    }
}
```

This plugin does the following:
1. Reads configuration during startup to get a header name and value
2. For every HTTP response, adds the configured header
3. Returns `Action::Continue` to let the response proceed

## Compiling the Plugin

Build the Wasm module:

```bash
cargo build --target wasm32-wasi --release
```

The compiled Wasm file will be at:

```text
target/wasm32-wasi/release/my_first_plugin.wasm
```

Check the file size:

```bash
ls -lh target/wasm32-wasi/release/my_first_plugin.wasm
```

Typical Wasm plugins are between 100KB and 2MB, depending on complexity and dependencies.

## Optimizing the Wasm Binary

You can reduce the binary size with wasm-opt:

```bash
# Install wasm-opt via binaryen
brew install binaryen  # on macOS
# or: apt-get install binaryen  # on Ubuntu

# Optimize the binary
wasm-opt -O3 target/wasm32-wasi/release/my_first_plugin.wasm -o my_first_plugin_optimized.wasm

# Compare sizes
ls -lh target/wasm32-wasi/release/my_first_plugin.wasm
ls -lh my_first_plugin_optimized.wasm
```

## Deploying to Istio

There are several ways to get the Wasm binary into your cluster. The simplest for testing is to use a ConfigMap or HTTP server. For production, use an OCI registry (covered in a separate post).

For quick testing, you can serve the Wasm file from an HTTP server:

```bash
# Start a simple HTTP server
python3 -m http.server 8080 &

# The file is available at http://localhost:8080/my_first_plugin_optimized.wasm
```

Or, to make it available in the cluster, create a simple web server deployment:

```bash
# Create a ConfigMap with the Wasm binary (for small files only)
kubectl create configmap my-plugin-wasm -n my-app \
  --from-file=plugin.wasm=my_first_plugin_optimized.wasm
```

For a more practical approach, push it to an OCI registry:

```bash
# Using ORAS to push the Wasm binary to a registry
oras push registry.example.com/my-first-plugin:v1.0 \
  my_first_plugin_optimized.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

## Creating the WasmPlugin Resource

Create the Istio WasmPlugin resource to deploy your plugin:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-first-plugin
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/my-first-plugin:v1.0
  pluginConfig:
    header_name: x-powered-by
    header_value: my-wasm-plugin
```

Apply it:

```bash
kubectl apply -f wasmplugin.yaml
```

## Testing the Plugin

Make a request to your service and check for the custom header:

```bash
# Send a request to the service
kubectl exec -it test-pod -n my-app -- curl -v http://my-service:8080/health

# Look for the custom header in the response
# You should see: x-powered-by: my-wasm-plugin
```

If the header appears in the response, your plugin is working.

## Checking Plugin Logs

Your plugin's log messages appear in the Envoy proxy logs:

```bash
# Check the proxy logs for your plugin messages
kubectl logs -n my-app -l app=my-service -c istio-proxy | grep "wasm\|my-first-plugin"
```

You should see the configuration log message from the `on_configure` callback.

## Common Mistakes to Avoid

**Forgetting to return Action::Continue:** If your callback does not return `Action::Continue`, the request/response will be paused indefinitely.

**Not handling configuration parsing errors:** If your plugin panics during `on_configure`, Envoy will reject the plugin.

**Using too many dependencies:** Every Rust crate you add increases the Wasm binary size. Keep dependencies minimal.

**Not setting the crate type:** Without `crate-type = ["cdylib"]` in Cargo.toml, the build will not produce a Wasm module that Envoy can load.

## Next Steps

From here, you can extend your plugin to do more interesting things:

- Read request headers and make routing decisions
- Call external services for authentication
- Collect custom metrics
- Transform request/response bodies
- Implement rate limiting logic

The proxy-wasm SDK provides all the building blocks through the `HttpContext`, `RootContext`, and `Context` traits.

## Summary

Creating your first Wasm plugin for Istio involves setting up a Rust project with the proxy-wasm SDK, implementing the RootContext and HttpContext traits, compiling to wasm32-wasi, and deploying with an Istio WasmPlugin resource. The example here adds a custom response header, but the same pattern applies to any kind of traffic processing logic you want to add to your mesh.
