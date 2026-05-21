# Validation Summary: How to Deploy Istio for Edge Computing Environments

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Istio
- Kubernetes
- K3s
- Envoy sidecar proxy
- Istio ambient mode
- IstioOperator
- ServiceEntry
- Sidecar resource
- Kubernetes NodePort Services

## Sources Consulted
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio gateway installation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio DNS behavior documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio ServiceEntry and egress examples: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio performance and scalability documentation: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio diagnostic tooling documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio application requirements and ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- K3s requirements: https://docs.k3s.io/installation/requirements
- Kubernetes Service documentation for NodePort behavior: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post said edge nodes typically need 2 CPU cores and 2GB of RAM available for Istio components. K3s documents 2 cores and 2GB RAM as the minimum for a server node, while Istio resource usage depends on mesh size and traffic. Updated the wording to make this a node planning baseline rather than an Istio-only requirement.
- The DNS section implied Istio DNS proxying can make external service resolution reliable even when local DNS is unreliable. Istio DNS proxying can answer known mesh and ServiceEntry names locally, but otherwise forwards to upstream DNS, and `resolution: DNS` ServiceEntries still use proxy-side periodic DNS lookups. Updated the explanation to match Istio's documented DNS behavior.
- The istiod health-check example used `/debug/endpointz`, which is a debug endpoint and may require debug endpoint authentication in current Istio versions. Replaced it with the documented in-cluster `/version` reachability check on port 15014 and changed the wording from a health check to a readiness and reachability check.

## Review Notes
- The minimal profile, IstioOperator shape, Sidecar scoping example, NodePort gateway configuration, ServiceEntry syntax, `istioctl analyze`, `istioctl proxy-status`, and ambient-mode description are consistent with current official documentation.
- The tutorial intentionally uses sidecar mode. Ambient mode is mentioned as an option, but adopting it requires following Istio's ambient installation prerequisites and platform-specific guidance.
