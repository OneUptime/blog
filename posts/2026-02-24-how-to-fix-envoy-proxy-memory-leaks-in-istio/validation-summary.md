# Validation Summary: How to Fix Envoy Proxy Memory Leaks in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar proxies
- Envoy admin interface and statistics
- Istio Sidecar, DestinationRule, Telemetry, EnvoyFilter, and WasmPlugin resources
- Kubernetes pod resource limits and container restarts

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio EnvoyFilter API reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy admin interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Envoy statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy overload manager reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/operations/overload_manager/overload_manager

## Issues Found
- The introduction said an OOMKilled `istio-proxy` restarts the entire pod. Kubernetes restarts the failed container within the pod under the normal pod restart policy, so the wording now says the proxy container restarts and disrupts pod traffic.
- The Sidecar and DestinationRule examples used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for these APIs, so the examples were updated.
- The Telemetry example used the wrong API group, `networking.istio.io/v1beta1`. Updated it to `telemetry.istio.io/v1`.
- The connection pool section said pools can grow unbounded and idle connections stay open forever without `idleTimeout`. Istio documents a default upstream connection pool idle timeout of 1 hour, so the text now describes the risk as large connection-pool memory usage and recommends shorter idle timeouts where appropriate.
- The stats-cardinality section used an EnvoyFilter `stats_tags` example that would not reduce stat cardinality as described. Replaced it with a Telemetry metric tag removal example.
- The mesh config section described `proxyStatsMatcher` as disabling stat prefixes. Istio documents `proxyStatsMatcher` as adding optional Envoy stats in addition to the minimum defaults, so the text now says to narrow broad optional stat matchers.
- The overload-manager example placed Envoy overload-manager fields under `proxy.istio.io/config`, but that annotation accepts Istio ProxyConfig fields, not arbitrary Envoy bootstrap fields. Replaced it with an EnvoyFilter BOOTSTRAP merge example and added a version-sensitivity caveat.
- The restart strategy showed a liveness probe against `/healthz/ready` as a memory check. That endpoint checks proxy readiness, not memory usage, so the invalid probe was removed and the text now explains that memory-triggered graceful restarts require separate automation or a custom health check.

## Review Notes
- `EnvoyFilter` with `applyTo: BOOTSTRAP` is documented but marked deprecated in the Istio reference. It is still the closest direct correction for the original overload-manager example, but it should be tested carefully for the target Istio and Envoy versions.
- `kubectl get wasmplugin -A` is appropriate for Istio's `WasmPlugin` resource, whose documented API group is `extensions.istio.io/v1alpha1`.
