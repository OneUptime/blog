# How to Deploy Velero with Flux CD for Cluster Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, Backup, GitOps, Kubernetes, Disaster Recovery

Description: Deploy Velero backup solution to Kubernetes using Flux CD HelmRelease for GitOps-managed cluster backup and disaster recovery.

---

## Introduction

Velero is the leading open-source solution for Kubernetes backup, restore, and disaster recovery. It backs up Kubernetes resource definitions and persistent volume data, enabling you to restore a cluster's workloads to a new cluster or recover from accidental deletion. When deployed through Flux CD, Velero's installation, configuration, and backup schedules are all version-controlled and continuously reconciled.

The combination of Flux and Velero creates a resilient platform: Flux continuously reconciles the desired cluster state from Git, and Velero protects that state against data loss and accidental resource deletion. Even if a namespace is accidentally deleted or a cluster is lost, Velero can restore the workloads and Flux can reconcile any Kubernetes resources that are tracked in Git.

This guide deploys Velero using a Flux HelmRelease with AWS S3 as the backup storage backend.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- An AWS S3 bucket for backup storage
- An IAM user or role with permissions to write to the S3 bucket
- `kubectl` and `flux` CLIs installed

## Step 1: Create an S3 Bucket and IAM Credentials

```bash
# Create the S3 bucket for Velero backups
aws s3 mb s3://my-cluster-velero-backups --region us-east-1

# Enable versioning for the bucket (recommended for backup data)
aws s3api put-bucket-versioning \
  --bucket my-cluster-velero-backups \
  --versioning-configuration Status=Enabled

# Create an IAM policy for Velero
cat > /tmp/velero-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",
                "ec2:DescribeSnapshots",
                "ec2:CreateTags",
                "ec2:CreateVolume",
                "ec2:CreateSnapshot",
                "ec2:DeleteSnapshot"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::my-cluster-velero-backups/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::my-cluster-velero-backups"
        }
    ]
}
EOF

aws iam create-policy \
  --policy-name VeleroBackupPolicy \
  --policy-document file:///tmp/velero-policy.json

# Create IAM user for Velero
aws iam create-user --user-name velero-backup
aws iam attach-user-policy \
  --user-name velero-backup \
  --policy-arn arn:aws:iam::123456789012:policy/VeleroBackupPolicy

# Create access keys
aws iam create-access-key --user-name velero-backup
```

## Step 2: Create the Velero Credentials Secret

```bash
# Create the credentials file
cat > /tmp/velero-credentials.txt << 'EOF'
[default]
aws_access_key_id=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Create the namespace first
kubectl create namespace velero

# Create the secret
kubectl create secret generic velero-aws-credentials \
  --from-file=cloud=/tmp/velero-credentials.txt \
  --namespace velero

rm /tmp/velero-credentials.txt
```

## Step 3: Add the Velero Helm Repository

```yaml
# infrastructure/velero/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: vmware-tanzu
  namespace: flux-system
spec:
  # Official Velero Helm chart repository
  url: https://vmware-tanzu.github.io/helm-charts
  interval: 10m
```

## Step 4: Create the Velero HelmRelease

```yaml
# infrastructure/velero/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: velero
  namespace: velero
spec:
  interval: 10m
  chart:
    spec:
      chart: velero
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: vmware-tanzu
        namespace: flux-system
  values:
    # Install the AWS plugin for S3 backup storage and EBS snapshots
    initContainers:
      - name: velero-plugin-for-aws
        image: velero/velero-plugin-for-aws:v1.9.0
        volumeMounts:
          - mountPath: /target
            name: plugins

    # Configure the AWS S3 backup storage location
    configuration:
      backupStorageLocation:
        - name: default
          provider: aws
          bucket: my-cluster-velero-backups
          config:
            region: us-east-1
            # Server-side encryption for backup data
            serverSideEncryption: AES256
      volumeSnapshotLocation:
        - name: default
          provider: aws
          config:
            region: us-east-1

    # Reference the credentials secret
    credentials:
      useSecret: true
      existingSecret: velero-aws-credentials

    # Resource configuration
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Deploy as a single replica for simplicity
    # Increase for HA setups
    replicaCount: 1

    # Install the node-agent DaemonSet for file system backups of PVs
    deployNodeAgent: true
    nodeAgent:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 1Gi
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/velero.yaml
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
```

## Step 6: Verify the Installation

```bash
# Check Velero is running
kubectl get pods -n velero

# Verify the backup storage location is available
kubectl get backupstoragelocation -n velero

# Check the volume snapshot location
kubectl get volumesnapshotlocation -n velero

# Install the Velero CLI for manual operations
brew install velero

# Test backup storage connectivity
velero backup-location get
```

Expected backup storage location status:
```plaintext
NAME      PROVIDER   BUCKET/PREFIX                        PHASE       LAST VALIDATED
default   aws        my-cluster-velero-backups            Available   1m ago
```

## Best Practices

- Enable S3 versioning on the backup bucket to protect against accidental backup deletion.
- Use server-side encryption (`serverSideEncryption: AES256` or `aws:kms`) for all backup data stored in S3.
- Deploy the `nodeAgent` DaemonSet to enable file system-level backup of Persistent Volumes, not just volume snapshots.
- Store the Velero AWS credentials secret using SOPS encryption before committing to Git.
- Set a lifecycle rule on the S3 bucket to transition old backups to cheaper storage classes (Glacier) after 90 days.

## Conclusion

Velero is now deployed and managed through Flux CD. Kubernetes workloads can be backed up to S3 on a schedule, and Persistent Volume data is captured through EBS snapshots. The next steps are to configure backup schedules for your namespaces and test the restore process to validate your disaster recovery capability.
