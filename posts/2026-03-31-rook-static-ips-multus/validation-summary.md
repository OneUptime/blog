# Validation Summary: How to Use Static IPs with Multus for Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Multus CNI (multi-network support for Kubernetes)
- CNI static IPAM plugin
- Macvlan CNI plugin
- Whereabouts IPAM plugin
- Kubernetes NetworkAttachmentDefinitions (NADs)

## Sources Consulted
- CNI static IPAM plugin specification: https://www.cni.dev/plugins/current/ipam/static/
- Multus CNI documentation: https://github.com/k8snetworkplumbingwg/multus-cni
- Rook Ceph Multus networking documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/#multus
- Macvlan CNI plugin documentation: https://www.cni.dev/plugins/current/main/macvlan/
- Whereabouts IPAM documentation: https://github.com/k8snetworkplumbingwg/whereabouts
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

### Issue 1: Incorrect Rook CephCluster annotations structure
- **What was wrong:** The post showed Multus network configuration under `spec.mon.annotations.mon` with a `k8s.v1.cni.cncf.io/networks` annotation. This path does not exist in the Rook CephCluster CRD. Rook configures Multus networks through `spec.network.provider` and `spec.network.selectors`, not through direct pod annotations in the mon spec.
- **What was changed:** Replaced the section with the correct `spec.network` configuration showing `provider: multus` and `selectors` for public and cluster networks. Added a note that per-monitor static-IP NADs are not natively supported by Rook's Multus integration.
- **Why:** Using the wrong CRD structure would cause validation errors when applying the CephCluster manifest.

### Issue 2: Incorrect Macvlan passthru mode explanation
- **What was wrong:** The post claimed that Macvlan in `passthru` mode "passes the host interface directly to the pod, giving the pod access to the host's static IP." This is incorrect. Macvlan passthru mode creates a single macvlan sub-interface that receives all frames from the parent interface, but the pod does NOT inherit the host's IP address. The pod still requires its own IP assignment via IPAM.
- **What was changed:** Replaced the passthru-based approach with a correct Whereabouts-based approach using bridge mode on the same subnet as the host NICs, with an `exclude` list to prevent IP conflicts with host addresses.
- **Why:** The original configuration would have resulted in pods with no IP address (static IPAM with no addresses specified) and the explanation of passthru mode was technically inaccurate.

### Issue 3: Static IPAM with no addresses field
- **What was wrong:** The NAD in the passthru section used `"type": "static"` IPAM but had no `"addresses"` array. The CNI static IPAM plugin requires explicit addresses in either the config or via CNI_ARGS runtime configuration. Without addresses, no IP would be assigned to the pod interface.
- **What was changed:** This was resolved as part of the fix for Issue 2, replacing the broken static IPAM config with a working Whereabouts configuration.
- **Why:** A pod created with this NAD would have a network interface with no IP address assigned.

## Review Notes
- The core concept of creating per-monitor NADs with static IPAM is sound and the static IPAM configuration format in the first two code examples is correct per the CNI specification.
- Rook's Multus integration does not natively support assigning different NADs to different monitor pods, which limits the practical applicability of the per-monitor static IP approach described. The post now notes this limitation.
- The verification test pod and expected output are correct and useful for validating static IP assignment.
- The `"routes"` entry in the first NAD example (`"dst": "192.168.100.0/24"`) is redundant since the kernel automatically adds a connected route for the assigned subnet, but it is not incorrect.
