# How to Implement Remote State Management in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, State Management, DevOps, AWS, S3

Description: Learn how to configure remote state storage in Terraform for team collaboration, state locking, and disaster recovery. Covers S3, Azure Blob, GCS, and Terraform Cloud backends.

---

Terraform state is the source of truth for your infrastructure. By default, it lives in a local `terraform.tfstate` file, which works for learning but fails for teams. Remote state solves collaboration, security, and reliability problems.

## Why Remote State Matters

Local state has serious limitations:

- **No collaboration**: Team members overwrite each other's changes
- **No locking**: Concurrent applies corrupt state
- **No backup**: Laptop crashes lose infrastructure mapping
- **No security**: State contains sensitive values in plaintext

Remote state provides:

- **Shared access**: Teams work from the same state
- **Locking**: Prevent concurrent modifications
- **Versioning**: Roll back to previous states
- **Encryption**: Protect sensitive data at rest

## S3 Backend Configuration

AWS S3 is the most common choice for teams on AWS. Here's a production-ready setup:

### Step 1: Create the S3 Bucket and DynamoDB Table

First, create the infrastructure for state storage. This is typically done once, manually or with a separate Terraform configuration:

```hcl
# bootstrap/main.tf
# Run this once to create state storage infrastructure

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for state files
resource "aws_s3_bucket" "terraform_state" {
  bucket = "mycompany-terraform-state"

  # Prevent accidental deletion of state
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name    = "Terraform State Storage"
    Purpose = "terraform-state"
  }
}

# Enable versioning to recover from mistakes
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypt state at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name    = "Terraform Lock Table"
    Purpose = "terraform-locking"
  }
}

output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "lock_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
```

### Step 2: Configure the Backend

In your Terraform configuration, reference the remote backend:

```hcl
# environments/prod/backend.tf

terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "prod/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    # Optional: Use specific KMS key
    # kms_key_id     = "alias/terraform-state"
  }
}
```

### Step 3: Initialize with Remote Backend

```bash
# Initialize and migrate local state to remote
terraform init

# If migrating from local state, Terraform will ask to copy
# Initializing the backend...
# Do you want to copy existing state to the new backend?
# Enter "yes" to migrate.
```

## State File Organization

Organize state files by environment and component:

```
s3://mycompany-terraform-state/
├── dev/
│   ├── networking/terraform.tfstate
│   ├── compute/terraform.tfstate
│   └── database/terraform.tfstate
├── staging/
│   ├── networking/terraform.tfstate
│   ├── compute/terraform.tfstate
│   └── database/terraform.tfstate
└── prod/
    ├── networking/terraform.tfstate
    ├── compute/terraform.tfstate
    └── database/terraform.tfstate
```

This separation provides:
- **Blast radius control**: A bad apply only affects one component
- **Faster operations**: Smaller state files process faster
- **Independent permissions**: Lock production state differently

## Azure Blob Storage Backend

For Azure users, use Azure Blob Storage:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatecompany"
    container_name       = "tfstate"
    key                  = "prod/infrastructure.tfstate"

    # Enable state locking (built-in with Azure)
    use_azuread_auth     = true
  }
}
```

Create the storage account first:

```bash
# Create resource group
az group create --name terraform-state-rg --location eastus

# Create storage account with encryption
az storage account create \
  --name tfstatecompany \
  --resource-group terraform-state-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name tfstatecompany
```

## Google Cloud Storage Backend

For GCP, use Cloud Storage:

```hcl
terraform {
  backend "gcs" {
    bucket = "mycompany-terraform-state"
    prefix = "prod/infrastructure"
  }
}
```

Create the bucket with versioning:

```bash
# Create bucket with versioning enabled
gsutil mb -p my-project -l us-central1 gs://mycompany-terraform-state

# Enable versioning
gsutil versioning set on gs://mycompany-terraform-state
```

## Terraform Cloud Backend

Terraform Cloud offers a managed solution with additional features:

```hcl
terraform {
  cloud {
    organization = "mycompany"

    workspaces {
      name = "prod-infrastructure"
    }
  }
}
```

Or use the legacy `remote` backend:

```hcl
terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "mycompany"

    workspaces {
      name = "prod-infrastructure"
    }
  }
}
```

## Reading Remote State

Access outputs from other state files using `terraform_remote_state`:

```hcl
# Read networking state to get VPC ID
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "mycompany-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the VPC ID from networking state
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  # Reference output from networking state
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]

  vpc_security_group_ids = [
    data.terraform_remote_state.networking.outputs.app_security_group_id
  ]
}
```

## State Management Commands

### View Current State

```bash
# List all resources in state
terraform state list

# Show details of a specific resource
terraform state show aws_instance.web

# Pull remote state to local file for inspection
terraform state pull > state.json
```

### Move Resources Between States

```bash
# Move resource to different state file
terraform state mv -state-out=other.tfstate aws_instance.web aws_instance.web

# Rename a resource in state
terraform state mv aws_instance.old aws_instance.new
```

### Remove Resources from State

```bash
# Remove without destroying (resource still exists in cloud)
terraform state rm aws_instance.web

# Useful when importing to a different state file
```

## Backend Configuration with Variables

Backend configuration cannot use variables directly. Use partial configuration instead:

```hcl
# backend.tf
terraform {
  backend "s3" {
    # Only specify static values here
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

```bash
# Pass dynamic values during init
terraform init \
  -backend-config="bucket=mycompany-terraform-state" \
  -backend-config="key=prod/infrastructure/terraform.tfstate"
```

Or use a backend config file:

```hcl
# config/prod.s3.tfbackend
bucket         = "mycompany-terraform-state"
key            = "prod/infrastructure/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-state-locks"
```

```bash
terraform init -backend-config=config/prod.s3.tfbackend
```

## Disaster Recovery

### Recover from Corrupted State

```bash
# List available versions in S3
aws s3api list-object-versions \
  --bucket mycompany-terraform-state \
  --prefix prod/infrastructure/terraform.tfstate

# Download a previous version
aws s3api get-object \
  --bucket mycompany-terraform-state \
  --key prod/infrastructure/terraform.tfstate \
  --version-id "abc123" \
  recovered-state.json

# Push recovered state
terraform state push recovered-state.json
```

### Force Unlock State

If a lock is stuck (after a crash), force unlock:

```bash
# Get lock ID from error message
terraform force-unlock LOCK_ID
```

Only use this when you're certain no other operation is running.

## Security Best Practices

1. **Enable encryption**: Always encrypt state at rest
2. **Use IAM policies**: Restrict who can read/write state
3. **Enable versioning**: Recover from mistakes
4. **Block public access**: Never expose state publicly
5. **Audit access**: Enable CloudTrail logging for S3

Example IAM policy for Terraform state access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::mycompany-terraform-state/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::mycompany-terraform-state"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/terraform-state-locks"
    }
  ]
}
```

---

Remote state is foundational for production Terraform. Set it up correctly from the start. The combination of S3 (or equivalent) for storage, encryption for security, versioning for recovery, and DynamoDB for locking gives you a solid foundation for team collaboration.
