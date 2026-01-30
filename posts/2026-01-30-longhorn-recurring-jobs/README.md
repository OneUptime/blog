# How to Create Longhorn Recurring Jobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Automation

Description: Automate Longhorn backups and snapshots with recurring jobs for hands-off volume protection.

---

Longhorn volumes hold your data. Manual snapshots and backups work until someone forgets. Recurring jobs let you schedule automatic protection so your volumes stay recoverable without human intervention.

## What Are Recurring Jobs?

Recurring jobs in Longhorn execute scheduled tasks against volumes. They run on a cron schedule and handle retention automatically. Two job types exist:

- **Snapshot**: Creates a point-in-time copy stored locally on the volume replicas
- **Backup**: Creates a snapshot and uploads it to an external backup target (S3, NFS)

Snapshots are fast but live on the same disks as your data. Backups are slower but survive node failures and cluster disasters.

```mermaid
flowchart TB
    subgraph Cluster
        V[Longhorn Volume]
        R1[Replica 1]
        R2[Replica 2]
        R3[Replica 3]
        S1[Snapshot A]
        S2[Snapshot B]
    end

    subgraph External
        BT[Backup Target<br/>S3 / NFS]
        B1[Backup A]
        B2[Backup B]
    end

    V --> R1
    V --> R2
    V --> R3
    R1 --> S1
    R1 --> S2
    S1 -->|Upload| B1
    S2 -->|Upload| B2
    B1 --> BT
    B2 --> BT
```

## Recurring Job Types

### Snapshot Job

Snapshots capture the volume state instantly. They share storage with the volume, so they consume space as data changes.

```yaml
# RecurringJob for hourly snapshots
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: hourly-snapshot
  namespace: longhorn-system
spec:
  # Snapshot creates a local point-in-time copy
  task: snapshot
  # Run every hour at minute 0
  cron: "0 * * * *"
  # Keep the last 24 snapshots (1 day of hourly snapshots)
  retain: 24
  # Number of concurrent jobs allowed
  concurrency: 1
  # Labels to identify volumes this job applies to
  groups:
    - default
```

### Backup Job

Backups upload snapshots to external storage. Configure a backup target first.

```yaml
# RecurringJob for daily backups to S3
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  # Backup creates a snapshot and uploads to backup target
  task: backup
  # Run daily at 2 AM
  cron: "0 2 * * *"
  # Keep the last 30 backups (30 days)
  retain: 30
  concurrency: 1
  groups:
    - default
```

### Filesystem Trim Job

Reclaims unused space from volumes. Useful for volumes with deleted data.

```yaml
# RecurringJob for weekly filesystem trim
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-trim
  namespace: longhorn-system
spec:
  task: filesystem-trim
  # Run every Sunday at 3 AM
  cron: "0 3 * * 0"
  retain: 0
  concurrency: 1
  groups:
    - default
```

## Cron Schedule Configuration

Longhorn uses standard cron syntax with five fields:

```
 +---------------- minute (0-59)
 |  +------------- hour (0-23)
 |  |  +---------- day of month (1-31)
 |  |  |  +------- month (1-12)
 |  |  |  |  +---- day of week (0-6, Sunday=0)
 |  |  |  |  |
 *  *  *  *  *
```

Common patterns:

| Schedule | Cron Expression | Description |
| --- | --- | --- |
| Every hour | `0 * * * *` | At minute 0 of every hour |
| Every 6 hours | `0 */6 * * *` | At minute 0 every 6th hour |
| Daily at 2 AM | `0 2 * * *` | At 2:00 AM every day |
| Weekly Sunday 3 AM | `0 3 * * 0` | At 3:00 AM every Sunday |
| Monthly 1st at midnight | `0 0 1 * *` | At midnight on the 1st |

## Recurring Job Execution Flow

```mermaid
sequenceDiagram
    participant C as Cron Scheduler
    participant RJ as Recurring Job Controller
    participant V as Volume
    participant E as Longhorn Engine
    participant BT as Backup Target

    C->>RJ: Trigger at scheduled time
    RJ->>V: Get volumes matching group
    loop For each volume
        RJ->>E: Create snapshot
        E->>E: Freeze I/O briefly
        E-->>RJ: Snapshot created
        alt Task is backup
            RJ->>E: Upload snapshot
            E->>BT: Transfer data
            BT-->>E: Upload complete
        end
        RJ->>RJ: Check retention
        RJ->>E: Delete old snapshots/backups
    end
    RJ-->>C: Job complete
```

## Retention Policies

The `retain` field controls how many snapshots or backups to keep. Longhorn deletes the oldest when the limit is exceeded.

```yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: tiered-retention
  namespace: longhorn-system
spec:
  task: backup
  cron: "0 */4 * * *"
  # Keep 42 backups (7 days at 6 backups/day)
  retain: 42
  concurrency: 1
  groups:
    - database
```

### Retention Strategy Example

Create multiple jobs with different schedules and retention:

```yaml
---
# Hourly snapshots, keep 24 (1 day)
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: snapshot-hourly
  namespace: longhorn-system
spec:
  task: snapshot
  cron: "0 * * * *"
  retain: 24
  concurrency: 2
  groups:
    - production
---
# Daily backups, keep 7 (1 week)
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: backup-daily
  namespace: longhorn-system
spec:
  task: backup
  cron: "0 1 * * *"
  retain: 7
  concurrency: 1
  groups:
    - production
---
# Weekly backups, keep 4 (1 month)
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: backup-weekly
  namespace: longhorn-system
spec:
  task: backup
  cron: "0 2 * * 0"
  retain: 4
  concurrency: 1
  groups:
    - production
```

## Volume Group Scheduling

Groups let you apply different recurring jobs to different volumes. Assign volumes to groups, then configure jobs to target those groups.

### Assigning Volumes to Groups

Add the `recurringJobSelector` annotation to volumes or use labels:

```yaml
# PersistentVolumeClaim with recurring job group
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  annotations:
    # Assign to the database group
    recurring-job-group.longhorn.io/database: enabled
    # Also assign to production group
    recurring-job-group.longhorn.io/production: enabled
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 50Gi
```

### Group-Specific Jobs

```yaml
---
# Frequent snapshots for databases
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: database-snapshot
  namespace: longhorn-system
spec:
  task: snapshot
  # Every 15 minutes for databases
  cron: "*/15 * * * *"
  retain: 96
  concurrency: 2
  groups:
    # Only applies to volumes in database group
    - database
---
# Less frequent snapshots for general workloads
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: general-snapshot
  namespace: longhorn-system
spec:
  task: snapshot
  # Hourly for general workloads
  cron: "0 * * * *"
  retain: 24
  concurrency: 2
  groups:
    - general
```

### Default Group

The `default` group applies to all volumes that do not have explicit group assignments:

```yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: default-backup
  namespace: longhorn-system
spec:
  task: backup
  cron: "0 3 * * *"
  retain: 7
  concurrency: 1
  # Applies to volumes without explicit group
  groups:
    - default
```

## Configuring Backup Target

Before backup jobs work, configure where backups go.

### S3 Backup Target

```yaml
# Secret for S3 credentials
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-backup-target-secret
  namespace: longhorn-system
type: Opaque
stringData:
  # AWS credentials for S3 access
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  # Optional: for S3-compatible storage
  AWS_ENDPOINTS: "https://s3.us-west-2.amazonaws.com"
```

Set the backup target in Longhorn settings:

```bash
# Using kubectl
kubectl -n longhorn-system patch setting backup-target \
  --type merge \
  -p '{"value": "s3://my-longhorn-backups@us-west-2/"}'

kubectl -n longhorn-system patch setting backup-target-credential-secret \
  --type merge \
  -p '{"value": "longhorn-backup-target-secret"}'
```

### NFS Backup Target

```bash
# Set NFS backup target
kubectl -n longhorn-system patch setting backup-target \
  --type merge \
  -p '{"value": "nfs://192.168.1.100:/longhorn-backups"}'
```

## Complete Production Setup

Here is a full example combining all concepts:

```yaml
---
# S3 credentials
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-backup-secret
  namespace: longhorn-system
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
---
# Hourly snapshots for all production volumes
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: prod-hourly-snapshot
  namespace: longhorn-system
spec:
  task: snapshot
  cron: "0 * * * *"
  retain: 24
  concurrency: 3
  groups:
    - production
  labels:
    environment: production
    type: snapshot
---
# Daily backups for all production volumes
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: prod-daily-backup
  namespace: longhorn-system
spec:
  task: backup
  cron: "0 2 * * *"
  retain: 30
  concurrency: 2
  groups:
    - production
  labels:
    environment: production
    type: backup
---
# Frequent snapshots for databases
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: db-frequent-snapshot
  namespace: longhorn-system
spec:
  task: snapshot
  cron: "*/10 * * * *"
  retain: 144
  concurrency: 2
  groups:
    - database
  labels:
    workload: database
    type: snapshot
---
# Frequent backups for databases
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: db-frequent-backup
  namespace: longhorn-system
spec:
  task: backup
  cron: "0 */4 * * *"
  retain: 42
  concurrency: 1
  groups:
    - database
  labels:
    workload: database
    type: backup
---
# Weekly filesystem trim
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-trim-all
  namespace: longhorn-system
spec:
  task: filesystem-trim
  cron: "0 4 * * 0"
  retain: 0
  concurrency: 5
  groups:
    - default
    - production
    - database
```

## Applying Jobs to Existing Volumes

Update existing PVCs to join groups:

```bash
# Add volume to production group
kubectl annotate pvc my-volume \
  recurring-job-group.longhorn.io/production=enabled

# Add volume to database group
kubectl annotate pvc postgres-data \
  recurring-job-group.longhorn.io/database=enabled

# Remove from a group
kubectl annotate pvc my-volume \
  recurring-job-group.longhorn.io/general-
```

## Monitoring Recurring Jobs

### Check Job Status

```bash
# List all recurring jobs
kubectl get recurringjobs -n longhorn-system

# Describe a specific job
kubectl describe recurringjob hourly-snapshot -n longhorn-system

# Check volume snapshots
kubectl get snapshots -n longhorn-system

# Check backups
kubectl get backups -n longhorn-system
```

### View Job History in UI

The Longhorn UI shows:

1. Navigate to Volume > Select Volume > Recurring Jobs
2. View scheduled jobs and their last execution time
3. Check Snapshot tab for local snapshots
4. Check Backup tab for remote backups

## Troubleshooting

### Jobs Not Running

```bash
# Check the longhorn-manager logs
kubectl logs -n longhorn-system -l app=longhorn-manager --tail=100

# Verify recurring job exists
kubectl get recurringjobs -n longhorn-system

# Check if volume is attached
kubectl get volumes -n longhorn-system
```

### Backups Failing

```bash
# Verify backup target is configured
kubectl get setting backup-target -n longhorn-system -o jsonpath='{.value}'

# Check backup target secret exists
kubectl get secret longhorn-backup-target-secret -n longhorn-system

# Test S3 connectivity from a pod
kubectl run -it --rm s3-test --image=amazon/aws-cli \
  --env="AWS_ACCESS_KEY_ID=your-key" \
  --env="AWS_SECRET_ACCESS_KEY=your-secret" \
  -- s3 ls s3://your-bucket/
```

### Snapshots Consuming Too Much Space

```bash
# List snapshots for a volume
kubectl get snapshots -n longhorn-system -l longhornvolume=pvc-xxx

# Delete old snapshots manually
kubectl delete snapshot snapshot-name -n longhorn-system

# Reduce retention in recurring job
kubectl patch recurringjob hourly-snapshot -n longhorn-system \
  --type merge -p '{"spec":{"retain":12}}'
```

## Best Practices

1. **Layer your protection**: Combine frequent snapshots with less frequent backups
2. **Match retention to RPO**: If you need 1-hour recovery point, keep hourly snapshots
3. **Separate groups by criticality**: Database volumes need more frequent protection than cache volumes
4. **Test restores monthly**: Backups are worthless if restore fails
5. **Monitor backup target capacity**: S3 costs and NFS space can grow quickly
6. **Use concurrency wisely**: Too many concurrent backups saturate network bandwidth
7. **Schedule during low activity**: Run large backup jobs during off-peak hours

---

Recurring jobs turn manual backup chores into automated protection. Set them up once, monitor occasionally, and your Longhorn volumes stay recoverable without daily intervention.
