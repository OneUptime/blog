# Validation Summary: How to Create GCP Backup Plans with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Google Cloud Platform (GCP)
- Google Terraform Provider (`hashicorp/google` ~> 5.0)
- GCE Persistent Disk Snapshots (`google_compute_resource_policy`)
- Cloud SQL for PostgreSQL automated backups (`google_sql_database_instance`)
- Backup for GKE (`google_gke_backup_backup_plan`)
- GCP IAM/Project Services API (`google_project_service`)

## Sources Consulted
- [google_compute_resource_policy — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_resource_policy)
- [google_compute_disk_resource_policy_attachment — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk_resource_policy_attachment)
- [google_sql_database_instance — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance)
- [google_gke_backup_backup_plan — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/gke_backup_backup_plan)
- [Enable Backup for GKE API — Google Cloud Documentation](https://cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/use-terraform-with-backup-for-gke)

## Issues Found
- **Incorrect API service name for GKE Backup**: The `google_project_service` block enabled `backupdr.googleapis.com` (which is the API for Google Cloud Backup and DR Service, a separate Actifio-based product). The Backup for GKE feature used by `google_gke_backup_backup_plan` requires the `gkebackup.googleapis.com` API. Corrected the service name in the GKE Backup Plans section.

## Review Notes
- All other resource arguments — snapshot schedule policies (daily/weekly), retention policies, snapshot properties (`labels`, `storage_locations`, `guest_flush`), disk attachment, Cloud SQL `backup_configuration` (including PITR, `transaction_log_retention_days`, and `backup_retention_settings`), and the GKE backup plan blocks (`retention_policy`, `backup_schedule`, `backup_config`, `selected_namespaces`) — match the current `hashicorp/google` ~> 5.0 provider schema.
- The `db-custom-2-8192` machine type is valid for Cloud SQL Postgres (custom 2 vCPU / 8 GiB).
- `POSTGRES_15` is a valid `database_version` value.
- `transaction_log_retention_days` is supported for PostgreSQL Cloud SQL instances; valid for this configuration.
- Minor caveat (not changed): the post does not declare `google_compute_disk.app` or `google_container_cluster.main`, but those are referenced as illustrative dependencies in real deployments — typical for tutorial snippets and not a technical error.
