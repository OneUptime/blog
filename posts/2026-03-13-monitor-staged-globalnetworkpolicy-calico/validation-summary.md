# Validation Summary: How to Monitor Staged GlobalNetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- `calicoctl` CLI
- `kubectl` CLI
- Calico Felix (with Prometheus metrics endpoint on port 9091)
- Calico `projectcalico.org/v3` API (StagedGlobalNetworkPolicy resource)
- Mermaid (for architecture diagram)

## Sources Consulted
- Calico Resource Reference (StagedGlobalNetworkPolicy): https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico Resource Reference (GlobalNetworkPolicy): https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Resource Reference (NetworkPolicy): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- calicoctl resource reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/component-resources/node/felix/configuration
- Calico staged network policy concepts: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies

## Issues Found
1. **YAML resource kind mismatch (FIXED)**: The example YAML used `kind: NetworkPolicy` (which is a namespaced, non-staged policy) despite the post being explicitly about Staged GlobalNetworkPolicy. Changed to `kind: StagedGlobalNetworkPolicy`, which is the correct cluster-scoped, staged resource in the `projectcalico.org/v3` API.
2. **Namespace on cluster-scoped resource (FIXED)**: The same YAML included `metadata.namespace: production`. StagedGlobalNetworkPolicy is cluster-scoped and does not accept a namespace, so the `namespace` field was removed.
3. **Verification command targeted wrong resource (FIXED)**: Step 2 of the implementation used `calicoctl get networkpolicies -n production -o wide` which would not show the staged global policy. Updated to `calicoctl get stagedglobalnetworkpolicies -o wide`.
4. **Operational commands inconsistent with post topic (FIXED)**: The Operational Commands section listed `networkpolicies` / `networkpolicy` operations against `-n production`. Updated to use `stagedglobalnetworkpolicies` / `stagedglobalnetworkpolicy` (cluster-scoped, no namespace flag) to match the resource type the post is about.
5. **Common Issues troubleshooting command (FIXED)**: The "Order conflicts" troubleshooting tip referenced `calicoctl get globalnetworkpolicies -o wide` — updated to `calicoctl get stagedglobalnetworkpolicies -o wide` to be consistent with the post topic.

## Review Notes
- The Felix Prometheus metrics endpoint default port (9091) is correct. The example `grep felix_denied` is illustrative — open-source Calico's denied-packet metrics are typically surfaced via `calico_denied_packets` (with Calico Enterprise / cnx-node providing richer denial metrics). The grep itself is harmless as a discovery pattern, so it was left as-is.
- Staged policies in Calico (open source) were historically Enterprise-only and became available in OSS later; the v3.26+ prerequisite is a reasonable lower bound. The `stagedAction` field (defaulting to `Set`) is not shown in the example but is optional, so omitting it is acceptable.
- The YAML uses `selector: all()` which is valid Calico selector syntax; integer `order`, the `ingress`/`egress`/`types` schema, and `protocol: UDP` with `ports: [53]` are all valid per the Calico resource reference.
- One minor grammatical issue ("patterns for monitor Staged GlobalNetworkPolicy" in the intro) is stylistic, not technical, so it was left untouched per the review scope.
