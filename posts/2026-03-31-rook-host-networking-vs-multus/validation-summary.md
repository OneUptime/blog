# Validation Summary: How to Configure Host Networking vs Multus for Rook-Ceph

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Ceph distributed storage
- Kubernetes host networking
- Multus CNI (multi-network plugin for Kubernetes)
- macvlan CNI plugin
- Whereabouts IPAM plugin
- NetworkAttachmentDefinitions (k8s.cni.cncf.io/v1)

## Sources Consulted
- Rook official documentation — Network Providers (Multus): https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook official documentation — CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook official documentation — Host Networking: https://rook.io/docs/rook/latest/CRDs/Cluster/host-cluster/
- CNI reference plugins documentation (static, whereabouts IPAM)
- Validated against sibling blog posts in this repository that were previously reviewed for Multus configuration accuracy

## Issues Found

### 1. IPAM plugin type "static" in NetworkAttachmentDefinition example
**What was wrong:** The NetworkAttachmentDefinition example used `"type": "static"` for IPAM. The static IPAM plugin requires manual per-pod IP assignment, which is impractical for Rook-Ceph OSD pods that are dynamically created. The Rook documentation specifically recommends the `whereabouts` IPAM plugin for Multus deployments.
**What was changed:** Replaced `"type": "static"` with `"type": "whereabouts"` and added a `"range": "192.168.200.0/24"` field to demonstrate automatic IP allocation from a subnet.
**Why:** A reader following this example would end up with OSD pods that cannot obtain IP addresses on the Multus interface, causing Ceph daemon communication failures.

### 2. Inaccurate claim that dedicated storage NICs are "Not possible" with host networking
**What was wrong:** The comparison table stated "Not possible" for dedicated storage NICs under host networking. This is misleading — with host networking, Ceph can be configured to bind to specific network interfaces/subnets using `public_network` and `cluster_network` Ceph configuration options.
**What was changed:** Changed "Not possible" to "Via Ceph config" to accurately reflect that dedicated NIC usage is possible through Ceph-level network binding configuration, though not via pod-level network attachment as with Multus.
**Why:** The original claim could lead readers to incorrectly rule out host networking in environments where dedicated storage NICs are available but Multus is not desired.

## Review Notes
- The `whereabouts` IPAM plugin requires separate installation on the cluster (it is not a built-in CNI reference plugin). The post could mention this in the prerequisites, but since it already lists Multus installation as a prerequisite, this is a minor omission.
- The CephCluster spec fields (`network.provider: host`, `network.provider: multus`, `network.selectors.public`, `network.selectors.cluster`) are all correct per the official CRD documentation.
- The NAD reference format `<namespace>/<nad-name>` used in the selectors is correct.
- The `macvlan` CNI type with `"mode": "bridge"` matches Rook's recommendations.
- The `rados bench` command syntax is correct for benchmarking Ceph pool throughput.
- The verification commands (`ceph -s`, checking pod annotations) are appropriate for confirming network configuration.
- The post's comparison table is a reasonable high-level summary. In practice, latency differences between host networking and Multus with macvlan are often minimal since macvlan also bypasses the overlay network.
