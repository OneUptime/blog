# Validation Summary: How to Configure Rook-Ceph for StatefulSet Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (RBD CSI driver)
- Kubernetes StatefulSets
- Kubernetes StorageClass and PersistentVolumeClaims
- Kubernetes PodDisruptionBudgets
- Kubernetes topologySpreadConstraints

## Sources Consulted
- Rook-Ceph official documentation on StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes volumeClaimTemplates documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#volume-claim-templates
- Kubernetes StorageClass volumeBindingMode documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes topologySpreadConstraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
1. **Missing labels on volumeClaimTemplates caused broken PVC cleanup commands.** The "Cleaning Up StatefulSet PVCs" section uses `kubectl -n databases get pvc -l app=mydb` and `kubectl -n databases delete pvc -l app=mydb` to find and delete PVCs by label. However, PVCs created via `volumeClaimTemplates` only inherit labels explicitly defined in each template's `metadata.labels` field — they do NOT automatically inherit the pod's labels from `spec.template.metadata.labels`. Since the original volumeClaimTemplates had no labels, the `-l app=mydb` selector would have matched zero PVCs. **Fix:** Added `labels: { app: mydb }` to both volumeClaimTemplate metadata blocks so the cleanup commands work as documented.

## Review Notes
- The summary mentions "local-affinity storage" in the context of `WaitForFirstConsumer`. Since Rook-Ceph RBD is network-attached block storage (not local storage), `WaitForFirstConsumer` ensures topology-aware provisioning (delaying PVC binding until pod scheduling) rather than true data locality. This is not incorrect but could be made more precise in a future revision.
- Kubernetes 1.27+ introduced the `StatefulSetAutoDeletePVC` feature (GA in 1.32) which allows automatic PVC cleanup via `.spec.persistentVolumeClaimRetentionPolicy`. The post's statement that "PVCs are not automatically removed" is correct for default behavior, but a future update could mention this newer option.
- The `imageFormat: "2"` and `imageFeatures: layering` parameters in the StorageClass are correct. Some production setups also enable additional features like `fast-diff,object-map,deep-flatten,exclusive-lock`, but `layering` alone is valid and safe.
