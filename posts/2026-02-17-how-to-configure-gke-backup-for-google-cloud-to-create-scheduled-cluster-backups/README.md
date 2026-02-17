# How to Configure GKE Backup for Google Cloud to Create Scheduled Cluster Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Backup, Disaster Recovery, Kubernetes, Cluster Management

Description: Learn how to set up GKE Backup for Google Cloud to create automated, scheduled backups of your Kubernetes cluster resources and persistent volumes.

---

Running production workloads on GKE without a backup strategy is like driving without insurance. Everything works fine until it does not. Whether it is accidental deletion, a bad deployment, or a configuration mistake that corrupts your data, having reliable backups can be the difference between a minor inconvenience and a major incident.

GKE Backup for Google Cloud is a managed service that lets you back up and restore your GKE cluster resources and persistent volume data. It integrates directly with GKE, which means it understands Kubernetes primitives and can do application-consistent backups.

## Enabling GKE Backup

First, enable the Backup for GKE API in your project:

```bash
# Enable the Backup for GKE API
gcloud services enable gkebackup.googleapis.com
```

Next, enable the backup feature on your cluster. This installs the backup agent on your cluster nodes:

```bash
# Enable the backup addon on an existing GKE cluster
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --update-addons=BackupRestore=ENABLED
```

If you are creating a new cluster, include the flag at creation time:

```bash
# Create a new cluster with the backup addon enabled
gcloud container clusters create my-cluster \
  --zone us-central1-a \
  --addons=BackupRestore
```

## Creating a Backup Plan

A backup plan defines what to back up, how often to do it, and how long to keep the backups. Think of it as the blueprint for your backup strategy.

This creates a backup plan that backs up everything in the cluster daily and keeps backups for 30 days:

```bash
# Create a backup plan for the entire cluster with 30-day retention
gcloud beta container backup-restore backup-plans create my-backup-plan \
  --project=my-project \
  --location=us-central1 \
  --cluster=projects/my-project/locations/us-central1-a/clusters/my-cluster \
  --all-namespaces \
  --include-volume-data \
  --backup-retain-days=30 \
  --backup-delete-lock-days=7 \
  --cron-schedule="0 2 * * *" \
  --backup-order=DEFAULT
```

Let me break down the important flags:

- `--all-namespaces` backs up every namespace in the cluster
- `--include-volume-data` includes the actual data from Persistent Volumes, not just the PVC definitions
- `--backup-retain-days=30` keeps each backup for 30 days before automatically deleting it
- `--backup-delete-lock-days=7` prevents anyone from deleting a backup for 7 days after creation
- `--cron-schedule="0 2 * * *"` runs the backup daily at 2 AM

## Backing Up Specific Namespaces

You do not always need to back up the entire cluster. Often, you want to target specific namespaces that contain your application workloads.

This creates a backup plan that only backs up two specific namespaces:

```bash
# Create a backup plan targeting only production namespaces
gcloud beta container backup-restore backup-plans create prod-backup-plan \
  --project=my-project \
  --location=us-central1 \
  --cluster=projects/my-project/locations/us-central1-a/clusters/my-cluster \
  --selected-namespaces=production,staging \
  --include-volume-data \
  --backup-retain-days=14 \
  --cron-schedule="0 */6 * * *"
```

This runs every 6 hours and keeps backups for two weeks.

## Selective Backup with Labels

You can also back up resources based on labels, which is useful when your application spans multiple namespaces:

```bash
# Back up only resources with a specific label across all namespaces
gcloud beta container backup-restore backup-plans create app-backup-plan \
  --project=my-project \
  --location=us-central1 \
  --cluster=projects/my-project/locations/us-central1-a/clusters/my-cluster \
  --selected-applications=production/my-app,production/my-database \
  --include-volume-data \
  --backup-retain-days=7 \
  --cron-schedule="0 * * * *"
```

## Creating a Manual Backup

Sometimes you need an on-demand backup before making changes to the cluster:

```bash
# Create an immediate one-time backup using an existing backup plan
gcloud beta container backup-restore backups create pre-migration-backup \
  --project=my-project \
  --location=us-central1 \
  --backup-plan=my-backup-plan \
  --wait-for-completion
```

The `--wait-for-completion` flag makes the command wait until the backup finishes. This is useful in scripts where you want to make sure the backup is done before proceeding.

## Monitoring Backup Status

Check on your backups regularly to make sure they are completing successfully:

```bash
# List all backups for a backup plan
gcloud beta container backup-restore backups list \
  --project=my-project \
  --location=us-central1 \
  --backup-plan=my-backup-plan

# Get detailed status of a specific backup
gcloud beta container backup-restore backups describe my-backup-20260217 \
  --project=my-project \
  --location=us-central1 \
  --backup-plan=my-backup-plan
```

## Setting Up a Restore Plan

You need a restore plan before you can restore from a backup. The restore plan defines how the backup data maps to the target cluster.

This creates a restore plan that restores everything from the backup plan into the same cluster:

```bash
# Create a restore plan linked to the backup plan
gcloud beta container backup-restore restore-plans create my-restore-plan \
  --project=my-project \
  --location=us-central1 \
  --cluster=projects/my-project/locations/us-central1-a/clusters/my-cluster \
  --backup-plan=projects/my-project/locations/us-central1/backupPlans/my-backup-plan \
  --all-namespaces \
  --volume-data-restore-policy=RESTORE_VOLUME_DATA_FROM_BACKUP \
  --namespaced-resource-restore-mode=DELETE_AND_RESTORE \
  --cluster-resource-restore-scope='{allGroupKinds: true}'
```

The `--namespaced-resource-restore-mode` flag is important:

- `DELETE_AND_RESTORE` deletes existing resources and recreates them from the backup
- `FAIL_ON_CONFLICT` fails if a resource already exists
- `MERGE_SKIP_ON_CONFLICT` restores only resources that do not already exist
- `MERGE_REPLACE_VOLUME_ON_CONFLICT` keeps existing resources but replaces volume data
- `MERGE_REPLACE_ON_CONFLICT` overwrites existing resources with backup data

## Performing a Restore

When you need to restore from a backup:

```bash
# Restore from a specific backup
gcloud beta container backup-restore restores create my-restore \
  --project=my-project \
  --location=us-central1 \
  --restore-plan=my-restore-plan \
  --backup=projects/my-project/locations/us-central1/backupPlans/my-backup-plan/backups/my-backup-20260217 \
  --wait-for-completion
```

## Using Terraform

If you prefer infrastructure as code, here is how to set up a backup plan with Terraform:

```hcl
# Terraform configuration for GKE Backup
resource "google_gke_backup_backup_plan" "primary" {
  name     = "my-backup-plan"
  cluster  = google_container_cluster.primary.id
  location = "us-central1"

  backup_config {
    include_volume_data = true
    all_namespaces      = true
  }

  retention_policy {
    backup_retain_days    = 30
    backup_delete_lock_days = 7
  }

  backup_schedule {
    cron_schedule = "0 2 * * *"
  }
}
```

## Best Practices

From experience running backups across many GKE clusters, here are some recommendations.

Test your restores regularly. A backup that you have never restored from is just a hope, not a strategy. Set up a test cluster and restore to it periodically to verify that your backup process actually works end to end.

Back up before major changes. Always create a manual backup before cluster upgrades, large deployments, or database migrations. The cost of an extra backup is negligible compared to the cost of data loss.

Use multiple retention tiers. Keep daily backups for a week, weekly backups for a month, and monthly backups for a year. This gives you granular recovery options for recent issues and long-term protection against slowly developing problems.

Monitor backup failures. Set up alerts in Cloud Monitoring for backup job failures. A backup plan is only useful if the backups are actually completing.

GKE Backup gives you a managed, Kubernetes-native way to protect your cluster workloads. Spending an hour setting it up now can save you days of recovery work later.
