# Validation Summary: How to Use Wasm Plugins for Custom Logging in Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio WasmPlugin
- Envoy proxy access logging
- Proxy-Wasm Rust SDK
- Rust WebAssembly plugins
- Kubernetes `kubectl logs`
- SHA-256 request body hashing

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio TrafficExtension announcement: https://istio.io/latest/blog/2026/traffic-extension-api/
- proxy-wasm Rust SDK `HttpContext` docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/traits/trait.HttpContext.html
- proxy-wasm Rust SDK `Context` / HTTP callout docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/traits/trait.Context.html
- proxy-wasm hostcalls docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/hostcalls/index.html
- Rust `DefaultHasher` standard library docs: https://doc.rust-lang.org/std/hash/struct.DefaultHasher.html
- Envoy logging documentation: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/run-envoy
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction claimed Wasm plugins have access to "all request and response data." Changed this to "request and response metadata and buffered body data" because proxy-wasm body access is through buffering APIs such as `get_http_request_body` and `get_http_response_body`.
- The external log shipping snippet referenced `self.response_status`, `self.duration_ms`, and `self.captured_headers`, but those fields were not defined in the earlier `LoggerHttp` example. Added `response_status` and `duration_ms` fields, initialized and populated them, and changed `captured_headers` to the existing `captured_request_headers`.
- The `on_log` explanation said HTTP callouts from `on_log` do not add request latency. Reworded it to say `on_log` runs after stream completion and is better for asynchronous log shipping, while still requiring short timeouts to avoid tying up proxy resources.
- The audit hashing example used Rust `DefaultHasher`. Replaced it with SHA-256 via `sha2::{Digest, Sha256}` because Rust documents `DefaultHasher` as having an unspecified internal algorithm whose hashes should not be relied on across releases.
- The log collection section said `log::info!()` output goes to Envoy proxy stdout. Changed this to Envoy application logs captured as Kubernetes container logs, and noted collectors should read stdout and stderr streams, because Envoy system/application logs default to stderr while access logs may be configured for stdout.

## Review Notes
Istio 1.30 introduced `TrafficExtension` as the primary proxy extensibility API and states existing `WasmPlugin` resources remain compatible. The post remains valid as a WasmPlugin-focused guide, but a future update could add a TrafficExtension deployment variant.
