# Validation Summary: How to Use Dapr with eBPF for Advanced Networking

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- eBPF (extended Berkeley Packet Filter)
- Cilium (eBPF-based CNI)
- Hubble (Cilium observability layer)
- SPIFFE/SPIRE (mutual authentication identity framework)
- Kubernetes
- Helm

## Sources Consulted
- Cilium official documentation: Bandwidth Manager (https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/)
- Cilium official documentation: CiliumNetworkPolicy (https://docs.cilium.io/en/stable/security/policy/)
- Cilium official documentation: Mutual Authentication with SPIRE (https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/)
- Hubble CLI documentation (https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/)
- Dapr CLI reference (https://docs.dapr.io/reference/cli/)
- Cilium Helm chart values reference (https://docs.cilium.io/en/stable/helm-reference/)

## Issues Found

1. **Hubble CLI `--port` flag does not exist**: The `--port` flag is not a valid Hubble observe option. Changed to `--to-port 3500`, which correctly filters flows by destination port.

2. **Hubble JSON output field paths were incorrect**: The jq expression referenced `.source.namespace`, `.destination.namespace`, and `.verdict` at the top level. Hubble's `--output json` wraps flow data under a `.flow` key. Fixed to `.flow.source.namespace`, `.flow.destination.namespace`, and `.flow.verdict`.

3. **`CiliumBandwidthManager` CRD does not exist**: The post used a fabricated CRD (`apiVersion: cilium.io/v2`, `kind: CiliumBandwidthManager`). Cilium bandwidth management is implemented via pod annotations (`kubernetes.io/egress-bandwidth`) after enabling the feature with `bandwidthManager.enabled=true` in the Helm chart. Replaced the entire section with the correct annotation-based approach.

4. **Mutual authentication policy structure was incorrect**: The `authentication` field was shown at the top level of `spec`, but it belongs inside individual `ingress`/`egress` rules in a CiliumNetworkPolicy. Additionally, the `spire.agentSocketPath` is configured at the Cilium Helm installation level, not in the network policy itself. Rewrote the section to show both the Helm SPIRE configuration and a correct CiliumNetworkPolicy with `authentication` inside an ingress rule.

## Review Notes
- The Cilium version pinned in the install command (1.16.0) is valid but will become outdated over time. The `kubeProxyReplacement=true` flag is correct for Cilium 1.14+.
- The CiliumNetworkPolicy in the "Network Policy for Dapr Services" section is correctly structured and uses accurate field names.
- The architecture diagram accurately represents the layering of Dapr (L7) above Cilium eBPF (L3/L4/L7).
- Dapr's default HTTP sidecar port (3500) is correctly referenced throughout.
