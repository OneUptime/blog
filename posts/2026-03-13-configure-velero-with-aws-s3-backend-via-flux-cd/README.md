# How to Configure Velero with AWS S3 Backend via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, AWS, S3, GitOps, Kubernetes, Backup, Disaster Recovery

Description: Configure Velero to use AWS S3 for backup storage managed by Flux CD, with IRSA authentication and cross-region replication for disaster recovery.

---

## Introduction

AWS S3 is the most widely used Velero backup backend. Its combination of durability (11 nines), lifecycle management, cross-region replication, and tight IAM integration makes it an excellent choice for Kubernetes backup storage. When running on EKS, you can use IAM Roles for Service Accounts (IRSA) to authenticate Velero without managing long-lived access keys.

This guide covers the complete AWS S3 backend setup including bucket creation with versioning and encryption, IRSA-based authentication for EKS clusters, cross-region replication for disaster recovery, and the Flux configuration to manage it all.

## Prerequisites

- Velero installed on an EKS cluster
- Flux CD bootstrapped on the cluster
- EKS cluster with OIDC provider configured for IRSA
- `aws` CLI and `kubectl` installed

## Step 1: Create the S3 Buckets

```bash
# Primary backup bucket
aws s3api create-bucket \
  --bucket my-cluster-velero-primary \
  --region us-east-1

# DR backup bucket in secondary region
aws s3api create-bucket \
  --bucket my-cluster-velero-dr \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

# Enable versioning on both buckets
for BUCKET in my-cluster-velero-primary my-cluster-velero-dr; do
  aws s3api put-bucket-versioning \
    --bucket "${BUCKET}" \
    --versioning-configuration Status=Enabled
done

# Enable server-side encryption
for BUCKET in my-cluster-velero-primary my-cluster-velero-dr; do
  aws s3api put-bucket-encryption \
    --bucket "${BUCKET}" \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }'
done

# Block all public access
for BUCKET in my-cluster-velero-primary my-cluster-velero-dr; do
  aws s3api put-public-access-block \
    --bucket "${BUCKET}" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
done
```

## Step 2: Configure Cross-Region Replication

```bash
# Create an IAM role for S3 replication
cat > /tmp/s3-replication-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetReplicationConfiguration",
      "s3:ListBucket"
    ],
    "Resource": "arn:aws:s3:::my-cluster-velero-primary"
  }, {
    "Effect": "Allow",
    "Action": [
      "s3:GetObjectVersionForReplication",
      "s3:GetObjectVersionAcl",
      "s3:GetObjectVersionTagging"
    ],
    "Resource": "arn:aws:s3:::my-cluster-velero-primary/*"
  }, {
    "Effect": "Allow",
    "Action": [
      "s3:ReplicateObject",
      "s3:ReplicateDelete",
      "s3:ReplicateTags"
    ],
    "Resource": "arn:aws:s3:::my-cluster-velero-dr/*"
  }]
}
EOF

# Enable replication from primary to DR bucket
aws s3api put-bucket-replication \
  --bucket my-cluster-velero-primary \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
    "Rules": [{
      "Status": "Enabled",
      "Destination": {
        "Bucket": "arn:aws:s3:::my-cluster-velero-dr",
        "StorageClass": "STANDARD_IA"
      }
    }]
  }'
```

## Step 3: Create IRSA Role for Velero

```bash
# Get the OIDC provider for your EKS cluster
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name my-eks-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

# Create the IRSA trust policy
cat > /tmp/velero-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789012:oidc-provider/${OIDC_PROVIDER}"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "${OIDC_PROVIDER}:sub": "system:serviceaccount:velero:velero-server",
        "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
      }
    }
  }]
}
EOF

# Create the Velero IRSA role
aws iam create-role \
  --role-name VeleroEKSRole \
  --assume-role-policy-document file:///tmp/velero-trust-policy.json

# Attach the Velero backup policy
aws iam attach-role-policy \
  --role-name VeleroEKSRole \
  --policy-arn arn:aws:iam::123456789012:policy/VeleroBackupPolicy
```

## Step 4: Configure Velero HelmRelease with IRSA

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
    initContainers:
      - name: velero-plugin-for-aws
        image: velero/velero-plugin-for-aws:v1.9.0
        volumeMounts:
          - mountPath: /target
            name: plugins

    # Use IRSA instead of static credentials
    credentials:
      useSecret: false  # Disable static credential secret

    configuration:
      backupStorageLocation:
        - name: primary
          provider: aws
          bucket: my-cluster-velero-primary
          config:
            region: us-east-1
            serverSideEncryption: AES256
          default: true
        - name: disaster-recovery
          provider: aws
          bucket: my-cluster-velero-dr
          config:
            region: eu-west-1
            serverSideEncryption: AES256
      volumeSnapshotLocation:
        - name: primary
          provider: aws
          config:
            region: us-east-1

    serviceAccount:
      server:
        create: true
        name: velero-server
        annotations:
          # IRSA annotation - links the SA to the IAM role
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/VeleroEKSRole

    deployNodeAgent: true
```

## Step 5: Add S3 Lifecycle Rules for Cost Management

```bash
# Configure lifecycle rules to transition old backups to cheaper storage
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-cluster-velero-primary \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [{
        "Days": 30,
        "StorageClass": "STANDARD_IA"
      }, {
        "Days": 90,
        "StorageClass": "GLACIER"
      }],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }]
  }'
```

## Best Practices

- Use IRSA for EKS clusters to avoid managing long-lived AWS access keys for Velero. IRSA credentials rotate automatically and are scoped to the specific pod.
- Enable S3 cross-region replication from the primary to a DR bucket in a different region. Replication is asynchronous but ensures backups survive a regional outage.
- Apply S3 lifecycle rules to transition old backups to cheaper storage classes (Standard-IA after 30 days, Glacier after 90 days) to control costs.
- Enable S3 Object Lock in Compliance mode for regulatory requirements that mandate tamper-proof backup retention.
- Monitor S3 replication status with CloudWatch metrics to detect replication lag, which could indicate an incomplete DR copy.

## Conclusion

Velero is now configured with AWS S3 as the primary backup backend, using IRSA for credential-free authentication on EKS. Cross-region replication automatically copies backups to a DR bucket for geographic redundancy, and S3 lifecycle rules manage storage costs over time. All configuration is managed through Flux CD for version-controlled, continuously reconciled backup infrastructure.
