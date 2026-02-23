# How to Configure Terraform Enterprise with External Object Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Object Storage, S3, Azure Blob, GCS, Infrastructure

Description: Learn how to configure Terraform Enterprise with external object storage backends like AWS S3, Azure Blob Storage, and Google Cloud Storage for production-ready deployments.

---

Terraform Enterprise stores a significant amount of data - state files, plan outputs, configuration versions, and policy sets. By default, a mounted disk handles all of this, but production deployments benefit enormously from external object storage. External storage gives you durability, scalability, and the ability to decouple storage from compute.

This guide walks through configuring Terraform Enterprise with AWS S3, Azure Blob Storage, and Google Cloud Storage.

## Why Use External Object Storage?

Before jumping into configuration, it helps to understand what you gain:

- **Durability**: Cloud object storage services offer 99.999999999% (11 nines) durability.
- **Scalability**: No need to worry about disk space on the TFE host.
- **Backup simplicity**: Object storage integrates with native backup and replication features.
- **High availability**: Required for active-active TFE deployments.

If you are running Terraform Enterprise in production, external object storage is not optional - it is a best practice.

## Prerequisites

Before starting, make sure you have:

- A running Terraform Enterprise instance (or you are doing a fresh install)
- Access to create buckets and IAM policies in your cloud provider
- Admin access to the TFE application settings
- The TFE configuration file (typically stored as environment variables or in a Docker Compose file)

## Configuring AWS S3

### Step 1: Create the S3 Bucket

```bash
# Create the S3 bucket for TFE object storage
aws s3api create-bucket \
  --bucket tfe-object-storage-prod \
  --region us-east-1

# Enable versioning for added protection
aws s3api put-bucket-versioning \
  --bucket tfe-object-storage-prod \
  --versioning-configuration Status=Enabled

# Enable server-side encryption by default
aws s3api put-bucket-encryption \
  --bucket tfe-object-storage-prod \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "alias/tfe-encryption-key"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

### Step 2: Create an IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::tfe-object-storage-prod",
        "arn:aws:s3:::tfe-object-storage-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
      ]
    }
  ]
}
```

### Step 3: Configure TFE Environment Variables

For Docker-based deployments, set these environment variables in your TFE configuration:

```bash
# Object storage type - set to "s3" for AWS
TFE_OBJECT_STORAGE_TYPE=s3

# S3 bucket configuration
TFE_OBJECT_STORAGE_S3_BUCKET=tfe-object-storage-prod
TFE_OBJECT_STORAGE_S3_REGION=us-east-1

# Use KMS encryption
TFE_OBJECT_STORAGE_S3_SERVER_SIDE_ENCRYPTION=aws:kms
TFE_OBJECT_STORAGE_S3_SERVER_SIDE_ENCRYPTION_KMS_KEY_ID=alias/tfe-encryption-key

# Authentication - use IAM role if possible, otherwise provide keys
# TFE_OBJECT_STORAGE_S3_ACCESS_KEY_ID=your-access-key
# TFE_OBJECT_STORAGE_S3_SECRET_ACCESS_KEY=your-secret-key

# If using IAM instance profile or IRSA (recommended)
TFE_OBJECT_STORAGE_S3_USE_INSTANCE_PROFILE=true
```

## Configuring Azure Blob Storage

### Step 1: Create the Storage Account and Container

```bash
# Create a resource group if you do not have one
az group create \
  --name tfe-storage-rg \
  --location eastus

# Create a storage account with encryption enabled
az storage account create \
  --name tfestorageaccount \
  --resource-group tfe-storage-rg \
  --location eastus \
  --sku Standard_GRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2

# Create the blob container
az storage container create \
  --name tfe-objects \
  --account-name tfestorageaccount \
  --auth-mode login
```

### Step 2: Configure TFE for Azure Blob

```bash
# Object storage type - set to "azure" for Azure Blob Storage
TFE_OBJECT_STORAGE_TYPE=azure

# Azure storage configuration
TFE_OBJECT_STORAGE_AZURE_ACCOUNT_NAME=tfestorageaccount
TFE_OBJECT_STORAGE_AZURE_CONTAINER=tfe-objects

# Authentication via access key
TFE_OBJECT_STORAGE_AZURE_ACCOUNT_KEY=your-storage-account-key

# Alternatively, use a managed identity (recommended)
# TFE_OBJECT_STORAGE_AZURE_USE_MSI=true
# TFE_OBJECT_STORAGE_AZURE_CLIENT_ID=your-managed-identity-client-id
```

## Configuring Google Cloud Storage

### Step 1: Create the GCS Bucket

```bash
# Create the GCS bucket
gsutil mb -p your-gcp-project \
  -c standard \
  -l us-central1 \
  gs://tfe-object-storage-prod/

# Enable versioning
gsutil versioning set on gs://tfe-object-storage-prod/

# Set a lifecycle policy to clean up old versions after 90 days
cat > lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "numNewerVersions": 3,
        "isLive": false
      }
    }
  ]
}
EOF

gsutil lifecycle set lifecycle.json gs://tfe-object-storage-prod/
```

### Step 2: Create a Service Account

```bash
# Create a service account for TFE
gcloud iam service-accounts create tfe-storage \
  --display-name="Terraform Enterprise Storage"

# Grant storage admin on the bucket
gsutil iam ch \
  serviceAccount:tfe-storage@your-gcp-project.iam.gserviceaccount.com:roles/storage.objectAdmin \
  gs://tfe-object-storage-prod/

# Generate a key file (store it securely)
gcloud iam service-accounts keys create tfe-storage-key.json \
  --iam-account=tfe-storage@your-gcp-project.iam.gserviceaccount.com
```

### Step 3: Configure TFE for GCS

```bash
# Object storage type
TFE_OBJECT_STORAGE_TYPE=google

# GCS configuration
TFE_OBJECT_STORAGE_GOOGLE_BUCKET=tfe-object-storage-prod
TFE_OBJECT_STORAGE_GOOGLE_PROJECT=your-gcp-project

# Authentication via service account key
TFE_OBJECT_STORAGE_GOOGLE_CREDENTIALS='{...contents of tfe-storage-key.json...}'

# Or point to the key file path
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/tfe-storage-key.json
```

## Applying Configuration with Docker Compose

If you run TFE via Docker Compose, your configuration file would look something like this (using S3 as the example):

```yaml
# docker-compose.yml for TFE with S3 object storage
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
    environment:
      TFE_HOSTNAME: tfe.example.com
      TFE_OBJECT_STORAGE_TYPE: s3
      TFE_OBJECT_STORAGE_S3_BUCKET: tfe-object-storage-prod
      TFE_OBJECT_STORAGE_S3_REGION: us-east-1
      TFE_OBJECT_STORAGE_S3_USE_INSTANCE_PROFILE: "true"
      TFE_OBJECT_STORAGE_S3_SERVER_SIDE_ENCRYPTION: "aws:kms"
      TFE_OBJECT_STORAGE_S3_SERVER_SIDE_ENCRYPTION_KMS_KEY_ID: "alias/tfe-encryption-key"
      # ... other TFE environment variables
    ports:
      - "443:443"
    volumes:
      - tfe-data:/var/lib/terraform-enterprise
volumes:
  tfe-data:
```

## Verifying the Configuration

After restarting TFE with the new configuration, verify that object storage is working:

```bash
# Check TFE health endpoint - object storage status is included
curl -s https://tfe.example.com/_health_check | jq .

# Check the TFE logs for storage initialization
docker logs tfe 2>&1 | grep -i "object storage"

# Trigger a test run and confirm state is stored
# Create a simple workspace and run a plan - then check the bucket
aws s3 ls s3://tfe-object-storage-prod/ --recursive | head -20
```

## Common Issues and Fixes

**Permission denied errors**: Double check your IAM policy. TFE needs both object-level and bucket-level permissions. The `s3:ListBucket` permission must be on the bucket ARN (without `/*`), while object operations need the wildcard suffix.

**Timeout connecting to storage**: Verify that your TFE instance has network access to the storage service. If you are using VPC endpoints or private link, make sure DNS resolution works correctly.

**Encryption key errors**: If using KMS or customer-managed keys, the TFE service identity needs `kms:Decrypt` and `kms:GenerateDataKey` permissions on the key.

**Bucket region mismatch**: The TFE configuration region must match the actual bucket region. S3 will return confusing redirect errors if they do not match.

## Monitoring Storage Usage

Once configured, keep an eye on storage growth. You can set up monitoring with tools like [OneUptime](https://oneuptime.com) to track bucket size, request rates, and error rates. Setting up alerts for storage-related errors helps catch issues before they affect your Terraform workflows.

## Summary

External object storage is a foundational piece of a production Terraform Enterprise deployment. Whether you choose S3, Azure Blob, or GCS, the pattern is the same: create a bucket with encryption, set up proper IAM permissions, and point TFE at it using environment variables. Once configured, you get the durability and scalability that production workloads demand.

For related Terraform Enterprise configuration topics, check out [How to Configure Terraform Enterprise with Redis](https://oneuptime.com/blog/post/2026-02-23-configure-terraform-enterprise-redis/view) and [How to Handle Terraform Enterprise Backup and Recovery](https://oneuptime.com/blog/post/2026-02-23-terraform-enterprise-backup-and-recovery/view).
