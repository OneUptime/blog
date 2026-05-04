# How to Configure the OSS Backend (Alibaba Cloud) in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Alibaba Cloud, State Management

Description: Learn how to configure the OpenTofu OSS backend to store state files in Alibaba Cloud Object Storage Service with locking, encryption, and versioning.

## Introduction

The OSS (Object Storage Service) backend stores OpenTofu state in Alibaba Cloud's Object Storage Service. It supports state locking via Table Store (OTS), server-side encryption, and bucket versioning. This guide covers the complete setup for Alibaba Cloud-based infrastructure management.

## Step 1: Create the OSS Bucket

```bash
# Using Alibaba Cloud CLI (aliyun)

aliyun oss mb oss://my-terraform-state --region cn-hangzhou

# Enable versioning
aliyun oss bucket-versioning --method put oss://my-terraform-state enabled
```

## Step 2: Create Table Store for Locking (Optional)

```bash
# Create a Table Store instance for state locking
# Via Alibaba Cloud Console: Table Store → Create Instance

# Create the lock table
aliyun ots CreateTable \
  --instance-name opentofu-state-lock \
  --table-meta '{"TableName":"terraform_state_lock","PrimaryKey":[{"Name":"path","Type":"STRING"}]}' \
  --reserved-throughput '{"CapacityUnit":{"Read":0,"Write":0}}'
```

## Step 3: Configure the OSS Backend

```hcl
# backend.tf
terraform {
  backend "oss" {
    region = "cn-hangzhou"
    bucket = "my-terraform-state"
    prefix = "terraform/state"
    key    = "prod.tfstate"

    # Optional: Table Store for locking
    tablestore_endpoint  = "https://opentofu-state-lock.cn-hangzhou.ots.aliyuncs.com"
    tablestore_table     = "terraform_state_lock"

    # Optional: server-side encryption
    encrypt = true

    # Optional: endpoint
    # endpoint = "oss-cn-hangzhou.aliyuncs.com"
  }
}
```

## Authentication Configuration

### Using Environment Variables

```bash
# Set Alibaba Cloud credentials
export ALICLOUD_ACCESS_KEY="LTAI..."
export ALICLOUD_SECRET_KEY="your-secret-key"
export ALICLOUD_REGION="cn-hangzhou"
```

### Using RAM Role (Recommended for ECS)

When running on an ECS instance with a RAM role:

```bash
# No static credentials needed
export ALICLOUD_REGION="cn-hangzhou"
# OpenTofu uses the instance's RAM role automatically
```

### Credential Configuration in Backend

```hcl
terraform {
  backend "oss" {
    region     = "cn-hangzhou"
    bucket     = "my-terraform-state"
    prefix     = "terraform/state"
    key        = "prod.tfstate"
    access_key = var.alicloud_access_key   # Use variables, not literals
    secret_key = var.alicloud_secret_key
  }
}
```

## RAM Policy for OpenTofu

Create a RAM policy with minimal OSS permissions:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:PutObject",
        "oss:DeleteObject",
        "oss:ListObjects",
        "oss:GetBucketInfo"
      ],
      "Resource": [
        "acs:oss:*:*:my-terraform-state",
        "acs:oss:*:*:my-terraform-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ots:GetRow",
        "ots:PutRow",
        "ots:DeleteRow"
      ],
      "Resource": "acs:ots:cn-hangzhou:*:instance/opentofu-state-lock/table/terraform_state_lock"
    }
  ]
}
```

## Server-Side Encryption

```hcl
terraform {
  backend "oss" {
    region  = "cn-hangzhou"
    bucket  = "my-terraform-state"
    prefix  = "terraform/state"
    key     = "prod.tfstate"
    encrypt = true  # AES-256 server-side encryption
  }
}
```

The OSS backend's `encrypt` argument enables server-side encryption with OSS-managed keys (SSE-OSS). The backend itself does not expose a KMS key argument; if you need SSE-KMS for state objects, configure default bucket-level encryption on the OSS bucket using the OSS console or `aliyun oss bucket-encryption` so that all written objects (including state) are encrypted with your KMS CMK.

## Organizing Multiple State Files

```hcl
# Networking state
terraform {
  backend "oss" {
    bucket = "my-terraform-state"
    prefix = "terraform/state/networking"
    key    = "prod.tfstate"
  }
}

# Application state
terraform {
  backend "oss" {
    bucket = "my-terraform-state"
    prefix = "terraform/state/application"
    key    = "prod.tfstate"
  }
}
```

## Initialize and Verify

```bash
# Set environment variables
export ALICLOUD_ACCESS_KEY="LTAI..."
export ALICLOUD_SECRET_KEY="your-secret-key"
export ALICLOUD_REGION="cn-hangzhou"

# Initialize
tofu init

# Verify
tofu state list
```

## Conclusion

The OSS backend provides a native Alibaba Cloud state storage solution that pairs naturally with the Alibaba Cloud provider. Use Table Store for reliable state locking, enable versioning for state history, and apply server-side encryption for data protection. Follow RAM policies with least-privilege access, and prefer RAM roles over static credentials when running on ECS.
