# How to Configure All WasmPlugin Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WasmPlugin, WebAssembly, Extensibility, Kubernetes

Description: Full reference for every WasmPlugin field in Istio covering plugin sources, phases, priorities, match rules, and environment variable injection.

---

WasmPlugin is Istio's way of extending Envoy proxy behavior with custom WebAssembly modules. Instead of writing EnvoyFilter patches or modifying Envoy source code, you compile your extension logic into a Wasm binary and deploy it through this API. It is cleaner, safer, and more portable than the alternatives.

## Why WasmPlugin

Before WasmPlugin existed, the main options for custom proxy logic were EnvoyFilter (fragile and version-dependent), Lua scripts (limited functionality), or building custom Envoy images (painful to maintain). Wasm gives you a sandboxed runtime that works across Envoy versions and can be written in languages like Rust, Go, C++, or AssemblyScript.

## Top-Level Structure

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-wasm-plugin
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  targetRef:
    kind: Gateway
    group: gateway.networking.k8s.io
    name: my-gateway
  url: oci://ghcr.io/my-org/my-plugin:v1.0
  sha256: abc123def456...
  imagePullPolicy: IfNotPresent
  imagePullSecret: my-registry-secret
  pluginName: my_custom_plugin
  pluginConfig:
    key1: value1
    key2: value2
  phase: AUTHN
  priority: 10
  match:
    - mode: CLIENT
      ports:
        - number: 8080
  failStrategy: FAIL_CLOSE
  vmConfig:
    env:
      - name: MY_ENV_VAR
        value: "my-value"
        valueFrom: HOST
  type: HTTP
```

## Selector and Target Ref

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
```

Same as other Istio resources. Matches workload pods by labels. If omitted, applies to all workloads in the namespace.

```yaml
spec:
  targetRef:
    kind: Gateway
    group: gateway.networking.k8s.io
    name: my-gateway
```

For Gateway API integration. Mutually exclusive with `selector`.

## URL

```yaml
spec:
  url: oci://ghcr.io/my-org/my-plugin:v1.0
```

The `url` field specifies where to fetch the Wasm binary from. Supported schemes:

- `oci://` - pull from an OCI-compatible container registry (recommended)
- `http://` or `https://` - download from a web server
- `file://` - load from the local filesystem of the proxy container

OCI is the recommended approach because it integrates with existing container registry infrastructure and supports versioning through tags.

```yaml
# OCI registry
url: oci://docker.io/my-org/my-wasm-plugin:v1.0.0

# HTTP download
url: https://storage.googleapis.com/my-bucket/my-plugin.wasm

# Local file (useful for development)
url: file:///opt/wasm/my-plugin.wasm
```

## SHA256

```yaml
spec:
  sha256: "a1b2c3d4e5f6..."
```

An optional SHA256 hash of the Wasm binary for integrity verification. If provided, Istio verifies the downloaded binary matches this hash before loading it. This is a good security practice for production deployments.

## Image Pull Policy

```yaml
spec:
  imagePullPolicy: IfNotPresent
```

Controls when the Wasm binary is fetched:

- `IfNotPresent` - download only if not already cached (default)
- `Always` - always download, even if cached

Use `Always` during development when you are pushing updates to the same tag. Use `IfNotPresent` in production with versioned tags.

## Image Pull Secret

```yaml
spec:
  imagePullSecret: my-registry-secret
```

The name of a Kubernetes secret (in the same namespace as the WasmPlugin) containing registry credentials for pulling the OCI image. The secret should be of type `kubernetes.io/dockerconfigjson`.

## Plugin Name

```yaml
spec:
  pluginName: my_custom_plugin
```

A unique name for the plugin within the Wasm VM. This is used to identify the plugin in logs and metrics. If not set, a name is derived from the resource metadata.

## Plugin Config

```yaml
spec:
  pluginConfig:
    rules:
      - header: x-api-key
        required: true
    log_level: debug
    max_cache_size: 1000
```

The `pluginConfig` field passes configuration to the Wasm plugin as a JSON object. The structure depends entirely on what your plugin expects. Istio serializes this to JSON and passes it to the plugin's `onConfigure` callback.

You can use any valid YAML structure here:

```yaml
pluginConfig:
  rate_limit:
    requests_per_second: 100
    burst: 50
  allowed_origins:
    - "https://app.example.com"
    - "https://admin.example.com"
  features:
    logging: true
    metrics: true
```

## Phase

```yaml
spec:
  phase: AUTHN
```

The `phase` field controls where in the HTTP filter chain the plugin is inserted:

- `UNSPECIFIED_PHASE` - control plane decides (default)
- `AUTHN` - inserted before Istio authentication filters
- `AUTHZ` - inserted before Istio authorization filters
- `STATS` - inserted before Istio stats filters

This is important because the filter position determines what data is available to your plugin and what it can affect. For example, an authentication plugin should run in the `AUTHN` phase so it executes before authorization checks.

## Priority

```yaml
spec:
  priority: 10
```

When multiple WasmPlugins are in the same phase, `priority` determines the order. Lower values run first. Default is 0. If two plugins have the same priority, the order is not guaranteed.

## Match

```yaml
spec:
  match:
    - mode: CLIENT
      ports:
        - number: 8080
        - number: 443
    - mode: SERVER
      ports:
        - number: 9090
```

The `match` field restricts when the plugin runs:

- `mode` can be `CLIENT` (outbound), `SERVER` (inbound), or `CLIENT_AND_SERVER`
- `ports` limits the plugin to specific port numbers

If `match` is not specified, the plugin runs on all traffic. Multiple match entries are ORed together.

## Fail Strategy

```yaml
spec:
  failStrategy: FAIL_CLOSE
```

Controls what happens when the Wasm plugin fails to load or crashes:

- `FAIL_CLOSE` - reject all traffic if the plugin cannot be loaded (safer but more disruptive)
- `FAIL_OPEN` - allow traffic to pass through without the plugin (default, less disruptive but less safe)

For security-critical plugins (authentication, authorization), you should use `FAIL_CLOSE`. For non-critical plugins (logging, metrics), `FAIL_OPEN` is usually fine.

## VM Config

```yaml
spec:
  vmConfig:
    env:
      - name: MY_API_KEY
        value: "secret-key-here"
      - name: POD_NAME
        valueFrom: HOST
```

The `vmConfig` section configures the Wasm virtual machine.

### Environment Variables

```yaml
vmConfig:
  env:
    - name: CONFIG_VALUE
      value: "inline-value"
    - name: POD_NAMESPACE
      valueFrom: HOST
```

Each environment variable has:

- `name` - the variable name visible inside the Wasm VM
- `value` - a static string value (used when `valueFrom` is not `HOST`)
- `valueFrom` - set to `HOST` to inherit the value from the proxy container's environment, or `INLINE` for the static `value`

This is how you pass dynamic configuration into your Wasm plugin. For example, injecting the pod name or namespace for logging purposes.

## Type

```yaml
spec:
  type: HTTP
```

The `type` field specifies the plugin type:

- `HTTP` - an HTTP filter plugin (default)
- `NETWORK` - a network (L4) filter plugin

Most plugins are HTTP type. Network plugins operate at the TCP level and are less common.

## Complete Examples

### Rate Limiting Plugin

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: rate-limiter
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  url: oci://ghcr.io/my-org/rate-limiter:v2.1.0
  sha256: "abc123..."
  imagePullPolicy: IfNotPresent
  phase: AUTHZ
  priority: 5
  failStrategy: FAIL_OPEN
  pluginConfig:
    requests_per_minute: 60
    burst: 10
    key_header: x-api-key
  match:
    - mode: SERVER
      ports:
        - number: 8080
  vmConfig:
    env:
      - name: LOG_LEVEL
        value: "info"
```

### Custom Authentication Plugin

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  url: oci://ghcr.io/my-org/custom-auth:v1.0.0
  sha256: "def456..."
  imagePullPolicy: IfNotPresent
  imagePullSecret: ghcr-credentials
  phase: AUTHN
  priority: 1
  failStrategy: FAIL_CLOSE
  pluginConfig:
    jwt_issuer: "https://auth.example.com"
    required_claims:
      - sub
      - email
    cache_ttl_seconds: 300
  vmConfig:
    env:
      - name: AUTH_SERVICE_URL
        value: "http://auth-service.auth.svc.cluster.local:8080"
```

WasmPlugin gives you a clean, maintainable way to extend Istio beyond its built-in capabilities. The API surface is straightforward, and the Wasm sandbox protects your proxy from plugin bugs. Start with simple plugins and gradually build up complexity as you get comfortable with the development workflow.
