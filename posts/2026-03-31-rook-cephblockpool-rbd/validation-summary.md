# Validation Summary: How to Create a CephBlockPool for RBD Storage in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Block Device (RBD)
- CephBlockPool CRD (`ceph.rook.io/v1`)
- Kubernetes StorageClass and CSI provisioning
- Rook CSI RBD driver
- Kubernetes PersistentVolumeClaims

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Block Storage (RBD) configuration: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook RBD StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found

1. **Incorrect RBD object size in Mermaid diagram**: The diagram stated RBD images are "Striped into 2.5MB Objects". The default RBD object size is 4 MiB (order 22 = 2^22 bytes), which is correctly shown later in the post's `rbd info` output. Fixed the diagram label to "Striped into 4 MiB Objects".

2. **Invalid `kubectl wait` condition for Pods**: The command `kubectl wait --for=condition=Complete pod/rbd-test-pod` uses a condition that does not exist on Pod resources. Pods do not have a `Complete` condition; that is a Job condition. For a Pod with `restartPolicy: Never` that runs to completion, the correct syntax is `kubectl wait --for=jsonpath='{.status.phase}'=Succeeded`. Fixed to use the jsonpath-based wait.

## Review Notes
- The `hybridStorage` feature (with `primaryDeviceClass` and `secondaryDeviceClass`) is a real Rook feature available in v1.12+. The Rook docs note that hybrid storage pools may suffer from lower availability if a node goes down -- the post could mention this caveat in the future.
- The RBD image features list (`layering`, `deep-flatten`, `exclusive-lock`, `object-map`, `fast-diff`) and their descriptions are accurate. These features require Linux kernel 5.4+ on the nodes.
- All YAML manifests use correct API versions, field names, and values per the Rook CRD spec.
- The CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) are correct and auto-created by the Rook operator.
- The `rbd info` example output is realistic and mathematically correct (1 GiB / 4 MiB = 256 objects, order 22).
