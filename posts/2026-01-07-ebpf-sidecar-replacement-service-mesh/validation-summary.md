# Validation Summary: How to Replace Sidecar Proxies with eBPF for Service Mesh

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- eBPF
- Kubernetes
- Cilium Service Mesh
- CiliumNetworkPolicy
- CiliumEnvoyConfig
- Envoy
- Hubble
- Helm
- Gateway API
- WireGuard and IPsec transparent encryption
- SPIFFE/SPIRE-backed mutual authentication
- Istio migration concepts
- Prometheus and Grafana

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Gateway API Support: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Ingress Support: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Layer 7 Policies: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/latest/security/network/proxy/envoy/
- Cilium L7 Traffic Shifting: https://docs.cilium.io/en/latest/network/servicemesh/envoy-traffic-shifting/
- Cilium Mutual Authentication: https://docs.cilium.io/en/latest/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium IPsec Transparent Encryption: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Command Reference: https://docs.cilium.io/en/stable/cmdref/

## Issues Found
- Updated Cilium examples from version 1.15.0 to 1.19.5 because the post should use a current supported release.
- Replaced the outdated Kubernetes version check with `kubectl version` and changed kernel guidance from 5.4+ to Cilium's current 5.10+ recommendation, with a note for supported distribution-equivalent kernels.
- Added Gateway API CRD installation commands before enabling `gatewayAPI.enabled=true`, matching Cilium's Gateway API prerequisites.
- Removed the invalid `loadBalancer.algorithm=maglev` Helm value from the service mesh install command.
- Replaced stale in-pod `cilium` debug commands with `bpftool prog show` and `cilium-dbg` commands.
- Corrected the mTLS section so WireGuard/IPsec are described as transparent encryption, not as mTLS. Added Cilium's SPIRE-backed mutual authentication Helm settings instead of a standalone SPIRE manifest that would not integrate Cilium by itself.
- Updated the IPsec key secret format to use the recommended per-tunnel key marker (`3+`).
- Fixed CiliumEnvoyConfig examples by adding the required Envoy router HTTP filter and EDS cluster resources.
- Updated Hubble metrics configuration from deprecated `http` metrics to `httpV2`, added labels context, and adjusted Grafana queries to use configured destination labels instead of an unsupported `destination_service` label.
- Corrected the Fortio jq parsing snippet to convert duration values from seconds to milliseconds before appending `ms`.
- Fixed the kernel version shell comparison so Linux 6.x kernels are treated as compatible.
- Removed fictional Cilium namespace labels and replaced them with migration-tracking labels that do not imply Cilium behavior.
- Qualified exact performance claims as benchmark-dependent rather than universal guarantees.

## Review Notes
The post is validated after edits. CiliumEnvoyConfig remains a low-level Envoy configuration interface, so production users should still validate generated Envoy resources through Cilium agent logs and prefer Gateway API where it covers the routing use case.
