# Validation Summary: How to Fix GKE Backup for GKE Restore Failures and Volume Snapshot Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Backup for GKE
- Google Cloud CLI
- Kubernetes resources, namespaces, CRDs, StorageClasses, PVCs, and PVs
- Compute Engine Persistent Disk volume restores
- IAM service agents and roles

## Sources Consulted
- Google Cloud Backup for GKE overview: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke
- Google Cloud Backup for GKE restore guide: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/restore
- Google Cloud Backup for GKE restore plan guide: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/restore-plan
- Google Cloud Backup for GKE volume data restore policy guide: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/volume-data-restore-policy
- Google Cloud Backup for GKE transformation rules guide: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/transformation-rules
- Google Cloud Backup for GKE IAM roles and permissions: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/roles
- Google Cloud IAM roles for Backup for GKE: https://docs.cloud.google.com/iam/docs/roles-permissions/gkebackup
- Google Cloud Backup for GKE cross-project restores: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/cross-project-restores
- gcloud Backup for GKE command reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore
- Backup for GKE REST restore resource reference: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/reference/rest/v1/projects.locations.restorePlans.restores
- Backup for GKE REST volume restore resource reference: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/reference/rest/v1/projects.locations.restorePlans.restores.volumeRestores

## Issues Found
- The architecture diagram said Kubernetes resources are serialized to GCS. The official product docs describe config backups as Kubernetes resource manifests managed by Backup for GKE, so the diagram now says "Store Kubernetes Resource Manifests" without naming GCS as the implementation.
- The restore state list omitted current documented states. Added `CREATING` and `VALIDATING`.
- The IAM section listed incorrect service-agent roles, including `roles/gkebackup.agent`, `roles/compute.storageAdmin`, and `roles/container.developer`. Replaced these with the documented `roles/gkebackup.serviceAgent` role for the Backup for GKE service agent.
- The cross-project restore note implied direct snapshot access from the restore project service agent. Updated it to reference restore channels and documented cross-project Backup for GKE service-agent permissions.
- The restore conflict policy examples used API enum-style values where the surrounding content was gcloud-oriented. Updated the options and example command to use documented gcloud flag values such as `use-existing-version`, `use-backup-version`, `delete-and-restore`, and `restore-volume-data-from-backup`.
- The StorageClass mapping example used deprecated substitution rules. Replaced it with the current transformation rules format and the `--transformation-rules-file` flag.
- The volume restore monitoring command used `stateReason`, but the volume restore resource exposes `stateMessage`. Updated the output format.
- The validation restore command used a `backups/latest` alias, which is not documented for `restores create`. Replaced it with an explicit backup name placeholder.
- The diagnostic summary still referred to substitution rules. Updated it to transformation rules.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against current official Google Cloud CLI documentation rather than local `--help` output. Backup for GKE gcloud commands remain in the `beta` command group according to the official reference.
