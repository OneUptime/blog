# Validation Summary: How to Manage Wasm Module Distribution in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio WasmPlugin
- Envoy Proxy-Wasm
- WebAssembly and WASI
- OCI registries
- ORAS CLI
- Kubernetes image pull secrets
- GitHub Actions
- Go proxy-wasm SDK
- Rust release profile optimization

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Distributing WebAssembly Modules task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- Istio Pull Policy for WebAssembly Modules: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- Istio istioctl environment variable reference for remote Wasm load conversion: https://istio.io/latest/docs/reference/commands/istioctl/
- Proxy-Wasm Go SDK repository and README: https://github.com/proxy-wasm/proxy-wasm-go-sdk
- Proxy-Wasm Go SDK package docs: https://pkg.go.dev/github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm
- Archived Tetrate Proxy-Wasm Go SDK repository notice: https://github.com/tetratelabs/proxy-wasm-go-sdk
- ORAS push command reference: https://oras.land/docs/commands/oras_push/
- ORAS tag command reference: https://oras.land/docs/commands/oras_tag/
- TinyGo installation/version documentation: https://tinygo.org/getting-started/install/linux/

## Issues Found
- The post said the proxy fetches the Wasm binary directly. Istio documentation states that the Istio agent interprets the WasmPlugin configuration, downloads remote modules, and rewrites the Envoy configuration to reference a local file. Updated the loading explanation to identify the proxy-side Istio agent as the downloader and cache owner.
- The Go example used the archived `github.com/tetratelabs/proxy-wasm-go-sdk` module and TinyGo build command. Updated the example to use the current upstream `github.com/proxy-wasm/proxy-wasm-go-sdk` module and the Go 1.24+ `GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared` build flow documented by the SDK.
- The GitHub Actions workflow used an old TinyGo-based setup and ORAS 1.1.0. Updated the workflow to use `actions/setup-go` with Go 1.24.x and ORAS 1.3.0.
- The caching section attributed Wasm module caching to Envoy and described `Always` too broadly. Updated it to describe Istio agent caching and clarify that `Always` pulls when the WasmPlugin resource changes.
- The rolling update section said proxies fetch the new module on the next xDS update. Updated it to describe proxy-side Istio agents fetching the module as updated configuration is processed.
- The monitoring section suggested Envoy admin stats for Wasm distribution. Istio documents `istio_agent_wasm_*` metrics for remote fetch and cache activity, so the command now checks the Istio agent Prometheus endpoint.
- The size optimization section used TinyGo-specific flags after the Go example was moved to the current upstream SDK. Updated it to a standard Go WASI build with `-ldflags="-s -w"`.

## Review Notes
- The WasmPlugin API is still documented in current Istio references, but Istio announced the newer TrafficExtension API in Istio 1.30 as the primary proxy extensibility mechanism. A future article update could mention that version-specific caveat if the post is meant to target Istio 1.30 and later.
- The local environment did not have `oras`, `tinygo`, or `kubectl` installed, so CLI validation was performed against official command and API documentation rather than local `--help` output.
