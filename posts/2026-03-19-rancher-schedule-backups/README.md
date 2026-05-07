# How to Schedule Automated Rancher Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup

Description: Learn how to configure scheduled automated backups for Rancher using the Backup Operator with cron-based scheduling.

Manual backups are fine for one-off situations, but production environments need automated, scheduled backups. The Rancher Backup Operator supports recurring backups using a cron schedule, so you can set it up once and let it run. This guide shows you how to configure scheduled backups with retention policies.

## Prerequisites

- Rancher v2.5 or later
- The Rancher Backup Operator installed (see the Backup Operator installation guide)
- kubectl access with cluster admin privileges
- An external storage location configured (recommended for scheduled backups)

## Step 1: Verify the Backup Operator Is Running

Confirm the operator is ready:

```bash
kubectl get pods -n cattle-resources-system -l app.kubernetes.io/name=rancher-backup
```

## Step 2: Create a Scheduled Backup Resource

The key to scheduling is the `schedule` field in the Backup spec, which accepts a standard cron expression. Save the following as `scheduled-backup.yaml`:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-daily-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 7
  schedule: "0 2 * * *"
```

This configuration creates a backup every day at 2:00 AM and retains the last 7 backups.

Apply it:

```bash
kubectl apply -f scheduled-backup.yaml
```

## Step 3: Common Cron Schedule Examples

Here are some commonly used cron schedules for backups:

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 6 hours | `0 */6 * * *` | Four backups per day |
| Daily at midnight | `0 0 * * *` | Once per day |
| Daily at 2 AM | `0 2 * * *` | Once per day, off-peak |
| Twice daily | `0 2,14 * * *` | At 2 AM and 2 PM |
| Weekly on Sunday | `0 0 * * 0` | Once per week |
| Every 4 hours | `0 */4 * * *` | Six backups per day |

For a comprehensive backup strategy, you might create multiple scheduled backups:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-hourly-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 24
  schedule: "0 * * * *"
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: hourly
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
---
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-daily-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 30
  schedule: "0 2 * * *"
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: daily
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
---
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-weekly-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 12
  schedule: "0 3 * * 0"
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: weekly
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

## Step 4: Configure Retention Policies

The `retentionCount` field controls how many backups are kept. When a new backup is created and the count exceeds this value, the oldest backup is deleted automatically.

Choose retention counts based on your recovery objectives:

- **Hourly backups**: retain 24 (one day of hourly snapshots)
- **Daily backups**: retain 30 (one month of daily snapshots)
- **Weekly backups**: retain 12 (three months of weekly snapshots)

## Step 5: Verify Scheduled Backups Are Running

After the first scheduled backup should have run, check the backup status:

```bash
kubectl get backups.resources.cattle.io
```

You will see the scheduled Backup custom resource, with the most recent backup file shown in the `Latest-Backup` column:

```plaintext
NAME                    LOCATION   TYPE        LATEST-BACKUP                                                                     RESOURCESET                AGE   STATUS
rancher-daily-backup    S3         Recurring   rancher-daily-backup-752ecd87-d958-4d20-8350-072f8d090045-2026-03-19T02-00-00Z.tar.gz   rancher-resource-set-full   1d    Completed
```

Check the details of the backup:

```bash
kubectl describe backups.resources.cattle.io rancher-daily-backup
```

## Step 6: Set Up Monitoring and Alerts

To ensure your scheduled backups are actually running, set up monitoring. If you have enabled the operator's metrics endpoint and use Prometheus, you can create an alert based on the operator's backup metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-backup-alerts
  namespace: cattle-resources-system
spec:
  groups:
  - name: rancher-backup
    rules:
    - alert: BackupFailed
      expr: increase(rancher_backups_failed_total[5m]) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Rancher backup failed"
        description: "Backup {{ $labels.name }} had a failed processing event in the last 5 minutes."
```

## Step 7: Modify an Existing Schedule

To change the schedule of an existing backup, edit the resource:

```bash
kubectl edit backups.resources.cattle.io rancher-daily-backup
```

Change the `schedule` field and save. The operator will use the updated schedule for future runs.

## Step 8: Pause and Resume Scheduled Backups

The Backup resource does not provide a dedicated pause flag. To stop future scheduled backups, delete the Backup custom resource and reapply the manifest when you want to resume.

To delete a scheduled backup:

```bash
kubectl delete backups.resources.cattle.io rancher-daily-backup
```

This stops future backups but does not delete existing backup files from storage.

## Best Practices

- Use external storage (S3-compatible object storage such as AWS S3 or MinIO) for scheduled backups to avoid filling up local storage.
- Set retention counts that align with your recovery point objectives (RPO).
- Monitor backup status and set up alerts for failures.
- Test restores periodically to verify backup integrity.
- Use separate folders or prefixes in your storage bucket for different backup schedules.
- Document your backup schedule and retention policy.

## Conclusion

Automated scheduled backups give you confidence that your Rancher management server can be recovered at any time. By combining cron schedules with retention policies and external storage, you create a robust backup strategy that requires minimal ongoing maintenance. In the next guides, we cover configuring specific S3-compatible storage backends such as S3 and MinIO.
