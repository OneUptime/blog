# How to Implement Backup Schedules with Velero and Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, Backup, Disaster Recovery, Kubernetes, GitOps, Restore

Description: A practical guide to implementing automated Kubernetes backup schedules using Velero managed by Flux CD for reliable disaster recovery.

---

## Introduction

Kubernetes clusters host stateful workloads, configurations, and custom resources that must be protected against data loss, accidental deletions, and cluster failures. Velero is the standard open-source tool for Kubernetes backup and restore, and when managed through Flux CD, your backup strategy becomes version-controlled, auditable, and consistently applied across all clusters.

This guide covers how to deploy Velero via Flux CD, configure backup schedules for different workload types, set up retention policies, and implement restore procedures using GitOps principles.

## Prerequisites

- A Kubernetes cluster (v1.24+)
- Flux CD v2 installed and bootstrapped
- An object storage backend (AWS S3, GCS, or Azure Blob Storage)
- kubectl configured to access your cluster
- Velero CLI installed locally for restore operations

## Deploying Velero via Flux CD

Install Velero as part of your infrastructure stack managed by Flux CD.

```yaml
# infrastructure/velero/namespace.yaml
# Dedicated namespace for Velero
apiVersion: v1
kind: Namespace
metadata:
  name: velero
  labels:
    app.kubernetes.io/managed-by: flux
    backup/component: "true"
```

```yaml
# infrastructure/velero/helmrepo.yaml
# Helm repository for Velero charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: vmware-tanzu
  namespace: flux-system
spec:
  interval: 24h
  url: https://vmware-tanzu.github.io/helm-charts
```

```yaml
# infrastructure/velero/helmrelease.yaml
# Deploy Velero using Flux HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: velero
  namespace: velero
spec:
  interval: 30m
  chart:
    spec:
      chart: velero
      version: "5.4.0"
      sourceRef:
        kind: HelmRepository
        name: vmware-tanzu
        namespace: flux-system
  values:
    # Cloud provider configuration for AWS
    configuration:
      backupStorageLocation:
        - name: default
          provider: aws
          bucket: my-velero-backups
          config:
            region: us-east-1
            # Use a prefix to separate clusters
            prefix: production-cluster
      volumeSnapshotLocation:
        - name: default
          provider: aws
          config:
            region: us-east-1
    # Credentials for accessing the backup storage
    credentials:
      useSecret: true
      secretContents:
        cloud: |
          [default]
          aws_access_key_id=${AWS_ACCESS_KEY_ID}
          aws_secret_access_key=${AWS_SECRET_ACCESS_KEY}
    # Install the CSI snapshot plugin
    deployNodeAgent: true
    # Resource limits for Velero server
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Enable Prometheus metrics
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
    # Install plugins
    initContainers:
      - name: velero-plugin-for-aws
        image: velero/velero-plugin-for-aws:v1.9.0
        volumeMounts:
          - mountPath: /target
            name: plugins
```

## Configuring Backup Schedules

Define different backup schedules for different workload types and criticality levels.

```yaml
# infrastructure/velero/schedules/critical-workloads.yaml
# Hourly backup for critical workloads
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: critical-workloads-hourly
  namespace: velero
spec:
  # Run every hour
  schedule: "0 * * * *"
  # Use server-side encryption for backups
  useOwnerReferencesInBackup: false
  template:
    # Include only namespaces with critical workloads
    includedNamespaces:
      - production
      - payment-processing
      - auth-service
    # Include all resource types
    includedResources:
      - "*"
    # Snapshot persistent volumes
    snapshotVolumes: true
    # Storage location
    storageLocation: default
    volumeSnapshotLocations:
      - default
    # Time to live - keep hourly backups for 3 days
    ttl: 72h
    # Labels for identifying this backup set
    metadata:
      labels:
        backup-type: critical
        frequency: hourly
    # Hooks to ensure data consistency
    hooks:
      resources:
        - name: database-freeze
          includedNamespaces:
            - production
          labelSelector:
            matchLabels:
              backup/freeze-before: "true"
          pre:
            - exec:
                container: database
                # Freeze writes before snapshot
                command:
                  - /bin/sh
                  - -c
                  - "fsfreeze --freeze /data || true"
                onError: Continue
                timeout: 30s
          post:
            - exec:
                container: database
                # Unfreeze writes after snapshot
                command:
                  - /bin/sh
                  - -c
                  - "fsfreeze --unfreeze /data || true"
                onError: Continue
                timeout: 30s
```

```yaml
# infrastructure/velero/schedules/standard-workloads.yaml
# Daily backup for standard workloads
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: standard-workloads-daily
  namespace: velero
spec:
  # Run daily at 2 AM UTC
  schedule: "0 2 * * *"
  template:
    # Include standard workload namespaces
    includedNamespaces:
      - backend-production
      - frontend-production
      - monitoring
    includedResources:
      - "*"
    snapshotVolumes: true
    storageLocation: default
    volumeSnapshotLocations:
      - default
    # Keep daily backups for 30 days
    ttl: 720h
    metadata:
      labels:
        backup-type: standard
        frequency: daily
    # Exclude certain resources to reduce backup size
    excludedResources:
      - events
      - events.events.k8s.io
```

```yaml
# infrastructure/velero/schedules/cluster-resources.yaml
# Weekly backup of cluster-wide resources
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: cluster-resources-weekly
  namespace: velero
spec:
  # Run weekly on Sundays at 1 AM UTC
  schedule: "0 1 * * 0"
  template:
    # Backup only cluster-scoped resources
    includeClusterResources: true
    includedResources:
      - namespaces
      - clusterroles
      - clusterrolebindings
      - customresourcedefinitions
      - storageclasses
      - persistentvolumes
      - ingressclasses
    # Do not include namespace-scoped resources
    includedNamespaces: []
    snapshotVolumes: false
    storageLocation: default
    # Keep weekly backups for 90 days
    ttl: 2160h
    metadata:
      labels:
        backup-type: cluster-resources
        frequency: weekly
```

```yaml
# infrastructure/velero/schedules/flux-system-backup.yaml
# Backup Flux CD system state for disaster recovery
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: flux-system-daily
  namespace: velero
spec:
  # Run daily at 3 AM UTC
  schedule: "0 3 * * *"
  template:
    includedNamespaces:
      - flux-system
    includedResources:
      - gitrepositories
      - kustomizations
      - helmreleases
      - helmrepositories
      - helmcharts
      - providers
      - alerts
      - receivers
      - imagerepositories
      - imagepolicies
      - imageupdateautomations
      - secrets
      - configmaps
    snapshotVolumes: false
    storageLocation: default
    # Keep Flux system backups for 60 days
    ttl: 1440h
    metadata:
      labels:
        backup-type: flux-system
        frequency: daily
```

## Implementing Backup Verification

Create a CronJob to verify that backups are completing successfully and are restorable.

```yaml
# infrastructure/velero/verification/backup-check.yaml
# CronJob to verify backup health and send reports
apiVersion: batch/v1
kind: CronJob
metadata:
  name: verify-backups
  namespace: velero
spec:
  # Run daily at 6 AM UTC (after all backups have completed)
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-verifier
          containers:
            - name: verifier
              image: bitnami/kubectl:1.28
              command:
                - /bin/sh
                - -c
                - |
                  echo "=== Backup Verification Report ==="
                  echo "Date: $(date -u)"
                  echo ""

                  # Check for failed backups in the last 24 hours
                  echo "--- Failed Backups (last 24h) ---"
                  kubectl get backups -n velero \
                    -o json | jq -r '
                    .items[] |
                    select(.status.phase == "Failed" or
                           .status.phase == "PartiallyFailed") |
                    select(.status.completionTimestamp |
                      fromdateiso8601 > (now - 86400)) |
                    "FAILED: \(.metadata.name) - Phase: \(.status.phase) - Errors: \(.status.errors)"'

                  echo ""
                  # Check for schedules that have not run
                  echo "--- Schedule Status ---"
                  kubectl get schedules -n velero \
                    -o json | jq -r '
                    .items[] |
                    "Schedule: \(.metadata.name) - Last: \(.status.lastBackup) - Phase: \(.status.phase)"'

                  echo ""
                  # Check backup storage location status
                  echo "--- Storage Location Status ---"
                  kubectl get backupstoragelocations -n velero \
                    -o json | jq -r '
                    .items[] |
                    "Location: \(.metadata.name) - Phase: \(.status.phase) - Last Validated: \(.status.lastValidationTime)"'

                  echo ""
                  # Count backups by status
                  echo "--- Backup Summary ---"
                  kubectl get backups -n velero \
                    -o json | jq -r '
                    [.items[] | .status.phase] |
                    group_by(.) |
                    map({phase: .[0], count: length}) |
                    .[] | "\(.phase): \(.count)"'
          restartPolicy: OnFailure
```

## Setting Up Backup Notifications

Configure Flux CD notifications for backup-related events.

```yaml
# clusters/production/notifications/backup-alerts.yaml
# Alert configuration for backup events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: backup-slack
  namespace: flux-system
spec:
  type: slack
  channel: backup-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: velero-alerts
  namespace: flux-system
spec:
  providerRef:
    name: backup-slack
  eventSeverity: error
  eventSources:
    # Watch Velero HelmRelease for deployment issues
    - kind: HelmRelease
      name: velero
      namespace: velero
    # Watch Kustomizations that contain backup schedules
    - kind: Kustomization
      name: velero-schedules
      namespace: flux-system
```

## Monitoring Backup Health with Prometheus

```yaml
# infrastructure/monitoring/backup-alerts.yaml
# PrometheusRule for monitoring Velero backup health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-alerts
  namespace: monitoring
spec:
  groups:
    - name: velero.rules
      rules:
        # Alert when a backup fails
        - alert: VeleroBackupFailed
          expr: |
            increase(velero_backup_failure_total[1h]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Velero backup failed"
            description: >-
              A Velero backup has failed in the last hour.
              Check the backup logs for details.

        # Alert when no successful backup in 25 hours (for daily schedules)
        - alert: VeleroBackupMissing
          expr: |
            time() - velero_backup_last_successful_timestamp{schedule!=""} > 90000
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "No successful backup for schedule {{ $labels.schedule }}"
            description: >-
              Schedule {{ $labels.schedule }} has not had a successful
              backup in over 25 hours.

        # Alert when backup storage location is unavailable
        - alert: VeleroStorageLocationUnavailable
          expr: |
            velero_backup_storage_location_available == 0
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Backup storage location {{ $labels.name }} is unavailable"
```

## Deploying the Backup Stack via Flux CD

Tie the entire backup infrastructure together with Flux CD dependency management.

```yaml
# clusters/production/infrastructure.yaml
# Flux Kustomization for deploying Velero
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/velero
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: velero
      namespace: velero
  timeout: 5m
---
# Backup schedules depend on Velero being healthy
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero-schedules
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/velero/schedules
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    # Ensure Velero is deployed and healthy before creating schedules
    - name: velero
  healthChecks:
    - apiVersion: velero.io/v1
      kind: Schedule
      name: critical-workloads-hourly
      namespace: velero
    - apiVersion: velero.io/v1
      kind: Schedule
      name: standard-workloads-daily
      namespace: velero
```

## Implementing Disaster Recovery Restore Procedures

Document restore procedures as part of your GitOps repository.

```yaml
# infrastructure/velero/restore-templates/full-namespace-restore.yaml
# Template for restoring an entire namespace from backup
# Usage: kubectl apply -f restore-templates/full-namespace-restore.yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: restore-production-TIMESTAMP
  namespace: velero
spec:
  # Reference the backup to restore from
  backupName: critical-workloads-hourly-TIMESTAMP
  # Restore only specific namespaces
  includedNamespaces:
    - production
  # Restore all resource types
  includedResources:
    - "*"
  # Restore persistent volume data
  restorePVs: true
  # Preserve existing resources in the cluster
  existingResourcePolicy: update
  # Hooks to run after restore
  hooks:
    resources:
      - name: post-restore-migrations
        includedNamespaces:
          - production
        labelSelector:
          matchLabels:
            app: api-server
        postHooks:
          - exec:
              container: api-server
              # Run database migrations after restore
              command:
                - /bin/sh
                - -c
                - "/app/run-migrations.sh"
              waitTimeout: 5m
              execTimeout: 5m
              onError: Continue
```

## Summary

Implementing backup schedules with Velero and Flux CD provides a GitOps-driven disaster recovery strategy. The key practices covered include:

- Deploying Velero via Flux CD HelmRelease for consistent management
- Configuring tiered backup schedules based on workload criticality (hourly, daily, weekly)
- Backing up Flux CD system state separately for GitOps disaster recovery
- Using pre/post backup hooks for data consistency
- Verifying backup health with automated CronJobs
- Monitoring backup success with Prometheus alerting rules
- Setting up Flux CD notifications for backup-related events
- Documenting restore procedures as templates in the GitOps repository

By managing your backup infrastructure through GitOps, you ensure that disaster recovery capabilities are version-controlled, consistently applied, and always ready when needed.
