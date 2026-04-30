# Validation Summary: How to Set Up Harvester Storage for Kubernetes - Part 3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harvester
- Longhorn
- Kubernetes
- Rancher
- CSI
- StorageClass
- PersistentVolumeClaim

## Sources Consulted
- Harvester StorageClass documentation: https://docs.harvesterhci.io/v1.7/advanced/storageclass/
- Harvester CSI Driver documentation: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Harvester Cloud Provider documentation: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Longhorn storage class parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn recurring snapshots and backups: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn backup target documentation: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn settings update via `kubectl`: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Harvester CSI driver deployment manifest: https://github.com/harvester/harvester-csi-driver/blob/master/deploy/manifests/deployment.yaml
- Harvester CSI driver controller source: https://github.com/harvester/harvester-csi-driver/blob/master/pkg/csi/controller_server.go

## Issues Found
- The introduction implied guest clusters consume Harvester storage through Longhorn CSI directly. Updated it to identify the Harvester CSI driver explicitly, matching the current Harvester CSI documentation and driver source.
- The post listed `longhorn` as a default Harvester StorageClass. Removed that claim and kept the documented host-cluster default `harvester-longhorn`.
- The Rancher provisioning section incorrectly implied the guest cluster should use `harvester-longhorn` directly. Replaced it with the current guest-cluster model: the Harvester cloud provider deploys the Harvester CSI driver, the default guest-cluster StorageClass is `harvester`, and custom guest-cluster StorageClasses must use `provisioner: driver.harvesterhci.io`.
- The PVC example referenced `harvester-longhorn` from inside the guest cluster. Updated it to use a guest-cluster StorageClass that maps to the host Harvester StorageClass via `hostStorageClass`.
- The topology example used `dataLocality: "strict-local"`, which Harvester documents as unsupported. Replaced it with the supported `best-effort` mode and kept `WaitForFirstConsumer` in the host StorageClass example.
- The backup section said to create Longhorn backup resources “from the guest cluster”, but guest clusters using Harvester CSI do not run Longhorn CRDs locally. Rewrote the section so backup target configuration and the `RecurringJob` are applied on the Harvester management cluster.

## Review Notes
- The passthrough custom StorageClass flow for guest clusters depends on Harvester CSI driver support that current Harvester docs describe beginning with v0.1.15.
- RWX, online resize, and volume snapshot behavior are version-dependent in the Harvester CSI driver. This post now stays within the validated host-StorageClass plus guest-StorageClass passthrough path and the standard RWO PVC flow.
- The backup target itself is environment-specific because S3-compatible targets often require credentials or cluster-specific configuration. The corrected post points readers to the supported embedded Longhorn UI path instead of keeping an incomplete one-line `kubectl patch` example.
