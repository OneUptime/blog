# Validation Summary: How to Deploy Portworx for Container-Native Storage with Data Services

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- Portworx Enterprise
- Portworx Operator
- Portworx CSI
- Stork
- Autopilot
- Prometheus metrics
- AWS S3-compatible backup locations

## Sources Consulted
- Portworx Enterprise StorageCluster CRD reference: https://docs.portworx.com/portworx-enterprise/reference/crd/storage-cluster/
- Portworx Enterprise installation overview: https://docs.portworx.com/portworx-enterprise/platform/install
- Portworx PX CLI installation documentation: https://docs.portworx.com/px-cli/install-px-cli
- Portworx StorageClass reference: https://docs.portworx.com/portworx-enterprise/reference/storageclass
- Portworx Kubernetes Secret PVC encryption documentation: https://docs.portworx.com/portworx-enterprise/3.3/platform/secure/key-management/kubernetes-secrets/pvc-encryption-using-annotations
- Portworx IO profiles documentation: https://docs.portworx.com/portworx-enterprise/operations/tune-performance/io-profile-in-k8s
- Portworx GroupVolumeSnapshot CRD reference: https://docs.portworx.com/portworx-enterprise/reference/crd/groupvolumesnapshots
- Portworx Rule CRD reference: https://docs.portworx.com/portworx-enterprise/reference/crd/rules
- Portworx AutopilotRule reference: https://docs.portworx.com/portworx-enterprise/operations/scale-portworx-cluster/autopilot/reference
- Portworx ApplicationBackup, ApplicationBackupSchedule, BackupLocation, ApplicationRestore, and SchedulePolicy CRD references: https://docs.portworx.com/portworx-enterprise/reference/crd
- Portworx metrics reference: https://docs.portworx.com/portworx-enterprise/reference/metrics
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- Updated Portworx examples from the end-of-life 2.13 release to Portworx Enterprise 3.6.0 and adjusted the installer URL examples accordingly.
- Replaced the outdated `px-kubectl` install and `kubectl portworx version` check with current PX CLI installation and verification commands.
- Made the Kubernetes version extraction command compatible with current `kubectl` behavior where `--short` may not be available.
- Removed invalid mixing of `spec.storage` and `spec.cloudStorage` in the same `StorageCluster` example and added a separate cloud-storage fragment with `provider: aws`.
- Changed StorageClass `io_priority` to the current `priority_io` parameter and replaced deprecated `io_profile: sequential` with `io_profile: auto`.
- Clarified that the encryption example uses a per-volume Kubernetes Secret, then aligned the Secret key and PVC annotations.
- Added labels to the StatefulSet volume claim template so the GroupVolumeSnapshot selector can match the PVC.
- Updated the Autopilot metric expression to use filesystem usage, matching current Portworx Autopilot examples.
- Replaced the scheduled backup example with the correct `BackupLocation`, `SchedulePolicy`, and `ApplicationBackupSchedule` CRD structure.
- Updated the monitoring metric list to use current non-deprecated metrics where appropriate.

## Review Notes
The examples remain illustrative and still require environment-specific values such as license details, storage devices, AWS credentials, and generated Portworx Central options. YAML snippets were checked for parseability after edits.
