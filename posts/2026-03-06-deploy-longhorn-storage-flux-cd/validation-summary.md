# Validation Summary: How to Deploy Longhorn Storage with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Kustomize
- Kubernetes StorageClass and PersistentVolumeClaim
- Prometheus Operator ServiceMonitor
- S3-compatible backup storage

## Sources Consulted
- Longhorn installation requirements and `longhornctl` preflight checks: https://longhorn.io/docs/1.11.2/deploy/install/
- Longhorn Helm chart values for v1.11.2: https://github.com/longhorn/charts/releases/download/longhorn-1.11.2/longhorn-1.11.2.tgz
- Longhorn Helm repository index and current chart versions: https://charts.longhorn.io/index.yaml
- Longhorn StorageClass parameters: https://longhorn.io/docs/1.11.2/references/storage-class-parameters/
- Longhorn recurring jobs with StorageClass parameters: https://longhorn.io/docs/1.11.2/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn S3-compatible backup target documentation: https://longhorn.io/docs/1.11.2/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Prometheus ServiceMonitor documentation: https://longhorn.io/docs/1.11.2/monitoring/prometheus-and-grafana-setup/
- Flux HelmRelease documentation, including CRD lifecycle policies: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization dependency documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The Longhorn environment check command referenced `https://raw.githubusercontent.com/longhorn/longhorn/v1.6.0/scripts/environment_check.yaml`, which returns 404. Replaced it with the current official `longhornctl` preflight check and install commands.
- The post pinned the Helm chart to `1.6.x`, which is outdated for a 2026 guide. Updated the chart constraint and preflight tooling to Longhorn `1.11.x` / `v1.11.2`.
- Longhorn backup settings were shown under `defaultSettings.backupTarget` and `defaultSettings.backupTargetCredentialSecret`. In current Longhorn Helm values, the default backup store is configured under `defaultBackupStore`, so the examples were updated.
- The Flux Kustomization applied `RecurringJob` resources in the same path as the HelmRelease that installs the Longhorn CRDs. Split the Longhorn custom resources into a dependent `longhorn-config` Kustomization so Flux waits for the Longhorn deployment and CRDs first.
- The HelmRelease did not specify CRD lifecycle policy. Added `install.crds: CreateReplace` and `upgrade.crds: CreateReplace` so Flux can create and update Longhorn CRDs during chart reconciliation.
- The prerequisites only mentioned open-iscsi. Updated them to include the running `iscsid` daemon and NFSv4 client requirements for backups and ReadWriteMany volumes.
- The Longhorn storage setting comment described `storageOverProvisioningPercentage` as reserved storage. Corrected it to allocation relative to disk capacity and clarified `storageMinimalAvailablePercentage`.
- The ServiceMonitor example was missing the namespace selector used by the official Longhorn example. Added `namespaceSelector.matchNames: [longhorn-system]` and aligned the label with the documented ServiceMonitor example.
- The S3-compatible backup secret included `AWS_REGION`, which is not part of the documented Longhorn secret fields for S3-compatible endpoints. Removed it and changed the endpoint placeholder away from the AWS global endpoint.

## Review Notes
- The tutorial now targets Longhorn 1.11.x, current as of 2026-05-14. Future Longhorn releases may introduce additional Helm value changes, so the chart version should be reviewed during future validations.
- The custom `longhorn-retain` StorageClass assigns only the `daily-snapshot` recurring job. The `weekly-backup` job is defined but not automatically assigned unless users add it to a StorageClass selector, a group, or a PVC label.
