# Validation Summary: How to Use Node Affinity and Tolerations in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephCluster CR placement configuration)
- Kubernetes (node affinity, pod anti-affinity, tolerations, topology spread constraints)
- kubectl CLI (label, taint, get, describe commands)

## Sources Consulted
- Rook-Ceph official documentation on CephCluster CRD placement configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#placement-configuration)
- Kubernetes API reference for NodeAffinity (https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity)
- Kubernetes API reference for Pod Anti-Affinity (https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity)
- Kubernetes API reference for Tolerations (https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- Kubernetes API reference for Topology Spread Constraints (https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- kubectl reference for `label` and `taint` subcommands (https://kubernetes.io/docs/reference/kubectl/)

## Issues Found

1. **Inaccurate description for OSD pod anti-affinity example**: The text stated "Ensure no two OSDs with the same device class share the same node (soft constraint)" but the YAML label selector only matches `app: rook-ceph-osd` — it does not filter by device class. The anti-affinity as written prevents any two OSD pods from co-locating, regardless of device class. Fixed the description to "Ensure no two OSDs share the same node (soft constraint)".

2. **Missing label commands in storage-dedicated nodes example**: The example showed `kubectl taint` commands to taint nodes with `dedicated=storage:NoSchedule`, and then used `nodeAffinity` with `key: dedicated` / `values: [storage]` to target those nodes. However, taints and labels are separate Kubernetes concepts — `nodeAffinity` matches against node labels, not taints. The `kubectl label` commands needed to apply matching labels were missing, which would have caused the nodeAffinity to not match any nodes. Added the corresponding `kubectl label` commands alongside the taint commands.

## Review Notes
- All YAML structures are syntactically correct and conform to the Kubernetes API specs for nodeAffinity, podAntiAffinity, tolerations, and topologySpreadConstraints.
- The Rook-Ceph placement keys used (`all`, `mon`, `osd`) are valid CephCluster CRD placement keys. The post doesn't cover all possible keys (e.g., `mds`, `rgw`, `prepareosd`) but this is fine for a focused tutorial.
- The `node-role.kubernetes.io/control-plane` taint key is the current standard, correctly replacing the deprecated `node-role.kubernetes.io/master` key.
- The `preferredDuringSchedulingIgnoredDuringExecution` pod anti-affinity correctly uses the `podAffinityTerm` wrapper, while the `requiredDuringSchedulingIgnoredDuringExecution` variant correctly omits it — both match the Kubernetes API spec.
- All kubectl commands use correct syntax and flags.
