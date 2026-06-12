# Validation Summary: How to Configure K3s Storage Classes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- K3s
- Kubernetes StorageClasses, PersistentVolumes, PersistentVolumeClaims, StatefulSets, ResourceQuotas
- Rancher Local Path Provisioner
- Longhorn
- NFS CSI Driver
- Helm
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- OneUptime monitoring

## Sources Consulted
- K3s Volumes and Storage documentation: https://docs.k3s.io/add-ons/storage
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Longhorn StorageClass Parameters documentation: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn/SUSE Storage Backup Target documentation: https://documentation.suse.com/cloudnative/storage/1.11/en/snapshots-backups/volume-snapshots-backups/configure-backup-target.html
- Longhorn/SUSE Storage Metrics documentation: https://documentation.suse.com/cloudnative/storage/1.11/en/observability/longhorn-metrics.html
- Longhorn/SUSE Storage Prometheus and Grafana monitoring documentation: https://documentation.suse.com/cloudnative/storage/1.11/en/observability/configure-prometheus-grafana.html
- Kubernetes CSI NFS driver README: https://github.com/kubernetes-csi/csi-driver-nfs
- Kubernetes CSI NFS driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Kubernetes CSI NFS Helm chart documentation: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/charts

## Issues Found
- The Longhorn performance StorageClass used `dataLocality: "strict-local"` with `numberOfReplicas: "2"`. Longhorn documents that `strict-local` should use a replica count of 1, otherwise volume creation fails validation. Changed the class to `dataLocality: "best-effort"` so the two-replica class remains valid.
- The NFS CSI StorageClass comment said `${pvc.metadata.namespace}-${pvc.metadata.name}` while the actual `subDir` used `${pvc.metadata.namespace}/${pvc.metadata.name}`. Updated the comment to match the configuration.
- The in-cluster NFS server example referenced the `storage` namespace and `nfs-backing-storage` PVC without creating either resource. Added a `Namespace` and a Longhorn-backed `PersistentVolumeClaim` to make the example complete.
- The Longhorn degraded replica alert used `longhorn_volume_robustness == 2`. Current Longhorn metrics expose robustness state via a `state` label with value `1` for the active state. Updated the expression to `longhorn_volume_robustness{state="degraded"} == 1`.

## Review Notes
- All fenced YAML snippets were parsed successfully after the fixes.
- The ServiceMonitor selector for Longhorn Manager matches official Longhorn monitoring documentation.
- The NFS CSI examples assume an existing, configured NFS server for the external NFS path, which matches the upstream CSI driver requirements.
