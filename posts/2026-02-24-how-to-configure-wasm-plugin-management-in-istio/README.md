# How to Configure Wasm Plugin Management in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASM, Envoy, Extensibility

Description: How to deploy, configure, and manage WebAssembly plugins in Istio for custom proxy behavior and traffic processing.

---

WebAssembly (Wasm) plugins are one of the most powerful extension mechanisms in Istio. They let you run custom code inside the Envoy proxy, right in the data path. Need custom authentication logic? Rate limiting based on business rules? Request transformation that is too complex for standard Envoy filters? Wasm plugins handle all of that.

But managing Wasm plugins in a production mesh requires some care. Here is how to do it right.

## What Are Wasm Plugins in Istio?

A Wasm plugin is a compiled WebAssembly module that runs inside the Envoy proxy. The plugin gets called for each request (or connection) and can inspect, modify, or reject traffic. Istio provides a `WasmPlugin` custom resource to deploy and configure these plugins.

Wasm plugins run in a sandboxed environment, so a bug in your plugin is isolated from the proxy process. If the plugin has a fatal error, Istio applies the `failStrategy` configuration: requests can be rejected, allowed to bypass the plugin, or handled by a new plugin instance for supported runtime errors.

## Deploying Your First Wasm Plugin

Here is a basic WasmPlugin resource:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-auth-plugin
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/wasm-plugins/auth:v1.0.0
  phase: AUTHN
  pluginConfig:
    auth_header: "x-api-key"
    required: true
```

The key fields:

- **selector** - Which workloads the plugin applies to
- **url** - Where to fetch the Wasm module (supports OCI registries, HTTP, and local files)
- **phase** - When in the filter chain the plugin runs
- **pluginConfig** - Configuration passed to the plugin at initialization

## Plugin Phases

The `phase` field determines where in the Envoy filter chain your plugin executes:

- **AUTHN** - Authentication phase, runs early. Good for validating tokens and API keys
- **AUTHZ** - Authorization phase, runs after authentication. Good for access control decisions
- **STATS** - Statistics phase, runs before Istio stats filters and after authorization filters. Good for custom metrics
- **UNSPECIFIED_PHASE** - Default, inserts before the router. Works for general-purpose processing

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: rate-limiter
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/wasm-plugins/rate-limit:v2.1.0
  phase: AUTHZ
  priority: 10
  pluginConfig:
    requests_per_minute: 100
    burst: 20
```

The `priority` field controls ordering when multiple plugins share the same phase. Higher numbers execute first.

## Fetching Plugins from OCI Registries

The recommended way to distribute Wasm plugins is through OCI (container) registries. You can push Wasm modules to any OCI-compatible registry:

```bash
# Build your Wasm plugin

tinygo build -o plugin.wasm -scheduler=none -target=wasi main.go

# Push to an OCI registry using oras or buildah
oras push registry.example.com/wasm-plugins/my-plugin:v1.0.0 \
  plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

If your registry requires authentication, create an image pull secret:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://private-registry.example.com/wasm-plugins/my-plugin:v1.0.0
  imagePullPolicy: IfNotPresent
  imagePullSecret: registry-credentials
```

The `imagePullSecret` references a Kubernetes Secret with registry credentials:

```bash
kubectl create secret docker-registry registry-credentials \
  -n production \
  --docker-server=private-registry.example.com \
  --docker-username=my-user \
  --docker-password=my-password
```

## Managing Plugin Versions

Use semantic versioning for your Wasm modules and the `imagePullPolicy` field to control updates:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  url: oci://registry.example.com/wasm-plugins/my-plugin:v1.2.3
  imagePullPolicy: IfNotPresent
```

The pull policies:

- **IfNotPresent** - Only fetch if the module is not already cached. Use with specific version tags
- **Always** - Always fetch, even if cached. Use during development with mutable tags like `latest`

For production, use immutable version tags or digest references with `IfNotPresent`. Using `latest` in production is asking for trouble.

## Applying Plugins at Different Scopes

Wasm plugins can be scoped to specific workloads, namespaces, or the entire mesh:

```yaml
# Mesh-wide (apply in the Istio config root namespace, commonly istio-system, without selector)
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: global-headers
  namespace: istio-system
spec:
  url: oci://registry.example.com/wasm-plugins/add-headers:v1.0.0
  pluginConfig:
    headers:
      x-mesh-version: "v1"
---
# Namespace-wide (apply in target namespace without selector)
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: namespace-auth
  namespace: production
spec:
  url: oci://registry.example.com/wasm-plugins/auth:v2.0.0
  pluginConfig:
    provider: "oauth2"
---
# Workload-specific
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: payment-validator
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  url: oci://registry.example.com/wasm-plugins/payment-validator:v1.5.0
  pluginConfig:
    validate_amount: true
    max_amount: 10000
```

## Configuring Failure Handling

What happens when a Wasm plugin fails? The `failStrategy` field controls this:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: optional-enrichment
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  url: oci://registry.example.com/wasm-plugins/enrichment:v1.0.0
  failStrategy: FAIL_OPEN
  pluginConfig:
    enrich_headers: true
```

- **FAIL_CLOSE** - If the plugin fails, reject the request. Use for security-critical plugins
- **FAIL_OPEN** - If the plugin fails, let the request through. Use for non-critical functionality
- **FAIL_RELOAD** - Create a new plugin instance for a new request after supported runtime errors

## Monitoring Wasm Plugins

Check the status of your Wasm plugins:

```bash
kubectl get wasmplugins -n production
```

Monitor Wasm-related metrics through the Istio telemetry endpoint:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep "wasm"
```

Key Istio agent metrics to watch for remote module distribution:

- `istio_agent_wasm_cache_lookup_count` - Wasm remote fetch cache lookups
- `istio_agent_wasm_cache_entries` - Wasm config conversion results, including cache and fetch outcomes
- `istio_agent_wasm_config_conversion_duration_bucket` - Time spent converting Wasm module configuration
- `istio_agent_wasm_remote_fetch_count` - Remote fetch results, including successful downloads, download failures, and checksum mismatches

## Debugging Plugin Issues

When a Wasm plugin is not working as expected:

```bash
# Check proxy logs for Wasm errors
kubectl logs deploy/my-service -c istio-proxy | grep -i "wasm"

# Check if the plugin was loaded
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/config_dump | grep "wasm"

# Verify the WasmPlugin resource status
kubectl describe wasmplugin my-plugin -n production

# Check Envoy config for the Wasm filter
istioctl proxy-config listener deploy/my-service -o json | grep -A 10 "wasm"
```

## Rolling Out Plugin Updates

For safe rollouts, use canary deployments. Apply the new version to a subset of workloads first:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-plugin-canary
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
      version: canary
  url: oci://registry.example.com/wasm-plugins/auth:v2.0.0
  pluginConfig:
    new_feature: true
```

Monitor the canary workloads for errors, then roll out to the full set by updating the main WasmPlugin resource.

Wasm plugins give you incredible flexibility to customize your mesh behavior, but they are also code running in the hot path of every request. Test thoroughly, version carefully, and monitor continuously.
