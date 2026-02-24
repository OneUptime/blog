# How to Configure Wasm Plugins in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Wasm, Configuration, Envoy

Description: A detailed guide to configuring WebAssembly plugins in Istio, covering plugin phases, targeting, priority, and runtime configuration options.

---

Deploying a Wasm plugin is only half the story. Getting the configuration right determines whether your plugin actually does what you want. Istio's WasmPlugin resource has several configuration options that control where the plugin runs in the filter chain, which workloads it targets, how it receives runtime configuration, and how it handles failures. This post covers all of these options in detail.

## The WasmPlugin Resource Structure

Here is the full structure of a WasmPlugin resource with all configurable fields:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: my-app
spec:
  # Which workloads get the plugin
  selector:
    matchLabels:
      app: my-service

  # Where to find the Wasm binary
  url: oci://registry.example.com/plugins/my-plugin:v1.0

  # Image pull settings
  imagePullPolicy: IfNotPresent
  imagePullSecret: registry-creds

  # Where in the filter chain to insert the plugin
  phase: AUTHN

  # Priority within the same phase (higher = earlier)
  priority: 10

  # Configuration passed to the plugin
  pluginConfig:
    key1: value1
    key2: value2

  # Plugin name (used for logging)
  pluginName: my-custom-plugin

  # Failure behavior
  failStrategy: FAIL_CLOSE

  # VM configuration
  vmConfig:
    env:
    - name: MY_ENV_VAR
      value: some-value
      valueFrom: HOST
```

## Configuring Plugin Phases

The `phase` field is critical because it determines where your plugin runs in Envoy's HTTP filter chain. Envoy processes filters in order, so the phase affects what information is available and whether your plugin can short-circuit processing.

```yaml
# Authentication phase - runs first
spec:
  phase: AUTHN

# Authorization phase - runs after authentication
spec:
  phase: AUTHZ

# Stats phase - runs after authorization
spec:
  phase: STATS

# Default (unspecified) - runs just before the router
spec:
  phase: UNSPECIFIED
```

Practical examples of phase selection:

- **Custom authentication** (validating API keys, custom tokens) - use `AUTHN`
- **Custom authorization** (checking permissions against an external service) - use `AUTHZ`
- **Request logging or metrics** - use `STATS`
- **Request/response transformation** (modifying headers, body) - use `UNSPECIFIED`

## Configuring Plugin Priority

When multiple plugins run in the same phase, the `priority` field determines their order. Higher values mean the plugin runs earlier:

```yaml
# This runs first (priority 20)
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: rate-limiter
spec:
  phase: AUTHZ
  priority: 20
  url: oci://registry.example.com/plugins/rate-limiter:v1.0
---
# This runs second (priority 10)
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: ip-allowlist
spec:
  phase: AUTHZ
  priority: 10
  url: oci://registry.example.com/plugins/ip-allowlist:v1.0
```

If two plugins have the same priority, the order is not guaranteed. Always set explicit priorities when ordering matters.

## Passing Runtime Configuration

The `pluginConfig` field accepts arbitrary YAML that gets serialized to JSON and passed to your plugin during initialization. Your plugin receives this in the `on_configure` callback.

**Simple key-value configuration:**

```yaml
spec:
  pluginConfig:
    api_key_header: x-api-key
    allowed_keys:
    - key-abc-123
    - key-def-456
    rate_limit: 100
```

Inside your Rust plugin, parse this configuration:

```rust
impl RootContext for MyPlugin {
    fn on_configure(&mut self, _size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            let config: serde_json::Value = serde_json::from_slice(&config_bytes)
                .unwrap_or_default();

            if let Some(header) = config["api_key_header"].as_str() {
                self.api_key_header = header.to_string();
            }
            if let Some(keys) = config["allowed_keys"].as_array() {
                self.allowed_keys = keys.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();
            }
        }
        true
    }
}
```

**Complex nested configuration:**

```yaml
spec:
  pluginConfig:
    routes:
    - path: /api/v1/*
      rate_limit: 100
      auth_required: true
    - path: /health
      rate_limit: 1000
      auth_required: false
    logging:
      level: info
      include_headers: true
      excluded_paths:
      - /health
      - /ready
```

## Configuring Failure Strategy

The `failStrategy` field determines what happens when the Wasm plugin fails to load or crashes:

```yaml
# Reject requests if plugin fails (default)
spec:
  failStrategy: FAIL_CLOSE

# Allow requests to pass through if plugin fails
spec:
  failStrategy: FAIL_OPEN
```

Use `FAIL_CLOSE` for security-critical plugins (authentication, authorization) where it is better to block traffic than to let unauthenticated requests through. Use `FAIL_OPEN` for non-critical plugins (logging, metrics) where you prefer to keep traffic flowing even if the plugin is broken.

## Configuring VM Environment Variables

You can pass environment variables to the Wasm VM:

```yaml
spec:
  vmConfig:
    env:
    - name: LOG_LEVEL
      value: debug
    - name: SERVICE_NAME
      valueFrom: HOST
```

The `valueFrom: HOST` option reads the environment variable from the Envoy process, which is useful for pulling in dynamic values.

## Targeting Workloads

**Target specific pods by label:**

```yaml
spec:
  selector:
    matchLabels:
      app: api-gateway
      version: v2
```

**Target all pods in a namespace (omit selector):**

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: global-logger
  namespace: my-app
spec:
  url: oci://registry.example.com/plugins/logger:v1.0
```

**Target gateway workloads:**

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: gateway-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  url: oci://registry.example.com/plugins/auth:v1.0
```

**Use targetRefs for more precise targeting:**

```yaml
spec:
  targetRefs:
  - kind: Service
    group: ""
    name: my-service
```

## Configuring Plugin for Traffic Direction

By default, plugins process both inbound and outbound traffic. You can restrict this with match rules:

```yaml
spec:
  match:
  - mode: SERVER  # Only inbound traffic
  # or
  - mode: CLIENT  # Only outbound traffic
```

This is useful when you want a logging plugin to only capture inbound requests, or an auth plugin to only run on the server side.

## Updating Configuration Without Redeployment

You can update the `pluginConfig` without changing the Wasm binary. Just edit the WasmPlugin resource:

```bash
kubectl edit wasmplugin my-plugin -n my-app
```

Or apply an updated YAML:

```bash
kubectl apply -f updated-wasmplugin.yaml
```

Envoy will reload the configuration and call `on_configure` again on the existing plugin instances. This lets you change plugin behavior (like updating rate limits or allowed API keys) without a new Wasm build.

## Validating Configuration

Before deploying, validate your WasmPlugin resource:

```bash
# Dry-run the apply
kubectl apply -f wasmplugin.yaml --dry-run=server

# Check for validation errors
kubectl apply -f wasmplugin.yaml
# If there are errors, kubectl will report them
```

After deployment, check that the proxy picked up the configuration:

```bash
# Check Envoy config dump for the Wasm filter
istioctl proxy-config listener my-pod -n my-app -o json | grep -A 20 "wasm"

# Check proxy logs for configuration messages
kubectl logs my-pod -c istio-proxy -n my-app | grep -i "wasm\|plugin"
```

## Summary

Configuring Wasm plugins in Istio involves choosing the right phase and priority, passing runtime configuration through `pluginConfig`, setting an appropriate failure strategy, and targeting the correct workloads. The WasmPlugin resource gives you fine-grained control over all these aspects, and configuration updates can be applied without rebuilding or redeploying the Wasm binary itself.
