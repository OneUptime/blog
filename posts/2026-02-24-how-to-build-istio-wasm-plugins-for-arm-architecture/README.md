# How to Build Istio Wasm Plugins for ARM Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, ARM, Envoy, Wasm Plugins

Description: Step-by-step guide to building and deploying Istio WebAssembly plugins that work correctly on ARM64 Kubernetes nodes.

---

WebAssembly plugins let you extend Envoy proxy behavior inside Istio without modifying the proxy itself. Wasm is architecture-neutral by design, which sounds like it should just work on ARM. And mostly it does. But there are some gotchas around the toolchain, the build process, and how you distribute these plugins that you need to handle carefully.

## Why Wasm on ARM Matters

If you are running ARM-based nodes (Graviton, Ampere, or even Raspberry Pi clusters), every component in your stack needs to work on that architecture. Wasm plugins are compiled to the WebAssembly bytecode format, which is platform-independent. Envoy on ARM can execute the same .wasm binary as Envoy on x86. That is the whole point.

But the build tools and the OCI images you use to distribute these plugins still need to run on your build platform. And if your CI/CD pipeline is on ARM, you need to make sure the entire toolchain works there too.

## Setting Up the Build Environment

You will need a few tools installed:

```bash
# Install Rust (works on both x86 and ARM)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the wasm32 target
rustup target add wasm32-wasi

# Install TinyGo if you prefer Go (also has ARM support)
# Download from https://tinygo.org/getting-started/install/
```

For Rust-based plugins, the `wasm32-wasi` target compiles to WebAssembly regardless of the host machine architecture. This means you can build on an ARM Mac or an ARM Linux box and produce the same wasm binary.

## Writing a Basic Wasm Plugin in Rust

Create a new Rust project:

```bash
cargo new --lib istio-wasm-plugin
cd istio-wasm-plugin
```

Update `Cargo.toml`:

```toml
[package]
name = "istio-wasm-plugin"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
proxy-wasm = "0.2.1"
log = "0.4"
```

Write a simple header-adding plugin in `src/lib.rs`:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_http_context(|_, _| -> Box<dyn HttpContext> {
        Box::new(CustomHeaders)
    });
}}

struct CustomHeaders;

impl Context for CustomHeaders {}

impl HttpContext for CustomHeaders {
    fn on_http_response_headers(&mut self, _: usize, _: bool) -> Action {
        self.set_http_response_header("x-powered-by", Some("istio-wasm-arm"));
        Action::Continue
    }
}
```

## Building the Plugin

Compile to WebAssembly:

```bash
cargo build --target wasm32-wasi --release
```

The output will be at `target/wasm32-wasi/release/istio_wasm_plugin.wasm`. This binary is architecture-neutral. You can build it on an ARM laptop and deploy it on an x86 cluster, or vice versa.

To verify the binary:

```bash
file target/wasm32-wasi/release/istio_wasm_plugin.wasm
```

You should see something like `WebAssembly (wasm) binary module version 0x1 (MVP)`.

## Writing a Plugin in Go with TinyGo

If Go is more your speed, TinyGo can compile Go to Wasm. Here is an equivalent plugin:

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
	return &httpHeaders{}
}

type httpHeaders struct {
	types.DefaultHttpContext
}

func (ctx *httpHeaders) OnHttpResponseHeaders(numHeaders int, endOfStream bool) types.Action {
	_ = proxywasm.AddHttpResponseHeader("x-powered-by", "istio-wasm-arm-go")
	return types.ActionContinue
}
```

Build with TinyGo:

```bash
tinygo build -o plugin.wasm -scheduler=none -target=wasi main.go
```

TinyGo runs on ARM64 natively, so this works fine on Graviton instances or Apple Silicon.

## Distributing Wasm Plugins via OCI Registry

Istio can pull Wasm plugins from OCI registries. Since the wasm binary is architecture-neutral, you only need a single image (unlike container images which need separate manifests for each arch).

Push your plugin to a registry:

```bash
# Using ORAS (OCI Registry As Storage)
oras push myregistry.io/istio-plugins/custom-headers:v1.0 \
  --artifact-type application/vnd.module.wasm.content.layer.v1+wasm \
  plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

## Deploying the Plugin to Istio

Create a WasmPlugin resource that references your OCI image:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-headers
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://myregistry.io/istio-plugins/custom-headers:v1.0
  phase: RESPONSE
```

Apply it:

```bash
kubectl apply -f wasm-plugin.yaml
```

This will work on ARM nodes, x86 nodes, or mixed clusters because the wasm binary runs in Envoy's Wasm runtime regardless of the host architecture.

## Building in CI/CD for ARM

If your CI/CD runs on ARM (like GitHub Actions with ARM runners or self-hosted ARM agents), the build process is the same. Here is a GitHub Actions workflow:

```yaml
name: Build Wasm Plugin
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        target: wasm32-wasi
    - name: Build
      run: cargo build --target wasm32-wasi --release
    - name: Push to Registry
      run: |
        oras push myregistry.io/istio-plugins/custom-headers:${{ github.sha }} \
          target/wasm32-wasi/release/istio_wasm_plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

The build step produces identical wasm output whether the runner is x86 or ARM.

## Optimizing Wasm Binary Size

Large wasm binaries take longer to load, especially on resource-constrained ARM nodes. Optimize your binary size:

```bash
# For Rust, add to Cargo.toml
[profile.release]
opt-level = "s"
lto = true
strip = true
```

You can also use `wasm-opt` from the Binaryen toolkit:

```bash
wasm-opt -Os -o optimized.wasm target/wasm32-wasi/release/istio_wasm_plugin.wasm
```

Check the size difference:

```bash
ls -lh target/wasm32-wasi/release/istio_wasm_plugin.wasm
ls -lh optimized.wasm
```

## Testing on ARM

Test your plugin locally before deploying. You can use `func-e` (a tool for running Envoy locally) or spin up a local Kind cluster on your ARM machine:

```bash
kind create cluster --name wasm-test
istioctl install --set profile=minimal -y
kubectl label namespace default istio-injection=enabled
kubectl apply -f wasm-plugin.yaml
```

Then deploy a test workload and verify the header is added:

```bash
kubectl exec deploy/sleep -- curl -s -D - http://my-service
```

Look for the `x-powered-by: istio-wasm-arm` header in the response.

## Summary

Building Wasm plugins for Istio on ARM is straightforward because WebAssembly is architecture-neutral by design. The compiled .wasm binary works on both x86 and ARM without modification. The key considerations are making sure your build toolchain (Rust, TinyGo) is installed on your ARM build environment, distributing plugins via OCI registries where a single artifact serves all architectures, and optimizing binary size for ARM nodes that might have tighter resource constraints. Once you get the build pipeline set up, the deploy-and-test cycle works identically across architectures.
