# How to Configure Velero Backup Schedules with Retention Policies for Kubernetes Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Backup, Disaster Recovery, Retention

Description: Learn how to configure automated Velero backup schedules with intelligent retention policies for Kubernetes clusters. Complete guide covering scheduling strategies and lifecycle management.

---

Automated backup schedules ensure your Kubernetes cluster resources are consistently protected without manual intervention. Velero provides flexible scheduling capabilities combined with retention policies that automatically delete old backups, balancing data protection with storage costs. Proper schedule and retention configuration protects against data loss while preventing backup storage from growing indefinitely.

## Understanding Velero Backup Schedules

Velero schedules use cron expressions to trigger automatic backups at specified intervals. Each schedule creates individual backup objects with timestamps, allowing you to restore to specific points in time. Unlike one-time backups, schedules run continuously, providing ongoing protection for your cluster resources.

Schedules support the same filtering and selection options as manual backups, letting you create targeted backup policies for different resource types, namespaces, or applications.

## Installing Velero with Backup Storage

Before creating schedules, install Velero with appropriate backup storage configuration:

```bash
# Install Velero with AWS S3 backend
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero
```

Verify installation:

```bash
kubectl get pods -n velero
kubectl get backupstoragelocations -n velero
```

## Creating a Basic Backup Schedule

Create a simple daily backup schedule:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  # Run at 2 AM daily
  schedule: "0 2 * * *"
  template:
    # Include all namespaces
    includedNamespaces:
    - '*'
    # Exclude velero namespace
    excludedNamespaces:
    - velero
    # Include persistent volumes
    defaultVolumesToFsBackup: false
    snapshotVolumes: true
    # Add labels to track scheduled backups
    labels:
      schedule: daily
      type: full
```

Apply the schedule:

```bash
kubectl apply -f daily-backup-schedule.yaml
```

Velero creates a new backup object every day at 2 AM following the pattern `daily-backup-YYYYMMDDHHMMSS`.

## Configuring Retention Policies

Add TTL (Time To Live) settings to automatically delete old backups:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup-with-retention
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    # Keep backups for 30 days
    ttl: 720h
    includedNamespaces:
    - '*'
    excludedNamespaces:
    - velero
    snapshotVolumes: true
    labels:
      schedule: daily
      type: full
```

The `ttl` field specifies how long to retain backups before automatic deletion. After 30 days (720 hours), Velero automatically deletes the backup and its associated storage.

## Implementing Multi-Tier Backup Schedules

Create different schedules with varying frequencies and retention periods:

```yaml
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: hourly-backup
  namespace: velero
spec:
  # Every hour
  schedule: "0 * * * *"
  template:
    # Keep for 24 hours
    ttl: 24h
    includedNamespaces:
    - production
    - staging
    snapshotVolumes: true
    labels:
      schedule: hourly
      type: incremental

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  # Daily at 2 AM
  schedule: "0 2 * * *"
  template:
    # Keep for 7 days
    ttl: 168h
    includedNamespaces:
    - '*'
    excludedNamespaces:
    - velero
    snapshotVolumes: true
    labels:
      schedule: daily
      type: full

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: weekly-backup
  namespace: velero
spec:
  # Weekly on Sunday at 3 AM
  schedule: "0 3 * * 0"
  template:
    # Keep for 4 weeks
    ttl: 672h
    includedNamespaces:
    - '*'
    excludedNamespaces:
    - velero
    snapshotVolumes: true
    labels:
      schedule: weekly
      type: full

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: monthly-backup
  namespace: velero
spec:
  # Monthly on the 1st at 4 AM
  schedule: "0 4 1 * *"
  template:
    # Keep for 1 year
    ttl: 8760h
    includedNamespaces:
    - '*'
    excludedNamespaces:
    - velero
    snapshotVolumes: true
    labels:
      schedule: monthly
      type: archive
```

This multi-tier strategy provides granular recovery options while managing storage costs.

## Creating Namespace-Specific Schedules

Configure different backup policies for different namespaces:

```yaml
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-backup
  namespace: velero
spec:
  # Every 6 hours
  schedule: "0 */6 * * *"
  template:
    # Keep for 7 days
    ttl: 168h
    includedNamespaces:
    - production
    snapshotVolumes: true
    labels:
      environment: production
      schedule: frequent

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: development-backup
  namespace: velero
spec:
  # Daily at midnight
  schedule: "0 0 * * *"
  template:
    # Keep for 3 days
    ttl: 72h
    includedNamespaces:
    - development
    - testing
    snapshotVolumes: true
    labels:
      environment: development
      schedule: daily
```

Production namespaces get more frequent backups with longer retention, while development environments use lighter backup schedules.

## Implementing Label-Based Backup Schedules

Use label selectors to backup specific resources:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: stateful-app-backup
  namespace: velero
spec:
  schedule: "0 */3 * * *"
  template:
    ttl: 168h
    # Select resources with specific label
    labelSelector:
      matchLabels:
        backup: required
        type: stateful
    snapshotVolumes: true
    labels:
      schedule: stateful-apps
```

Only resources labeled with `backup: required` and `type: stateful` are included in these backups.

## Configuring Ordered Resource Backup

Control backup order for resources with dependencies:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: ordered-backup
  namespace: velero
spec:
  schedule: "0 1 * * *"
  template:
    ttl: 168h
    # Backup in specific order
    orderedResources:
      persistentvolumeclaims: namespaces/production
      persistentvolumes: ""
      deployments: namespaces/production
      services: namespaces/production
    includedNamespaces:
    - production
    snapshotVolumes: true
```

This configuration backs up PVCs and PVs first, ensuring volumes are captured before dependent deployments and services.

## Monitoring Backup Schedule Execution

Check schedule status and recent backups:

```bash
# List all schedules
velero schedule get

# Get detailed schedule information
velero schedule describe daily-backup

# List backups created by a schedule
velero backup get --selector schedule=daily-backup

# Check for failed scheduled backups
velero backup get --selector schedule=daily-backup | grep -i failed
```

Monitor backup creation and retention:

```bash
# Watch for new backups
watch velero backup get

# Check backup storage usage
velero backup-location get
```

## Creating Prometheus Alerts for Schedule Failures

Monitor schedule health with Prometheus alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-schedule-alerts
  namespace: velero
spec:
  groups:
  - name: velero-schedules
    interval: 30s
    rules:
    - alert: VeleroScheduleFailure
      expr: |
        increase(velero_backup_failure_total[1h]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Velero backup schedule has failed"
        description: "Backup schedule has failed {{ $value }} times in the last hour"

    - alert: VeleroScheduleMissed
      expr: |
        time() - velero_backup_last_successful_timestamp{schedule!=""} > 86400
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Velero schedule has not run successfully"
        description: "Schedule {{ $labels.schedule }} has not completed successfully in over 24 hours"

    - alert: VeleroBackupTooOld
      expr: |
        time() - velero_backup_last_successful_timestamp{schedule!=""} > 172800
      labels:
        severity: critical
      annotations:
        summary: "No recent successful backups"
        description: "Last successful backup was over 48 hours ago"
```

These alerts notify you of schedule failures and missed backups.

## Implementing Backup Size Quotas

Monitor backup sizes to prevent storage exhaustion:

```bash
# Check total backup size
velero backup describe daily-backup-20240209020000 | grep "Backup Size"

# List backups sorted by size
for backup in $(velero backup get -o name); do
  echo -n "$backup: "
  velero backup describe $backup | grep "Backup Size" | awk '{print $3, $4}'
done | sort -k2 -h
```

Set up alerts for unexpectedly large backups:

```yaml
- alert: VeleroBackupTooLarge
  expr: |
    velero_backup_total_items > 10000
  labels:
    severity: warning
  annotations:
    summary: "Velero backup is unusually large"
    description: "Backup {{ $labels.schedule }} contains {{ $value }} items"
```

## Pausing and Resuming Schedules

Temporarily disable schedules without deleting them:

```bash
# Pause a schedule
velero schedule pause daily-backup

# Verify schedule is paused
velero schedule get daily-backup

# Resume schedule
velero schedule unpause daily-backup
```

This is useful during maintenance windows or when testing backup configurations.

## Testing Schedule Configuration

Trigger a manual backup using schedule template:

```bash
# Create backup from schedule template
velero backup create test-backup --from-schedule daily-backup

# Verify backup completes successfully
velero backup describe test-backup

# Delete test backup
velero backup delete test-backup --confirm
```

This lets you verify schedule configuration without waiting for the next scheduled run.

## Implementing Backup Rotation Logic

Create a custom controller to implement complex rotation policies:

```go
package main

import (
    "context"
    "time"

    velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes/scheme"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func rotateBackups(ctx context.Context, c client.Client) error {
    backupList := &velerov1.BackupList{}

    // Get all backups from daily schedule
    err := c.List(ctx, backupList, client.MatchingLabels{
        "schedule": "daily-backup",
    })
    if err != nil {
        return err
    }

    // Keep only the last 7 daily backups
    if len(backupList.Items) > 7 {
        // Sort backups by creation time
        sort.Slice(backupList.Items, func(i, j int) bool {
            return backupList.Items[i].CreationTimestamp.Before(
                &backupList.Items[j].CreationTimestamp,
            )
        })

        // Delete oldest backups
        for i := 0; i < len(backupList.Items)-7; i++ {
            err := c.Delete(ctx, &backupList.Items[i])
            if err != nil {
                return err
            }
        }
    }

    return nil
}
```

This custom logic provides rotation policies beyond TTL-based deletion.

## Optimizing Schedule Performance

Reduce backup time and resource usage:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: optimized-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    ttl: 168h
    includedNamespaces:
    - production
    # Exclude high-churn resources
    excludedResources:
    - events
    - pods
    - replicasets.apps
    # Use snapshot for volumes
    snapshotVolumes: true
    defaultVolumesToFsBackup: false
    labels:
      schedule: optimized
```

Excluding ephemeral resources and using volume snapshots improves backup performance.

## Conclusion

Velero backup schedules with retention policies provide automated, reliable cluster protection without manual intervention. Implement multi-tier schedules to balance recovery granularity with storage costs, use label selectors for targeted backups, and configure comprehensive monitoring to ensure schedule reliability. Regular testing of restore procedures validates that your backup strategy actually protects against data loss. With proper schedule and retention configuration, you maintain point-in-time recovery capabilities while keeping backup storage manageable and cost-effective.
