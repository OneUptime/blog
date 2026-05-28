# Validation Summary: How to Calculate and Achieve RTO and RPO Targets for GCP Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Backup and DR Service
- Backup for GKE
- Cloud SQL for PostgreSQL
- Compute Engine persistent disk snapshots
- Cloud Monitoring alert policies
- Cloud DNS
- Firestore
- Python Google Cloud client libraries
- gcloud CLI

## Sources Consulted
- Google Cloud Backup and DR Service overview: https://docs.cloud.google.com/backup-disaster-recovery/docs/concepts/backup-dr
- gcloud backup-dr backup-vaults create reference: https://docs.cloud.google.com/sdk/gcloud/reference/backup-dr/backup-vaults/create
- gcloud backup-dr management-servers create reference: https://docs.cloud.google.com/sdk/gcloud/reference/backup-dr/management-servers/create
- Backup and DR backup plan documentation: https://docs.cloud.google.com/backup-disaster-recovery/docs/cloud-console/backup-plan-create
- Cloud SQL PostgreSQL PITR documentation: https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/configure-pitr
- Cloud SQL Admin API restoreBackup reference: https://cloud.google.com/sql/docs/mysql/admin-api/rest/v1beta4/instances/restoreBackup
- Cloud SQL Admin API clone reference: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/clone
- Compute Engine scheduled snapshot documentation: https://docs.cloud.google.com/compute/docs/disks/scheduled-snapshots
- Backup for GKE overview and restore documentation: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke and https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/restore
- Cloud Monitoring metric references for Cloud SQL, Backup for GKE, and Backup and DR: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c, https://cloud.google.com/monitoring/api/metrics_gcp_d_h, and https://docs.cloud.google.com/backup-disaster-recovery/docs/monitor-reports/metrics
- gcloud alpha monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create

## Issues Found
- The post claimed Backup and DR directly covered GKE workloads. Updated the product boundary to say Backup and DR covers Compute Engine, Cloud SQL, and AlloyDB, while GKE workloads use Backup for GKE.
- The backup vault command used an invalid retention flag. Replaced it with the current `--backup-min-enforced-retention=7d` flag.
- The management server example implied a management server is required for all Backup and DR use and used the deprecated `--network` flag. Updated the comment and command.
- The Cloud SQL section overpromised zero-data-loss DR with regional HA and used a daily backup command as if it provided hourly backups. Softened the HA claim and replaced the backup example with a Backup and DR backup plan using the Cloud SQL resource type.
- The Compute Engine snapshot Python example used a non-existent `ResourcePolicyHourlySnapshot` class and treated daily schedules as 24-hour hourly schedules. Updated it to use `ResourcePolicyHourlyCycle` and `ResourcePolicyDailyCycle`.
- The Cloud SQL recovery Python example used incorrect generated client classes. Replaced it with the documented Cloud SQL Admin API request structure via `googleapiclient.discovery.build`.
- The GKE restore example used Velero even though the post discusses Google Cloud services. Replaced it with Backup for GKE restore commands.
- The DNS update example only added a new A record and could fail when the record already existed. Updated it to delete existing A records for the domain before adding the replacement.
- The Cloud Monitoring alert examples used non-existent Cloud SQL backup metric names and omitted required condition flags. Replaced them with valid Backup for GKE and Backup and DR metric examples and added `--duration` and `--if`.

## Review Notes
The local workspace does not have `gcloud` installed, so command validation was performed against the current official Google Cloud SDK reference rather than local `--help` output. Python snippets were checked for syntax.
