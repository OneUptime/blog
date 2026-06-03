# Validation Summary: How to Use VolumeSnapshots to Create Point-in-Time Backups of Persistent Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes VolumeSnapshot API
- CSI external-snapshotter
- PersistentVolumeClaim restore from snapshots
- AWS EBS CSI driver
- Google Kubernetes Engine Persistent Disk CSI driver
- Kubernetes CronJob and RBAC
- kubectl
- jq
- MySQL container workload

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI Volume Snapshot & Restore documentation: https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html
- Kubernetes CSI external-snapshotter repository and installation guidance: https://github.com/kubernetes-csi/external-snapshotter
- AWS EBS CSI driver snapshot example: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/examples/kubernetes/snapshot
- AWS EBS CSI driver VolumeSnapshotClass example: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/examples/kubernetes/snapshot/manifests/classes/snapshotclass.yaml
- Google Cloud GKE volume snapshots overview: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/volume-snapshots
- Google Cloud GKE Persistent Disk snapshot backup and restore guide: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/backup-pd-volume-snapshots

## Issues Found
- The external-snapshotter install commands used the `master` branch. Updated the URLs to the versioned `release-8.2` branch so the CRDs and snapshot-controller manifests are stable and reproducible.
- The AWS EBS `VolumeSnapshotClass` example used `parameters.encrypted: "true"`, which is not part of the official AWS EBS CSI snapshot class example. Removed the parameter from the generic AWS comment and the AWS-specific YAML.
- The RBAC role allowed creating, getting, and listing snapshots, but the retention CronJob deletes snapshots. Added the `delete` verb so the cleanup example has the required permission.
- The restore verification example created a PVC in a different namespace from the `VolumeSnapshot`, but Kubernetes requires the restore PVC to be in the same namespace as the referenced snapshot. Updated the example to restore in the same namespace.
- The restore verification command referenced `mysql-service`, which was never created and did not mount the restored PVC. Replaced it with a temporary MySQL pod that mounts `mysql-restored`, waits until it is ready, verifies the table data, and cleans up the pod and PVC.

## Review Notes
- VolumeSnapshots are storage-provider snapshots and might be crash-consistent rather than application-consistent unless the workload is quiesced or coordinated before snapshot creation. This is worth expanding in a future production-focused revision, especially for databases.
- The example uses generic names such as `storageClassName: standard` and `bitnami/kubectl:latest`; real clusters should pin images and use storage classes that match the installed CSI driver.
