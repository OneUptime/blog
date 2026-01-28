# How to Use Velero with Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Backup, AWS S3, Azure Blob, Google Cloud Storage

Description: A practical guide to configuring Velero with major cloud storage providers including AWS S3, Azure Blob Storage, and Google Cloud Storage for Kubernetes backups.

---

Velero relies on object storage to store backup data, and each major cloud provider offers compatible storage services. Configuring Velero correctly with your cloud storage is essential for reliable backup and disaster recovery. This guide covers the setup process for AWS S3, Azure Blob Storage, and Google Cloud Storage, along with best practices for production deployments.

## Understanding Velero's Storage Architecture

Before diving into provider-specific configurations, it helps to understand how Velero interacts with cloud storage.

```mermaid
flowchart TB
    subgraph Kubernetes Cluster
        V[Velero Server]
        BSL[BackupStorageLocation]
        VSL[VolumeSnapshotLocation]
    end

    subgraph Cloud Storage
        S3[AWS S3 Bucket]
        AZ[Azure Blob Container]
        GCS[GCS Bucket]
    end

    subgraph Cloud Snapshots
        EBS[AWS EBS Snapshots]
        AZD[Azure Disk Snapshots]
        PD[GCE Persistent Disk Snapshots]
    end

    V --> BSL
    V --> VSL

    BSL --> S3
    BSL --> AZ
    BSL --> GCS

    VSL --> EBS
    VSL --> AZD
    VSL --> PD
```

## Configuring Velero with AWS S3

AWS S3 is the most commonly used storage backend for Velero. The setup involves creating an S3 bucket, configuring IAM permissions, and installing the Velero AWS plugin.

### Creating the S3 Bucket and IAM Policy

First, create an S3 bucket and the necessary IAM resources:

```bash
# Set your configuration variables
BUCKET_NAME=velero-backups-prod
REGION=us-east-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create the S3 bucket for backup storage
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION

# Enable versioning for backup protection
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Enable server-side encryption by default
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms"
            },
            "BucketKeyEnabled": true
        }]
    }'
```

Create the IAM policy for Velero:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VeleroS3Access",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::velero-backups-prod",
                "arn:aws:s3:::velero-backups-prod/*"
            ]
        },
        {
            "Sid": "VeleroEC2Access",
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
        }
    ]
}
```

Apply the IAM policy and create credentials:

```bash
# Create the IAM policy
aws iam create-policy \
    --policy-name VeleroAccessPolicy \
    --policy-document file://velero-policy.json

# Create an IAM user for Velero
aws iam create-user --user-name velero

# Attach the policy to the user
aws iam attach-user-policy \
    --user-name velero \
    --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/VeleroAccessPolicy

# Create access keys for the user
aws iam create-access-key --user-name velero > velero-credentials.json

# Create credentials file for Velero installation
cat > credentials-velero <<EOF
[default]
aws_access_key_id=$(jq -r '.AccessKey.AccessKeyId' velero-credentials.json)
aws_secret_access_key=$(jq -r '.AccessKey.SecretAccessKey' velero-credentials.json)
EOF
```

### Installing Velero with AWS Plugin

Install Velero using the CLI:

```bash
# Install Velero with AWS plugin
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket $BUCKET_NAME \
    --backup-location-config region=$REGION \
    --snapshot-location-config region=$REGION \
    --secret-file ./credentials-velero \
    --use-volume-snapshots=true \
    --default-volumes-to-fs-backup=false
```

Or use the Helm chart for more control:

```yaml
# values-aws.yaml - Helm values for AWS configuration
configuration:
  backupStorageLocation:
    - name: default
      provider: aws
      bucket: velero-backups-prod
      config:
        region: us-east-1
        # Enable server-side encryption with KMS
        kmsKeyId: alias/velero-backup-key
        # Use path-style access for compatibility
        s3ForcePathStyle: "false"

  volumeSnapshotLocation:
    - name: default
      provider: aws
      config:
        region: us-east-1

credentials:
  useSecret: true
  secretContents:
    cloud: |
      [default]
      aws_access_key_id=YOUR_ACCESS_KEY
      aws_secret_access_key=YOUR_SECRET_KEY

initContainers:
  - name: velero-plugin-for-aws
    image: velero/velero-plugin-for-aws:v1.8.0
    volumeMounts:
      - name: plugins
        mountPath: /target
```

## Configuring Velero with Azure Blob Storage

Azure Blob Storage provides durable object storage for Velero backups. The setup requires creating a storage account, container, and service principal.

### Creating Azure Storage Resources

```bash
# Set configuration variables
AZURE_BACKUP_RESOURCE_GROUP=velero-backups-rg
AZURE_STORAGE_ACCOUNT_NAME=velerobackupsprod
AZURE_BLOB_CONTAINER=velero
AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)
REGION=eastus

# Create resource group for backup storage
az group create \
    --name $AZURE_BACKUP_RESOURCE_GROUP \
    --location $REGION

# Create storage account with secure settings
az storage account create \
    --name $AZURE_STORAGE_ACCOUNT_NAME \
    --resource-group $AZURE_BACKUP_RESOURCE_GROUP \
    --location $REGION \
    --sku Standard_GRS \
    --encryption-services blob \
    --https-only true \
    --min-tls-version TLS1_2

# Create the blob container for backups
az storage container create \
    --name $AZURE_BLOB_CONTAINER \
    --account-name $AZURE_STORAGE_ACCOUNT_NAME \
    --auth-mode login

# Get the storage account resource ID
AZURE_STORAGE_ACCOUNT_ID=$(az storage account show \
    --name $AZURE_STORAGE_ACCOUNT_NAME \
    --resource-group $AZURE_BACKUP_RESOURCE_GROUP \
    --query id -o tsv)
```

Create a service principal for Velero:

```bash
# Create service principal with custom role
AZURE_CLIENT_SECRET=$(az ad sp create-for-rbac \
    --name "velero-backup-sp" \
    --role "Contributor" \
    --scopes /subscriptions/$AZURE_SUBSCRIPTION_ID \
    --query password -o tsv)

AZURE_CLIENT_ID=$(az ad sp list \
    --display-name "velero-backup-sp" \
    --query '[0].appId' -o tsv)

# Create credentials file for Velero
cat > credentials-velero-azure <<EOF
AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID}
AZURE_TENANT_ID=${AZURE_TENANT_ID}
AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}
AZURE_RESOURCE_GROUP=${AZURE_BACKUP_RESOURCE_GROUP}
AZURE_CLOUD_NAME=AzurePublicCloud
EOF
```

### Installing Velero with Azure Plugin

```bash
# Install Velero with Azure plugin
velero install \
    --provider azure \
    --plugins velero/velero-plugin-for-microsoft-azure:v1.8.0 \
    --bucket $AZURE_BLOB_CONTAINER \
    --backup-location-config \
        resourceGroup=$AZURE_BACKUP_RESOURCE_GROUP,\
        storageAccount=$AZURE_STORAGE_ACCOUNT_NAME,\
        subscriptionId=$AZURE_SUBSCRIPTION_ID \
    --snapshot-location-config \
        apiTimeout=5m,\
        resourceGroup=$AZURE_BACKUP_RESOURCE_GROUP,\
        subscriptionId=$AZURE_SUBSCRIPTION_ID \
    --secret-file ./credentials-velero-azure
```

Helm values for Azure:

```yaml
# values-azure.yaml - Helm values for Azure configuration
configuration:
  backupStorageLocation:
    - name: default
      provider: azure
      bucket: velero
      config:
        resourceGroup: velero-backups-rg
        storageAccount: velerobackupsprod
        subscriptionId: your-subscription-id
        # Use managed identity if available
        useAAD: "true"

  volumeSnapshotLocation:
    - name: default
      provider: azure
      config:
        apiTimeout: 5m
        resourceGroup: velero-backups-rg
        subscriptionId: your-subscription-id

credentials:
  useSecret: true
  secretContents:
    cloud: |
      AZURE_SUBSCRIPTION_ID=your-subscription-id
      AZURE_TENANT_ID=your-tenant-id
      AZURE_CLIENT_ID=your-client-id
      AZURE_CLIENT_SECRET=your-client-secret
      AZURE_RESOURCE_GROUP=velero-backups-rg
      AZURE_CLOUD_NAME=AzurePublicCloud

initContainers:
  - name: velero-plugin-for-azure
    image: velero/velero-plugin-for-microsoft-azure:v1.8.0
    volumeMounts:
      - name: plugins
        mountPath: /target
```

## Configuring Velero with Google Cloud Storage

Google Cloud Storage offers high durability and global availability for Velero backups.

### Creating GCS Bucket and Service Account

```bash
# Set configuration variables
PROJECT_ID=$(gcloud config get-value project)
BUCKET_NAME=velero-backups-${PROJECT_ID}
GSA_NAME=velero-backup-sa
REGION=us-central1

# Create GCS bucket with versioning and lifecycle
gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME

# Enable versioning for backup protection
gsutil versioning set on gs://$BUCKET_NAME

# Set lifecycle policy to manage old backups
cat > lifecycle.json <<EOF
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "age": 90,
        "isLive": false
      }
    }
  ]
}
EOF
gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME

# Create service account for Velero
gcloud iam service-accounts create $GSA_NAME \
    --display-name "Velero Backup Service Account"

# Get the service account email
GSA_EMAIL=${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com
```

Grant necessary permissions:

```bash
# Grant storage permissions to the service account
gsutil iam ch serviceAccount:${GSA_EMAIL}:objectAdmin gs://$BUCKET_NAME

# Grant compute permissions for snapshots
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${GSA_EMAIL}" \
    --role="roles/compute.storageAdmin"

# Create and download service account key
gcloud iam service-accounts keys create credentials-velero-gcp.json \
    --iam-account $GSA_EMAIL
```

### Installing Velero with GCP Plugin

```bash
# Install Velero with GCP plugin
velero install \
    --provider gcp \
    --plugins velero/velero-plugin-for-gcp:v1.8.0 \
    --bucket $BUCKET_NAME \
    --secret-file ./credentials-velero-gcp.json
```

Helm values for GCP:

```yaml
# values-gcp.yaml - Helm values for GCP configuration
configuration:
  backupStorageLocation:
    - name: default
      provider: gcp
      bucket: velero-backups-your-project-id
      config:
        # Optional: specify a key prefix
        prefix: backups

  volumeSnapshotLocation:
    - name: default
      provider: gcp
      config:
        project: your-project-id
        # Snapshot location - use multi-regional for HA
        snapshotLocation: us

credentials:
  useSecret: true
  secretContents:
    cloud: |
      {
        "type": "service_account",
        "project_id": "your-project-id",
        "private_key_id": "key-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
        "client_email": "velero-backup-sa@your-project-id.iam.gserviceaccount.com",
        "client_id": "client-id",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
      }

initContainers:
  - name: velero-plugin-for-gcp
    image: velero/velero-plugin-for-gcp:v1.8.0
    volumeMounts:
      - name: plugins
        mountPath: /target
```

## Multi-Cloud and Hybrid Storage Configuration

For disaster recovery across cloud providers, you can configure multiple backup storage locations.

```mermaid
flowchart LR
    subgraph Primary Cluster
        V[Velero]
    end

    subgraph Primary Storage
        AWS[AWS S3 - Primary]
    end

    subgraph DR Storage
        GCS[GCS - Disaster Recovery]
        AZ[Azure Blob - Archive]
    end

    V -->|Active Backups| AWS
    V -->|DR Replication| GCS
    V -->|Long-term Archive| AZ
```

Configure multiple storage locations:

```yaml
# multi-cloud-backup-locations.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: aws-primary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-primary-backups
  config:
    region: us-east-1
  default: true
---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: gcp-dr
  namespace: velero
spec:
  provider: gcp
  objectStorage:
    bucket: velero-dr-backups
  config:
    serviceAccount: velero@project.iam.gserviceaccount.com
---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: azure-archive
  namespace: velero
spec:
  provider: azure
  objectStorage:
    bucket: velero-archive
  config:
    resourceGroup: velero-backups-rg
    storageAccount: veleroarchive
    storageAccountAccessKeyEnvVar: AZURE_STORAGE_ACCOUNT_ACCESS_KEY
```

Create backups to multiple locations:

```bash
# Create backup to primary storage
velero backup create daily-backup-primary \
    --storage-location aws-primary \
    --include-namespaces production

# Create backup to DR storage for critical workloads
velero backup create daily-backup-dr \
    --storage-location gcp-dr \
    --include-namespaces production \
    --include-cluster-resources=true
```

## Storage Performance and Cost Optimization

Different storage classes offer trade-offs between cost and access speed.

### AWS S3 Storage Classes

```bash
# Configure lifecycle rules for cost optimization
aws s3api put-bucket-lifecycle-configuration \
    --bucket velero-backups-prod \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "TransitionToIA",
                "Status": "Enabled",
                "Filter": {"Prefix": "backups/"},
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "Days": 90,
                        "StorageClass": "GLACIER"
                    }
                ]
            }
        ]
    }'
```

### Azure Blob Storage Tiers

```bash
# Set default access tier for the storage account
az storage account update \
    --name $AZURE_STORAGE_ACCOUNT_NAME \
    --resource-group $AZURE_BACKUP_RESOURCE_GROUP \
    --access-tier Cool

# Configure blob lifecycle management
az storage account management-policy create \
    --account-name $AZURE_STORAGE_ACCOUNT_NAME \
    --resource-group $AZURE_BACKUP_RESOURCE_GROUP \
    --policy '{
        "rules": [{
            "name": "archiveOldBackups",
            "enabled": true,
            "type": "Lifecycle",
            "definition": {
                "filters": {"blobTypes": ["blockBlob"]},
                "actions": {
                    "baseBlob": {
                        "tierToCool": {"daysAfterModificationGreaterThan": 30},
                        "tierToArchive": {"daysAfterModificationGreaterThan": 90}
                    }
                }
            }
        }]
    }'
```

## Verifying Storage Configuration

After setup, verify your storage configuration is working:

```bash
# Check backup storage location status
velero backup-location get

# Verify the storage location is available
velero backup-location get default -o yaml

# Create a test backup
velero backup create test-storage-config \
    --include-namespaces default \
    --ttl 1h

# Watch backup progress
velero backup describe test-storage-config --details

# List objects in your storage to confirm
# AWS
aws s3 ls s3://velero-backups-prod/backups/ --recursive

# Azure
az storage blob list \
    --container-name velero \
    --account-name velerobackupsprod \
    --output table

# GCP
gsutil ls -la gs://velero-backups-project-id/backups/
```

---

Properly configuring cloud storage is the foundation of a reliable Velero backup strategy. Whether you choose AWS S3, Azure Blob Storage, or Google Cloud Storage, the key factors are secure credential management, appropriate storage class selection for cost optimization, and regular validation of your backup storage locations. Consider implementing multi-cloud storage for critical workloads to ensure your disaster recovery capabilities remain available even during cloud provider outages.
