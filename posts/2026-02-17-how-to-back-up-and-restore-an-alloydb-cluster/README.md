# How to Back Up and Restore an AlloyDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, Backup, Restore, Database

Description: Learn how to create on-demand and automated backups for AlloyDB clusters and restore them when disaster strikes, with step-by-step gcloud commands and best practices.

---

AlloyDB for PostgreSQL is Google Cloud's fully managed, PostgreSQL-compatible database service. It delivers high performance and availability, but none of that matters if you lose your data. Backups are your safety net, and knowing how to restore from them is just as important as creating them in the first place.

In this guide, I will walk through everything you need to know about backing up and restoring AlloyDB clusters - from automated daily backups to on-demand snapshots and full cluster restores.

## Understanding AlloyDB Backup Types

AlloyDB supports two main backup strategies:

- **Continuous backups**: These are enabled by default and provide point-in-time recovery (PITR). AlloyDB continuously streams write-ahead logs (WAL) to Cloud Storage, allowing you to restore to any point within a configurable retention window.
- **On-demand backups**: These are manual snapshots you trigger yourself. They are useful before major schema changes, deployments, or migrations.

Both types store data in Google Cloud Storage and are encrypted at rest using Google-managed or customer-managed encryption keys (CMEK).

## Setting Up Continuous Backups

Continuous backups are enabled by default when you create an AlloyDB cluster. You can configure the retention period and the recovery window. Here is how to check the current configuration:

```bash
# Check continuous backup configuration for your cluster
gcloud alloydb clusters describe my-cluster \
  --region=us-central1 \
  --format="yaml(continuousBackupConfig, continuousBackupInfo)"
```

To update the continuous backup settings, you can modify the retention period. The default is 14 days, and you can set it anywhere from 1 to 35 days:

```bash
# Update continuous backup retention to 21 days
gcloud alloydb clusters update my-cluster \
  --region=us-central1 \
  --continuous-backup-recovery-window-days=21
```

If you need to enable continuous backups with a customer-managed encryption key, specify the CMEK key:

```bash
# Enable continuous backup with CMEK encryption
gcloud alloydb clusters update my-cluster \
  --region=us-central1 \
  --continuous-backup-encryption-key=projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key \
  --continuous-backup-recovery-window-days=14
```

## Creating On-Demand Backups

On-demand backups are snapshots of your cluster at a specific moment. They persist until you explicitly delete them, unlike continuous backups which roll off after the retention window.

```bash
# Create an on-demand backup of your AlloyDB cluster
gcloud alloydb backups create my-backup-20260217 \
  --cluster=my-cluster \
  --region=us-central1 \
  --description="Pre-deployment backup before v2.5 release"
```

To list all existing backups for your project:

```bash
# List all AlloyDB backups in a specific region
gcloud alloydb backups list \
  --region=us-central1 \
  --format="table(name, state, clusterName, createTime, sizeBytes)"
```

You can also create an on-demand backup with CMEK encryption:

```bash
# Create an encrypted on-demand backup
gcloud alloydb backups create my-encrypted-backup \
  --cluster=my-cluster \
  --region=us-central1 \
  --kms-key=projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key
```

## Restoring from a Continuous Backup (Point-in-Time Recovery)

Point-in-time recovery lets you restore your cluster to any second within the retention window. This is incredibly useful when you need to recover from accidental data deletion or corruption.

First, check the available recovery window:

```bash
# Check the earliest and latest restorable times
gcloud alloydb clusters describe my-cluster \
  --region=us-central1 \
  --format="yaml(continuousBackupInfo.earliestRestorableTime, continuousBackupInfo.enabledTime)"
```

Then restore to a specific point in time by creating a new cluster:

```bash
# Restore to a specific point in time - creates a new cluster
gcloud alloydb clusters restore my-restored-cluster \
  --region=us-central1 \
  --backup-source=CONTINUOUS \
  --continuous-backup-source=my-cluster \
  --point-in-time="2026-02-17T10:30:00Z" \
  --network=projects/my-project/global/networks/my-vpc
```

Note that restoring always creates a new cluster. You cannot overwrite an existing cluster with a restore operation. After the restore completes, you will need to create read pool instances if your original cluster had them.

## Restoring from an On-Demand Backup

Restoring from an on-demand backup is straightforward. You reference the backup name and provide configuration for the new cluster:

```bash
# Restore from an on-demand backup to a new cluster
gcloud alloydb clusters restore my-restored-cluster \
  --region=us-central1 \
  --backup-source=BACKUP \
  --backup=my-backup-20260217 \
  --network=projects/my-project/global/networks/my-vpc
```

After the cluster is restored, you need to create a primary instance:

```bash
# Create a primary instance in the restored cluster
gcloud alloydb instances create primary-instance \
  --cluster=my-restored-cluster \
  --region=us-central1 \
  --instance-type=PRIMARY \
  --cpu-count=4
```

## Automating Backup Workflows

While continuous backups handle ongoing protection, you might want to automate on-demand backups before scheduled events. Here is a simple Cloud Scheduler and Cloud Functions approach:

```bash
# Create a Cloud Scheduler job that triggers a backup function daily
gcloud scheduler jobs create http trigger-alloydb-backup \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/create-alloydb-backup" \
  --http-method=POST \
  --message-body='{"cluster":"my-cluster","region":"us-central1"}' \
  --time-zone="America/New_York"
```

## Backup Monitoring and Alerting

You should set up monitoring to track backup health. AlloyDB exposes metrics that you can use with Cloud Monitoring:

```bash
# Create an alert policy for backup failures using gcloud
gcloud alpha monitoring policies create \
  --display-name="AlloyDB Backup Failure Alert" \
  --condition-display-name="Backup failure detected" \
  --condition-filter='resource.type="alloydb.googleapis.com/Cluster" AND metric.type="alloydb.googleapis.com/database/backup/count" AND metric.labels.status="FAILED"' \
  --notification-channels=projects/my-project/notificationChannels/12345
```

## Cleanup and Cost Management

On-demand backups consume storage and incur costs. Regularly clean up old backups that are no longer needed:

```bash
# Delete an old on-demand backup
gcloud alloydb backups delete my-old-backup \
  --region=us-central1 \
  --quiet
```

You can also write a script to prune backups older than a certain date:

```bash
# List backups older than 30 days and delete them
gcloud alloydb backups list \
  --region=us-central1 \
  --filter="createTime < '2026-01-17T00:00:00Z'" \
  --format="value(name)" | while read backup; do
    gcloud alloydb backups delete "$backup" --region=us-central1 --quiet
done
```

## Best Practices

Here are a few things I have learned from running AlloyDB in production:

1. **Keep continuous backups enabled** with at least a 14-day retention window. The storage cost is minimal compared to the risk of data loss.
2. **Take on-demand backups before major changes** like schema migrations, application upgrades, or bulk data imports.
3. **Test your restores regularly.** A backup you have never restored is a backup you cannot trust. Schedule quarterly restore drills.
4. **Use CMEK for compliance-sensitive workloads.** If your organization requires control over encryption keys, configure CMEK for both continuous and on-demand backups.
5. **Monitor backup status** using Cloud Monitoring alerts. You want to know immediately if a backup fails.
6. **Document your recovery procedures.** When an incident happens at 3 AM, you do not want to be reading documentation for the first time.

## Wrapping Up

AlloyDB makes backups relatively painless with its built-in continuous backup and point-in-time recovery features. The key is making sure you have tested your recovery process before you actually need it. Set up your retention windows, automate on-demand backups around critical events, and practice restoring regularly. Your future self will thank you when something inevitably goes sideways.
