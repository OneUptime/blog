# Validation Summary: How to Fix HTTP and HTTPS Egress Rules in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- DNS-based egress policy
- FQDN policy
- Hubble CLI

## Sources Consulted
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/latest/security/dns/
- Cilium policy language and DNS/FQDN documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium troubleshooting documentation for `toFQDNs` rules and `cilium-dbg fqdn cache list`: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium deny policy documentation: https://docs.cilium.io/en/stable/security/policy/deny/
- Cilium Layer 4 SNI policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/

## Issues Found
- The post stated that behavior depends on rule ordering when the same destination is matched by both CIDR and FQDN rules. Cilium allow policies are combined rather than ordered, and deny policies take precedence over allow policies. Updated the section to explain that a broad CIDR allow can permit traffic even when an FQDN rule would not match, and to avoid overlapping broad CIDR allows when FQDN-based control is intended.

## Review Notes
The Cilium `toFQDNs`, DNS `matchPattern: "*"`, port-based egress policy examples, `cilium-dbg fqdn cache list`, and `hubble observe --verdict DROPPED` guidance are consistent with current official Cilium documentation. The YAML examples are policy fragments rather than complete manifests, so readers would still need `apiVersion`, `kind`, `metadata`, and an appropriate `endpointSelector` in a full CiliumNetworkPolicy.
