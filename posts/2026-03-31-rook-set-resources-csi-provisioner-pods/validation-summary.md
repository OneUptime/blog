# Validation Summary: How to Set Resources for Rook CSI Provisioner Pods

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI (Container Storage Interface) drivers
- Kubernetes PersistentVolumeClaims (PVCs)
- Kubernetes Deployments and resource management
- Prometheus metrics for CSI monitoring

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CSI drivers documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook operator Helm chart values (`deploy/charts/rook-ceph/values.yaml`) for default resource definitions and field names
- Rook source code (`pkg/operator/ceph/csi/spec.go`) for provisioner Deployment creation logic
- kubernetes-csi/csi-lib-utils source for Prometheus metric naming conventions

## Issues Found
1. **Missing `csi-omap-generator` sidecar container**: The "CSI Provisioner Architecture" section listed 5 sidecar containers but omitted `csi-omap-generator`, which is present in the RBD provisioner Deployment and maintains OMap mappings for RBD volumes. Added it to the list.

2. **Incorrect Prometheus metric name**: The monitoring section referenced `csi_operations_seconds_bucket` as the metric for CSI operations. The correct metric name from the upstream CSI library is `csi_sidecar_operations_seconds_bucket` (for sidecar containers). Fixed the metric name in the comment.

## Review Notes
- The CephCluster YAML configuration format using pipe (`|`) for resource definitions is correct and matches the Rook Helm chart values format.
- The `provisionerReplicas` field and its default of 2 are accurate.
- The driver name `rook-ceph.rbd.csi.ceph.com` follows the correct `<namespace>.<service>.csi.ceph.com` naming convention.
- The CephFS provisioner resource example only shows 2 containers (csi-provisioner and csi-cephfsplugin) rather than all sidecars. This is acceptable as a partial example but users should be aware other sidecars (csi-resizer, csi-snapshotter, csi-attacher, liveness-prometheus) can also be configured for CephFS provisioners.
