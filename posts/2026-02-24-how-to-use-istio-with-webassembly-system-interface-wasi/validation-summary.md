# Validation Summary: How to Use Istio with WebAssembly System Interface (WASI)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WasmPlugin API
- Envoy WebAssembly extensions
- Proxy-Wasm Rust SDK
- Rust WASI target
- Kubernetes
- OCI registries
- ORAS

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio WebAssembly module distribution task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- Istio WebAssembly Plugins alpha announcement and WASI support notes: https://istio.io/latest/blog/2021/wasm-api-alpha/
- Envoy Wasm architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- Envoy Wasm runtime documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Rust `wasm32-wasip1` platform documentation: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Proxy-Wasm Rust SDK repository: https://github.com/proxy-wasm/proxy-wasm-rust-sdk
- Proxy-Wasm Rust crate API docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/

## Issues Found
- The introduction overstated WASI access as general interaction with system resources. Updated it to say plugins can use supported WASI system calls, matching Istio's documented partial WASI support.
- The HTTP deployment option implied a ConfigMap could directly serve the module. Updated the wording and command comment to clarify the ConfigMap must be mounted by an HTTP server pod, while the WasmPlugin URL points at that server.
- The WasmPlugin configuration comment used `UNSPECIFIED`; the current Istio enum value is `UNSPECIFIED_PHASE`. Updated the comment.
- The priority description said lower numbers run first. Current Istio documentation says plugins in the same phase are applied by priority in descending order, so higher numbers run first. Updated the comment.
- The custom metrics Rust snippet used nonexistent `self.increment_metric` and `self.record_metric` methods and subtracted `SystemTime` values directly. Updated it to use `proxy_wasm::hostcalls::increment_metric`, `proxy_wasm::hostcalls::record_metric`, and `duration_since`.

## Review Notes
The main Rust plugin example was compiled successfully against the current `proxy-wasm` 0.2.x crate using `cargo build --target wasm32-wasip1 --release`. The practical-use snippets remain partial examples and assume surrounding structs, fields, helper functions, and metric definitions exist.
