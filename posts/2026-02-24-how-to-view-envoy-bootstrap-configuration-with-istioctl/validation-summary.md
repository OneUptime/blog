# Validation Summary: How to View Envoy Bootstrap Configuration with istioctl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- istioctl
- Kubernetes
- Envoy bootstrap configuration
- Istio ProxyConfig and mesh configuration

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-proxy-config-bootstrap
- Istio MeshConfig / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- Istio Resource Annotations reference for `proxy.istio.io/config`: https://istio.io/latest/docs/reference/config/annotations/#proxy.istio.io/config
- Istio distributed tracing with Zipkin documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio MeshConfig and pod annotation tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Envoy Bootstrap API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto.html
- Envoy Cluster API reference for STRICT_DNS behavior: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Istio upstream Envoy bootstrap template: https://raw.githubusercontent.com/istio/istio/master/tools/packaging/common/envoy_bootstrap.json

## Issues Found
- The post said bootstrap output defaults to an unhelpful table. Current `istioctl proxy-config bootstrap` defaults to JSON, so the wording was corrected.
- The xDS static cluster example showed Envoy connecting directly to `istiod.istio-system.svc:15012` with a STRICT_DNS cluster. Current Istio sidecars use a STATIC `xds-grpc` cluster over a Unix domain socket to the local Istio agent, which proxies xDS traffic to Istiod. The example and explanation were updated.
- The control-plane troubleshooting text implied the Istiod address is in the `xds-grpc` cluster. It was updated to point readers to `node.metadata.PROXY_CONFIG.discoveryAddress` and the local XDS socket path.
- The admin interface example used the older `accessLogPath` shape. Current Istio bootstrap uses an Envoy file access logger entry, so the snippet was updated.
- The stats tag regex examples were older than the current Istio bootstrap template. The snippet was updated to match current patterns for the shown tags.
- The Zipkin cluster example used older timeout fields and omitted current DNS refresh fields. It was updated with `respectDnsTtl`, `dnsRefreshRate`, and the current connect timeout.
- The tracing text implied all distributed tracing configuration appears in bootstrap. It now says this applies to legacy MeshConfig or pod annotation tracing; current Telemetry API/provider configuration may be inspected elsewhere.
- Static cluster descriptions and comparison guidance were updated to reflect local Istio agent connections and `PROXY_CONFIG.discoveryAddress`.

## Review Notes
The post is now technically accurate for current Istio sidecar bootstrap behavior. Tracing remains version- and configuration-path dependent: legacy MeshConfig/pod annotation tracing can appear in bootstrap, while Telemetry API tracing is the current recommended configuration model.
