# Validation Summary: How to Configure Pod Scheduling Based on Storage Locality in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes StorageClass with topology-aware provisioning
- Kubernetes Pod/Node Affinity scheduling
- Kubernetes StatefulSet volumeClaimTemplates

## Sources Consulted
- Rook official documentation: Ceph CSI drivers and topology-based provisioning (https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/)
- Rook CephCluster CRD documentation: topology label hierarchy (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook operator.yaml deployment manifest: CSI_ENABLE_TOPOLOGY and CSI_TOPOLOGY_DOMAIN_LABELS ConfigMap keys
- Kubernetes StorageClass API reference: volumeBindingMode and allowedTopologies (https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- Kubernetes Node Affinity documentation: preferredDuringSchedulingIgnoredDuringExecution structure (https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity)

## Issues Found

### 1. Inconsistent topology key in StorageClass allowedTopologies
- **What was wrong:** The StorageClass used `topology.rook.io/chassis` with values `chassis-a` and `chassis-b` in `allowedTopologies`, while all other examples in the post (node labels, operator ConfigMap, node affinity rules) consistently used `topology.rook.io/rack` with values `rack1` and `rack2`. This inconsistency would confuse readers trying to follow the tutorial end-to-end.
- **What was changed:** Updated the StorageClass `allowedTopologies` to use `topology.rook.io/rack` with values `rack1` and `rack2`, matching the rest of the post.
- **Why:** A working topology setup requires the StorageClass `allowedTopologies` key to match the topology domain labels configured in the operator ConfigMap and applied to nodes.

### 2. Incorrect terminology: "Pod Affinity" vs "Node Affinity"
- **What was wrong:** The section heading said "Use Pod Affinity for Storage-Local Scheduling" and the introductory text said "use pod affinity", but the YAML example uses `nodeAffinity`, not `podAffinity`. In Kubernetes, these are distinct scheduling features: `podAffinity` schedules pods relative to other pods, while `nodeAffinity` schedules pods based on node labels.
- **What was changed:** Updated the heading to "Use Node Affinity for Storage-Local Scheduling" and the text to "use node affinity".
- **Why:** Using the wrong Kubernetes term could mislead readers into thinking pod affinity (inter-pod scheduling) is involved, when the actual mechanism is node affinity (scheduling based on node labels).

## Review Notes
- The provisioner name `rook-ceph.rbd.csi.ceph.com` is correct for the default `rook-ceph` namespace. If deployed to a different namespace, the prefix would change accordingly. This is a minor caveat not worth fixing in the post.
- The Deployment and StatefulSet YAML snippets are intentionally partial (missing required fields like `selector`, `serviceName`, `template.metadata.labels`). This is standard blog convention for showing relevant excerpts, but readers copying YAML verbatim would need to add the missing fields.
- `CSI_ENABLE_TOPOLOGY` and `CSI_TOPOLOGY_DOMAIN_LABELS` are documented in the Rook operator deployment manifests (operator.yaml) rather than the main rook.io docs pages. Both are valid and functional configuration keys.
