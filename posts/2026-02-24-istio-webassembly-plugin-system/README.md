# How to Understand Istio's WebAssembly Plugin System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASM, Envoy, Extensibility

Description: An overview of Istio's WebAssembly plugin system explaining how Wasm extends Envoy proxy functionality for custom traffic processing.

---

Istio's WebAssembly (Wasm) plugin system lets you extend the Envoy proxy with custom logic without rebuilding Envoy itself. You can write plugins in languages like Rust, Go, or C++ that compile to Wasm modules, then deploy those modules to Envoy sidecars or waypoint proxies. This gives you a way to add custom authentication, request transformation, logging, rate limiting, or any other traffic processing logic directly in the data plane.

## Why Wasm Plugins

Before Wasm, extending Envoy in Istio meant one of two things:

1. **EnvoyFilter resources** - Writing raw Envoy configuration patches. Powerful but fragile, hard to maintain, and tightly coupled to Envoy's internal API.

2. **Custom Envoy builds** - Compiling your own Envoy binary with custom C++ filters. Extremely powerful but requires deep Envoy knowledge and makes upgrades painful.

Wasm plugins offer a middle ground. You write your logic in a high-level language, compile it to a portable Wasm binary, and deploy it alongside your Envoy proxies. The plugin runs inside Envoy's Wasm runtime, with access to request and response data through a well-defined API.

## How Wasm Works in Envoy

Envoy has a built-in Wasm runtime (based on V8 or Wasmtime) that can load and execute Wasm modules. Each module runs in a sandboxed environment with controlled access to:

- Request headers, body, and trailers
- Response headers, body, and trailers
- Shared data between plugin instances
- Timers and HTTP callouts to external services
- Logging

The Wasm plugin lifecycle in Envoy follows this pattern:

```text
1. Envoy loads the Wasm module
2. For each request/response:
   a. onRequestHeaders() - called when request headers arrive
   b. onRequestBody() - called when request body chunks arrive
   c. onResponseHeaders() - called when response headers arrive
   d. onResponseBody() - called when response body chunks arrive
3. Plugin can modify headers, body, or reject the request
```

## The Istio WasmPlugin Resource

Istio provides a first-class custom resource for deploying Wasm plugins:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/my-plugin:v1.0
  phase: AUTHN
  pluginConfig:
    custom_key: custom_value
```

The key fields are:

- **selector**: Which workloads get the plugin (same as Istio's standard label matching)
- **url**: Where to find the Wasm binary (OCI registry, HTTP URL, or local file)
- **phase**: Where in the filter chain the plugin runs
- **pluginConfig**: JSON configuration passed to the plugin at startup

## Plugin Phases

The `phase` field determines where your plugin runs in the Envoy filter chain:

| Phase | Description |
|-------|-------------|
| AUTHN | Runs during authentication, before Istio's own authn filters |
| AUTHZ | Runs during authorization, after authentication |
| STATS | Runs during stats collection, after authorization |
| UNSPECIFIED | Default phase, runs before the router filter |

Choosing the right phase matters because it determines what information is available to your plugin and whether it can short-circuit the request before other filters run.

```yaml
# Authentication plugin - runs early in the chain
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/auth-plugin:v1.0
  phase: AUTHN
```

## Wasm Plugin Sources

You can load Wasm modules from three types of sources:

**OCI Registry (recommended):**

```yaml
url: oci://registry.example.com/my-plugin:v1.0
```

This is the recommended approach for production. The Wasm module is packaged as an OCI artifact and stored in a container registry.

**HTTP URL:**

```yaml
url: https://example.com/plugins/my-plugin.wasm
```

Useful for development and testing.

**Local file (for development):**

```yaml
url: file:///opt/plugins/my-plugin.wasm
```

Only works if the file is available in the Envoy container's filesystem.

## The Proxy-Wasm ABI

Wasm plugins communicate with Envoy through the proxy-wasm ABI (Application Binary Interface). This is a standardized interface that works across different proxy implementations (Envoy, NGINX, etc.).

The ABI provides these host functions:

```text
// Header manipulation
get_header_map_value() / set_header_map_value()
add_header_map_value() / remove_header_map_value()

// Body manipulation
get_buffer_bytes() / set_buffer_bytes()

// HTTP callouts
dispatch_http_call()

// Shared data
get_shared_data() / set_shared_data()

// Logging
log()

// Metrics
define_metric() / increment_metric() / record_metric()
```

SDKs in different languages wrap these low-level functions into more ergonomic APIs. For example, the Rust SDK provides typed methods like `self.get_http_request_header("content-type")`.

## Plugin Configuration

You pass configuration to your Wasm plugin through the `pluginConfig` field. This configuration is delivered to the plugin as a JSON string during initialization:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: rate-limiter
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/rate-limiter:v1.0
  pluginConfig:
    requests_per_second: 100
    burst_size: 20
    response_code: 429
```

Inside the plugin, you parse this configuration during the `on_configure` callback.

## Targeting Specific Workloads

You can target Wasm plugins at different levels:

**Specific workloads:**

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
```

**Entire namespace (no selector):**

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: global-logging
  namespace: my-app
spec:
  url: oci://registry.example.com/logging-plugin:v1.0
```

**Gateway proxies:**

```yaml
spec:
  selector:
    matchLabels:
      istio: ingressgateway
```

## Wasm Plugin Limitations

There are important limitations to be aware of:

- **Performance:** Wasm plugins add latency compared to native C++ Envoy filters. For most use cases the overhead is negligible (microseconds), but for extremely latency-sensitive paths, it can matter.

- **Memory:** Each Wasm plugin instance has its own memory sandbox. Memory usage scales with the number of plugin instances (one per worker thread per proxy).

- **No raw socket access:** Plugins cannot open raw TCP/UDP sockets. They can only make HTTP callouts through Envoy's async HTTP client.

- **Limited file system access:** Plugins run in a sandbox and cannot access the host filesystem.

## Checking Wasm Plugin Status

After deploying a WasmPlugin resource, verify it was picked up:

```bash
# Check the WasmPlugin resource
kubectl get wasmplugin -n my-app

# Check if the plugin was loaded by Envoy
istioctl proxy-config log <pod-name> -n my-app --level wasm:debug

# Look for plugin loading messages in proxy logs
kubectl logs <pod-name> -c istio-proxy -n my-app | grep -i wasm
```

## Summary

Istio's Wasm plugin system provides a clean extension mechanism for the Envoy data plane. You write plugins in Rust, Go, or C++, compile them to Wasm, and deploy them using the WasmPlugin custom resource. Plugins can run at different phases in the filter chain, receive custom configuration, and be targeted at specific workloads. This system replaces many use cases that previously required EnvoyFilter resources or custom Envoy builds.
