# Validation Summary: How to Extend Istio with WebAssembly (WASM) Plugins

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio WasmPlugin
- Envoy HTTP Wasm filter
- WebAssembly / Proxy-Wasm ABI
- Rust proxy-wasm SDK
- TinyGo
- Kubernetes CRDs and kubectl
- Docker / OCI images
- Prometheus alerting rules

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio TrafficExtension reference: https://istio.io/latest/docs/reference/config/proxy_extensions/traffic_extension/
- Istio TrafficExtension announcement: https://istio.io/latest/blog/2026/traffic-extension-api/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP Wasm filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/wasm_filter
- Envoy HTTP Wasm proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/wasm/v3/wasm.proto
- Envoy Wasm proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/wasm/v3/wasm.proto
- Envoy Wasm stats handler source: https://github.com/envoyproxy/envoy/blob/main/source/extensions/common/wasm/stats_handler.h
- proxy-wasm Rust SDK traits: https://github.com/proxy-wasm/proxy-wasm-rust-sdk/blob/main/src/traits.rs
- proxy-wasm crate documentation: https://docs.rs/proxy-wasm

## Issues Found
- The portability claim was too broad. Updated it to say binaries can work across compatible Envoy builds that support the same Proxy-Wasm ABI.
- The prerequisites listed `wasme CLI` and installed `wasm-pack`, neither of which is required by the Rust proxy-wasm flow shown. Replaced them with the proxy-wasm SDK and optional `wasm-opt`/Binaryen guidance.
- The first Rust example imported `std::time::Duration` without using it. Removed the unused import.
- The basic WasmPlugin example said it targeted all sidecars in a namespace while using `istio-system`; Istio root namespace policies can apply mesh-wide. Updated the comment.
- The STATS phase and priority comments were inaccurate. Corrected STATS phase placement and changed priority ordering to higher values running earlier within the same phase.
- The deployment verification used `istioctl proxy-config wasm`, which is not a current `istioctl` subcommand. Replaced it with `istioctl proxy-config ecds`.
- The external service Rust example used `Duration` without importing it and cloned `AuthConfig` without deriving `Clone`. Added the import and `Clone` derive.
- The caching example imported `Duration` without using it. Removed the unused import.
- The benchmark disabled the plugin with `mode: NONE`, which is not a valid WasmPlugin workload mode. Replaced it with a non-matching port selector.
- The troubleshooting script queried the wrong config dump resource for ECDS and looked for non-existent `wasm.failed` stats. Replaced that with `istioctl proxy-config ecds` and broader Wasm stats inspection.
- The Prometheus example used undocumented Wasm metric names. Updated the alert examples to use documented Envoy Wasm fetch/reload stats and clearly mark latency as a custom plugin metric.

## Review Notes
Istio 1.30 introduces `TrafficExtension` as the newer primary proxy extensibility API and says it supersedes `WasmPlugin`. The post remains technically relevant because `WasmPlugin` is still documented, but a future article should consider covering `TrafficExtension` for newer Istio deployments.
