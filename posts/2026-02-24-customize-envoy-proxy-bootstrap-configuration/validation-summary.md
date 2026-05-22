# Validation Summary: How to Customize Envoy Proxy Bootstrap Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy Proxy
- Kubernetes
- Istio ProxyConfig
- Envoy bootstrap configuration
- Envoy overload manager
- Envoy statistics configuration

## Sources Consulted
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio MeshConfig and ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio custom bootstrap sample: https://github.com/istio/istio/tree/master/samples/custom-bootstrap
- Envoy bootstrap API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto.html
- Envoy stats API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto
- Envoy overload manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/overload/v3/overload.proto
- Envoy downstream connections resource monitor reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/resource_monitors/downstream_connections/v3/downstream_connections.proto
- Envoy config dump reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump.proto

## Issues Found
- Removed `parentShutdownDuration` from the `proxy.istio.io/config` example because it is not present in the current Istio `ProxyConfig` reference.
- Clarified that `sidecar.istio.io/bootstrapOverride` merges custom bootstrap configuration rather than replacing the whole generated bootstrap in the Kubernetes sidecar injection path.
- Replaced the `extraStatTags` example because that field is deprecated in current Istio. The section now uses Envoy `stats_config.stats_tags`, which is the bootstrap-level mechanism being discussed.
- Replaced the `EnvoyFilter` example using `applyTo: BOOTSTRAP` because Istio marks that apply target as deprecated. The overload manager example now uses a custom bootstrap ConfigMap with `sidecar.istio.io/bootstrapOverride`.
- Updated the overload manager explanation so it does not overstate the feature as preventing all resource-related crashes; it sheds load or stops accepting work when configured thresholds are reached.
- Replaced the `BOOTSTRAP_XDS_AGENT` environment variable with current `PROXY_CONFIG_XDS_AGENT`.
- Replaced the direct `curl` call to Envoy admin with `pilot-agent request`, which is available in the Istio proxy container even when the image does not include curl.
- Replaced the `istio-init` bootstrap debugging command with `kubectl logs <pod-name> -c istio-proxy --previous`; `istio-init` is for traffic redirection setup and may not exist when Istio CNI is used.

## Review Notes
The `sidecar.istio.io/bootstrapOverride` annotation is still documented as Alpha. Bootstrap overrides and Envoy runtime guards are version-sensitive, so examples should continue to be checked against the Istio and Envoy versions used by readers.
