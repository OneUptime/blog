# Validation Summary: Use Istio WasmPlugin to Add Custom Authentication Logic at the Proxy Level

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio WasmPlugin
- Envoy Proxy
- Proxy-Wasm
- WebAssembly
- Go
- Rust
- Kubernetes
- Docker/OCI images
- Prometheus

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Wasm pull policy documentation: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- Istio supported releases and Envoy version mapping: https://istio.io/latest/docs/releases/supported-releases/
- Istio proxy-config command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy Wasm architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- Envoy Wasm runtime stats documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Proxy-Wasm Go SDK documentation: https://github.com/proxy-wasm/proxy-wasm-go-sdk
- Proxy-Wasm Go SDK package reference: https://pkg.go.dev/github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm

## Issues Found
- The original Go example used the archived `github.com/tetratelabs/proxy-wasm-go-sdk` TinyGo SDK path. Updated it to the maintained `github.com/proxy-wasm/proxy-wasm-go-sdk` module and changed the build command to the current Go 1.24+ `GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared` flow.
- The prerequisites said Istio 1.12 or later was sufficient for the whole tutorial. WasmPlugin exists from that era, but the maintained Go SDK requires an Envoy 1.33+ compatible host. Updated the prerequisite wording to a supported Istio release with an Envoy 1.33+ data plane for this Go example.
- The first authentication snippet returned `types.ActionContinue` when the token header was missing, while the testing section said missing tokens should be rejected. Updated the code to send a 401 response for missing tokens.
- The external HTTP call used `"auth-service"` as the Envoy cluster name. In Istio, service clusters use names like `outbound|80||auth-service.default.svc.cluster.local`; updated the example accordingly.
- The configuration snippet used `json.Unmarshal` without showing the required `encoding/json` import. Added the import to the snippet.
- The rate-limiting snippet stored counts on per-request HTTP contexts and did not initialize the map, so it would not retain counts and could panic. Updated it to keep the map on the plugin context and initialize it in `OnPluginStart`.
- The proxy log command grepped for `custom-auth`, but the sample code did not emit that string. Updated the command to grep for the actual log messages.
- The monitoring PromQL referenced Wasm metrics that are not the documented Envoy runtime stat names. Replaced them with documented V8 runtime metric examples and added a note to confirm exact names from Envoy `/stats`.
- The performance comparison to sidecar containers and C++ filters was too broad. Reworded it to a narrower statement about avoiding an extra network hop and easier rollout than custom Envoy C++ filters.

## Review Notes
- I verified the snippets and commands against official or authoritative documentation, but could not locally compile the Go examples because Go is not installed in this workspace.
- The rate-limiting example is still intentionally simple and in-memory. A production implementation should add time windows, eviction, and shared state if limits must apply across proxy workers or replicas.
