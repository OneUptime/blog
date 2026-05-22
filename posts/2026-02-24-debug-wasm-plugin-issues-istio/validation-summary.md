# Validation Summary: How to Debug Wasm Plugin Issues in Istio

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio WasmPlugin API
- Envoy WebAssembly extensions and admin interface
- Kubernetes kubectl commands
- ORAS CLI for OCI artifacts
- Rust proxy-wasm SDK
- WebAssembly/WASI compilation targets

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Envoy WebAssembly architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- Envoy Wasm runtime documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Envoy HTTP Wasm filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/wasm_filter.html
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- ORAS manifest fetch command reference: https://oras.land/docs/commands/oras_manifest_fetch/
- ORAS pull command reference: https://oras.land/docs/commands/oras_pull/
- Rust wasm32-wasip1 target documentation: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Rust WASI target rename announcement: https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- proxy-wasm Rust SDK examples: https://github.com/proxy-wasm/proxy-wasm-rust-sdk

## Issues Found
- The post recommended recompiling with the deprecated `wasm32-wasi` Rust target. Rust renamed the WASI preview 1 target to `wasm32-wasip1`, and current proxy-wasm Rust SDK examples build with `wasm32-wasip1`. Updated the wording to recommend the SDK-appropriate target and cite `wasm32-wasip1` as the current proxy-wasm Rust SDK example target.
- The post suggested checking `WasmPlugin` status conditions with `kubectl describe`. The Istio `WasmPlugin` reference documents spec fields but does not document a status conditions interface to rely on. Updated the comment to check resource details and events instead.
- The Envoy Wasm metric examples used undocumented names, `wasm.envoy_wasm_runtime.wasm_vm_active` and `wasm.envoy_wasm_runtime.wasm_vm_created`. Envoy documents runtime stats as `wasm.<runtime>.active` and `wasm.<runtime>.created`. Updated the metric names and descriptions.

## Review Notes
The remaining commands and examples are technically consistent with the referenced documentation. Some operational details, such as exact Envoy log messages for Wasm failures, can vary by Istio, Envoy, runtime, and plugin SDK version, so they should be treated as representative patterns rather than exhaustive exact strings.
