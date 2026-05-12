# Validation Summary: How to Test Custom Calico Ingress Gateways with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (network policy engine)
- Kubernetes (Deployment, Service, LoadBalancer)
- Envoy proxy (v1.28.0)
- kubectl
- calicoctl
- Bash / curl
- Mermaid (for architecture diagram)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selectors documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- Kubernetes Deployment API: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#deployment-v1-apps
- Kubernetes Service API: https://kubernetes.io/docs/concepts/services-networking/service/
- Envoy proxy Docker Hub: https://hub.docker.com/r/envoyproxy/envoy/tags (v1.28.0 confirmed valid)
- Kubernetes auto-applied namespace labels (kubernetes.io/metadata.name): https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
No technical issues found.

## Review Notes
- The `apiVersion: projectcalico.org/v3` is correct for both GlobalNetworkPolicy and NetworkPolicy resources.
- The selector syntax (`app == 'custom-gateway'`, `all()`, `kubernetes.io/metadata.name == 'gateway-system'`) is valid Calico selector syntax.
- The NetworkPolicy in the `production` namespace does not declare a `types` field. Calico infers types from defined rules, so this is acceptable, though explicitly declaring `types: [Ingress]` is considered best practice.
- The Envoy container exposes ports 80 and 443, which are privileged ports. The official `envoyproxy/envoy:v1.28.0` image runs as root by default, so this works out of the box, but operators using non-root variants (e.g., `envoyproxy/envoy-distroless`) would need NET_BIND_SERVICE capabilities or remapped ports.
- The egress GlobalNetworkPolicy allows traffic to backend ports 8080/8443, while the gateway listens on 80/443. This separation between gateway listen ports and backend ports is consistent and intentional.
- The Mermaid diagram uses `\n` for line breaks inside node labels. This works in modern Mermaid renderers but `<br/>` is the more portable convention.
- Envoy v1.28.0 is a valid release from late 2023; newer LTS releases (1.31+) are available as of 2026, but pinning to a specific version is appropriate for a tutorial.
