# Validation Summary: How to Configure Multi-Cluster Network Policies with Cilium ClusterMesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- Cilium ClusterMesh
- CiliumNetworkPolicy
- Hubble
- Prometheus Operator rules
- eBPF networking

## Sources Consulted
- Cilium ClusterMesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium ClusterMesh load-balancing and global services documentation: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium ClusterMesh network policy documentation: https://docs.cilium.io/en/stable/network/clustermesh/policy/
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer3/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium mutual authentication documentation: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium mutual authentication example: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication-example/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/gettingstarted/hubble_setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium policy audit mode documentation: https://docs.cilium.io/en/latest/security/policy-creation/

## Issues Found
- The post stated that ClusterMesh creates encrypted tunnels between clusters. Cilium documentation requires routable inter-cluster connectivity and treats WireGuard/IPsec transparent encryption as separate features, so the explanation was corrected.
- The Cilium install commands used older direct flags for cluster name, cluster ID, and IPAM mode. They were changed to the current documented `--set cluster.name`, `--set cluster.id`, and `--set ipam.mode` form.
- The Cilium CLI and Hubble CLI install snippets were limited to amd64 and omitted checksum verification. They now follow the current official Linux install pattern with architecture detection and SHA256 verification.
- The ClusterMesh prerequisites only mentioned unique IDs and pod CIDRs. The text now also calls out matching datapath mode and required inter-cluster control-plane and pod connectivity.
- Several cross-cluster policy examples relied on implicit all-cluster endpoint selection. Cilium 1.19 defaults policy endpoint selection to the local cluster, so the examples now explicitly match the `io.cilium.k8s.policy.cluster` label where cross-cluster matching is intended.
- The mutual TLS policy example mixed TLS visibility fields with removed `fromRequires` policy requirements and presented it as ClusterMesh-compatible service-to-service authentication. It was replaced with the current `authentication.mode: "required"` Cilium mutual authentication syntax and a caveat that Cilium mutual authentication is not currently compatible with ClusterMesh trust domains.
- The default deny policy included `policyEnforcement: always` inside a `CiliumNetworkPolicy` spec. Policy enforcement mode is an agent/Helm configuration, not a CNP rule field, so the invalid field was removed.
- The Hubble flow commands used `hubble observe --context`, which is not the documented Hubble CLI access pattern. The commands now switch the Kubernetes context and use Hubble's `-P` port-forward option.
- The Prometheus alert used `cilium_policy_l4_denied_total`, which is not listed in the current Cilium metrics reference. It now uses the documented `cilium_drop_count_total` metric filtered to policy-denied drops.
- The policy simulation example used an unsupported per-policy audit annotation. It was replaced with Cilium's documented `policy-audit-mode` ConfigMap workflow and Hubble policy-verdict observation.

## Review Notes
Cilium mutual authentication remains beta and has explicit ClusterMesh limitations in the current documentation. Hubble and Prometheus metrics require the corresponding Hubble Relay and metrics options to be enabled in the target cluster.
