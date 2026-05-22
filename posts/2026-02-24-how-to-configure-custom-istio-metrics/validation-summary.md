# Validation Summary: How to Configure Custom Istio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Istio EnvoyFilter
- Istio stats plugin configuration
- Istio TrafficExtension and WasmPlugin extensibility
- Envoy request and response attributes
- Prometheus and PromQL
- Kubernetes kubectl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Istio Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio TrafficExtension announcement and examples: https://istio.io/latest/blog/2026/traffic-extension-api/
- Istio stats plugin Go API reference: https://pkg.go.dev/istio.io/api/envoy/extensions/stats
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Istio Prometheus integration docs: https://istio.io/latest/docs/ops/integrations/prometheus/

## Issues Found
- Header-based Telemetry examples indexed request and response headers directly. I changed them to use CEL `in` checks with an `unknown` fallback so missing headers do not produce brittle expressions.
- The advanced custom metric section described EnvoyFilter stats examples as definitely creating a counter and histogram with fixed Prometheus names. I softened the claim because Istio's stats plugin type handling is version-dependent and the current API reference notes implementation caveats around metric type configuration.
- The Wasm example used `WasmPlugin` as the main new-extension API. I updated it to `TrafficExtension`, which Istio 1.30 documents as the recommended API for new Wasm and Lua extensions, while noting that existing `WasmPlugin` resources remain compatible.
- The "Track Slow Requests" example queried `request_method` on `istio_request_duration_milliseconds_bucket` but only added the label to `REQUEST_COUNT`. I added the same tag override to `REQUEST_DURATION` and adjusted the text to accurately describe method-based duration breakdown.
- The authentication label expression checked a possibly absent `authorization` header directly. I changed it to use a CEL map membership check.
- The verification command used `localhost:15020/stats/prometheus`; Istio's customization tasks verify proxy stats through `localhost:15000/stats/prometheus` from the `istio-proxy` container, so I updated the command.

## Review Notes
The EnvoyFilter examples are still advanced and version-sensitive. Future revisions could add stronger guidance to prefer Telemetry API for label customization and TrafficExtension/Wasm for new custom logic, with EnvoyFilter reserved for cases that have been tested against a specific Istio release.
