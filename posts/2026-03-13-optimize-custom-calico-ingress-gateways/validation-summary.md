# Validation Summary: How to Optimize Custom Calico Ingress Gateways for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (Deployment, Service, LoadBalancer)
- Envoy proxy (envoyproxy/envoy:v1.28.0)
- kubectl / calicoctl
- Mermaid diagrams

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax documentation (embedded in the above references)
- Envoy proxy image tags on Docker Hub (envoyproxy/envoy)

## Issues Found
No technical issues found.

The Calico `GlobalNetworkPolicy` and `NetworkPolicy` YAML use valid `projectcalico.org/v3` schema:
- `selector: app == 'custom-gateway'` is valid Calico selector syntax.
- The destination block correctly contains both `namespaceSelector` and `ports`, which the EntityRule spec allows.
- `source` with both `namespaceSelector` and `selector` is documented as supported, and `selector: all()` is a valid Calico selector.
- The Envoy image tag `envoyproxy/envoy:v1.28.0` is a real, published Envoy release.
- The kubectl `jsonpath` expression to extract the LoadBalancer ingress IP is correct.

## Review Notes
- Envoy 1.28.x is an older release line (the current latest stable line is well past v1.30); the example would still work, but users targeting current security patches may want a more recent tag. This is informational only — pinning to v1.28.0 is a deliberate, valid choice for a tutorial.
- The GlobalNetworkPolicy egress rule only allows TCP to ports 8080 and 8443. Real-world gateways often also need DNS (UDP/53) egress to resolve backend service names; the post does not call this out, but that is a stylistic/coverage observation, not a technical error in the example as written.
- Calico infers policy `types` from the presence of `ingress`/`egress` rules, so omitting `types: [Ingress]` on the second NetworkPolicy is acceptable; the first policy correctly includes `types: [Egress]`.
- Mermaid `\n` line breaks inside node labels render correctly in standard Mermaid graph diagrams.
