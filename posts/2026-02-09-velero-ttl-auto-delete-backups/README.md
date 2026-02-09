# How to Configure Velero TTL to Automatically Delete Old Backup Archives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Backup, Storage Management

Description: Learn how to configure Velero TTL (Time To Live) settings to automatically delete old backup archives, reducing storage costs and maintaining efficient backup retention policies in Kubernetes.

---

Managing backup storage is a critical aspect of any disaster recovery strategy. While backing up your Kubernetes resources and persistent volumes is essential, keeping backups indefinitely leads to unnecessary storage costs and complexity. Velero provides Time To Live (TTL) configuration options that automatically delete old backups, helping you maintain efficient retention policies.

## Understanding Velero TTL

Velero's TTL mechanism controls how long backups are retained before automatic deletion. When you create a backup with a TTL setting, Velero tracks the backup's age and automatically removes it once the TTL period expires. This ensures you maintain only the backups you need while controlling storage costs.

The TTL setting applies to both the backup metadata stored in the Kubernetes cluster and the actual backup data stored in your object storage backend (S3, GCS, Azure Blob, etc.).

## Basic TTL Configuration

You can set TTL when creating a backup using the `--ttl` flag. The value accepts duration strings like `24h`, `7d`, or `720h`.

```bash
# Create a backup with 30-day TTL
velero backup create my-backup \
  --ttl 720h \
  --include-namespaces production
```

This backup will be automatically deleted after 30 days (720 hours). Velero runs a garbage collection controller that periodically checks for expired backups and removes them.

## Configuring TTL for Scheduled Backups

For production environments, you typically use scheduled backups rather than manual ones. You can set TTL in your backup schedule configuration:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-production-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Run at 2 AM daily
  template:
    ttl: 168h0m0s  # 7 days retention
    includedNamespaces:
    - production
    - staging
    storageLocation: default
```

Apply this schedule:

```bash
kubectl apply -f backup-schedule.yaml
```

Each backup created by this schedule will have a 7-day TTL, automatically cycling through weekly backups.

## Different TTL Strategies for Different Backup Types

You should use different TTL values based on backup importance and compliance requirements:

```yaml
# Daily backups - keep for 7 days
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    ttl: 168h0m0s  # 7 days
    includedNamespaces:
    - production
---
# Weekly backups - keep for 30 days
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: weekly-backup
  namespace: velero
spec:
  schedule: "0 3 * * 0"  # Sunday at 3 AM
  template:
    ttl: 720h0m0s  # 30 days
    includedNamespaces:
    - production
    labelSelector:
      matchLabels:
        backup-type: weekly
---
# Monthly backups - keep for 1 year
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: monthly-backup
  namespace: velero
spec:
  schedule: "0 4 1 * *"  # First day of month at 4 AM
  template:
    ttl: 8760h0m0s  # 365 days
    includedNamespaces:
    - production
    labelSelector:
      matchLabels:
        backup-type: monthly
```

This configuration creates a grandfather-father-son (GFS) backup rotation scheme, balancing recovery options with storage efficiency.

## Checking TTL Status

You can view the expiration time of existing backups:

```bash
# List all backups with expiration dates
velero backup get

# Get detailed information including TTL
velero backup describe my-backup
```

The output shows when each backup will expire:

```
Name:         daily-production-backup-20260209
Namespace:    velero
Labels:       velero.io/schedule-name=daily-production-backup
Status:       Completed
Created:      2026-02-09 02:00:00 +0000 UTC
Expires:      2026-02-16 02:00:00 +0000 UTC
```

## Modifying TTL for Existing Backups

If you need to extend or shorten the TTL of an existing backup, you must edit the backup resource directly:

```bash
# Edit the backup resource
kubectl edit backup my-backup -n velero
```

Find the `spec.ttl` field and modify it:

```yaml
spec:
  ttl: 1440h0m0s  # Change from 7 days to 60 days
```

Alternatively, use kubectl patch:

```bash
# Extend TTL to 60 days
kubectl patch backup my-backup -n velero \
  --type merge \
  --patch '{"spec":{"ttl":"1440h0m0s"}}'
```

## Disabling Automatic Deletion

If you want to keep a backup indefinitely (for compliance or legal reasons), set the TTL to 0:

```bash
# Create backup without TTL
velero backup create compliance-backup \
  --ttl 0 \
  --include-namespaces production
```

This backup will never expire automatically. You must manually delete it when no longer needed.

## Monitoring TTL-Based Deletions

Configure monitoring to track backup deletions. Velero exposes Prometheus metrics that you can alert on:

```yaml
# PrometheusRule for backup expiration alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-alerts
  namespace: velero
spec:
  groups:
  - name: velero
    interval: 30s
    rules:
    - alert: BackupExpiringSoon
      expr: |
        (velero_backup_expiration_timestamp_seconds - time()) < 86400
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Backup {{ $labels.backup }} expires in less than 24 hours"
    - alert: BackupDeleted
      expr: |
        increase(velero_backup_deletion_total[5m]) > 0
      labels:
        severity: info
      annotations:
        summary: "Backup deleted by TTL policy"
```

## Storage Lifecycle Policies

Combine Velero TTL with object storage lifecycle policies for defense-in-depth:

```json
// S3 lifecycle policy example
{
  "Rules": [
    {
      "Id": "velero-backup-expiration",
      "Status": "Enabled",
      "Prefix": "backups/",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

This ensures backup data gets deleted from S3 even if Velero fails to clean it up.

## Best Practices

Start with conservative TTL values and adjust based on recovery requirements. Test your restore procedures regularly to ensure you keep backups long enough for your recovery time objectives.

Document your TTL policies and ensure they align with compliance requirements. Different data types may have different retention requirements.

Use labels to categorize backups and apply appropriate TTL values. This makes it easier to implement complex retention schemes.

Monitor storage costs and adjust TTL values to balance cost with recovery needs. Regularly review which backups are actually used for restores.

## Conclusion

Velero's TTL feature provides automatic backup lifecycle management, reducing operational overhead and storage costs. By configuring appropriate TTL values for different backup schedules, you can implement sophisticated retention policies that meet both operational and compliance requirements while keeping storage costs under control.

Remember to test your TTL configuration in a non-production environment first, and always verify that critical backups have appropriate retention periods before relying on automatic deletion in production.
