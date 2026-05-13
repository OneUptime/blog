# Validation Summary: How to Deploy Longhorn with Backup to S3 via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Flux CD
- Longhorn
- Helm
- Amazon S3
- Kubernetes Secrets
- Kubernetes StorageClasses
- Longhorn RecurringJob and Backup custom resources

## Sources Consulted
- Longhorn install requirements: https://longhorn.io/docs/1.11.2/deploy/install/
- Longhorn install with Flux: https://longhorn.io/docs/1.11.2/deploy/install/install-with-flux/
- Longhorn S3 backup target documentation: https://longhorn.io/docs/1.11.2/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Helm values reference: https://longhorn.io/docs/1.11.2/references/helm-values/
- Longhorn storage class parameters: https://longhorn.io/docs/1.11.2/references/storage-class-parameters/
- Longhorn recurring snapshots and backups: https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn create backup documentation: https://longhorn.io/docs/1.11.2/snapshots-and-backups/backup-and-restore/create-a-backup/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The prerequisite Kubernetes version was stricter than current Longhorn requirements and omitted the `iscsid` daemon requirement. Updated it to Kubernetes v1.25+ with `open-iscsi` installed and `iscsid` running.
- The manifests referenced the `longhorn-system` namespace before creating it. Added a `Namespace` manifest to the backup secret example.
- The ingress example referenced `longhorn-basic-auth` without stating that the secret must exist. Added that prerequisite.
- The HelmRelease pinned Longhorn `1.6.2`, which is outdated for a 2026 validation. Updated the chart version to `1.11.2`.
- The backup target values were placed under `defaultSettings`, but current Longhorn Helm values use `defaultBackupStore.backupTarget` and `defaultBackupStore.backupTargetCredentialSecret`. Moved those values to `defaultBackupStore`.
- The manager resource limits used an unsupported `resources.manager` path. Updated this to the current `longhornManager.resources` Helm value.
- The manual backup command used an undocumented `recurring-jobs.longhorn.io/manual-backup` annotation. Replaced it with the documented Longhorn `Backup` custom resource workflow using an existing snapshot.

## Review Notes
The examples are technically valid after the changes. For a production GitOps repository, separating the HelmRelease from Longhorn custom resources into ordered Flux Kustomizations can avoid a first-reconcile failure before Longhorn CRDs exist.
