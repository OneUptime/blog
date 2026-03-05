# How to Use HelmRelease for Deploying Velero with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Velero, Backup, Disaster Recovery

Description: Learn how to deploy Velero for Kubernetes cluster backup and disaster recovery using a Flux HelmRelease.

---

Velero is an open-source tool for backing up and restoring Kubernetes cluster resources and persistent volumes. It supports scheduled backups, disaster recovery, and cluster migration across cloud providers. Deploying Velero through a Flux HelmRelease ensures your backup infrastructure is version-controlled and automatically reconciled from Git.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- An object storage bucket (AWS S3, GCS, Azure Blob, or MinIO) for storing backups
- Cloud provider credentials for the storage backend

## Creating the HelmRepository

Velero publishes its Helm chart through the VMware Tanzu repository.

```yaml
# helmrepository-velero.yaml - Velero Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: vmware-tanzu
  namespace: flux-system
spec:
  interval: 1h
  url: https://vmware-tanzu.github.io/helm-charts
```

## Creating Storage Credentials

Create a Secret with your cloud provider credentials for backup storage. This example uses AWS S3.

```yaml
# secret-velero-aws.yaml - AWS credentials for Velero
apiVersion: v1
kind: Secret
metadata:
  name: velero-aws-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    [default]
    aws_access_key_id=YOUR_ACCESS_KEY
    aws_secret_access_key=YOUR_SECRET_KEY
```

For production, encrypt this secret using SOPS or Sealed Secrets integrated with your Flux pipeline.

## Deploying Velero with HelmRelease

The following HelmRelease deploys Velero configured for AWS S3 storage.

```yaml
# helmrelease-velero.yaml - Velero deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: velero
  namespace: velero
spec:
  interval: 15m
  chart:
    spec:
      chart: velero
      version: "7.x"
      sourceRef:
        kind: HelmRepository
        name: vmware-tanzu
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
    crds: CreateReplace
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
    crds: CreateReplace
  values:
    # Velero resource configuration
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Init containers for installing plugins
    initContainers:
      - name: velero-plugin-for-aws
        image: velero/velero-plugin-for-aws:v1.10.0
        volumeMounts:
          - mountPath: /target
            name: plugins

    # Backup storage configuration
    configuration:
      backupStorageLocation:
        - name: default
          provider: aws
          bucket: my-velero-backups
          config:
            region: us-east-1
            s3ForcePathStyle: "false"

      # Volume snapshot location
      volumeSnapshotLocation:
        - name: default
          provider: aws
          config:
            region: us-east-1

    # Credentials configuration
    credentials:
      useSecret: true
      existingSecret: velero-aws-credentials

    # Deploy node-agent (formerly restic) for file-system backups
    deployNodeAgent: true
    nodeAgent:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi

    # Scheduled backups
    schedules:
      daily-backup:
        disabled: false
        schedule: "0 2 * * *"
        useOwnerReferencesInBackup: false
        template:
          ttl: "720h"
          includedNamespaces:
            - "*"
          excludedNamespaces:
            - kube-system
            - velero
          snapshotVolumes: true
          storageLocation: default
          volumeSnapshotLocations:
            - default

    # Prometheus metrics
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
```

## Configuring for GCS

For Google Cloud Storage, adjust the values accordingly.

```yaml
# Snippet: GCS provider configuration
values:
  initContainers:
    - name: velero-plugin-for-gcp
      image: velero/velero-plugin-for-gcp:v1.10.0
      volumeMounts:
        - mountPath: /target
          name: plugins
  configuration:
    backupStorageLocation:
      - name: default
        provider: gcp
        bucket: my-velero-backups
        config: {}
    volumeSnapshotLocation:
      - name: default
        provider: gcp
        config: {}
  credentials:
    useSecret: true
    existingSecret: velero-gcp-credentials
```

## Creating On-Demand Backups

Once Velero is deployed, you can create backups using the Velero CLI or by applying Backup resources.

```yaml
# backup.yaml - On-demand backup resource
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: manual-backup
  namespace: velero
spec:
  includedNamespaces:
    - apps
    - databases
  ttl: 720h
  storageLocation: default
  snapshotVolumes: true
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease velero -n velero

# Verify Velero pods are running
kubectl get pods -n velero

# Check backup storage locations
velero backup-location get

# List scheduled backups
velero schedule get

# Create a test backup
velero backup create test-backup --include-namespaces default --wait

# Verify the backup
velero backup describe test-backup
```

## Summary

Deploying Velero through a Flux HelmRelease from `https://vmware-tanzu.github.io/helm-charts` provides GitOps-managed backup and disaster recovery for your Kubernetes clusters. By defining backup schedules, storage locations, and plugin configurations declaratively in Git, you ensure that your disaster recovery infrastructure is reproducible, auditable, and automatically maintained by Flux across all your clusters.
