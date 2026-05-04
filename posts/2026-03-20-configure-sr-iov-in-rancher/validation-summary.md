# Validation Summary: How to Configure SR-IOV in Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- SR-IOV (Single Root I/O Virtualization)
- Rancher / Kubernetes
- SR-IOV Network Device Plugin (k8snetworkplumbingwg/sriov-network-device-plugin)
- SR-IOV CNI (k8snetworkplumbingwg/sriov-cni)
- Multus CNI (NetworkAttachmentDefinition)
- Linux sysfs SR-IOV interface (`sriov_numvfs`, `sriov_totalvfs`)
- Intel NIC drivers: i40e/iavf (X710/XL710), ixgbe/ixgbevf (82599)
- DPDK (mentioned in tags)
- IOMMU / `intel_iommu=on`
- systemd unit files

## Sources Consulted
- k8snetworkplumbingwg/sriov-cni GitHub repo (https://github.com/k8snetworkplumbingwg/sriov-cni) — verified daemonset path is `images/sriov-cni-daemonset.yaml`, not `deployments/`.
- k8snetworkplumbingwg/sriov-network-device-plugin GitHub repo (https://github.com/k8snetworkplumbingwg/sriov-network-device-plugin) — verified `deployments/sriovdp-daemonset.yaml` and the example `deployments/configMap.yaml`, which lists `["i40evf", "iavf", "ixgbevf"]` as drivers.
- Linux kernel iavf/i40evf driver history — `i40evf` was renamed to `iavf` in kernel 4.15 (2018); modern distributions ship `iavf`.
- Intel PCI device IDs: 154c (X710/XL710 VF), 10ed (82599 VF) — confirmed against Intel/PCI ID database.
- Kubernetes Network Plumbing WG NetworkAttachmentDefinition CRD spec (`k8s.cni.cncf.io/v1`).

## Issues Found
1. **Wrong path to sriov-cni daemonset YAML** (Step 3). Post referenced `deployments/sriov-cni-daemonset.yaml`, but the upstream repo has it at `images/sriov-cni-daemonset.yaml`. Updated the `kubectl apply -f` path.
2. **Outdated/incomplete driver list in the device plugin ConfigMap** (Step 2). Post listed only `["i40evf", "ixgbevf"]`. The `i40evf` driver was renamed to `iavf` in Linux 4.15 (Jan 2018); current distributions load `iavf`. Added `iavf` to match the upstream sample config (`["i40evf", "iavf", "ixgbevf"]`) so the selector works on both legacy and modern kernels.
3. **Overstated kernel-bypass claim in Introduction.** Post claimed "Pods attached to SR-IOV VFs bypass the kernel networking stack entirely." With the netdevice driver flow described (i40evf/iavf/ixgbevf), VFs are still surfaced as kernel netdevs in the pod's namespace and traffic still traverses the in-pod kernel stack — what's bypassed is the host's CNI overlay/software switching. Reworded to reflect this and added a parenthetical noting that DPDK + vfio-pci can additionally bypass the kernel stack.

## Review Notes
- The post uses a `NetworkAttachmentDefinition` (Step 4) and the `k8s.v1.cni.cncf.io/networks` annotation (Step 5), both of which require Multus CNI to be installed on the cluster. Multus is mentioned only in the conclusion; readers should install Multus before Step 4 for the example to work end-to-end. Left unchanged because the conclusion does call this out and the task scope is technical correctness rather than completeness.
- The example `subnet: 10.56.217.0/24` with `host-local` IPAM is fine for a single-node demo; in multi-node clusters `host-local` will allocate overlapping IPs across nodes. `whereabouts` IPAM is the typical production choice, but this is a recommendation rather than a correction.
- `make build` in Step 3 produces the binary under `build/` in the cloned repo; the daemonset uses the upstream container image and does not actually need the local `make build` step to deploy. Left unchanged as it isn't incorrect, just redundant.
- Device ID `154c` covers Intel X710/XL710/X722 family VFs; `10ed` covers 82599 VFs. The upstream sample also lists `1889` (X710-T VF) — could be added for broader matching but not strictly needed for the post's example.
- The "10-40% better network performance" figure in the conclusion is a rough order-of-magnitude claim; real numbers depend heavily on workload, baseline CNI, and whether DPDK is in use. Acceptable as a qualitative statement.
