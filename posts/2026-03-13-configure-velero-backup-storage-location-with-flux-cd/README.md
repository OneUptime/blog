# How to Configure Velero Backup Storage Location with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, BackupStorageLocation, GitOps, Kubernetes, Backup Storage

Description: Configure Velero BackupStorageLocation resources using Flux CD to manage backup storage backends declaratively as code.

---

## Introduction

The BackupStorageLocation (BSL) is the Velero resource that defines where backup data is stored. It specifies the object storage provider (AWS S3, Azure Blob, GCS), the bucket, the region, and any provider-specific configuration. Managing BSLs through Flux means your backup storage configuration is version-controlled, reproducible, and continuously reconciled.

Multiple BackupStorageLocations can be configured on a single cluster, enabling backup data to be sent to different buckets for different purposes: a primary location in the same region for fast restores, and a secondary location in a different region for disaster recovery. Velero's Schedule resources reference specific BSLs by name.

This guide covers creating BSL resources for different scenarios and managing them with Flux CD.

## Prerequisites

- Velero deployed on the cluster
- Flux CD bootstrapped on the cluster
- Object storage credentials configured as Kubernetes Secrets
- `kubectl` CLI installed

## Step 1: Create the AWS S3 Backup Storage Location

```yaml
# infrastructure/velero/storage/bsl-primary.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: primary
  namespace: velero
spec:
  # AWS S3 provider
  provider: aws
  # S3 bucket and optional prefix
  objectStorage:
    bucket: my-cluster-velero-backups
    # Optional prefix for organizing backups by cluster
    prefix: production-cluster
  config:
    region: us-east-1
    # Server-side encryption using AWS managed keys
    serverSideEncryption: AES256
    # KMS key for customer-managed encryption
    # kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/your-key-id
    # S3 storage class for backup objects (standard for frequent access)
    s3Url: ""
    publicUrl: ""
  # Use existing secret for credentials
  credential:
    name: velero-aws-credentials
    key: cloud
```

## Step 2: Create a Disaster Recovery BSL in a Secondary Region

```yaml
# infrastructure/velero/storage/bsl-dr.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: disaster-recovery
  namespace: velero
spec:
  provider: aws
  objectStorage:
    # DR bucket in a different region
    bucket: my-cluster-velero-backups-dr
    prefix: production-cluster
  config:
    # Secondary region for geographic redundancy
    region: eu-west-1
    serverSideEncryption: AES256
  credential:
    name: velero-aws-credentials-dr
    key: cloud
  # Only use this location when explicitly specified
  # Set to true to make this the default location instead
  default: false
```

## Step 3: Create a Read-Only BSL for Cross-Cluster Restores

When restoring from a different cluster's backups, configure the BSL as read-only to prevent accidental writes.

```yaml
# infrastructure/velero/storage/bsl-cross-cluster.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: cross-cluster-source
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: source-cluster-velero-backups
    prefix: source-cluster-name
  config:
    region: us-east-1
  credential:
    name: velero-source-cluster-credentials
    key: cloud
  # Read-only prevents Velero from writing to or deleting from this bucket
  accessMode: ReadOnly
```

## Step 4: Create BSL for Non-AWS Providers

```yaml
# For GCS backup storage
# infrastructure/velero/storage/bsl-gcs.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: gcs-primary
  namespace: velero
spec:
  provider: gcp
  objectStorage:
    bucket: my-cluster-velero-backups-gcs
    prefix: production-cluster
  config:
    serviceAccount: velero@my-gcp-project.iam.gserviceaccount.com
  credential:
    name: velero-gcp-credentials
    key: cloud
```

## Step 5: Create the Flux Kustomization for BSLs

```yaml
# clusters/my-cluster/infrastructure/velero-storage.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero-storage-locations
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/velero/storage
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: velero
  healthChecks:
    - apiVersion: velero.io/v1
      kind: BackupStorageLocation
      name: primary
      namespace: velero
```

## Step 6: Verify BSL Status

```bash
# List all backup storage locations and their status
kubectl get backupstoragelocation -n velero

# Example healthy output:
# NAME              PROVIDER   BUCKET/PREFIX                              PHASE       LAST VALIDATED
# primary           aws        my-cluster-velero-backups/production-cluster   Available   30s
# disaster-recovery aws        my-cluster-velero-backups-dr/production-cluster Available  30s

# Get detailed status
kubectl describe backupstoragelocation primary -n velero

# Verify Velero can write to the BSL by creating a test backup
velero backup create bsl-connectivity-test \
  --storage-location primary \
  --include-namespaces default \
  --ttl 1h
```

## Best Practices

- Configure at least two BackupStorageLocations: one in the primary region for fast restores and one in a secondary region for disaster recovery.
- Use `accessMode: ReadOnly` for BSLs that belong to other clusters to prevent Velero from modifying or deleting their backups.
- Validate BSL credentials regularly. Rotate IAM credentials on a schedule and update the corresponding Kubernetes Secrets.
- Use separate IAM credentials for each BSL to apply least-privilege access. The DR bucket credential should have write access only to the DR bucket, not the primary bucket.
- Set a distinct `prefix` for each cluster using the same bucket to prevent backup data from different clusters from colliding.

## Conclusion

Velero BackupStorageLocations are now managed through Flux CD. Your backup data flows to a primary S3 bucket for fast restores and a secondary disaster recovery bucket in a different region. BSL configuration is version-controlled, making it easy to add new backup locations or modify existing ones through pull requests.
