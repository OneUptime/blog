# Validation Summary: How to Calculate Sidecar Memory Requirements for Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio sidecar mode
- Envoy proxy
- Kubernetes resource requests and limits
- istioctl proxy configuration commands
- Prometheus and PromQL

## Sources Consulted
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio configuration scoping guide: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio sidecar injection customization docs: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio performance and scalability docs: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Envoy admin interface docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy memory admin proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/memory.proto
- Envoy statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Envoy memory check used `/server_info | grep -i memory`, but Envoy's `/server_info` returns server metadata rather than memory allocation fields. Changed it to query `/stats?filter=server.memory`, which exposes `server.memory_allocated`, `server.memory_heap_size`, and related gauges.
- The `Sidecar` example used `"./api-service.backend.svc.cluster.local"` and `"./auth-service.auth.svc.cluster.local"` for services in other namespaces. Istio `egress.hosts` uses the format `namespace/dnsName`, with `./` referring to the sidecar resource's own namespace. Changed the entries to `"backend/api-service.backend.svc.cluster.local"` and `"auth/auth-service.auth.svc.cluster.local"`.
- The mesh-wide Sidecar text implied that any `istio-system` Sidecar is mesh-wide. Istio applies a global default Sidecar from the MeshConfig root namespace, so the wording now says to apply it in the Istio root namespace.

## Review Notes
The memory formula and per-endpoint values are practical sizing heuristics rather than Istio or Envoy guarantees. Istio's official performance docs note that proxy memory depends on total configuration state and report about 60 MB for a single sidecar at 1000 HTTP requests per second with 1 KB payloads in their Istio 1.24 benchmark, so operators should validate the estimates against their own mesh metrics.
