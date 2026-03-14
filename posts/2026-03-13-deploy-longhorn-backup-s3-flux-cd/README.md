# How to Deploy Longhorn with Backup to S3 via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Longhorn, Block Storage, S3, Backup, Disaster Recovery

Description: Deploy Longhorn distributed block storage with S3 backup on Kubernetes using Flux CD for GitOps-managed resilient storage with cloud backup.

---

## Introduction

Longhorn is a lightweight, reliable, and powerful distributed block storage system for Kubernetes, originally developed by Rancher (now SUSE). It uses the existing disks on your Kubernetes worker nodes without requiring dedicated storage hardware. Longhorn supports volume snapshots, incremental backups to S3 or NFS, and cross-cluster disaster recovery - making it an excellent choice for clusters that don't have dedicated storage nodes.

Deploying Longhorn through Flux CD gives you GitOps control over storage settings, backup schedules, and recurring snapshot policies. The Longhorn Manager is available as a Helm chart, and backup targets and recurring jobs are managed through its API or CRDs.

## Prerequisites

- Kubernetes v1.26+ with `open-iscsi` installed on all nodes
- Worker nodes with available disk space for Longhorn replicas
- AWS S3 bucket for backups
- Flux CD bootstrapped to your Git repository
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Longhorn HelmRepository

```yaml
# infrastructure/sources/longhorn-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: longhorn
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.longhorn.io
```

## Step 2: Create S3 Backup Credentials Secret

```yaml
# infrastructure/storage/longhorn/backup-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-backup-secret
  namespace: longhorn-system
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
  AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  AWS_ENDPOINTS: ""       # leave empty for AWS S3; set for MinIO
  AWS_CERT: ""            # leave empty for public S3; set for self-signed certs
```

## Step 3: Deploy Longhorn

```yaml
# infrastructure/storage/longhorn/longhorn.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: longhorn
  namespace: longhorn-system
spec:
  interval: 30m
  chart:
    spec:
      chart: longhorn
      version: "1.6.2"
      sourceRef:
        kind: HelmRepository
        name: longhorn
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    persistence:
      defaultClass: true
      defaultClassReplicaCount: 3
      defaultDataLocality: best-effort
      reclaimPolicy: Delete
      migratable: false
      recurringJobSelector:
        enable: false

    defaultSettings:
      # Backup target: S3 bucket
      backupTarget: "s3://my-longhorn-backups@us-east-1/"
      backupTargetCredentialSecret: longhorn-backup-secret
      # Default number of replicas per volume
      defaultReplicaCount: 3
      # Allow scheduling on control-plane nodes
      taintToleration: "node-role.kubernetes.io/control-plane:NoSchedule"
      # Storage over-provisioning factor
      storageOverProvisioningPercentage: 200
      # Minimum available storage before refusing new volumes
      storageMinimalAvailablePercentage: 25
      # Replica auto-balance
      replicaAutoBalance: best-effort
      # Snapshot data integrity check
      snapshotDataIntegrity: fast-check
      # Auto cleanup recurring jobs
      autoCleanupSystemGeneratedSnapshot: true

    resources:
      manager:
        requests:
          cpu: "250m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"

    ingress:
      enabled: true
      ingressClassName: nginx
      host: longhorn.internal.example.com
      annotations:
        nginx.ingress.kubernetes.io/auth-type: basic
        nginx.ingress.kubernetes.io/auth-secret: longhorn-basic-auth
```

## Step 4: Create StorageClasses for Different Tiers

```yaml
# infrastructure/storage/longhorn/storageclasses.yaml
# Default storage class (3 replicas)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"  # 2 days
  fromBackup: ""
  dataLocality: best-effort
---
# Fast storage class (1 replica, for ephemeral or cache volumes)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
parameters:
  numberOfReplicas: "1"
  dataLocality: strict-local   # keep replica local to pod for lowest latency
```

## Step 5: Configure Recurring Backup Jobs

```yaml
# infrastructure/storage/longhorn/recurring-jobs.yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"       # daily at 2 AM
  task: backup
  groups:
    - default              # apply to all volumes with "default" group label
  retain: 7                # keep 7 daily backups
  concurrency: 2           # backup 2 volumes simultaneously
  labels:
    schedule: daily
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: hourly-snapshot
  namespace: longhorn-system
spec:
  cron: "0 * * * *"       # every hour
  task: snapshot
  groups:
    - default
  retain: 24               # keep 24 hourly snapshots
  concurrency: 5
  labels:
    schedule: hourly
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/longhorn-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: longhorn
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/longhorn
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: longhorn-manager
      namespace: longhorn-system
  timeout: 10m
```

## Step 7: Verify and Test Backup

```bash
# Check Longhorn pods
kubectl get pods -n longhorn-system

# Check storage nodes
kubectl -n longhorn-system get nodes.longhorn.io

# Check volumes
kubectl -n longhorn-system get volumes.longhorn.io

# Check backup target is configured
kubectl -n longhorn-system get setting backup-target

# Trigger a manual backup of a specific volume
kubectl -n longhorn-system get volumes.longhorn.io
kubectl -n longhorn-system annotate volume <volume-name> \
  recurring-jobs.longhorn.io/manual-backup="true"

# List backups in S3
aws s3 ls s3://my-longhorn-backups/ --recursive | head -20

# Check recurring jobs
kubectl get recurringjobs -n longhorn-system
```

## Best Practices

- Install `open-iscsi` on all worker nodes before deploying Longhorn - volumes will fail to attach without it.
- Set `defaultReplicaCount: 3` for production volumes and `1` only for ephemeral caches.
- Configure recurring backups to S3 and test restore by creating a volume from backup in a test environment.
- Use `dataLocality: best-effort` to prefer placing the primary replica on the same node as the pod for read performance.
- Monitor Longhorn's volume health via Prometheus metrics at `/metrics` on the manager service.

## Conclusion

Longhorn deployed via Flux CD provides a simple yet powerful distributed block storage solution that leverages your existing node disks without requiring dedicated storage hardware. S3 backups with configurable retention give you disaster recovery capabilities with minimal configuration. Every storage setting - replica count, backup schedule, retention policy - is a Git-managed configuration that Flux applies consistently across your cluster.
