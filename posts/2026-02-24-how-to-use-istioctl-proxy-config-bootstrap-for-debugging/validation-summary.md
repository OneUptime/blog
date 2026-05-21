# Validation Summary: How to Use istioctl proxy-config bootstrap for Debugging

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istioctl
- Envoy bootstrap configuration
- Envoy xDS and SDS
- Kubernetes

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnostic tools guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Envoy bootstrap template source: https://raw.githubusercontent.com/istio/istio/master/tools/packaging/common/envoy_bootstrap.json
- Envoy bootstrap API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin

## Issues Found
- The post described the `xds-grpc` bootstrap cluster as connecting directly to istiod and showed an istiod service address and port in the cluster load assignment. Current Istio sidecar bootstrap config uses `xds-grpc` to connect Envoy to the local Istio agent over a Unix domain socket, while the agent connects upstream to istiod. Updated the explanation, static cluster list, and load assignment example accordingly.
- The post recommended checking the `xds-grpc` cluster address for wrong Istio revisions. Because current bootstrap points to the local xDS socket rather than the istiod service address, this could mislead readers. Updated the text to refer to bootstrap node metadata and `istioctl proxy-status`.
- The post discussed EnvoyFilters that modify bootstrap configuration without noting their current status. Istio marks `applyTo: BOOTSTRAP` as deprecated, so the text now calls that out while preserving the startup/restart guidance.

## Review Notes
The command forms and `-o json` output flag are valid in the current Istio command reference. The JSON field casing used in the examples matches Istio's `istioctl` JSON marshalling, even though Envoy's raw bootstrap template uses protobuf field names internally.
