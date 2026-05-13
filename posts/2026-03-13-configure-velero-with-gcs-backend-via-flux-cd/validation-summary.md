# Validation Summary: How to Configure Velero with GCS Backend via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Velero Helm chart
- Velero plugin for GCP
- Flux CD HelmRelease and Kustomization APIs
- Google Cloud Storage
- GKE Workload Identity
- Google Cloud IAM
- `gcloud`, `gsutil`, `kubectl`, and `velero` CLI commands

## Sources Consulted
- Velero GCP plugin README and Workload Identity setup: https://github.com/velero-io/velero-plugin-for-gcp
- Velero GCP plugin BackupStorageLocation configuration: https://github.com/velero-io/velero-plugin-for-gcp/blob/main/backupstoragelocation.md
- Velero GCP plugin VolumeSnapshotLocation configuration: https://github.com/velero-io/velero-plugin-for-gcp/blob/main/volumesnapshotlocation.md
- Velero GCP plugin compatibility table and current release metadata: https://github.com/velero-io/velero-plugin-for-gcp
- Velero Helm chart values and current chart metadata: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Google Cloud Storage uniform bucket-level access documentation: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Storage Object Lifecycle Management documentation: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage lifecycle configuration examples: https://cloud.google.com/storage/docs/lifecycle-configurations

## Issues Found
- The introduction said GCS offers "automatic versioning." GCS supports object versioning, but it is optional and must be enabled per bucket. Changed this to "optional object versioning."
- The prerequisites said Velero was already installed, but the tutorial installs/configures Velero through a Flux HelmRelease. Changed the prerequisite to a GKE cluster with Workload Identity enabled and noted that Flux should have a `vmware-tanzu` HelmRepository available.
- The IAM setup omitted `iam.serviceAccounts.signBlob`, which the Velero GCP plugin documents as required for CLI operations such as backup logs, backup download, backup describe, and restore describe. Added a `roles/iam.serviceAccountTokenCreator` project binding for the Velero Google service account.
- The HelmRelease used chart version `6.x` and `velero/velero-plugin-for-gcp:v1.9.0`, which target the older Velero 1.13 release family. Updated the chart to `12.x` and the GCP plugin image to `v1.14.0`, matching the current Velero 1.18-era release family available in 2026.
- The Workload Identity Helm values omitted the GCP service account in the BackupStorageLocation config. The Velero GCP plugin documents `serviceAccount` as the config field to use for Workload Identity instead of a key file. Added `serviceAccount: velero-backup@my-gcp-project.iam.gserviceaccount.com`.
- The best practices section said uniform bucket-level access is required for Workload Identity authentication. For this GKE setup, access is granted to the Google service account through IAM and uniform access is a security recommendation that disables ACLs. Reworded the claim to avoid overstating the requirement.

## Review Notes
The tutorial still uses broad IAM roles (`roles/storage.admin`, `roles/compute.storageAdmin`, and `roles/iam.serviceAccountTokenCreator`) for simplicity. The official Velero GCP plugin documentation also shows a narrower custom role option, which would be preferable for production hardening.
