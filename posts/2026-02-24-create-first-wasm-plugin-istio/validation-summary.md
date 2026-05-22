# Validation Summary: How to Create Your First Wasm Plugin for Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio WasmPlugin API
- WebAssembly and Proxy-Wasm
- Rust
- proxy-wasm Rust SDK
- Cargo and rustup
- Envoy HTTP filters
- Kubernetes kubectl
- OCI registries and ORAS
- wasm-opt/Binaryen

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio WebAssembly module distribution task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- Istio WebAssembly plugin API announcement: https://istio.io/latest/blog/2021/wasm-api-alpha/
- Rust `wasm32-wasip1` target documentation: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- proxy-wasm Rust SDK docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/
- proxy-wasm `RootContext` trait docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/traits/trait.RootContext.html
- proxy-wasm `HttpContext` trait docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/traits/trait.HttpContext.html

## Issues Found
- The post used the old Rust target name `wasm32-wasi`. Rust documentation now identifies `wasm32-wasip1` as the WASI preview 1 target and notes that `wasm32-wasi` was the historical name. Updated the `rustup`, `cargo build`, output path, file size, `wasm-opt`, and summary references to `wasm32-wasip1`.
- The Rust example parsed plugin configuration as `key=value` lines, but Istio encodes `pluginConfig` as JSON before passing it to Proxy-Wasm SDK configuration callbacks. Added `serde` and `serde_json` dependencies and changed the plugin code to deserialize `header_name` and `header_value` from JSON.
- The HTTP server example implied `localhost` would work from the cluster. Updated the text to say the HTTP endpoint must be reachable from the Istio sidecars and changed the example URL to use `<reachable-host>`.
- The ConfigMap example implied that creating a ConfigMap alone made the Wasm file usable by Envoy. Updated the text to clarify that it is for a file-based deployment and must be mounted into the selected workloads.

## Review Notes
The corrected Rust code was compiled successfully with `cargo build --target wasm32-wasip1 --release` using current stable Rust and `proxy-wasm` 0.2.x. The WasmPlugin resource shape, `pluginConfig` field, `url` field, and Proxy-Wasm callback methods match the official Istio and proxy-wasm documentation. The post still uses `extensions.istio.io/v1alpha1`, which is current for Istio WasmPlugin at the time of review.
