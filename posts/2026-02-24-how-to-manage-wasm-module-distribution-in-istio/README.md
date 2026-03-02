# How to Manage Wasm Module Distribution in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASM, OCI, Distribution

Description: How to build, distribute, and manage WebAssembly modules for Istio using OCI registries and best practices for production.

---

Building a Wasm plugin is one thing. Getting it distributed reliably to hundreds or thousands of Envoy proxies across your mesh is another challenge entirely. Each proxy needs to fetch the Wasm binary, cache it, and load it - and this needs to happen without disrupting traffic or introducing latency.

Here is how to manage the full lifecycle of Wasm module distribution in Istio.

## How Wasm Module Loading Works

When you create a WasmPlugin resource in Istio, here is what happens:

1. The Istio control plane (istiod) sees the new WasmPlugin resource
2. Istiod translates it into an Envoy configuration that includes the Wasm filter
3. The proxy receives the configuration via xDS
4. The proxy fetches the Wasm binary from the specified URL
5. The binary is compiled and loaded into the proxy's Wasm runtime
6. The plugin starts processing traffic

The key detail is that the proxy fetches the Wasm binary directly. It is not distributed through the control plane. This means the proxy needs network access to wherever the binary is hosted.

## Distribution Methods

Istio supports three ways to distribute Wasm modules:

### OCI Registry (Recommended)

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  url: oci://registry.example.com/wasm-plugins/my-plugin:v1.0.0
  imagePullPolicy: IfNotPresent
```

### HTTP/HTTPS URL

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  url: https://storage.example.com/wasm-plugins/my-plugin-v1.0.0.wasm
```

### Local File (for development only)

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  url: file:///var/local/wasm/my-plugin.wasm
```

OCI registries are the best choice for production because they support authentication, versioning, and content-addressable storage.

## Building Wasm Modules

Wasm plugins for Envoy can be written in several languages. The most common are Go (using TinyGo), Rust, and C++.

Here is a simple Go example using the proxy-wasm SDK:

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
    proxywasm.AddHttpResponseHeader("x-custom-header", "added-by-wasm")
    return types.ActionContinue
}
```

Compile it:

```bash
tinygo build -o plugin.wasm -scheduler=none -target=wasi ./main.go
```

## Pushing to an OCI Registry

Use `oras` (OCI Registry as Storage) to push the compiled Wasm binary:

```bash
# Install oras
brew install oras

# Push the Wasm module
oras push registry.example.com/wasm-plugins/my-plugin:v1.0.0 \
  plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm

# Tag with a specific version and latest
oras push registry.example.com/wasm-plugins/my-plugin:v1.0.0 \
  plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm

oras tag registry.example.com/wasm-plugins/my-plugin:v1.0.0 latest
```

You can use any OCI-compatible registry. Docker Hub, GitHub Container Registry, AWS ECR, Google Artifact Registry, and Azure Container Registry all work.

## CI/CD Pipeline for Wasm Modules

Automate the build and push process in your CI pipeline:

```yaml
# .github/workflows/wasm-plugin.yml
name: Build and Push Wasm Plugin
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up TinyGo
        uses: nicholasgasior/action-setup-tinygo@v1
        with:
          tinygo-version: '0.31.0'

      - name: Build Wasm module
        run: tinygo build -o plugin.wasm -scheduler=none -target=wasi ./main.go

      - name: Install oras
        run: |
          curl -LO https://github.com/oras-project/oras/releases/download/v1.1.0/oras_1.1.0_linux_amd64.tar.gz
          tar -xzf oras_1.1.0_linux_amd64.tar.gz
          sudo mv oras /usr/local/bin/

      - name: Login to registry
        run: oras login registry.example.com -u ${{ secrets.REGISTRY_USER }} -p ${{ secrets.REGISTRY_PASSWORD }}

      - name: Push Wasm module
        run: |
          VERSION=${GITHUB_REF#refs/tags/}
          oras push registry.example.com/wasm-plugins/my-plugin:${VERSION} \
            plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

## Private Registry Authentication

If your registry requires authentication, configure an imagePullSecret:

```bash
kubectl create secret docker-registry wasm-registry-creds \
  -n production \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword
```

Reference it in the WasmPlugin:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  url: oci://registry.example.com/wasm-plugins/my-plugin:v1.0.0
  imagePullPolicy: IfNotPresent
  imagePullSecret: wasm-registry-creds
```

## Caching and Pull Policies

Envoy caches Wasm modules locally. The `imagePullPolicy` controls when modules are refetched:

```yaml
# Only fetch if not cached - good for production with versioned tags
imagePullPolicy: IfNotPresent

# Always fetch - good for development with mutable tags
imagePullPolicy: Always
```

With `IfNotPresent`, the module is fetched once and cached. If you update the binary behind the same tag, proxies will not pick up the change. This is why immutable version tags are important for production.

## Versioning Strategy

Use semantic versioning and manage updates carefully:

```bash
# Development versions
oras push registry.example.com/wasm-plugins/my-plugin:dev-abc123 plugin.wasm:...

# Release versions
oras push registry.example.com/wasm-plugins/my-plugin:v1.0.0 plugin.wasm:...
oras push registry.example.com/wasm-plugins/my-plugin:v1.0.1 plugin.wasm:...
oras push registry.example.com/wasm-plugins/my-plugin:v1.1.0 plugin.wasm:...
```

To update the plugin version, update the WasmPlugin resource:

```bash
kubectl patch wasmplugin my-plugin -n production --type=merge \
  -p '{"spec":{"url":"oci://registry.example.com/wasm-plugins/my-plugin:v1.1.0"}}'
```

## Rolling Updates

When you update a WasmPlugin version, proxies fetch the new module on the next xDS update. This is not instantaneous - it happens over seconds to minutes depending on your mesh size.

For critical plugins, do a phased rollout:

```yaml
# Step 1: Update canary workloads
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin-canary
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
      track: canary
  url: oci://registry.example.com/wasm-plugins/my-plugin:v2.0.0
---
# Step 2: After validation, update the main plugin
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/wasm-plugins/my-plugin:v2.0.0
```

## Monitoring Distribution Health

Track whether modules are being fetched successfully:

```bash
# Check for Wasm fetch errors in proxy logs
kubectl logs deploy/my-service -c istio-proxy | grep -i "wasm\|fetch\|download"

# Check Envoy stats for Wasm module loading
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep "wasm"

# Check the WasmPlugin resource status
kubectl get wasmplugin -n production -o wide
```

Common distribution failures:

- **Registry unreachable** - Check network policies and DNS resolution
- **Authentication failed** - Verify the imagePullSecret
- **Module too large** - Very large Wasm modules take longer to fetch and compile, causing startup latency
- **Incompatible ABI** - The Wasm module was compiled for a different proxy-wasm ABI version than Envoy supports

## Size Optimization

Smaller modules load faster and use less memory:

```bash
# Check module size
ls -lh plugin.wasm

# Strip debug info (for TinyGo)
tinygo build -o plugin.wasm -scheduler=none -target=wasi -no-debug ./main.go

# For Rust, use release mode with size optimization
[profile.release]
opt-level = "s"
lto = true
strip = true
```

A good target is under 1 MB for the compiled Wasm binary. Modules over 5 MB will noticeably impact proxy startup time.

Getting Wasm distribution right is about having a reliable pipeline from development to production. Build with CI, push to a trusted registry, version everything, and monitor the distribution status across your mesh.
