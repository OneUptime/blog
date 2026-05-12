# Validation Summary: How to Test Calico IPAM Before Production

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Calico (v3.20+)
- Calico IPAM
- Kubernetes
- calicoctl CLI
- kubectl
- Tigera Operator (`operator.tigera.io/v1` Installation CRD)
- VXLAN encapsulation

## Sources Consulted
- Calico documentation: IP address management — https://docs.tigera.io/calico/latest/networking/ipam/
- calicoctl IPAM command reference — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- `calicoctl ipam check` reference — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- `calicoctl ipam show` reference — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Tigera Operator Installation API reference — https://docs.tigera.io/calico/latest/reference/installation/api
- Calico custom resources (IPAMBlock, IPAMHandle, BlockAffinity) — https://docs.tigera.io/calico/latest/reference/resources/

## Issues Found
1. **Incorrect resource for viewing node block assignments.** The original command `kubectl get ipamhandles -A` was wrong on two counts: (a) `IPAMHandle` resources track individual IP-allocation handles (one per allocation), not node-to-block assignments — the resource that represents "node block assignments" is `BlockAffinity`; and (b) IPAMHandles/BlockAffinities are cluster-scoped, so the `-A` (all-namespaces) flag is meaningless. Replaced with `kubectl get blockaffinities`.

2. **Wrong flag for finding orphaned allocations.** The third invocation of `calicoctl ipam check --show-all-ips` (commented as "Check for orphaned allocations") duplicated the previous command and used the wrong flag. `--show-all-ips` prints every IP; the flag that surfaces orphaned/inconsistent allocations is `--show-problem-ips`. Changed to `--show-problem-ips`.

## Review Notes
- The default Calico IPv4 block size of `/26` (64 addresses) is correct.
- The Installation CRD snippet is valid: `apiVersion: operator.tigera.io/v1`, `kind: Installation`, with `spec.calicoNetwork.ipPools[]` entries containing `cidr`, `blockSize`, `natOutgoing` (Enabled/Disabled), and `encapsulation` (valid values include `VXLAN`, `VXLANCrossSubnet`, `IPIP`, `IPIPCrossSubnet`, `None`).
- The description of Calico IPAM (dynamic block allocation, block affinity, datastore in CRDs/etcd, topology-aware allocation, specific IP assignment) is accurate.
- The Mermaid diagram is illustrative; note that in practice Calico does not deterministically assign the first /26 blocks to nodes in numeric order — block allocation depends on demand and node affinity. This is acceptable as a simplified visualization.
- Minor stylistic observation (not a technical error): the `calicoctl ipam show --show-configuration` command shows IPAM configuration rather than pool utilization per se; pool utilization is surfaced by `calicoctl ipam show` itself. Left unchanged since the command is valid and useful in context.
