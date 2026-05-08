# Validation Summary: How to Update the Calico BlockAffinity Resource Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico BlockAffinity
- Calico IPAM
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico Block affinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico IPAM overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico IPAM concepts: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico hard-way RBAC reference for `blockaffinities` and `ipamblocks`: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run

## Issues Found
- The post presented direct BlockAffinity reassignment with `calicoctl apply`. Official Calico documentation describes BlockAffinity resources as managed by Calico IPAM and lists create, update, and delete operations as unsupported through the Calico API. I changed the guidance to avoid direct BlockAffinity edits and to let Calico IPAM allocate blocks as workloads are scheduled.
- The BlockAffinity YAML used `deleted: "false"` as a string, but the resource schema defines `deleted` as a boolean. I changed it to `deleted: false`.
- The post suggested backing up `ipamblocks` with `calicoctl get ipamblocks`, but current `calicoctl get` documentation does not list `ipamblocks` as a managed resource. I changed this to `calicoctl ipam show --show-blocks`, which is documented for showing detailed block usage.
- The troubleshooting section suggested restoring BlockAffinity state with `calicoctl apply`, which conflicts with the unsupported create/update/delete operations for BlockAffinity. I replaced it with the documented `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report report.json` repair flow.
- The post described `calicoctl ipam release --ip` as a fix for orphaned block affinities. The command releases an IP allocation and does not remove an existing endpoint or directly delete a BlockAffinity. I changed the wording to orphaned IP allocations where the endpoint no longer exists.
- The drain verification command filtered by node name but the surrounding text claimed it verified IPs from the target block. I changed the text to say it verifies no regular pods are still running on the drained node.
- The introduction implied pods always receive IPs from the associated block. Calico documentation notes that Calico can assign addresses from blocks not associated with the node. I changed the wording to say Calico IPAM prefers addresses from the associated block.

## Review Notes
The post is now technically valid as a guide for safely inspecting and working around Calico BlockAffinity state without manually editing it. Future improvements could include adding install-specific namespace notes for `calico-node` logs, because operator-based installs commonly use `calico-system` while manifest-based installs often use `kube-system`.
