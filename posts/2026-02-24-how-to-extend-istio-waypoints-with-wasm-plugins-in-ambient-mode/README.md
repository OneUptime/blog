# How to Extend Istio Waypoints with Wasm Plugins in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Wasm, Waypoint Proxy, Kubernetes

Description: Learn how to attach WebAssembly plugins to waypoint proxies in Istio ambient mode for Layer 7 traffic processing customization.

---

Istio's ambient mode changes the game for service mesh architecture. Instead of injecting sidecar proxies into every pod, it uses a shared ztunnel for Layer 4 processing and optional waypoint proxies for Layer 7 processing. If you want to run custom Wasm plugins in ambient mode, your plugins attach to waypoint proxies rather than sidecars. The workflow is a bit different from the traditional sidecar model, and this guide walks through exactly how to set it up.

## Quick Recap: Ambient Mode Architecture

In ambient mode, there are two proxy layers:

1. **ztunnel** - A per-node proxy that handles Layer 4 concerns like mTLS and basic network policy. Every pod in the mesh automatically gets ztunnel coverage.
2. **Waypoint proxy** - An optional per-namespace or per-service proxy that handles Layer 7 concerns like HTTP routing, retries, and header manipulation.

Wasm plugins only make sense at Layer 7, so they attach to waypoint proxies. If you do not have a waypoint proxy deployed, you cannot run Wasm plugins on that traffic.

## Deploying a Waypoint Proxy

Before you can attach Wasm plugins, you need a waypoint proxy. Create one for a specific namespace:

```bash
istioctl waypoint apply --namespace my-app
```

This creates a Kubernetes Gateway resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: my-app
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

Verify it is running:

```bash
kubectl get gateway -n my-app
kubectl get pods -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint
```

You should see a waypoint proxy pod running in your namespace.

## Attaching a WasmPlugin to a Waypoint

In ambient mode, you target waypoint proxies using the `targetRefs` field instead of the `selector` field. Here is how to attach a Wasm plugin to a waypoint:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-auth
  namespace: my-app
spec:
  targetRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: waypoint
  url: oci://registry.example.com/wasm-plugins/auth:v1.0.0
  phase: AUTHN
  pluginConfig:
    allowed_paths:
      - "/healthz"
      - "/readyz"
```

The key difference from sidecar mode is the `targetRefs` field. Instead of matching pod labels, you reference the Gateway resource by name. This tells Istio to load your Wasm plugin on the waypoint proxy that Gateway defines.

## Targeting a Specific Service's Waypoint

You can also deploy waypoint proxies per-service rather than per-namespace. First, label the service to get its own waypoint:

```bash
kubectl label service my-api istio.io/use-waypoint=my-api-waypoint -n my-app
```

Create the service-specific waypoint:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-api-waypoint
  namespace: my-app
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

Then attach the Wasm plugin to that specific waypoint:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: api-rate-limiter
  namespace: my-app
spec:
  targetRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: my-api-waypoint
  url: oci://registry.example.com/wasm-plugins/rate-limiter:v2.0.0
  phase: AUTHN
  pluginConfig:
    max_requests_per_second: 100
```

This is nice because different services can have different Wasm plugins, and you are not loading unnecessary plugins on services that do not need them.

## Using targetRefs with Service Targets

You can also target a Kubernetes Service directly, and the Wasm plugin will apply to whatever waypoint is handling that service:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: service-logger
  namespace: my-app
spec:
  targetRefs:
  - kind: Service
    group: ""
    name: my-api
  url: oci://registry.example.com/wasm-plugins/logger:v1.0.0
  phase: STATS
```

## Combining Multiple Plugins on a Waypoint

Just like with sidecars, you can attach multiple Wasm plugins to a single waypoint. Use the `priority` field to control execution order:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-plugin
  namespace: my-app
spec:
  targetRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: waypoint
  url: oci://registry.example.com/wasm-plugins/auth:v1.0.0
  phase: AUTHN
  priority: 20

---
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: logging-plugin
  namespace: my-app
spec:
  targetRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: waypoint
  url: oci://registry.example.com/wasm-plugins/logger:v1.0.0
  phase: STATS
  priority: 10
```

The auth plugin (priority 20) runs before the logging plugin (priority 10).

## Verifying the Plugin is Loaded

Check the waypoint proxy's configuration to verify your plugin is loaded:

```bash
# Find the waypoint pod
WAYPOINT_POD=$(kubectl get pods -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint -o jsonpath='{.items[0].metadata.name}')

# Check loaded extensions
istioctl proxy-config extension $WAYPOINT_POD -n my-app
```

You can also check the waypoint proxy logs:

```bash
kubectl logs $WAYPOINT_POD -n my-app
```

If the Wasm binary fails to load, you will see error messages about remote fetch failures or Wasm compilation errors.

## Failure Handling in Ambient Mode

The `failStrategy` field works the same way as it does with sidecars:

```yaml
spec:
  failStrategy: FAIL_OPEN
```

However, the impact is different in ambient mode. When a waypoint proxy's Wasm plugin fails with `FAIL_CLOSE`, it blocks all Layer 7 traffic through that waypoint. Layer 4 traffic through ztunnel is unaffected since Wasm plugins do not run there.

For non-critical plugins (logging, metrics enrichment), use `FAIL_OPEN`. For security-critical plugins (authentication, authorization), use `FAIL_CLOSE`.

## Performance Considerations for Waypoint Plugins

Waypoint proxies are shared resources. Unlike sidecars where each pod has its own proxy, a waypoint proxy handles traffic for an entire namespace or service. This means:

- Plugin performance impact is amplified since all traffic flows through one proxy
- Memory usage matters more because one waypoint VM serves many connections
- You should be more conservative with heavy computation in plugins

Monitor waypoint proxy resource usage:

```bash
kubectl top pod $WAYPOINT_POD -n my-app
```

And check Envoy stats:

```bash
kubectl exec $WAYPOINT_POD -n my-app -- curl -s localhost:15000/stats | grep wasm
```

## Upgrading Plugins on Waypoints

To update a Wasm plugin, update the WasmPlugin resource with the new version:

```bash
kubectl patch wasmplugin custom-auth -n my-app \
  --type merge \
  -p '{"spec":{"url":"oci://registry.example.com/wasm-plugins/auth:v1.1.0"}}'
```

The waypoint proxy picks up the change without needing a restart. Istio pushes the new configuration, and Envoy fetches the updated binary.

## Limitations to Be Aware Of

There are a few things to keep in mind when using Wasm plugins with ambient mode:

- Wasm plugins only run on waypoint proxies, not on ztunnel. If you need Layer 4 customization, Wasm is not the answer in ambient mode.
- The `selector` field (matchLabels) does not work for waypoint targeting. You must use `targetRefs`.
- Waypoint proxies need to be provisioned before you can attach plugins. Unlike sidecars that are always present, waypoints are optional.
- If you remove the waypoint, all attached Wasm plugins stop running for that traffic.

## Summary

Extending waypoint proxies with Wasm plugins in ambient mode is straightforward once you understand the key difference: use `targetRefs` to target Gateway resources instead of `selector` to match pod labels. Deploy your waypoint first, then attach your WasmPlugin resources to it. Monitor performance carefully since waypoints are shared infrastructure, and choose your failure strategy wisely based on what your plugin does. Ambient mode with Wasm plugins gives you a clean, sidecar-free mesh that you can still customize exactly the way you need.
