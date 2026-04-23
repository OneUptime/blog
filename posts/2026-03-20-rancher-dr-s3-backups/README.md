# How to Configure Rancher DR with S3 Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, S3, Backup, Kubernetes, AWS

Description: Complete configuration guide for setting up Rancher disaster recovery using Amazon S3 or S3-compatible storage for reliable backup storage.

## Introduction

Amazon S3 and S3-compatible storage provide durable, highly-available storage for Rancher backups. With 99.999999999% durability and cross-region replication capabilities, S3 is an ideal backend for DR backups.

## Prerequisites

- Rancher management cluster with a `rancher-backup` chart version compatible with your Rancher release
- AWS account or S3-compatible storage (MinIO, Ceph, etc.)
- IAM permissions for S3 bucket access and replication
- `kubectl` and Helm access to the Rancher management cluster

## Step 1: Create S3 Bucket

```bash
# Create primary backup bucket

aws s3 mb s3://rancher-production-backups \
  --region us-east-1

# Enable versioning for additional protection
aws s3api put-bucket-versioning \
  --bucket rancher-production-backups \
  --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket rancher-production-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket rancher-production-backups \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

## Step 2: Configure Cross-Region Replication

```bash
# Create destination bucket in DR region
aws s3 mb s3://rancher-dr-backups-west \
  --region us-west-2

# Enable versioning on destination bucket (required for replication)
aws s3api put-bucket-versioning \
  --bucket rancher-dr-backups-west \
  --region us-west-2 \
  --versioning-configuration Status=Enabled

# Create IAM role for replication
cat > /tmp/replication-role.json << 'ROLEEOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "s3.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
ROLEEOF

aws iam create-role \
  --role-name RancherS3ReplicationRole \
  --assume-role-policy-document file:///tmp/replication-role.json

# Attach the minimum permissions S3 needs to replicate objects
cat > /tmp/replication-policy.json << 'POLICYEOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::rancher-production-backups"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Resource": "arn:aws:s3:::rancher-production-backups/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Resource": "arn:aws:s3:::rancher-dr-backups-west/*"
    }
  ]
}
POLICYEOF

aws iam put-role-policy \
  --role-name RancherS3ReplicationRole \
  --policy-name RancherS3ReplicationPolicy \
  --policy-document file:///tmp/replication-policy.json

# Configure replication rule (the caller needs iam:PassRole on RancherS3ReplicationRole)
cat > /tmp/replication.json << 'REPLEOF'
{
  "Role": "arn:aws:iam::123456789:role/RancherS3ReplicationRole",
  "Rules": [{
    "ID": "rancher-dr-replication",
    "Priority": 1,
    "Status": "Enabled",
    "DeleteMarkerReplication": {
      "Status": "Disabled"
    },
    "Filter": {
      "Prefix": ""
    },
    "Destination": {
      "Bucket": "arn:aws:s3:::rancher-dr-backups-west",
      "StorageClass": "STANDARD_IA"
    }
  }]
}
REPLEOF

aws s3api put-bucket-replication \
  --bucket rancher-production-backups \
  --replication-configuration file:///tmp/replication.json
```

## Step 3: Create IAM Policy for Backup Operator

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::rancher-production-backups"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::rancher-production-backups/*"
    }
  ]
}
```

## Step 4: Install Backup Operator

```bash
# Add Helm repo
helm repo add rancher-charts https://charts.rancher.io
helm repo update

# Select a rancher-backup chart version compatible with your Rancher release
CHART_VERSION=<chart-version>

# Install the CRDs first, then the backup operator
helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  --namespace cattle-resources-system \
  --create-namespace \
  --version $CHART_VERSION

helm install rancher-backup rancher-charts/rancher-backup \
  --namespace cattle-resources-system \
  --version $CHART_VERSION
```

## Step 5: Create S3 Credentials Secret

```bash
# Create AWS credentials secret
kubectl create secret generic rancher-backup-s3-creds \
  --namespace cattle-resources-system \
  --from-literal=accessKey="YOUR_AWS_ACCESS_KEY_ID" \
  --from-literal=secretKey="YOUR_AWS_SECRET_ACCESS_KEY"
```

## Step 6: Configure Backup Resource

```yaml
# rancher-s3-backup.yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-s3-backup
spec:
  # Storage location configuration
  storageLocation:
    s3:
      bucketName: rancher-production-backups
      folder: rancher              # Subfolder within bucket
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com   # Use a custom endpoint for MinIO/Ceph
      endpointCA: ""                         # Base64-encoded CA cert for custom endpoints
      insecureTLSSkipVerify: false # Never skip in production
      credentialSecretName: rancher-backup-s3-creds
      credentialSecretNamespace: cattle-resources-system

  # Use the full Rancher resource set for DR backups
  resourceSetName: rancher-resource-set-full
  
  # Backup schedule (cron format)
  schedule: "0 */2 * * *"          # Every 2 hours
  
  # Retention
  retentionCount: 12               # Keep 12 backups (24 hours)
  
  # Encryption
  encryptionConfigSecretName: backup-encryption-key
```

## Step 7: Configure Encryption

```bash
# Generate an encryption key for the Kubernetes EncryptionConfiguration
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Create the EncryptionConfiguration file Rancher expects
cat > encryption-provider-config.yaml << EOF
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: ${ENCRYPTION_KEY}
      - identity: {}
EOF

# Create encryption config secret
kubectl create secret generic backup-encryption-key \
  --namespace cattle-resources-system \
  --from-file=./encryption-provider-config.yaml

# Save the file contents securely (critical for restore!)
echo "Store encryption-provider-config.yaml in a secure location immediately!"
```

## Step 8: Configure S3 Lifecycle Policy

```bash
# Set lifecycle rules to manage old backups
aws s3api put-bucket-lifecycle-configuration \
  --bucket rancher-production-backups \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "cleanup-old-backups",
      "Status": "Enabled",
      "Filter": {"Prefix": "rancher/"},
      "Expiration": {"Days": 30},
      "NoncurrentVersionExpiration": {"NoncurrentDays": 7},
      "Transitions": [{
        "Days": 7,
        "StorageClass": "STANDARD_IA"
      }]
    }]
  }'
```

## Using MinIO as S3-Compatible Backend

For on-premises deployments:

```yaml
# minio-backup.yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-minio-backup
spec:
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: prod
      endpoint: minio.internal:9000
      endpointCA: <base64-encoded-cert>  # Base64-encoded CA cert for self-signed TLS
      insecureTLSSkipVerify: false
      credentialSecretName: minio-credentials
      credentialSecretNamespace: cattle-resources-system
  resourceSetName: rancher-resource-set-full
  schedule: "0 * * * *"
  retentionCount: 24
```

## Monitoring Backup Health

```bash
# Check backup status
kubectl get backups

# View backup details
kubectl describe backup rancher-s3-backup

# Check backup operator logs
kubectl logs -n cattle-resources-system \
  -l app.kubernetes.io/name=rancher-backup \
  --tail=50
```

## Conclusion

S3-backed Rancher backups provide enterprise-grade durability and the foundation for reliable DR. With cross-region replication, encryption, and lifecycle policies, your backups are protected against data loss while remaining cost-effective. Combine these backup configurations with tested restore procedures for a complete DR solution.
