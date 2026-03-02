# How to Use WasmPlugin API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WASM, WasmPlugin, API, Kubernetes, Service Mesh

Description: A complete walkthrough of the Istio WasmPlugin API including all fields, configuration options, and practical deployment examples.

---

The WasmPlugin API is how you tell Istio to load and run WebAssembly extensions in your Envoy sidecars. It was introduced to replace the older approach of using EnvoyFilter resources for Wasm configuration, and it is much cleaner to work with. If you are building or deploying custom Wasm plugins, understanding this API thoroughly will save you a lot of headaches.

## The WasmPlugin Resource Structure

The WasmPlugin custom resource lives in the `extensions.istio.io/v1alpha1` API group. Here is a complete example showing all the major fields:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/plugins/my-plugin:v1.0.0
  phase: AUTHN
  priority: 10
  pluginConfig:
    key1: value1
    key2: value2
  pluginName: my-plugin
  imagePullPolicy: IfNotPresent
  imagePullSecret: my-registry-secret
  failStrategy: FAIL_CLOSE
  vmConfig:
    env:
    - name: MY_ENV_VAR
      value: some-value
    - name: POD_NAME
      valueFrom: HOST
```

That is a lot of fields. Let us go through each one.

## The selector Field

The `selector` field determines which workloads the plugin applies to. It uses label matching, the same way Kubernetes Services work:

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
      version: v2
```

If you omit the selector entirely and deploy the WasmPlugin in the `istio-system` namespace, it applies to all workloads in the mesh. This is how you deploy mesh-wide plugins.

For namespace-scoped plugins, create the WasmPlugin in the workload's namespace:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: my-app-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/plugins/my-plugin:v1.0.0
```

## The url Field

This tells Istio where to find the Wasm binary. Three URL schemes are supported:

**OCI registry (recommended):**
```yaml
url: oci://registry.example.com/plugins/my-plugin:v1.0.0
```

**HTTP/HTTPS:**
```yaml
url: https://storage.example.com/plugins/my-plugin.wasm
```

**Local file (for development only):**
```yaml
url: file:///etc/istio/plugins/my-plugin.wasm
```

The OCI approach is strongly recommended for production because it gives you proper versioning, authentication, and caching.

## The phase Field

Wasm plugins need to execute at a specific point in the Envoy filter chain. The `phase` field controls this:

- `AUTHN` - Runs during authentication, before Istio's own authentication filters
- `AUTHZ` - Runs during authorization, before Istio's authorization filters
- `STATS` - Runs during stats collection, after authorization
- `UNSPECIFIED_PHASE` - Defaults to `AUTHN`

Choosing the right phase matters. If your plugin does authentication work, put it in `AUTHN`. If it modifies headers for routing decisions, `AUTHN` is also appropriate since it runs early. Logging and observability plugins should use `STATS` so they see the final state of the request.

```yaml
spec:
  phase: AUTHZ
```

## The priority Field

When you have multiple WasmPlugins in the same phase, `priority` controls the order. Higher numbers run first:

```yaml
# This runs first (higher priority)
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-check
spec:
  phase: AUTHN
  priority: 20
  url: oci://registry.example.com/plugins/auth:v1.0.0

---
# This runs second (lower priority)
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: rate-limit
spec:
  phase: AUTHN
  priority: 10
  url: oci://registry.example.com/plugins/ratelimit:v1.0.0
```

## The pluginConfig Field

This is where you pass configuration to your Wasm plugin. The content is arbitrary and depends entirely on what your plugin expects:

```yaml
spec:
  pluginConfig:
    rules:
      - path: "/api/v1/*"
        action: allow
      - path: "/admin/*"
        action: deny
    log_level: info
    cache_ttl: 300
```

The configuration gets serialized as JSON and passed to the plugin at initialization time. Your Wasm plugin code reads this in its `onConfigure` callback.

## The vmConfig Field

The `vmConfig` section lets you configure the Wasm virtual machine environment. The most useful part is passing environment variables:

```yaml
spec:
  vmConfig:
    env:
    - name: LOG_LEVEL
      value: debug
    - name: POD_NAME
      valueFrom: HOST
    - name: NAMESPACE
      valueFrom: HOST
```

The `valueFrom: HOST` option pulls the environment variable from the host (proxy) environment. This is useful for passing pod metadata to your plugin.

## Practical Example: Deploying a Header Manipulation Plugin

Here is a real-world example. Say you have a Wasm plugin that adds custom headers based on the request path:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-headers
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://ghcr.io/myorg/wasm-plugins/custom-headers:v2.1.0
  phase: AUTHN
  priority: 15
  imagePullPolicy: IfNotPresent
  imagePullSecret: ghcr-pull-secret
  failStrategy: FAIL_OPEN
  pluginConfig:
    header_rules:
      - match_path: "/api/v1/"
        add_headers:
          x-api-version: "v1"
          x-service-tier: "standard"
      - match_path: "/api/v2/"
        add_headers:
          x-api-version: "v2"
          x-service-tier: "premium"
  vmConfig:
    env:
    - name: CLUSTER_NAME
      value: production-us-east
```

Deploy it:

```bash
kubectl apply -f custom-headers-plugin.yaml
```

Verify it is loaded:

```bash
istioctl proxy-config extension api-gateway-pod-xyz -n default
```

## Targeting Specific Traffic Types

You can also control whether the plugin applies to inbound traffic, outbound traffic, or gateway traffic using the `match` field:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: outbound-logger
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/plugins/logger:v1.0.0
  phase: STATS
  match:
  - mode: CLIENT
```

The mode options are:
- `CLIENT` - Outbound traffic (when the pod is the client)
- `SERVER` - Inbound traffic (when the pod is the server)
- `UNDEFINED` - Both directions (default)

## Verifying Plugin Deployment

After applying a WasmPlugin resource, check that Istio accepted it:

```bash
kubectl get wasmplugin -A
```

Then verify the plugin is actually loaded in the proxy:

```bash
istioctl proxy-status
istioctl proxy-config extension <pod-name> -n <namespace>
```

If the plugin is not showing up, check istiod logs:

```bash
kubectl logs -l app=istiod -n istio-system --tail=50
```

Common issues include wrong selectors, inaccessible OCI registries, and missing pull secrets.

## Removing a WasmPlugin

Cleanup is straightforward:

```bash
kubectl delete wasmplugin my-plugin -n default
```

The proxy will stop loading the plugin on the next configuration push from istiod. This usually happens within a few seconds.

## Summary

The WasmPlugin API is the proper way to manage Wasm extensions in Istio. It gives you control over which workloads run the plugin, what phase of the filter chain it executes in, how it handles failures, and what configuration it receives. Using OCI registries for plugin distribution, pinning versions, and setting appropriate failure strategies are all essential for production deployments. The API surface is compact but covers everything you need.
