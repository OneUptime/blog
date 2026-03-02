# How to Migrate Terraform State Between Backends

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Backend, Migration, Infrastructure as Code

Description: Learn how to safely migrate Terraform state between different backends such as local, S3, Azure Blob, GCS, and HCP Terraform with zero downtime.

---

Terraform backends determine where state files are stored and how state locking works. As your infrastructure grows, you may need to migrate from a local backend to a remote one, switch between cloud storage backends, or move to HCP Terraform. This guide covers how to migrate state between any combination of backends safely.

## Understanding Terraform Backends

Terraform supports several backend types for storing state:

```hcl
# Local backend (default)
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

# S3 backend (AWS)
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# Azure Blob backend
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}

# GCS backend (Google Cloud)
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"
  }
}
```

## Migrating from Local to S3

The most common migration is from local state to an S3 remote backend:

```hcl
# Step 1: Add the S3 backend configuration
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

```bash
# Step 2: Initialize with the new backend
terraform init

# Terraform detects the backend change and asks to migrate
# Output:
# Initializing the backend...
# Do you want to copy existing state to the new backend?
# Enter a value: yes

# Step 3: Verify the migration
terraform plan
# Should show: No changes.

# Step 4: Verify state exists in S3
aws s3 ls s3://my-terraform-state/prod/
```

## Migrating from S3 to Azure Blob

To switch between cloud provider backends:

```hcl
# Step 1: Update the backend configuration
terraform {
  # Remove the old S3 backend
  # backend "s3" { ... }

  # Add the new Azure backend
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

```bash
# Step 2: Initialize with migration
terraform init -migrate-state

# Terraform will prompt to copy the state
# Enter a value: yes

# Step 3: Verify
terraform plan
```

## Migrating from Remote to Local

Sometimes you need to bring state back to local storage:

```hcl
# Step 1: Change backend to local
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

```bash
# Step 2: Initialize and migrate
terraform init -migrate-state

# Step 3: Verify the local state file exists
ls -la terraform.tfstate
terraform plan
```

## Manual State Migration

If automatic migration fails, you can migrate manually:

```bash
# Step 1: Pull state from the current backend
terraform state pull > state-backup.json

# Step 2: Update the backend configuration in your code
# Edit main.tf to use the new backend

# Step 3: Initialize the new backend (empty)
terraform init -reconfigure

# Step 4: Push the state to the new backend
terraform state push state-backup.json

# Step 5: Verify
terraform plan
```

## Migrating to HCP Terraform (Terraform Cloud)

Migrating to HCP Terraform (formerly Terraform Cloud):

```hcl
# Step 1: Configure the cloud backend
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "my-workspace"
    }
  }
}
```

```bash
# Step 2: Login to HCP Terraform
terraform login

# Step 3: Initialize and migrate
terraform init

# Terraform will prompt to migrate state to HCP Terraform
# Enter a value: yes

# Step 4: Verify in the HCP Terraform UI
# Navigate to your workspace to confirm state was migrated
```

## Handling State Locking During Migration

State locking prevents concurrent modifications. During migration, handle locks carefully:

```bash
# If a lock exists on the source backend, force unlock
terraform force-unlock LOCK_ID

# Then proceed with migration
terraform init -migrate-state
```

For DynamoDB-based locking with S3:

```bash
# Check for existing locks
aws dynamodb scan --table-name terraform-locks

# Remove a stale lock
aws dynamodb delete-item \
  --table-name terraform-locks \
  --key '{"LockID":{"S":"my-terraform-state/prod/terraform.tfstate"}}'
```

## Migrating State for Multiple Workspaces

If you use Terraform workspaces, migrate all of them:

```bash
# List all workspaces
terraform workspace list

# Migrate each workspace
for workspace in $(terraform workspace list | tr -d '* '); do
  echo "Migrating workspace: $workspace"
  terraform workspace select "$workspace"
  terraform init -migrate-state
done
```

## Setting Up the Destination Backend First

Before migration, ensure the destination backend is properly configured:

```hcl
# For S3 backend, create the bucket and DynamoDB table first
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

Apply this with a separate configuration before migrating your main state.

## Verifying the Migration

After migration, perform thorough verification:

```bash
# Verify state is accessible
terraform state list

# Verify plan shows no changes
terraform plan

# Verify state pull works
terraform state pull | jq '.version'

# Verify locking works
terraform plan  # This acquires and releases a lock
```

## Best Practices

Always back up state before migration using `terraform state pull`. Test the migration in a non-production environment first. Ensure the destination backend is fully configured and accessible before starting. Use `terraform init -migrate-state` for automatic migration when possible. Verify with `terraform plan` after every migration. Keep the old state file as a backup until you are confident the migration is complete. Enable versioning on your state bucket to allow recovery from accidental changes.

## Conclusion

Migrating Terraform state between backends is a well-supported operation that Terraform handles through the `terraform init -migrate-state` workflow. Whether you are moving from local to remote, switching cloud providers, or adopting HCP Terraform, the process follows the same pattern: update the backend configuration, initialize with migration, and verify. Always back up your state and verify after migration to ensure a smooth transition.

For related topics, see [How to Migrate Terraform State Between Accounts](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-terraform-state-between-accounts/view) and [How to Migrate from Terraform OSS to HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-terraform-oss-to-hcp-terraform/view).
