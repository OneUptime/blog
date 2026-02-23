# How to Use Workspaces with S3 Backend Key Prefixes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, S3, AWS, State Management, Backend Configuration

Description: Learn how Terraform workspaces interact with S3 backend key prefixes, how to customize state paths, set up proper IAM policies, and organize multi-project state in a single S3 bucket.

---

The S3 backend is the go-to choice for teams running Terraform on AWS. When you combine it with workspaces, Terraform automatically organizes state files using a prefix convention. Understanding exactly how this prefix system works gives you control over state organization, access policies, and cross-project state references. This post goes deep on the S3-specific workspace behavior.

## The Default Prefix Convention

When you configure an S3 backend and create workspaces, Terraform uses this pattern:

```
Default workspace:
  s3://<bucket>/<key>

Other workspaces:
  s3://<bucket>/env:/<workspace-name>/<key>
```

Here is a concrete example:

```hcl
terraform {
  backend "s3" {
    bucket = "acme-terraform-state"
    key    = "services/api/terraform.tfstate"
    region = "us-east-1"
  }
}
```

The resulting S3 paths for different workspaces:

```
default:  acme-terraform-state/services/api/terraform.tfstate
dev:      acme-terraform-state/env:/dev/services/api/terraform.tfstate
staging:  acme-terraform-state/env:/staging/services/api/terraform.tfstate
prod:     acme-terraform-state/env:/prod/services/api/terraform.tfstate
```

Notice the `env:` prefix. This is hardcoded by Terraform and cannot be changed through configuration. The colon is part of the prefix, which makes it an unusual S3 key path but is perfectly valid.

## Customizing the workspace_key_prefix

Terraform lets you change the prefix from `env:` to something else using the `workspace_key_prefix` parameter:

```hcl
terraform {
  backend "s3" {
    bucket               = "acme-terraform-state"
    key                  = "services/api/terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "workspaces"
  }
}
```

Now the paths look like:

```
default:  acme-terraform-state/services/api/terraform.tfstate
dev:      acme-terraform-state/workspaces/dev/services/api/terraform.tfstate
staging:  acme-terraform-state/workspaces/staging/services/api/terraform.tfstate
prod:     acme-terraform-state/workspaces/prod/services/api/terraform.tfstate
```

A cleaner alternative that avoids the colon:

```hcl
terraform {
  backend "s3" {
    bucket               = "acme-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "services/api"
  }
}
```

This produces:

```
default:  acme-terraform-state/terraform.tfstate
dev:      acme-terraform-state/services/api/dev/terraform.tfstate
staging:  acme-terraform-state/services/api/staging/terraform.tfstate
prod:     acme-terraform-state/services/api/prod/terraform.tfstate
```

## Organizing Multiple Projects in One Bucket

Many teams use a single S3 bucket for all Terraform state. Using `workspace_key_prefix` and unique `key` values keeps everything organized:

```hcl
# Project: networking
# File: infrastructure/networking/backend.tf
terraform {
  backend "s3" {
    bucket               = "acme-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "networking"
    dynamodb_table       = "terraform-locks"
    encrypt              = true
  }
}

# Project: api-service
# File: services/api/backend.tf
terraform {
  backend "s3" {
    bucket               = "acme-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "services/api"
    dynamodb_table       = "terraform-locks"
    encrypt              = true
  }
}

# Project: web-frontend
# File: services/web/backend.tf
terraform {
  backend "s3" {
    bucket               = "acme-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "services/web"
    dynamodb_table       = "terraform-locks"
    encrypt              = true
  }
}
```

The resulting S3 structure:

```
acme-terraform-state/
  terraform.tfstate                              (networking default)
  networking/
    dev/terraform.tfstate                        (networking dev)
    staging/terraform.tfstate                    (networking staging)
    prod/terraform.tfstate                       (networking prod)
  services/
    api/
      dev/terraform.tfstate                      (api dev)
      staging/terraform.tfstate                  (api staging)
      prod/terraform.tfstate                     (api prod)
    web/
      dev/terraform.tfstate                      (web dev)
      prod/terraform.tfstate                     (web prod)
```

## IAM Policies Based on Key Prefixes

The predictable path structure lets you write precise IAM policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::acme-terraform-state",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "services/api/dev/*",
            "services/api/staging/*"
          ]
        }
      }
    },
    {
      "Sid": "AllowDevStagingAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::acme-terraform-state/services/api/dev/*",
        "arn:aws:s3:::acme-terraform-state/services/api/staging/*"
      ]
    },
    {
      "Sid": "DenyProdAccess",
      "Effect": "Deny",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::acme-terraform-state/services/api/prod/*"
    }
  ]
}
```

This policy lets users work with dev and staging workspaces but blocks write access to production state.

## DynamoDB Lock Table with Workspaces

The DynamoDB lock entries use the full S3 path as the lock ID:

```hcl
terraform {
  backend "s3" {
    bucket               = "acme-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    dynamodb_table       = "terraform-locks"
    workspace_key_prefix = "services/api"
  }
}
```

Lock entries in DynamoDB:

```
LockID: acme-terraform-state/services/api/dev/terraform.tfstate
LockID: acme-terraform-state/services/api/staging/terraform.tfstate
LockID: acme-terraform-state/services/api/prod/terraform.tfstate
```

All workspaces can share a single DynamoDB table because the lock IDs are unique per workspace.

## Setting Up the S3 Bucket for Workspaces

Here is a Terraform configuration for creating the state bucket with best practices:

```hcl
# state-bucket/main.tf - Bootstrap configuration for the state bucket

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for state storage
resource "aws_s3_bucket" "state" {
  bucket = "acme-terraform-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Purpose   = "Terraform State"
    ManagedBy = "terraform-bootstrap"
  }
}

# Enable versioning for state history
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypt state at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Purpose   = "Terraform State Locking"
    ManagedBy = "terraform-bootstrap"
  }
}
```

## Cross-Referencing State Between Workspaces

You can read another workspace's state using the `terraform_remote_state` data source:

```hcl
# In the API service project, read the networking state
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket               = "acme-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "networking"
  }

  # Read the same workspace's networking state
  workspace = terraform.workspace
}

# Use outputs from the networking state
resource "aws_instance" "api" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  # Place in the VPC managed by the networking project
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]

  tags = {
    Name = "api-${terraform.workspace}"
  }
}
```

The `workspace` argument in the data source controls which workspace's state to read. Setting it to `terraform.workspace` means the dev workspace of the API service reads the dev workspace of the networking project.

## Listing State Files with AWS CLI

You can inspect workspace state files directly:

```bash
# List all state files in the bucket
aws s3 ls s3://acme-terraform-state/ --recursive | grep terraform.tfstate

# List workspaces for a specific project
aws s3 ls s3://acme-terraform-state/services/api/ --recursive

# Download a specific workspace's state for inspection
aws s3 cp s3://acme-terraform-state/services/api/prod/terraform.tfstate ./prod-state.json
python3 -m json.tool prod-state.json | head -20
```

## Migration: Changing the Key Prefix

If you need to change the `workspace_key_prefix`, you need to migrate state:

```bash
# Step 1: Pull state from all workspaces
for WS in dev staging prod; do
  terraform workspace select "$WS"
  terraform state pull > "backup-${WS}.json"
  echo "Backed up $WS"
done

# Step 2: Update the backend configuration
# Change workspace_key_prefix in your .tf file

# Step 3: Reinitialize with migration
terraform init -migrate-state

# Step 4: Verify each workspace
for WS in dev staging prod; do
  terraform workspace select "$WS"
  RESOURCES=$(terraform state list | wc -l)
  echo "$WS: $RESOURCES resources"
done
```

## Handling the Default Workspace Path

The default workspace does not use the `workspace_key_prefix`. Its state always lives at the `key` path directly. This can be confusing if you expect it to follow the same pattern:

```
workspace_key_prefix = "services/api"
key                  = "terraform.tfstate"

default:  s3://bucket/terraform.tfstate              <- No prefix!
dev:      s3://bucket/services/api/dev/terraform.tfstate
prod:     s3://bucket/services/api/prod/terraform.tfstate
```

To avoid this inconsistency, many teams skip the default workspace entirely and always use named workspaces:

```bash
# Create named workspaces and avoid default
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Never use the default workspace
```

## Troubleshooting

**"AccessDenied" when creating a workspace.** Your IAM role needs `s3:PutObject` permission on the workspace's key path. Check that the prefix matches your IAM policy.

**State file appears in an unexpected location.** Verify `workspace_key_prefix` and `key` in your backend config. The full path is `<prefix>/<workspace>/<key>`.

**Lock conflicts.** Check the DynamoDB table for stale locks. The lock ID is the full S3 path. You can manually delete stale lock entries if Terraform crashed without releasing the lock.

## Conclusion

The S3 backend's workspace key prefix system gives you a clean, predictable structure for organizing state files. Customize the `workspace_key_prefix` to replace the default `env:` convention, use IAM policies to control workspace access, and leverage `terraform_remote_state` to share data between projects and workspaces. The patterns shown here scale from small teams to organizations managing dozens of Terraform projects across multiple environments. For applying these patterns to feature branch workflows, check out our post on [using workspaces to manage feature branches](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspaces-to-manage-feature-branches/view).
