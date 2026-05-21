# Validation Summary: How to Understand Istio's WebAssembly Plugin System

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio WasmPlugin custom resource
- Envoy
- WebAssembly
- Proxy-Wasm ABI
- Kubernetes YAML resources
- istioctl and kubectl

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio WebAssembly module distribution task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Wasm architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- Envoy Wasm runtime reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Proxy-Wasm ABI v0.2.1 specification: https://github.com/proxy-wasm/spec/blob/main/abi-versions/v0.2.1/README.md
- Proxy-Wasm specification repository: https://github.com/proxy-wasm/spec

## Issues Found
- Corrected the Envoy runtime description. Envoy supports V8, WAMR, Wasmtime, and Null VM runtimes, but WAMR and Wasmtime are not necessarily included in release images by default.
- Corrected the phase table for `AUTHZ`, `STATS`, and `UNSPECIFIED` to match Istio's current WasmPlugin API reference.
- Corrected low-level Proxy-Wasm callback and host function names to use the actual ABI names such as `proxy_on_request_headers`, `proxy_get_header_map_value`, `proxy_http_call`, and `proxy_log`.
- Changed `pluginConfig` wording from a JSON string to structured configuration, matching the Istio API's `Struct` field.
- Added waypoint proxy targeting with `targetRefs`, because current Istio documentation states waypoint proxies require policy attachment through `targetRefs` and ignore selector-based policies.
- Softened unqualified performance and memory claims so they do not overstate fixed latency overhead or instance layout.

## Review Notes
The YAML snippets use valid WasmPlugin fields for Istio's current `extensions.istio.io/v1alpha1` API. The post remains a high-level guide; future improvements could mention `priority`, `type`, `match`, `sha256`, `imagePullPolicy`, and `failStrategy`, but those omissions are not correctness issues for the current scope.
