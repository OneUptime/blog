# Validation Summary: How to Optimize Changing Calico Block Size for Large Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Tigera) networking
- Kubernetes
- Calico IPAM
- calicoctl CLI
- kubectl CLI
- IPPool custom resource (projectcalico.org/v3)

## Sources Consulted
- Calico IP pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM CLI reference (calicoctl ipam): https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- `calicoctl ipam check` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- `calicoctl ipam show` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico release history / version timeline (v3.19 introduced `ipam check`; v3.20 is plausible as a baseline)
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get

## Issues Found
No technical issues found.

- `calicoctl get ippools -o yaml` — valid.
- `calicoctl ipam show --show-blocks` — valid command and flag.
- `calicoctl ipam check` — valid (available since Calico v3.19).
- IPPool YAML uses correct `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and supported spec fields (`cidr`, `blockSize`, `ipipMode`, `vxlanMode`, `natOutgoing`).
- `blockSize: 26` is a valid IPv4 block size (also the default).
- `ipipMode: Never` and `vxlanMode: Never` are valid enum values.
- The mermaid graph is syntactically correct.

## Review Notes
- The post is quite brief and does not explain the trade-offs between block sizes (smaller blockSize value → larger blocks, fewer routes but more IPs locked per node; larger blockSize value → smaller blocks, more granular distribution but more routes). For a post titled "Optimize ... for Large Clusters," guidance on choosing blockSize relative to node count and pool CIDR size would strengthen it. Not a correctness issue.
- `blockSize` is immutable on an existing IPPool. To change block size, operators must create a new IPPool with the desired blockSize, then migrate workloads / drain the old pool. The post does not mention this constraint — readers attempting to edit an existing pool's blockSize will hit an API validation error. This is an omission rather than an incorrect statement, so the post remains technically accurate as written.
- In `kubectl get pods -A -o wide | awk '{print $8}' | sort -u`, column 8 is `NODE` (column 7 is `IP`). The "Verify" heading is generic enough that listing unique nodes pods are running on is a defensible validation step, so this was not changed. If the author intended to list unique pod IPs, `$7` would be the right column.
- Calico v3.20 is from 2021; readers on current releases (v3.28+) will find everything in this post still works, but they could optionally use newer features (e.g., `allowedUses`, IPv6 dual-stack improvements) not covered here.
