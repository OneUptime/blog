# Validation Summary: How to Build Custom Envoy Filters with Wasm in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio WasmPlugin
- Istio EnvoyFilter
- Envoy HTTP Wasm filters
- Proxy-Wasm ABI and Rust SDK
- Rust WebAssembly/WASI targets
- Docker
- Prometheus metrics scraping

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy Wasm HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/wasm_filter.html
- Envoy Wasm runtime documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Proxy-Wasm Rust SDK repository and examples: https://github.com/proxy-wasm/proxy-wasm-rust-sdk
- Proxy-Wasm Rust SDK docs for metric hostcalls: https://docs.rs/proxy-wasm/latest/proxy_wasm/hostcalls/fn.define_metric.html and https://docs.rs/proxy-wasm/latest/proxy_wasm/hostcalls/fn.increment_metric.html
- Proxy-Wasm ABI v0.2.1 specification: https://github.com/proxy-wasm/spec/blob/main/abi-versions/v0.2.1/README.md
- Rust wasm32-wasip1 target documentation: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Envoy Docker image tags: https://hub.docker.com/r/envoyproxy/envoy

## Issues Found
- The build command used Rust's old `wasm32-wasi` target. Updated it to install and build with `wasm32-wasip1`, and corrected the optimized output path, because Rust renamed the WASI preview 1 target.
- The custom metrics Rust example called `define_metric` and `increment_metric` as trait methods. Updated it to use `proxy_wasm::hostcalls::{define_metric, increment_metric}` and added `impl Context for MetricsRoot {}`, matching the current proxy-wasm Rust SDK API.
- The standalone Envoy test configuration omitted the required HTTP connection manager route configuration. Added a minimal `route_config` with a direct response route so the config is structurally valid.
- The Docker test command did not publish Envoy's listener port to the host. Added `-p 8080:8080` and `--rm` so the local test endpoint is reachable and the container is cleaned up after exit.

## Review Notes
The Istio `WasmPlugin` examples use the documented `extensions.istio.io/v1alpha1` API, `selector.matchLabels`, `url`, and `pluginConfig` fields. The EnvoyFilter/Lua example follows the documented v1alpha3 patch pattern, but the post correctly treats EnvoyFilter as lower-level and more version-sensitive than WasmPlugin. The Envoy Wasm filter remains marked experimental in Envoy's documentation, so future reviews should re-check the Envoy API if the sample is updated to a newer pinned Envoy release.
