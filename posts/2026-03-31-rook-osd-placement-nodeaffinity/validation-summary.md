# Validation Summary: How to Configure OSD Placement with nodeAffinity in Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephCluster CRD)
- Kubernetes (nodeAffinity, tolerations, taints, node labels)
- Ceph OSDs (Object Storage Daemons)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook Ceph Toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook OSD Management documentation: https://rook.io/docs/rook/v1.11/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook dedicated OSD pod design doc: https://github.com/rook/rook/blob/master/design/ceph/dedicated-osd-pod.md
- Kubernetes Affinity and Anti-Affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Taints and Tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
1. **Architecture diagram incorrectly referenced "DaemonSet"**: The Mermaid diagram on line 17 described the OSD resource as "OSD DaemonSet/Job". Since Rook v0.8.0, OSDs have been deployed as individual Kubernetes Deployments (one per OSD/device), not DaemonSets. Rook does use a Job (`rook-ceph-osd-prepare`) for the provisioning/preparation step. Changed the diagram label from "OSD DaemonSet/Job" to "OSD Prepare Job / Deployment" to accurately reflect modern Rook behavior.

## Review Notes
- All CephCluster CRD YAML snippets use correct field names and structure for the `spec.placement` section, including `nodeAffinity`, `tolerations`, and per-component keys (`all`, `mgr`, `mon`, `osd`).
- The `preferredDuringSchedulingIgnoredDuringExecution` example correctly uses `weight` (1-100) and `preference.matchExpressions`.
- The kubectl commands for labeling nodes, applying taints, and verifying OSD placement are all syntactically correct. The label selector `app=rook-ceph-osd` is the correct label for Rook OSD pods.
- The toolbox command `kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd tree` is correct.
- The first CephCluster example includes a toleration with `operator: Exists` while the later taints/tolerations section uses `operator: Equal` with `value: "true"`. Both are valid approaches; `Exists` is broader (matches any value for that key) while `Equal` is more precise. This is not an error but readers should be aware of the distinction.
