# How to Configure Velero Backup Schedules with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, Backup Schedules, GitOps, Kubernetes, Disaster Recovery

Description: Manage Velero backup schedules as code using Flux CD GitOps to ensure consistent, automated backup coverage for Kubernetes workloads.

---

## Introduction

A Velero installation without configured schedules is like a backup tool that nobody remembers to run. Velero Schedules define when and what to back up automatically. When managed through Flux CD, backup schedules are version-controlled, continuously reconciled, and consistently applied across environments. Adding a new namespace to backup coverage requires a Git commit rather than manual CLI execution.

Velero Schedules are Kubernetes custom resources that define cron-based backup policies. They reference the namespace scope, label selectors, storage locations, and retention policies. This guide covers creating schedules for different use cases: full cluster backups, namespace-specific backups, and application-aware backups with pre-hooks.

## Prerequisites

- Velero deployed on the cluster (see the Velero deployment guide)
- Flux CD bootstrapped on the cluster
- A configured `BackupStorageLocation` (BSL) named `default`
- `kubectl` and `velero` CLIs installed

## Step 1: Create a Full Cluster Backup Schedule

```yaml
# infrastructure/velero/schedules/full-cluster-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: full-cluster-daily
  namespace: velero
spec:
  # Daily backup at 2 AM UTC
  schedule: "0 2 * * *"
  template:
    # Backup all namespaces (cluster-wide backup)
    includedNamespaces:
      - "*"
    # Exclude system namespaces that don't need application backup
    excludedNamespaces:
      - kube-system
      - kube-public
      - kube-node-lease
      - velero
    # Include all resource types
    includedResources:
      - "*"
    # Include cluster-scoped resources (ClusterRoles, CRDs, etc.)
    includeClusterResources: true
    # Reference the configured backup storage location
    storageLocation: default
    # Reference the volume snapshot location for PV snapshots
    volumeSnapshotLocations:
      - default
    # Retain backups for 30 days
    ttl: 720h
    # Labels for identifying this backup
    labels:
      schedule: full-cluster-daily
      backup-type: full
```

## Step 2: Create Namespace-Specific Schedules

Different namespaces may require different backup frequencies based on data criticality.

```yaml
# infrastructure/velero/schedules/production-apps-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-apps-hourly
  namespace: velero
spec:
  # Hourly backup for production namespaces
  schedule: "0 * * * *"
  template:
    includedNamespaces:
      - production
      - payments
      - user-data
    includeClusterResources: false
    storageLocation: default
    volumeSnapshotLocations:
      - default
    # Keep hourly backups for 7 days
    ttl: 168h
    labels:
      schedule: production-apps-hourly
      backup-type: namespace

---
# infrastructure/velero/schedules/staging-apps-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: staging-apps-daily
  namespace: velero
spec:
  # Daily backup for staging (less frequent than production)
  schedule: "0 3 * * *"
  template:
    includedNamespaces:
      - staging
    includeClusterResources: false
    storageLocation: default
    # Keep staging backups for 7 days only
    ttl: 168h
    labels:
      schedule: staging-apps-daily
      backup-type: namespace
```

## Step 3: Create Application-Aware Backups with Hooks

For stateful applications like databases, use Velero hooks to ensure consistent backups.

```yaml
# infrastructure/velero/schedules/database-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: database-namespace-backup
  namespace: velero
spec:
  # Backup databases every 4 hours
  schedule: "0 */4 * * *"
  template:
    includedNamespaces:
      - databases
    storageLocation: default
    volumeSnapshotLocations:
      - default
    ttl: 336h  # 14 days retention for database backups
    # Hooks execute commands in pods before/after backup
    hooks:
      resources:
        - name: postgres-freeze
          includedNamespaces:
            - databases
          labelSelector:
            matchLabels:
              app: postgresql
          pre:
            # Checkpoint the database before snapshot to ensure consistency
            - exec:
                container: postgresql
                command:
                  - /bin/sh
                  - -c
                  - "psql -U postgres -c 'CHECKPOINT;'"
                onError: Fail
                timeout: 30s
          post:
            # No specific post-hook needed for PostgreSQL
            - exec:
                container: postgresql
                command:
                  - /bin/sh
                  - -c
                  - "echo 'Backup complete'"
                onError: Continue
                timeout: 10s
    labels:
      schedule: database-namespace-backup
      backup-type: database
```

## Step 4: Create a Weekly Long-Term Retention Backup

```yaml
# infrastructure/velero/schedules/weekly-archive.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: weekly-long-term-archive
  namespace: velero
spec:
  # Sunday at midnight for weekly long-term archive
  schedule: "0 0 * * 0"
  template:
    includedNamespaces:
      - "*"
    excludedNamespaces:
      - kube-system
      - kube-public
      - kube-node-lease
      - velero
    includeClusterResources: true
    storageLocation: default
    volumeSnapshotLocations:
      - default
    # Keep weekly backups for 90 days
    ttl: 2160h
    labels:
      schedule: weekly-long-term-archive
      backup-type: archive
      retention: long-term
```

## Step 5: Create the Flux Kustomization for Schedules

```yaml
# clusters/my-cluster/infrastructure/velero-schedules.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero-schedules
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/velero/schedules
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: velero
```

## Step 6: Verify Schedules and Monitor Backups

```bash
# List all configured schedules
kubectl get schedules -n velero

# Watch backup jobs as they run
kubectl get backups -n velero --watch

# Check the last backup result for a schedule
velero backup get --selector schedule=full-cluster-daily

# Get detailed backup status
velero backup describe full-cluster-daily-20260313020000

# Check backup logs for errors
velero backup logs full-cluster-daily-20260313020000

# Verify backup objects in S3
aws s3 ls s3://my-cluster-velero-backups/ --recursive | head -20
```

## Best Practices

- Use overlapping schedules with different retention periods: hourly for recent recovery (7 days), daily for medium-term (30 days), weekly for long-term compliance (90+ days).
- Apply Velero backup hooks to stateful applications to ensure application-consistent backups. A database snapshot taken without flushing the write-ahead log may be corrupt.
- Label your schedules consistently (`backup-type`, `schedule`, `retention`) to enable filtering and reporting.
- Test your backup schedules by regularly performing restore drills. A backup schedule is only valuable if restores actually work.
- Use `includeClusterResources: true` for full cluster backups to capture CRDs, ClusterRoles, and other cluster-scoped resources needed for full cluster recreation.

## Conclusion

Velero backup schedules are now managed as code through Flux CD. Different schedules apply appropriate backup frequencies and retention policies to different namespaces and workload types. Adding a new production namespace to backup coverage requires only a Git commit to update the schedule's `includedNamespaces` list. The schedules are continuously reconciled by Flux, ensuring backup coverage is always in sync with the desired configuration in Git.
