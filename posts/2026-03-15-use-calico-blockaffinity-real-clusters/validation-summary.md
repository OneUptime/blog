# Validation Summary: How to Use the Calico BlockAffinity Resource in Real Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico BlockAffinity resources
- Calico IPAM and IPPool resources
- Kubernetes nodes and pods
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl ipam show` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam check` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam release` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico `calicoctl ipam configure` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico node decommissioning guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Kubernetes node assignment documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- The introduction implied that every pod scheduled on a node always receives an IP from that node's affined blocks. Calico can borrow addresses from other hosts' blocks when needed, so the wording was changed to say pods normally receive IPs from the node's blocks.
- The scale-up section said Calico creates a BlockAffinity when a node joins. Calico IPAM creates block affinity as part of address allocation, so the text was changed to say the affinity appears when Calico first needs to allocate an address on the new node.
- The leaked allocation cleanup example ran `calicoctl ipam check` and `calicoctl ipam release` without the datastore lock/unlock steps shown in the official Calico workflow. Added `calicoctl datastore migrate lock` before the check and `calicoctl datastore migrate unlock` after the release.
- The troubleshooting command assumed `calico-node` always runs in `kube-system`. Operator-managed Calico commonly uses `calico-system`, so the command was changed to use `-A` and match the node by field selector across namespaces.

## Review Notes
The Calico IPPool snippets use valid `projectcalico.org/v3` fields, and `blockSize: 26` for IPv4 correctly represents 64-address blocks. The `maxBlocksPerHost` reference is valid in Calico IPAM configuration, exposed by `calicoctl ipam configure --max-blocks-per-host`. BlockAffinity is a Calico-managed resource; the post correctly focuses on observing it rather than manually creating or updating it.
