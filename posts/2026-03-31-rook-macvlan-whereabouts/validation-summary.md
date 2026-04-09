# Validation Summary: How to Set Up Macvlan with Whereabouts for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Macvlan CNI plugin (virtual network interfaces on physical NICs)
- Whereabouts IPAM (distributed IP address management for CNI)
- Multus CNI (multi-network support for Kubernetes pods)
- Kubernetes NetworkAttachmentDefinitions (NADs)

## Sources Consulted
- Whereabouts GitHub repository and README: https://github.com/k8snetworkplumbingwg/whereabouts
- Rook network providers documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook Multus network design document: https://github.com/rook/rook/blob/master/design/ceph/multus-network.md
- CNI macvlan plugin documentation: https://www.cni.dev/plugins/current/main/macvlan/
- CNI spec versions: https://www.cni.dev/docs/spec-upgrades/
- Multus CNI quickstart and how-to-use guides: https://github.com/k8snetworkplumbingwg/multus-cni/blob/master/docs/quickstart.md
- Kubernetes network plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/

## Issues Found

1. **Incomplete Whereabouts installation command**: The post used a single `kubectl apply -f` with a raw GitHub URL pointing only to `daemonset-install.yaml`. The official Whereabouts installation requires applying three files: the DaemonSet YAML plus two CRD YAMLs (`whereabouts.cni.cncf.io_ippools.yaml` and `whereabouts.cni.cncf.io_overlappingrangeipreservations.yaml`). Fixed to show the complete installation procedure by cloning the repo and applying all three files.

2. **Invalid `kubectl get ipam` command**: The post included `kubectl -n kube-system get ipam -o yaml` as a way to check Whereabouts state. There is no Kubernetes resource type called `ipam`. Whereabouts stores allocations in `ippools.whereabouts.cni.cncf.io` and `overlappingrangeipreservations.whereabouts.cni.cncf.io` custom resources. Replaced with a valid command to query overlapping range IP reservations.

3. **IP range count math error**: The troubleshooting section stated "192.168.100.200 - 192.168.100.10 = 190 IPs". Since both endpoints are inclusive in Whereabouts ranges, the correct count is 191 IPs (200 - 10 + 1). Fixed the arithmetic.

## Review Notes
- The `cniVersion` field is set to `"0.3.1"` throughout the post. While this is a valid and supported CNI spec version, Kubernetes now requires >= 0.4.0 and recommends 1.0.0. The 0.3.1 version still works in practice with most runtimes, but users setting up new clusters should consider using `"1.0.0"`.
- The Whereabouts IPPool CRs can exist in different namespaces depending on configuration. The post uses `-n kube-system` for querying them, but using `-A` (all namespaces) would be more reliable for discovery.
- The Macvlan description as "a built-in Linux kernel module" is essentially correct (it is a native kernel feature since Linux 2.6.23), though technically it may be compiled as a loadable module rather than built-in depending on the distribution.
- The Rook documentation explicitly recommends Macvlan with Whereabouts as the preferred production networking setup, confirming the post's opening claim.
