# Validation Summary: How to Configure Storage Capacity Tracking for CSI Drivers with Limited Space

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes storage APIs
- CSI drivers and CSIStorageCapacity
- Kubernetes external-provisioner
- Kubernetes RBAC
- PrometheusRule and kubelet volume metrics
- Go CSI driver implementation

## Sources Consulted
- Kubernetes Storage Capacity documentation: https://kubernetes.io/docs/concepts/storage/storage-capacity/
- Kubernetes CSIStorageCapacity API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-storage-capacity-v1/
- Kubernetes CSIDriver API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/
- Kubernetes CSI developer documentation for storage capacity tracking: https://kubernetes-csi.github.io/docs/storage-capacity-tracking.html
- Kubernetes CSI external-provisioner README and capacity support documentation: https://github.com/kubernetes-csi/external-provisioner/blob/master/README.md
- Kubernetes CSI external-provisioner RBAC example: https://github.com/kubernetes-csi/external-provisioner/blob/master/deploy/kubernetes/rbac.yaml
- Kubernetes metrics reference for kubelet volume stats labels: https://kubernetes.io/docs/reference/instrumentation/metrics

## Issues Found
- The post described CSIStorageCapacity as a CRD and used `kubectl get crd csistoragecapacities.storage.k8s.io`. CSIStorageCapacity is a built-in `storage.k8s.io/v1` API resource, so the CRD check was removed and replaced with an API resource check.
- The topology examples mixed `topology.kubernetes.io/hostname` and `kubernetes.io/hostname`. The examples now consistently use `kubernetes.io/hostname`, matching the Kubernetes API reference example for node-local capacity.
- The external-provisioner deployment used `--capacity-ownerref-level=2` but did not set the `NAMESPACE` and `POD_NAME` environment variables required by external-provisioner capacity ownership handling. These env vars were added through the Downward API.
- The RBAC example was missing permissions used by the external-provisioner for normal event/PV patch behavior and for owner-reference chain lookup with a Deployment owner. Added `events`, `persistentvolumes` patch, `pods` get, and `replicasets` get permissions.
- A `jq` example selected `.spec.storageClassName`, but `storageClassName` is a top-level field on CSIStorageCapacity. Updated the query to use `.storageClassName`.
- The example owner reference pointed to a StorageClass and omitted the required owner `uid`. Updated it to show a Deployment owner with `apps/v1` and a placeholder UID, matching the configured `--capacity-ownerref-level=2`.
- The Prometheus alerts grouped `kubelet_volume_stats_*` metrics by `node` and `storage_class`, but Kubernetes documents those metrics with `namespace` and `persistentvolumeclaim` labels. Updated the alert expressions and annotations to group by PVC labels.

## Review Notes
- The scheduler's capacity check is intentionally simple and relies on CSIStorageCapacity data that may be stale; Kubernetes still may need to reschedule after a provisioning failure.
- The external-provisioner image in the example is an older valid release line. Future refreshes could update it to the currently recommended sidecar version for the target Kubernetes release.
