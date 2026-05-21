# Validation Summary: How to Use Wasm Plugins for Custom Authentication in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio WasmPlugin
- Envoy proxy
- Proxy-Wasm Rust SDK
- WebAssembly
- Kubernetes Services
- kubectl and curl

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- proxy-wasm Rust SDK Context trait documentation: https://docs.rs/proxy-wasm/latest/proxy_wasm/traits/trait.Context.html
- proxy-wasm Rust SDK RootContext source documentation: https://docs.rs/proxy-wasm/latest/src/proxy_wasm/traits.rs.html

## Issues Found
- The post said AUTHN runs before any other processing. Changed this to say it runs before Istio authentication filters, matching the Istio WasmPlugin phase definition.
- The post described FAIL_CLOSE as rejecting unauthenticated requests when a plugin fails to load. Changed this to state that fatal fetch or runtime failures make subsequent requests fail with 5xx instead of bypassing the plugin.
- The HTTP callout example used `auth-service` as the Envoy cluster name. Changed it to Istio's generated outbound cluster form, `outbound|80||auth-service.auth-system.svc.cluster.local`, and clarified how the service FQDN and port map to the cluster name.
- The invalid API key log statement sliced the first four bytes of an arbitrary header value, which can panic for non-ASCII input. Changed it to collect the first four Unicode scalar values with `chars().take(4)`.
- The testing command implied curl would directly show the proxy-added upstream request header. Changed it to note that this check only works when the upstream endpoint echoes request headers.
- The latency explanation implied every Wasm auth check stays inside the proxy. Narrowed the claim to local checks, since the post also covers external HTTP callouts.
- The summary implied FAIL_CLOSE itself ensures unauthenticated requests are blocked. Updated it to the more precise behavior: fatal plugin failures do not bypass authentication.

## Review Notes
The Rust snippets use current proxy-wasm SDK APIs for request headers, plugin configuration, HTTP callouts, and callout response handling. The WasmPlugin manifest uses the current Istio `extensions.istio.io/v1alpha1` API fields for selector, URL, phase, failure strategy, and plugin configuration.
