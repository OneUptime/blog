# Validation Summary: How to Monitor Wasm Plugin Performance Impact in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio WasmPlugin
- Envoy
- WebAssembly
- Prometheus
- Grafana
- Kubernetes
- Fortio

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy Wasm runtime documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Envoy Wasm API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/wasm/v3/wasm.proto.html
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy memory admin API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/memory.proto
- Fortio documentation: https://fortio.org/

## Issues Found
- The post claimed every HTTP request in an Istio mesh goes through at least two Envoy proxies and doubled plugin latency unconditionally. Updated this to describe the common sidecar-to-sidecar case and clarify that the doubled impact applies when the plugin is deployed on both proxies.
- The Prometheus scraping section implied Wasm stats are always collected when Prometheus scrapes Istio. Updated it to note that Envoy proxy stats must be collected and not dropped by scrape or relabeling rules.
- The WasmPlugin example used `pluginConfig.enable_timing: true` as if it enabled Envoy filter timing. `pluginConfig` is opaque configuration passed to the plugin, and `enable_timing` is not a documented Istio WasmPlugin timing field. Replaced this with a documented `pluginName` field and an example plugin-specific configuration value.
- The memory section stated that each Wasm plugin runs inside a V8 VM. Envoy supports multiple Wasm runtimes and the runtime defaults to the first available engine, typically V8 in official builds. Updated the wording to be accurate without changing the guidance.
- The EnvoyFilter section claimed a listener patch enabled detailed per-filter timing stats, but the shown fields only changed listener behavior and buffer limits. Replaced it with Istio Telemetry access logging, which is the documented mechanism for getting request-level `%DURATION%` and upstream service time in Envoy logs.
- The debugging section described a stats query as built-in profiling. Updated it to say it inspects Wasm-related proxy stats.
- The `imagePullPolicy: IfNotPresent` recommendation was too broad. Updated it to match the WasmPlugin reference: pull policy matters for OCI or HTTP Wasm modules referenced without a digest.

## Review Notes
Istio 1.30 introduced TrafficExtension as the recommended primary proxy extensibility API, while existing WasmPlugin resources remain supported. Since the post is specifically about monitoring WasmPlugin deployments and WasmPlugin is still documented, the post remains technically relevant.
