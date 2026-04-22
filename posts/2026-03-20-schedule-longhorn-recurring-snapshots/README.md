# How to Schedule Longhorn Recurring Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Snapshot, Automation, Backup

Description: Configure automated recurring snapshots in Longhorn using recurring jobs and cron expressions to maintain consistent data protection schedules.

## Introduction

Manually creating snapshots is not practical for production environments with many volumes. Longhorn's recurring job feature allows you to define automated snapshot schedules using cron expressions, similar to traditional backup scheduling. Recurring jobs can apply to individual volumes or groups of volumes, making it easy to implement organization-wide data protection policies.

## Understanding Recurring Jobs

Longhorn recurring jobs support several operation types, including:
- **snapshot**: Creates a local snapshot after cleaning up outdated snapshots
- **snapshot-force-create**: Creates a local snapshot
- **snapshot-cleanup**: Purges removable snapshots and system snapshots
- **snapshot-delete**: Removes and purges snapshots that exceed the retention count
- **backup**: Creates a backup to an external backup target after cleaning up outdated snapshots (requires backup target configuration)
- **backup-force-create**: Creates a backup to an external backup target (requires backup target configuration)
- **filesystem-trim**: Trims the filesystem to reclaim disk space

RecurringJob specs can be configured with:
- A cron schedule
- Retention count (for snapshot/backup retention; no effect for `snapshot-cleanup`)
- Concurrency (number of jobs to run at the same time)
- Groups for assigning jobs to volumes
- Labels to apply to the created snapshots or backups

## Creating a Recurring Snapshot Job via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Recurring Job**
3. Click **Create Recurring Job**
4. Fill in the form:
   - **Name**: `daily-snapshot`
   - **Task**: `Snapshot`
   - **Cron**: `0 0 * * *` (daily at midnight)
   - **Retain**: `7` (keep last 7 snapshots)
   - **Concurrency**: `2`
5. Click **OK**

## Creating a Recurring Job via kubectl

```yaml
# recurring-snapshot-daily.yaml - Daily snapshot at midnight

apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-snapshot
  namespace: longhorn-system
spec:
  # Cron expression: run at midnight every day
  cron: "0 0 * * *"
  # Snapshot task type
  task: "snapshot"
  # Keep the last 7 daily snapshots
  retain: 7
  # Maximum number of concurrent snapshot jobs
  concurrency: 2
  # Labels to apply to created snapshots (optional)
  labels:
    schedule: daily
```

```bash
kubectl apply -f recurring-snapshot-daily.yaml

# Verify the recurring job was created
kubectl get recurringjobs.longhorn.io -n longhorn-system
```

## Creating Multiple Snapshot Schedules

For comprehensive data protection, create multiple schedules:

```yaml
# recurring-jobs.yaml - Multiple snapshot schedules for different retention periods

# Hourly snapshots, keep last 24 (covers past day)
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: hourly-snapshot
  namespace: longhorn-system
spec:
  cron: "0 * * * *"    # Every hour
  task: "snapshot"
  retain: 24           # Keep 24 hourly snapshots
  concurrency: 2
  labels:
    frequency: hourly
---
# Daily snapshots, keep last 7 (covers past week)
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-snapshot
  namespace: longhorn-system
spec:
  cron: "0 1 * * *"    # Every day at 1 AM
  task: "snapshot"
  retain: 7            # Keep 7 daily snapshots
  concurrency: 2
  labels:
    frequency: daily
---
# Weekly snapshots, keep last 4 (covers past month)
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-snapshot
  namespace: longhorn-system
spec:
  cron: "0 2 * * 0"    # Every Sunday at 2 AM
  task: "snapshot"
  retain: 4            # Keep 4 weekly snapshots
  concurrency: 1
  labels:
    frequency: weekly
```

```bash
kubectl apply -f recurring-jobs.yaml
```

## Associating Recurring Jobs with Volumes

### Method 1: Apply to Individual Volumes via UI

1. Navigate to **Volume**
2. Click on the volume
3. In the **Recurring Job** section, click **+**
4. Select the recurring job
5. Click **Save**

### Method 2: Apply via kubectl

```bash
# Associate the recurring job with a volume by adding the job label
kubectl label volumes.longhorn.io my-volume \
  -n longhorn-system \
  "recurring-job.longhorn.io/daily-snapshot=enabled"
```

### Method 3: Use RecurringJob Groups

Use groups to apply jobs to multiple volumes at once:

```yaml
# recurring-job-with-group.yaml - Recurring job with a group assignment
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: production-daily-snapshot
  namespace: longhorn-system
spec:
  cron: "0 0 * * *"
  task: "snapshot"
  retain: 7
  concurrency: 2
  # Assign to a named group
  groups:
    - production
```

```bash
kubectl apply -f recurring-job-with-group.yaml
```

Then label your volumes with the group:

```bash
# Apply the production recurring job group to a volume
kubectl label volumes.longhorn.io my-production-volume \
  -n longhorn-system \
  "recurring-job-group.longhorn.io/production=enabled"
```

## Default Recurring Job Group

Longhorn's built-in `default` group applies recurring jobs to volumes that have no recurring job labels. Add a recurring job to that group by including `default` in `spec.groups`:

```bash
# Add the daily snapshot job to the default recurring job group
kubectl patch recurringjobs.longhorn.io daily-snapshot \
  -n longhorn-system \
  --type merge \
  -p '{"spec":{"groups":["default"]}}'
```

In Longhorn UI:
1. Navigate to **Recurring Job**
2. Edit or create a recurring job
3. Add the **default** group

## Applying Recurring Jobs via StorageClass

You can configure recurring jobs in a StorageClass so that all PVCs created from that class inherit the snapshot schedule:

```yaml
# storageclass-with-snapshot.yaml - StorageClass that assigns recurring jobs
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-with-snapshots
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  fsType: "ext4"
  # Associate with the daily snapshot recurring job
  recurringJobSelector: '[{"name":"daily-snapshot","isGroup":false}]'
```

## Monitoring Recurring Jobs

```bash
# List all recurring jobs
kubectl get recurringjobs.longhorn.io -n longhorn-system

# Check recurring job details
kubectl describe recurringjob.longhorn.io daily-snapshot -n longhorn-system

# Check Longhorn manager logs for snapshot job execution
kubectl logs -n longhorn-system \
  -l app=longhorn-manager \
  --tail=100 | grep -i "recurring"
```

## Common Cron Expressions

```text
# Every hour
0 * * * *

# Every day at midnight
0 0 * * *

# Every day at 2 AM
0 2 * * *

# Every Monday at 3 AM
0 3 * * 1

# Every 6 hours
0 */6 * * *

# Every 15 minutes
*/15 * * * *

# First day of every month at midnight
0 0 1 * *
```

## Conclusion

Recurring snapshot jobs are essential for maintaining automated, consistent data protection in Longhorn. By creating a combination of hourly, daily, and weekly snapshot schedules and applying them to volumes through labels or StorageClass configurations, you can implement a robust recovery point objective (RPO) that meets your organization's requirements. Remember that snapshots are stored locally, so always complement them with external backups for true disaster recovery protection.
