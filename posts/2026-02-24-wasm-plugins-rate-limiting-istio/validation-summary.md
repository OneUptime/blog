# Validation Summary: How to Use Wasm Plugins for Rate Limiting in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WasmPlugin
- Envoy Proxy and Proxy-Wasm
- Rust proxy-wasm SDK
- WebAssembly plugins
- Local and global rate limiting
- Kubernetes kubectl
- curl

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy Wasm architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- Envoy Wasm API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/wasm/v3/wasm.proto.html
- Rust proxy-wasm crate API docs: https://docs.rs/proxy-wasm/latest/proxy_wasm/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The description claimed the post covered sliding windows, but the implementation uses token buckets. Updated the description to say token buckets.
- The main Rust snippet imported `HashMap` without using it. Removed the unused import.
- The Rust configuration parser accepted `refill_rate: 0`, which could later cause a divide-by-zero when calculating reset time. Updated the parser to ignore zero refill rates.
- The token refill calculation used unchecked multiplication and addition. Updated it to use saturating arithmetic.
- The response header example stored rate-limit state in a synthetic request header and called an undefined `next_reset_time()` method. Updated the snippets to store `remaining_tokens` and `reset_at` on the per-request HTTP context and use those fields in `on_http_response_headers`.
- The shared data explanation overstated the scope of `get_shared_data` and `set_shared_data`. Updated it to reflect Envoy's per-worker Wasm execution model and noted that limits can scale with worker threads as well as proxy replicas.
- The metrics example used a nonexistent `self.define_metric` helper. Updated it to use `proxy_wasm::hostcalls::define_metric` and `increment_metric`.
- The metrics section implied Prometheus would always scrape the custom Envoy stats. Added a configuration caveat.

## Review Notes
The Istio `WasmPlugin` configuration fields in the post match the current official reference. The `failStrategy: FAIL_OPEN` example is valid, but Istio documents that fail-open is not recommended for authentication or authorization plugins; a rate limiter can be optional, but production deployments should choose this deliberately.
