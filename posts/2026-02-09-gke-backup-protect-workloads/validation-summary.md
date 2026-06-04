# Validation Summary: How to Use GKE Backup for GKE to Protect Kubernetes Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Backup for GKE
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring and log-based alerts
- Terraform Google provider
- Kubernetes custom resources (`ProtectedApplication`)

## Sources Consulted
- Google Cloud: Backup for GKE overview: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke
- Google Cloud: Enable Backup for GKE for a cluster: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/enable-gke-cluster
- Google Cloud: Create and manage a Backup for GKE backup plan: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/backup-plan
- Google Cloud SDK: `gcloud beta container backup-restore backup-plans create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/backup-plans/create
- Google Cloud SDK: `gcloud beta container backup-restore backups create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/backups/create
- Google Cloud SDK: `gcloud beta container backup-restore restore-plans create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/restore-plans/create
- Google Cloud SDK: `gcloud beta container backup-restore restores create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/restores/create
- Google Cloud: Modify resources during restoration: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/transformation-rules
- Google Cloud: Define custom backup and restore logic with `ProtectedApplication`: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/protected-application
- Google Cloud: Set up alerts for failed backups: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/alerts
- Google Cloud Monitoring metrics list for Backup for GKE: https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h
- Terraform Registry: `google_gke_backup_backup_plan`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/gke_backup_backup_plan
- Terraform Registry: `google_gke_backup_restore_plan`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/gke_backup_restore_plan

## Issues Found
- The post used `gcloud alpha backup-restore ...`, which is not the documented Backup for GKE command path. Updated commands to `gcloud beta container backup-restore ...`.
- The existing-cluster enablement command configured Workload Identity instead of enabling the Backup for GKE agent. Replaced it with `gcloud container clusters update ... --update-addons=BackupRestore=ENABLED`.
- Backup plan examples used `--retention-days`, but the documented Backup for GKE flag is `--backup-retain-days`. Updated the affected commands.
- Manual backup and restore examples used `--wait`; Backup for GKE uses `--wait-for-completion`. Updated both examples.
- Restore plan examples omitted explicit cluster-scoped resource restore scope flags. Added `--cluster-resource-scope-all-group-kinds` or `--cluster-resource-scope-no-group-kinds` where appropriate.
- The namespace restore example used a nonexistent `--namespace-mappings` restore flag. Replaced it with a documented transformation rules file and `--transformation-rules-file`.
- The selected application example used bare application names. Updated it to the documented `namespace/name` format and added a valid `ProtectedApplication` example.
- The `ProtectedApplication` YAML used an outdated/incorrect API version. Updated it to `gkebackup.gke.io/v1`.
- The alerting example used an invalid Backup for GKE metric type and label syntax. Replaced it with the official log-based failed-backup filter.
- Several explanatory claims overstated Backup for GKE behavior, including application consistency and full cluster configuration backup. Reworded these to match the documented behavior: Kubernetes manifests plus supported volume backup data, with application consistency requiring application-specific quiescing logic.
- The DR test cluster did not enable the Backup for GKE agent. Added `--addons=BackupRestore` to the test cluster creation command.

## Review Notes
The corrected post still uses the documented beta `gcloud` command group because Google Cloud's current SDK documentation lists Backup for GKE CLI commands under `gcloud beta container backup-restore`, with alpha variants also noted. The Terraform resource names and enum values matched the current Terraform Google provider documentation.
