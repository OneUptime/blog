# Validation Summary: How to Write Wasm Plugins in Rust for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Proxy-Wasm ABI
- Proxy-Wasm Rust SDK (`proxy-wasm`)
- Rust
- WebAssembly
- WASI preview 1
- `wasm-opt`

## Sources Consulted
- Rust `wasm32-wasip1` target documentation: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Rust blog, "Changes to Rust's WASI targets": https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- Proxy-Wasm Rust SDK repository: https://github.com/proxy-wasm/proxy-wasm-rust-sdk
- `proxy-wasm` crate documentation: https://docs.rs/proxy-wasm/
- Local `proxy-wasm` 0.2.5 crate source from crates.io
- Proxy-Wasm ABI v0.2.1 specification: https://github.com/proxy-wasm/spec/blob/main/abi-versions/v0.2.1/README.md
- Envoy WebAssembly overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio proxy configuration debugging documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/

## Issues Found
- The setup and build commands used the removed Rust target name `wasm32-wasi`. Updated them to `wasm32-wasip1`, the current WASI preview 1 target name used by Rust.
- The architecture overview described timers as a `Context` trait responsibility. Updated it to clarify that HTTP callout callbacks are on `Context`, while timers are handled on `RootContext`.
- The configuration example returned `None` from `create_http_context` when the plugin was disabled. The current proxy-wasm Rust SDK dispatcher panics if `create_http_context` returns `None` for an HTTP context, so the example now always creates the HTTP context and has request handling continue without work when disabled.
- The header example used `self.context_id`, but the `MyPluginHttp` struct did not include that field. Added `context_id` to the struct and populated it in `create_http_context`.
- The HTTP callout example passed a Kubernetes service DNS name as the proxy-wasm upstream. Proxy-wasm dispatches to an Envoy cluster name, so the example now uses Istio's `outbound|80||...` cluster naming pattern and tells readers to confirm the exact cluster with `istioctl proxy-config cluster`.
- The custom metrics example called `define_metric`, `increment_metric`, and `record_metric` as methods on `self`, but in the current Rust SDK they are `proxy_wasm::hostcalls` functions. Updated the calls and added metric ID storage/passing in the example.
- The metrics example referenced an undefined `calculate_duration()` helper. Replaced it with elapsed-time calculation using `request_start`.

## Review Notes
- A representative Rust plugin using the corrected API shapes was checked locally with `cargo check --target wasm32-wasip1 --release` against `proxy-wasm` 0.2.5.
- `wasm-opt` was not installed locally in this environment, so its command was reviewed for syntax but not executed.
