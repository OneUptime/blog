# How to Use GKE Backup for GKE to Protect Kubernetes Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Kubernetes, GKE, Backup

Description: Set up Backup for GKE to create automated backups of Kubernetes workloads, persistent volumes, and cluster state for disaster recovery.

---

Backup for GKE is a managed service that protects your GKE workloads and persistent data against accidental deletion, corruption, or cluster failures. Unlike traditional backup solutions, it understands Kubernetes resources and can restore entire applications with their configurations and data.

This guide shows you how to enable and configure Backup for GKE, create backup plans, and perform disaster recovery operations.

## Understanding Backup for GKE

Backup for GKE provides application-consistent backups of:

**Kubernetes resources** - Deployments, Services, ConfigMaps, Secrets, and all other resource types.

**Persistent volumes** - Backups of PersistentVolumes using volume snapshots.

**Cluster state** - Complete cluster configuration for disaster recovery.

Backups are stored in Google Cloud Storage and can be restored to the same cluster or different clusters in the same project.

## Enabling Backup for GKE

Enable the Backup for GKE API:

```bash
# Enable required APIs
gcloud services enable \
  gkebackup.googleapis.com \
  container.googleapis.com

# Set project
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
```

Your GKE cluster must run version 1.19 or later. Enable Workload Identity if not already enabled:

```bash
gcloud container clusters update CLUSTER_NAME \
  --zone=ZONE \
  --workload-pool=$PROJECT_ID.svc.id.goog
```

## Creating a Backup Plan

Create a backup plan that defines what to back up and when:

```bash
# Create backup plan
gcloud alpha backup-restore backup-plans create production-backup \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/my-cluster \
  --all-namespaces \
  --include-secrets \
  --include-volume-data \
  --retention-days=30
```

This backs up all namespaces, including secrets and volume data, with 30-day retention.

For namespace-specific backups:

```bash
gcloud alpha backup-restore backup-plans create app-backup \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/my-cluster \
  --selected-namespaces=production,staging \
  --include-secrets \
  --include-volume-data \
  --retention-days=90
```

## Creating Manual Backups

Create an on-demand backup:

```bash
# Create backup
gcloud alpha backup-restore backups create backup-20260209 \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --backup-plan=production-backup \
  --wait
```

Check backup status:

```bash
# List backups
gcloud alpha backup-restore backups list \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --backup-plan=production-backup

# Describe specific backup
gcloud alpha backup-restore backups describe backup-20260209 \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --backup-plan=production-backup
```

## Scheduling Automated Backups

Create a backup schedule using cron syntax:

```bash
# Create daily backup at 2 AM
gcloud alpha backup-restore backup-plans update production-backup \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cron-schedule="0 2 * * *"
```

Common schedule examples:

```bash
# Every 6 hours
--cron-schedule="0 */6 * * *"

# Daily at 3:30 AM
--cron-schedule="30 3 * * *"

# Weekly on Sunday at midnight
--cron-schedule="0 0 * * 0"

# Monthly on the 1st at 1 AM
--cron-schedule="0 1 1 * *"
```

## Restoring from Backups

Restore to the same cluster:

```bash
# Create restore operation
gcloud alpha backup-restore restores create restore-20260209 \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --restore-plan=production-restore-plan \
  --backup=projects/$PROJECT_ID/locations/us-central1/backupPlans/production-backup/backups/backup-20260209 \
  --wait
```

First, create a restore plan:

```bash
gcloud alpha backup-restore restore-plans create production-restore-plan \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/my-cluster \
  --backup-plan=projects/$PROJECT_ID/locations/us-central1/backupPlans/production-backup \
  --all-namespaces \
  --volume-data-restore-policy=restore-volume-data-from-backup \
  --cluster-resource-conflict-policy=use-existing-version
```

## Selective Restore

Restore specific namespaces:

```bash
gcloud alpha backup-restore restore-plans create selective-restore \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/my-cluster \
  --backup-plan=projects/$PROJECT_ID/locations/us-central1/backupPlans/production-backup \
  --selected-namespaces=production \
  --volume-data-restore-policy=restore-volume-data-from-backup
```

Restore to a different namespace:

```bash
# Create restore with namespace transformation
gcloud alpha backup-restore restores create restore-to-test \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --restore-plan=selective-restore \
  --backup=backup-20260209 \
  --namespace-mappings=production=test-environment
```

## Using Terraform for Backup Configuration

Define backup plan with Terraform:

```hcl
# backup-plan.tf
resource "google_gke_backup_backup_plan" "production" {
  name     = "production-backup"
  cluster  = google_container_cluster.primary.id
  location = "us-central1"

  backup_config {
    include_volume_data = true
    include_secrets     = true

    selected_namespaces {
      namespaces = ["production", "staging"]
    }
  }

  backup_schedule {
    cron_schedule = "0 2 * * *"
  }

  retention_policy {
    backup_delete_lock_days = 7
    backup_retain_days      = 30
  }
}
```

Define restore plan:

```hcl
# restore-plan.tf
resource "google_gke_backup_restore_plan" "production" {
  name     = "production-restore-plan"
  cluster  = google_container_cluster.primary.id
  location = "us-central1"

  backup_plan = google_gke_backup_backup_plan.production.id

  restore_config {
    all_namespaces = true

    volume_data_restore_policy = "RESTORE_VOLUME_DATA_FROM_BACKUP"

    cluster_resource_conflict_policy = "USE_EXISTING_VERSION"

    cluster_resource_restore_scope {
      all_group_kinds = true
    }
  }
}
```

## Filtering Resources in Backups

Include only specific resources:

```bash
gcloud alpha backup-restore backup-plans create filtered-backup \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/my-cluster \
  --selected-namespaces=production \
  --selected-applications=app1,app2
```

Exclude specific resource types:

```yaml
# backup-filter.yaml
apiVersion: gkebackup.gke.io/v1
kind: BackupPlan
metadata:
  name: filtered-backup
spec:
  cluster: projects/PROJECT_ID/locations/us-central1-a/clusters/my-cluster
  backupConfig:
    includeVolumeData: true
    includeSecrets: false
    selectedNamespaces:
      namespaces:
      - production
    selectedApplications:
      namespacedNames:
      - namespace: production
        name: critical-app
```

## Monitoring Backup Operations

View backup status:

```bash
# List all backups with status
gcloud alpha backup-restore backups list \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --backup-plan=production-backup \
  --format="table(name,state,createTime,completeTime)"

# Get detailed backup information
gcloud alpha backup-restore backups describe backup-20260209 \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --backup-plan=production-backup \
  --format=yaml
```

Check restore operations:

```bash
# List restore operations
gcloud alpha backup-restore restores list \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --restore-plan=production-restore-plan

# Describe restore
gcloud alpha backup-restore restores describe restore-20260209 \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --restore-plan=production-restore-plan
```

## Setting Up Alerts

Create Cloud Monitoring alerts for backup failures:

```bash
# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Backup Failures" \
  --condition-display-name="Backup failed" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=60s \
  --condition-filter='resource.type="gkebackup.googleapis.com/BackupPlan"
    metric.type="gkebackup.googleapis.com/backup/state"
    metric.label.state="FAILED"'
```

## Testing Disaster Recovery

Perform regular DR tests:

```bash
# 1. Create a test cluster
gcloud container clusters create dr-test-cluster \
  --zone=us-central1-a \
  --num-nodes=3

# 2. Create restore plan for DR cluster
gcloud alpha backup-restore restore-plans create dr-test-restore \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/dr-test-cluster \
  --backup-plan=production-backup \
  --all-namespaces

# 3. Restore latest backup
LATEST_BACKUP=$(gcloud alpha backup-restore backups list \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --backup-plan=production-backup \
  --sort-by=~createTime \
  --limit=1 \
  --format="value(name)")

gcloud alpha backup-restore restores create dr-test-restore-$(date +%Y%m%d) \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --restore-plan=dr-test-restore \
  --backup=$LATEST_BACKUP

# 4. Verify applications
kubectl --context=dr-test-cluster get pods --all-namespaces

# 5. Clean up
gcloud container clusters delete dr-test-cluster --zone=us-central1-a
```

## Backup Cost Optimization

Optimize backup costs:

```bash
# Use shorter retention for non-critical workloads
gcloud alpha backup-restore backup-plans create dev-backup \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/dev-cluster \
  --selected-namespaces=development \
  --retention-days=7

# Exclude volume data for stateless apps
gcloud alpha backup-restore backup-plans create stateless-backup \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --cluster=projects/$PROJECT_ID/locations/us-central1-a/clusters/my-cluster \
  --selected-namespaces=web-frontend \
  --no-include-volume-data
```

## Troubleshooting Backup Issues

If backups fail:

```bash
# Check backup plan status
gcloud alpha backup-restore backup-plans describe production-backup \
  --project=$PROJECT_ID \
  --location=us-central1

# View error messages
gcloud alpha backup-restore backups describe failed-backup \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --backup-plan=production-backup \
  --format="value(stateReason)"

# Check IAM permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/gkebackup.admin"
```

## Conclusion

Backup for GKE provides enterprise-grade backup and restore capabilities for Kubernetes workloads, protecting against data loss and enabling disaster recovery. The service integrates natively with GKE and understands Kubernetes resource relationships, ensuring application-consistent backups.

Key features include automated scheduled backups, selective namespace and resource backups, volume snapshots, and flexible restore options. Regular testing of backup and restore procedures ensures you can recover quickly from disasters or accidental deletions.
