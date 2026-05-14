# Validation Summary: Cilium CRD-Backed IPAM: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNode CRDs
- CiliumEndpoint CRDs
- Cilium cluster-pool IPAM
- Helm
- kubectl
- jq

## Sources Consulted
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CRD-Backed by Cluster-Pool IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-cluster-pool/
- Cilium CRD-Backed IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-crd/
- Cilium CRD-Backed IPAM concept documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/crd/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium API reference for CiliumEndpoint networking fields: https://docs.cilium.io/en/latest/api.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium AWS ENI and Azure IPAM documentation for `spec.ipam.pre-allocate`, `min-allocate`, and related fields: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/ and https://docs.cilium.io/en/stable/network/concepts/ipam/azure/

## Issues Found
- The post incorrectly described cluster-pool IPAM as storing all per-pod IP allocation state in CRDs. Updated the introduction and conclusion to clarify that cluster-pool stores per-node PodCIDR assignment in `CiliumNode.spec.ipam.podCIDRs`, while agents allocate endpoint IPs locally from that range.
- The example CiliumNode structure mixed cluster-pool fields with cloud-provider or pure CRD IPAM fields such as `max-allocate`, `min-allocate`, `status.ipam.used`, and `status.ipam.available`. Replaced it with a cluster-pool-oriented example using `spec.ipam.podCIDRs` and `status.ipam.operator-status`.
- The post showed unsupported CiliumNode annotations for `ipam.cilium.io/max-allocate`, `ipam.cilium.io/min-allocate`, and `ipam.cilium.io/pre-allocate`. Replaced them with documented Helm values for cluster-pool IPAM.
- Troubleshooting and validation commands checked pod allocations through `CiliumNode.status.ipam.used`, which is not the documented per-pod ledger for cluster-pool IPAM. Replaced these checks with operator status, PodCIDR, and CiliumEndpoint address validation.
- Fixed a shell command that would include `kubectl get` output in the `CN` variable when checking whether a `CiliumNode` exists.
- Updated the monitoring diagram and watch commands so they monitor PodCIDR assignment and operator errors rather than a nonexistent cluster-pool `used`/`available` status model.

## Review Notes
The post is now technically aligned with Cilium cluster-pool IPAM. Cilium also has a distinct pure `ipam=crd` mode where `spec.ipam.pool` and `status.ipam.used` are central; future revisions could explicitly compare that mode with cluster-pool IPAM if the author wants broader coverage.
