# Validation Summary: How to Debug Service Mesh Data Plane Issues Using Envoy Admin Interface

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Envoy admin interface
- Istio sidecars
- Linkerd proxy metrics/admin port
- Kubernetes kubectl
- istioctl
- jq
- TLS and mTLS troubleshooting

## Sources Consulted
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy admin quick start: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Envoy certificates admin proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/certs.proto
- Envoy clusters admin proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy tracing documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Envoy degraded endpoints documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/degraded
- Istio application requirements / sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described Linkerd port 4191 as an Envoy admin interface. Linkerd's proxy is not Envoy, and port 4191 exposes Linkerd proxy metrics/admin endpoints. Updated the access section to scope the Envoy admin instructions to Istio sidecars and clarify the Linkerd distinction.
- Several `jq` examples iterated fields such as `dynamic_active_clusters`, `dynamic_listeners`, and `dynamic_route_configs` across every config dump entry. Those fields are only present on specific config dump objects, so the examples could fail on null values. Updated the filters to use optional iteration.
- The route example used `config_dump?resource=routes` and described this as simulating route lookup. Envoy documents `resource=` values such as `dynamic_listeners`; for routes, the relevant field is `dynamic_route_configs`. Updated the example and wording to inspect route configuration instead of claiming route simulation.
- The certificate expiration example used `.[].cert_chain[].days_until_expiration`, but Envoy's `/certs` JSON is wrapped in a `certificates` field. Updated it to `.certificates[].cert_chain[].days_until_expiration`.
- The log-level listing example used `GET /logging`. Envoy documents `POST /logging` without query parameters for listing loggers. Updated the command to use `curl -X POST`.
- The post said `ssl.handshake` verifies mTLS is active. Envoy documents this as successful TLS handshakes, which does not by itself prove mutual TLS. Updated the wording to "Look for TLS handshakes."
- The configuration comparison section described `istioctl proxy-config all` as generating expected config from Istio. Istio documents this command as retrieving configuration for a proxy. Replaced the example with a direct comparison of two Envoy config dumps.

## Review Notes
The remaining examples are operational templates that depend on pod names, namespaces, installed tools, and mesh configuration. `kubectl` was not available locally, so Kubernetes command syntax was checked against official Kubernetes references rather than local `--help` output.
