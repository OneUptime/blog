# How to Extend Waypoints with WebAssembly Plugins in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, WebAssembly, Wasm, Waypoint Proxy

Description: How to extend Istio waypoint proxies in ambient mode with custom WebAssembly plugins for advanced traffic processing and custom logic.

---

Waypoint proxies in Istio ambient mode run Envoy, which means they support WebAssembly (Wasm) plugins. Wasm lets you inject custom logic into the request/response path without modifying the proxy itself. You can add custom headers, implement rate limiting schemes, transform request bodies, enforce custom authorization rules, or integrate with external services.

This guide shows how to build, deploy, and manage Wasm plugins for waypoint proxies in ambient mode.

## Why Wasm for Waypoint Proxies?

Waypoint proxies already offer a lot through Istio's built-in features: routing, retries, authorization policies, fault injection. But sometimes you need logic that Istio does not provide out of the box:

- Custom authentication token validation
- Request/response body transformation
- Integration with a proprietary rate limiting backend
- Custom metrics collection
- Geolocation-based routing

Wasm plugins run inside Envoy at near-native speed and have access to the full request/response lifecycle.

## Prerequisites

You need:
- An ambient mode Istio installation with at least one waypoint proxy deployed
- A Wasm plugin compiled to `.wasm` format
- A way to host the Wasm binary (OCI registry or HTTP server)

## Creating a Simple Wasm Plugin

Here is a basic Wasm plugin written in Go using the proxy-wasm SDK. This plugin adds a custom response header:

```go
package main

import (
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

func main() {
	proxywasm.SetVMContext(&vmContext{})
}

type vmContext struct {
	types.DefaultVMContext
}

func (*vmContext) NewPluginContext(contextID uint32) types.PluginContext {
	return &pluginContext{}
}

type pluginContext struct {
	types.DefaultPluginContext
}

func (*pluginContext) NewHttpContext(contextID uint32) types.HttpContext {
	return &httpContext{}
}

type httpContext struct {
	types.DefaultHttpContext
}

func (ctx *httpContext) OnHttpResponseHeaders(numHeaders int, endOfStream bool) types.Action {
	proxywasm.AddHttpResponseHeader("x-wasm-plugin", "ambient-waypoint")
	return types.ActionContinue
}
```

Build it using TinyGo:

```bash
tinygo build -o plugin.wasm -scheduler=none -target=wasi ./main.go
```

## Hosting the Wasm Binary

The most reliable way to host Wasm binaries is through an OCI registry. Push the Wasm file as an OCI artifact:

```bash
# Using oras CLI
oras push registry.example.com/istio-wasm/custom-header:v1 \
  plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

Alternatively, you can host the binary on an HTTP server. For testing, you can use a ConfigMap, though this has size limitations:

```bash
kubectl create configmap wasm-plugin \
  --from-file=plugin.wasm \
  -n bookinfo
```

## Deploying a Wasm Plugin to a Waypoint

Use the WasmPlugin custom resource to attach a Wasm plugin to your waypoint proxy:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-header-plugin
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: bookinfo-waypoint
  url: oci://registry.example.com/istio-wasm/custom-header:v1
  phase: STATS
  pluginConfig:
    header_name: "x-custom-header"
    header_value: "processed-by-wasm"
```

The `targetRefs` field specifies which waypoint proxy gets the plugin. The `phase` field determines where in the filter chain the plugin runs:

- `AUTHN`: Runs during authentication phase
- `AUTHZ`: Runs during authorization phase
- `STATS`: Runs during stats collection phase (after request processing)

## Plugin Configuration

The `pluginConfig` field passes configuration to the Wasm plugin. The plugin reads this during initialization:

```go
func (ctx *pluginContext) OnPluginStart(pluginConfigurationSize int) types.OnPluginStartStatus {
    data, err := proxywasm.GetPluginConfiguration()
    if err != nil {
        proxywasm.LogCriticalf("error reading plugin configuration: %v", err)
        return types.OnPluginStartStatusFailed
    }
    // Parse the configuration JSON
    proxywasm.LogInfof("plugin config: %s", string(data))
    return types.OnPluginStartStatusOK
}
```

## Example: Custom Rate Limiting Plugin

Here is a more practical example - a Wasm plugin that implements simple rate limiting based on a custom header:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: rate-limiter
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: bookinfo-waypoint
  url: oci://registry.example.com/istio-wasm/rate-limiter:v1
  phase: AUTHN
  pluginConfig:
    requests_per_minute: 100
    header_key: "x-api-key"
    burst_size: 10
```

The plugin code would track request counts per API key and reject requests that exceed the limit.

## Example: Request Validation Plugin

A plugin that validates JSON request bodies before they reach the service:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: request-validator
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: bookinfo-waypoint
  url: oci://registry.example.com/istio-wasm/request-validator:v1
  phase: AUTHN
  pluginConfig:
    max_body_size: 1048576
    required_content_type: "application/json"
    required_fields:
      - "user_id"
      - "action"
```

## Using Wasm Plugins from HTTP URLs

If you cannot use an OCI registry, serve the Wasm binary from HTTP:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-plugin
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: bookinfo-waypoint
  url: https://wasm-storage.example.com/plugins/custom-plugin.wasm
  sha256: "abc123def456..."
  phase: STATS
```

The `sha256` field is recommended for HTTP URLs to ensure the binary has not been tampered with. Calculate it:

```bash
sha256sum plugin.wasm
```

## Debugging Wasm Plugins

### Check Plugin Loading

Verify the WasmPlugin resource was accepted:

```bash
kubectl get wasmplugin -n bookinfo
```

### Check Envoy Logs

The waypoint proxy logs show Wasm plugin loading and execution:

```bash
kubectl logs deploy/bookinfo-waypoint -n bookinfo --tail=50
```

Look for lines mentioning "wasm" or your plugin name. Common errors:
- `Failed to load Wasm module`: URL is unreachable or binary is invalid
- `Plugin configuration rejected`: The pluginConfig format does not match what the plugin expects

### Enable Debug Logging

For more verbose output, increase the log level:

```bash
istioctl proxy-config log deploy/bookinfo-waypoint -n bookinfo --level wasm:debug
```

### Check Envoy Stats

```bash
kubectl exec deploy/bookinfo-waypoint -n bookinfo -- \
  pilot-agent request GET stats | grep wasm
```

This shows counters for Wasm operations including errors and processing time.

## Multiple Plugins

You can attach multiple Wasm plugins to the same waypoint. They execute in order based on their phase and priority:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-plugin
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: bookinfo-waypoint
  url: oci://registry.example.com/istio-wasm/auth:v1
  phase: AUTHN
  priority: 10
---
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: metrics-plugin
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: bookinfo-waypoint
  url: oci://registry.example.com/istio-wasm/metrics:v1
  phase: STATS
  priority: 20
```

Lower priority numbers execute first within the same phase.

## Performance Considerations

Wasm plugins add processing time to each request. The overhead depends on what the plugin does:

- A simple header manipulation plugin adds microseconds
- A plugin that makes external HTTP calls adds milliseconds (and is generally discouraged)
- A plugin that processes large request bodies can use significant memory

Keep plugins lean. If your plugin needs to make network calls, consider using Envoy's async HTTP call API to avoid blocking the request path.

Monitor the impact:

```bash
kubectl exec deploy/bookinfo-waypoint -n bookinfo -- \
  pilot-agent request GET stats | grep -E "wasm.*duration"
```

## Updating Wasm Plugins

To update a plugin, push a new version to the registry and update the WasmPlugin resource:

```bash
oras push registry.example.com/istio-wasm/custom-header:v2 plugin-v2.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

```yaml
spec:
  url: oci://registry.example.com/istio-wasm/custom-header:v2
```

Envoy reloads the plugin without restarting. This makes it possible to update plugin logic without any traffic disruption.

Wasm plugins are a powerful extension mechanism for waypoint proxies. They let you implement custom logic that goes beyond what Istio's built-in features offer, all while keeping the mesh infrastructure clean and standardized.
