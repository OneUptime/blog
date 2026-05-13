# Validation Summary: How to Optimize Calico IPAM for Large Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (CNI)
- Calico IPAM
- Kubernetes
- calicoctl
- Tigera Operator (operator.tigera.io/v1 Installation CRD)
- IPAM CRDs (IPAMHandle)
- VXLAN encapsulation

## Sources Consulted
- calicoctl ipam show — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Change IP pool block size — https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Customizing your installation (Installation CRD options) — https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- IP pool resource — https://docs.tigera.io/calico/latest/reference/resources/ippool
- Install CNI plugin (IPAMHandle CRD) — https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin

## Issues Found
- Incorrect flag in "Verify IPAM Health" section: the command labeled "Check for orphaned allocations" used `calicoctl ipam check --show-all-ips`, which prints *all* checked IPs rather than leaked/problem ones. Corrected to `calicoctl ipam check --show-problem-ips`, which is the documented flag for printing IPs that are leaked or not allocated properly.

## Review Notes
- Default IPv4 block size of `/26` (64 IPs) is correct per Calico docs.
- The Installation CRD fields used (`cidr`, `blockSize`, `natOutgoing`, `encapsulation`) are all valid. Worth noting (not a correctness issue) that `blockSize` cannot be edited in-place after installation; changing it requires creating a new pool and migrating workloads.
- The mermaid diagram uses `\n` inside node labels for line breaks. This renders in many Mermaid versions but newer Mermaid generally prefers `<br/>`. Left as-is since both forms still work in current renderers and this is a stylistic choice.
- The post's description mentions "topology-aware allocation" and "pre-allocating blocks", but the body only briefly references topology-aware allocation in the intro and does not show examples. Not a technical inaccuracy, but a content gap the author may wish to fill in a future revision.
- `kubectl get ipamhandles -A` works because `ipamhandles.crd.projectcalico.org` is installed alongside the Calico CNI; readers using non-default kubectl RBAC may need read permission on this CRD.
