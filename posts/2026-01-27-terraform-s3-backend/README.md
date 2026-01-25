# How to Configure S3 Backend for Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, S3, State Management, Infrastructure as Code, DevOps

Description: A complete guide to setting up an S3 backend for Terraform state management, including bucket creation, encryption, versioning, DynamoDB locking, and cross-account access.

---

The S3 backend is the standard for teams using AWS with Terraform. It stores state remotely, enables collaboration, and integrates with DynamoDB for locking. This guide walks through a production-ready setup.

## Why S3 Backend?

| Feature | Local State | S3 Backend |
|---------|-------------|------------|
| Team collaboration | No | Yes |
| State locking | No | Yes (with DynamoDB) |
| Encryption at rest | Manual | Built-in |
| Versioning | No | Yes |
| Backup/recovery | Manual | Automatic |
| Access control | Filesystem | IAM |

## Creating the Backend Infrastructure

Before using the S3 backend, create the S3 bucket and DynamoDB table. Use a separate Terraform configuration or create manually.

### Option 1: Terraform Bootstrap

```hcl
# bootstrap/main.tf

terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "bucket_name" {
  description = "Name for the Terraform state bucket"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name for the lock table"
  type        = string
  default     = "terraform-state-locks"
}

# S3 Bucket for state storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.bucket_name

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Terraform State"
    Environment = "management"
    ManagedBy   = "terraform-bootstrap"
  }
}

# Enable versioning for state history
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
    bucket_key_enabled = true
  }
}

# KMS key for encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "terraform-state-key"
  }
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy to enforce encryption
resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.terraform_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "Terraform State Locks"
  }
}

# Outputs for reference
output "bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "bucket_arn" {
  value = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}

output "kms_key_arn" {
  value = aws_kms_key.terraform_state.arn
}
```

Apply the bootstrap:

```bash
cd bootstrap
terraform init
terraform apply -var="bucket_name=mycompany-terraform-state"
```

### Option 2: AWS CLI

```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket mycompany-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket mycompany-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket mycompany-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket mycompany-terraform-state \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# Create DynamoDB table
aws dynamodb create-table \
  --table-name terraform-state-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Configuring the Backend

### Basic Configuration

```hcl
# backend.tf

terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "project/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

### With KMS Encryption

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "project/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/terraform-state"
    dynamodb_table = "terraform-state-locks"
  }
}
```

### With IAM Role

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "project/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    # Assume a specific role for state access
    role_arn = "arn:aws:iam::123456789012:role/TerraformStateAccess"
  }
}
```

## State Organization

Organize state files by environment and component:

```
s3://mycompany-terraform-state/
├── network/
│   └── terraform.tfstate
├── dev/
│   ├── app/terraform.tfstate
│   └── database/terraform.tfstate
├── staging/
│   ├── app/terraform.tfstate
│   └── database/terraform.tfstate
└── prod/
    ├── app/terraform.tfstate
    └── database/terraform.tfstate
```

### Environment-Specific Backends

```hcl
# environments/dev/backend.tf
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "dev/app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}

# environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "prod/app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

## Partial Configuration

Use partial configuration for flexibility:

```hcl
# backend.tf
terraform {
  backend "s3" {
    # Static values
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
    # bucket and key provided at init time
  }
}
```

```bash
# Initialize with environment-specific values
terraform init \
  -backend-config="bucket=mycompany-terraform-state" \
  -backend-config="key=dev/app/terraform.tfstate"
```

### Backend Config Files

```hcl
# config/dev.s3.tfbackend
bucket         = "mycompany-terraform-state"
key            = "dev/app/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-state-locks"
```

```bash
terraform init -backend-config=config/dev.s3.tfbackend
```

## IAM Policies

### Terraform Execution Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3StateAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::mycompany-terraform-state/*"
    },
    {
      "Sid": "S3StateBucketList",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::mycompany-terraform-state"
    },
    {
      "Sid": "DynamoDBLocking",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/terraform-state-locks"
    },
    {
      "Sid": "KMSDecrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:*:key/*",
      "Condition": {
        "ForAnyValue:StringEquals": {
          "kms:ResourceAliases": "alias/terraform-state"
        }
      }
    }
  ]
}
```

### Read-Only Policy

For users who should only view state:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::mycompany-terraform-state",
        "arn:aws:s3:::mycompany-terraform-state/*"
      ]
    }
  ]
}
```

## Cross-Account Access

For multi-account setups:

```hcl
# In the state bucket account, add bucket policy
resource "aws_s3_bucket_policy" "cross_account" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CrossAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::222222222222:role/TerraformRole",
            "arn:aws:iam::333333333333:role/TerraformRole"
          ]
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
      },
      {
        Sid    = "CrossAccountList"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::222222222222:role/TerraformRole",
            "arn:aws:iam::333333333333:role/TerraformRole"
          ]
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.terraform_state.arn
      }
    ]
  })
}
```

## Migrating to S3 Backend

### From Local State

```bash
# 1. Add backend configuration
# backend.tf
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "project/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}

# 2. Initialize and migrate
terraform init

# Terraform detects existing local state and prompts:
# Do you want to copy existing state to the new backend?
# Enter "yes"

# 3. Verify state migrated
terraform state list

# 4. Remove local state file (now redundant)
rm terraform.tfstate terraform.tfstate.backup
```

### Between S3 Locations

```bash
# Update backend configuration with new key/bucket
# Then reinitialize
terraform init -migrate-state
```

## Disaster Recovery

### Recover from S3 Versioning

```bash
# List versions of state file
aws s3api list-object-versions \
  --bucket mycompany-terraform-state \
  --prefix project/terraform.tfstate

# Download a specific version
aws s3api get-object \
  --bucket mycompany-terraform-state \
  --key project/terraform.tfstate \
  --version-id "abc123" \
  recovered-state.tfstate

# Review the state
terraform show recovered-state.tfstate

# Push recovered state
terraform state push recovered-state.tfstate
```

### Enable S3 Replication

For critical state, replicate to another region:

```hcl
resource "aws_s3_bucket_replication_configuration" "state_replication" {
  bucket = aws_s3_bucket.terraform_state.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-state"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.terraform_state_replica.arn
      storage_class = "STANDARD"
    }
  }
}
```

## Best Practices

1. **Enable versioning** for state recovery
2. **Use KMS encryption** for sensitive state
3. **Enable DynamoDB locking** to prevent concurrent access
4. **Block public access** completely
5. **Use IAM roles** instead of access keys
6. **Organize by environment** with separate state files
7. **Enable CloudTrail** for state access auditing
8. **Replicate critical state** to another region

## Troubleshooting

### Access Denied

```
Error: Failed to load state: AccessDenied
```

Check IAM permissions for S3 and KMS access.

### Lock Table Not Found

```
Error: Error acquiring the state lock: ResourceNotFoundException
```

Verify DynamoDB table exists and table name matches configuration.

### State Locked

```
Error: Error acquiring the state lock
Lock Info:
  ID:        abc-123
```

Another operation is running or crashed. Verify and force-unlock if needed:

```bash
terraform force-unlock abc-123
```

---

A properly configured S3 backend is the foundation of team-based Terraform. Invest time in setting up encryption, locking, and access controls correctly from the start. The security and collaboration benefits are worth the initial setup effort.
