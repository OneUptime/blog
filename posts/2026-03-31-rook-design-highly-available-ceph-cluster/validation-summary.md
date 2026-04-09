# Validation Summary: How to Design a Highly Available Ceph Cluster

## Status
validated

## Post Type
Architecture guide / Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (pod anti-affinity, PodDisruptionBudgets, node labels, cordon/drain)
- CRUSH failure domains (host, rack)
- Network bonding (active-backup via nmcli)
- Multus CNI (network provider context)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook network configuration documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Ceph CRUSH map and failure domain documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes pod anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Ceph monitor quorum and Paxos consensus documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/

## Issues Found

1. **Rack topology label mismatch**: The post used `topology.kubernetes.io/zone` labels for rack-level failure domain configuration, but Rook maps that label to the `zone` CRUSH bucket, not `rack`. Changed to `topology.rook.io/rack` which correctly maps to the `rack` failure domain used in the CephBlockPool spec.

2. **Network selectors invalid with host provider**: The `selectors` field (specifying `public: "bond0"` and `cluster: "bond1"`) is only valid with `provider: multus`, not `provider: host`. With host networking, pods share the host network namespace directly and use whatever bonded interfaces are configured at the OS level. Removed the invalid `selectors` block and clarified via comment that bonding is configured at the OS level.

3. **PDB minAvailable too low for 5-mon quorum**: With 5 monitors, Ceph quorum requires a majority of 3. The PDB had `minAvailable: 2`, which would allow Kubernetes to voluntarily evict 3 monitors simultaneously, breaking quorum. Changed to `minAvailable: 3` to ensure quorum is preserved during voluntary disruptions.

4. **Minor comment inaccuracy on requireSafeReplicaSize**: The comment stated "Refuse writes if < 3 OSDs available" but `requireSafeReplicaSize: true` enforces a safe `min_size` (typically 2 for a pool with `size: 3`), meaning writes are refused when fewer than 2 replicas can be maintained, not 3. Updated the comment to reflect the actual behavior.

## Review Notes
- The post correctly recommends an odd number of monitors (3, 5, 7) for Paxos-based quorum consensus.
- The OSD anti-affinity uses `preferredDuringSchedulingIgnoredDuringExecution` (soft rule) rather than `required` (hard rule), which is appropriate for OSDs since Rook creates one OSD pod per disk and multiple disks may exist on the same node.
- The `kubectl drain` command correctly uses `--delete-emptydir-data` (the modern flag, replacing the deprecated `--delete-local-data`).
- Rook automatically creates PDBs for its components in recent versions; the manual PDB example is still valid for customization or older Rook versions.
- The post could benefit from mentioning stretch clusters for multi-datacenter HA in a future update, but this is outside the current scope.
