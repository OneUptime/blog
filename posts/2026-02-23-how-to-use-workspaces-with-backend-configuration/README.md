# How to Use Workspaces with Backend Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Backend, State Management, S3, Infrastructure as Code

Description: Learn how different Terraform backends handle workspaces and how to configure them for proper state isolation and management.

---

Terraform backends determine where state files are stored and how state locking works. When you add workspaces into the mix, the backend needs to handle multiple state files - one per workspace. Different backends handle this in different ways, and understanding the behavior of your chosen backend is essential for a reliable workspace setup.

## How Backends Store Workspace State

The most important thing to understand is that your backend configuration does not change when you switch workspaces. Instead, the backend internally manages separate state files for each workspace.

### S3 Backend

The S3 backend is the most popular choice for AWS-based infrastructure. It stores non-default workspace states under an `env:` prefix:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "services/webapp/terraform.tfstate"
    region         = "us-east-1"

    # State locking via DynamoDB
    dynamodb_table = "terraform-state-locks"

    # Encrypt state at rest
    encrypt        = true

    # Optional: use a KMS key for encryption
    kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/abc-123"
  }
}

# With this configuration, state files are stored at:
# Default workspace:  s3://company-terraform-state/services/webapp/terraform.tfstate
# Dev workspace:      s3://company-terraform-state/env:/dev/services/webapp/terraform.tfstate
# Prod workspace:     s3://company-terraform-state/env:/prod/services/webapp/terraform.tfstate
```

You can customize the workspace key prefix using the `workspace_key_prefix` option:

```hcl
terraform {
  backend "s3" {
    bucket               = "company-terraform-state"
    key                  = "services/webapp/terraform.tfstate"
    region               = "us-east-1"
    dynamodb_table       = "terraform-state-locks"
    encrypt              = true

    # Custom prefix instead of "env:"
    workspace_key_prefix = "workspaces"
  }
}

# Now state files are stored at:
# Default workspace:  s3://company-terraform-state/services/webapp/terraform.tfstate
# Dev workspace:      s3://company-terraform-state/workspaces/dev/services/webapp/terraform.tfstate
```

### Azure Backend

The Azure backend stores workspace state using different blob names:

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatecompany"
    container_name       = "tfstate"
    key                  = "webapp.terraform.tfstate"
  }
}

# State files are stored as blobs:
# Default workspace:  webapp.terraform.tfstate
# Dev workspace:      webapp.terraform.tfstateenv:dev
# Prod workspace:     webapp.terraform.tfstateenv:prod
```

### GCS Backend

Google Cloud Storage backend works similarly to S3:

```hcl
terraform {
  backend "gcs" {
    bucket = "company-terraform-state"
    prefix = "services/webapp"
  }
}

# State files:
# Default workspace:  services/webapp/default.tfstate
# Dev workspace:      services/webapp/dev.tfstate
# Prod workspace:     services/webapp/prod.tfstate
```

### Terraform Cloud Backend

Terraform Cloud treats workspaces as first-class citizens with their own settings:

```hcl
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      # Option 1: Single workspace
      name = "webapp-prod"

      # Option 2: Match workspaces by tags
      # tags = ["webapp", "networking"]

      # Option 3: Match workspaces by project
      # project = "webapp"
    }
  }
}
```

## Setting Up the S3 Backend for Workspaces

Let me walk through a complete setup for the S3 backend, which is the most common choice.

First, create the backend infrastructure:

```hcl
# bootstrap/main.tf
# Run this once to create the backend resources

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for state storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = "company-terraform-state"

  tags = {
    Name      = "Terraform State"
    ManagedBy = "terraform-bootstrap"
  }
}

# Enable versioning for state file recovery
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Block public access
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
    Name      = "Terraform State Locks"
    ManagedBy = "terraform-bootstrap"
  }
}
```

## Backend Configuration With Partial Configuration

For teams that deploy across multiple accounts or regions, partial backend configuration keeps things flexible:

```hcl
# backend.tf - minimal configuration
terraform {
  backend "s3" {
    # Only specify what is common across all deployments
    key            = "services/webapp/terraform.tfstate"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }
}
```

Then provide the rest at init time:

```bash
# Initialize for the US region
terraform init \
  -backend-config="bucket=terraform-state-us" \
  -backend-config="region=us-east-1"

# Initialize for the EU region
terraform init \
  -backend-config="bucket=terraform-state-eu" \
  -backend-config="region=eu-west-1"
```

Or use backend config files:

```hcl
# backend-configs/us-east-1.hcl
bucket = "terraform-state-us"
region = "us-east-1"
```

```hcl
# backend-configs/eu-west-1.hcl
bucket = "terraform-state-eu"
region = "eu-west-1"
```

```bash
# Initialize with a specific backend config
terraform init -backend-config="backend-configs/us-east-1.hcl"

# Now create and use workspaces within that backend
terraform workspace new dev
terraform workspace new prod
```

## State Locking Across Workspaces

State locking prevents two people from modifying the same workspace's state simultaneously. Each workspace has independent locks.

```bash
# If someone else is running terraform in the dev workspace,
# you will see this error:
terraform workspace select dev
terraform apply

# Error: Error acquiring the state lock
# Lock Info:
#   ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
#   Path:      company-terraform-state/env:/dev/services/webapp/terraform.tfstate
#   Operation: OperationTypeApply
#   Who:       user@hostname
#   Created:   2026-02-23 10:30:00 UTC

# But you can still work in a different workspace
terraform workspace select staging
terraform apply  # This works fine
```

## Accessing State Across Workspaces

When one project needs data from another project's workspace, use `terraform_remote_state`:

```hcl
# Read the networking project's state for the current workspace
data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "company-terraform-state"
    key    = "infrastructure/network/terraform.tfstate"
    region = "us-east-1"
  }

  # Read from the same workspace name
  workspace = terraform.workspace
}

# Use networking outputs
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_ids[0]

  vpc_security_group_ids = [
    data.terraform_remote_state.network.outputs.app_security_group_id
  ]
}
```

## Migrating Between Backends

If you need to move your workspace state to a different backend:

```bash
# Step 1: Update backend.tf with the new backend configuration
# Step 2: Run terraform init with the -migrate-state flag

terraform init -migrate-state

# Terraform will detect the backend change and ask if you want
# to copy existing state to the new backend.
# It migrates ALL workspaces automatically.
```

## Verifying Backend Configuration

After setting up your backend, verify that workspaces are working correctly:

```bash
#!/bin/bash
# verify-backend.sh
# Verifies that the backend is properly configured for workspaces

echo "Backend Verification"
echo "===================="

# Show current backend info
echo "Current workspace: $(terraform workspace show)"
echo ""

# List all workspaces
echo "Available workspaces:"
terraform workspace list
echo ""

# Check each workspace's state
for ws in $(terraform workspace list | tr -d ' *'); do
  terraform workspace select "$ws" 2>/dev/null
  resource_count=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')
  lineage=$(terraform state pull 2>/dev/null | jq -r '.lineage // "empty"')
  echo "Workspace: $ws | Resources: $resource_count | Lineage: $lineage"
done
```

## Summary

The backend configuration is the foundation of workspace management. Whether you use S3, Azure Blob Storage, GCS, or Terraform Cloud, each backend handles workspace state isolation automatically. The key decisions are choosing the right backend for your infrastructure, setting up proper encryption and locking, and understanding the file layout so you can manage access controls. For more on how workspaces work with different backend types, see our guide on [workspace state isolation](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-state-isolation-in-terraform/view).
