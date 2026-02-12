# How to Use S3 as a Terraform State Backend

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Terraform, Infrastructure as Code

Description: Learn how to configure Amazon S3 as a Terraform state backend with DynamoDB locking, encryption, and best practices for team collaboration.

---

If you're using Terraform with a team, the default local state file won't cut it. You need a shared, remote backend. S3 is the go-to choice for AWS-based infrastructure because it's durable, versioned, and integrates nicely with DynamoDB for state locking.

Let's set this up properly - including the bootstrap problem of creating the backend infrastructure itself.

## Why S3 for Terraform State?

Terraform state contains everything about your infrastructure: resource IDs, attributes, dependencies, and sometimes sensitive values. Storing it locally means:

- Only one person can run Terraform at a time
- If your laptop dies, you lose your state
- No locking means concurrent runs can corrupt state

S3 solves all of these. Combined with DynamoDB for locking, it gives you a production-grade state management setup.

## The Bootstrap Problem

Here's the chicken-and-egg issue: you need Terraform to create the S3 bucket, but you need the S3 bucket before you can use Terraform with a remote backend. The solution is to create the backend resources first, either manually or with a separate Terraform config that uses local state.

Create the backend resources with a bootstrap configuration.

```hcl
# bootstrap/main.tf - Run this once with local state

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for state storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = "mycompany-terraform-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Terraform State"
    Environment = "shared"
    ManagedBy   = "terraform-bootstrap"
  }
}

# Enable versioning so you can recover from bad applies
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption by default
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
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
    Name        = "Terraform State Locks"
    Environment = "shared"
  }
}

output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "lock_table_name" {
  value = aws_dynamodb_table.terraform_locks.id
}
```

Run this bootstrap once.

```bash
# Initialize and apply the bootstrap configuration
cd bootstrap
terraform init
terraform apply
```

## Configuring the Backend

Now configure your actual Terraform projects to use the S3 backend.

```hcl
# backend.tf - Add this to your Terraform configurations

terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/networking/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
    kms_key_id     = "alias/terraform-state-key"
  }
}
```

The `key` path is important - it's how you organize state files within the bucket. A good convention is `{environment}/{component}/terraform.tfstate`.

After adding the backend config, initialize Terraform.

```bash
# Initialize with the new backend
terraform init

# If migrating from local state, Terraform will ask to copy it
# Type "yes" to migrate existing state to S3
```

## State File Organization

For larger organizations, structure your state keys consistently. Here's a pattern that works well.

```
mycompany-terraform-state/
  production/
    networking/terraform.tfstate
    eks-cluster/terraform.tfstate
    databases/terraform.tfstate
    monitoring/terraform.tfstate
  staging/
    networking/terraform.tfstate
    eks-cluster/terraform.tfstate
  shared/
    iam/terraform.tfstate
    dns/terraform.tfstate
```

Each component gets its own state file. This limits the blast radius - a bad apply to networking won't affect your databases.

## Using Workspaces

Terraform workspaces let you use the same configuration with different state files. They're useful for managing multiple environments from a single config.

```bash
# Create and switch to a new workspace
terraform workspace new staging
terraform workspace new production

# List workspaces
terraform workspace list

# Switch between workspaces
terraform workspace select production
```

When using workspaces with an S3 backend, Terraform stores state files under `env:/{workspace_name}/{key}`.

You can reference the workspace name in your configuration.

```hcl
# Use workspace name to select environment-specific variables
locals {
  env = terraform.workspace

  instance_type = {
    production = "m5.xlarge"
    staging    = "t3.medium"
    dev        = "t3.small"
  }
}

resource "aws_instance" "app" {
  instance_type = local.instance_type[local.env]
  # ...
}
```

## Partial Backend Configuration

Avoid hardcoding backend values. Use partial configuration and pass values at init time.

```hcl
# backend.tf - Partial configuration
terraform {
  backend "s3" {
    # Values provided at init time
  }
}
```

Then pass values via a backend config file or CLI flags.

```bash
# Using a config file
terraform init -backend-config=backend-production.hcl

# Using CLI flags
terraform init \
  -backend-config="bucket=mycompany-terraform-state" \
  -backend-config="key=production/app/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=terraform-state-locks" \
  -backend-config="encrypt=true"
```

The backend config file keeps things clean.

```hcl
# backend-production.hcl
bucket         = "mycompany-terraform-state"
key            = "production/app/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-state-locks"
encrypt        = true
```

## IAM Permissions for the Backend

Users running Terraform need specific permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
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
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::mycompany-terraform-state/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/terraform-state-locks"
    }
  ]
}
```

If you're using KMS encryption, also add `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` permissions for the KMS key.

## Handling Lock Issues

Sometimes Terraform exits ungracefully and leaves a stale lock. You'll see an error like "Error locking state: ConditionalCheckFailedException."

Force unlock the state, but be careful - make sure nobody else is actually running Terraform.

```bash
# Force unlock a stale lock
terraform force-unlock LOCK_ID

# The LOCK_ID is shown in the error message
```

## Recovering from State Issues

Since versioning is enabled on the bucket, you can recover previous state versions if something goes wrong.

```bash
# List state file versions
aws s3api list-object-versions \
  --bucket mycompany-terraform-state \
  --prefix production/app/terraform.tfstate

# Restore a previous version by copying it
aws s3api copy-object \
  --bucket mycompany-terraform-state \
  --key production/app/terraform.tfstate \
  --copy-source "mycompany-terraform-state/production/app/terraform.tfstate?versionId=VERSION_ID"
```

This is why versioning is non-negotiable for state buckets. It's your safety net.

## Best Practices

1. **Always enable versioning** - State corruption happens. Versioning lets you roll back.
2. **Always enable encryption** - State files contain sensitive data like passwords and API keys.
3. **Always use DynamoDB locking** - Without it, concurrent applies will corrupt your state.
4. **Use separate state files per component** - Keep blast radius small.
5. **Never manually edit state files** - Use `terraform state mv` and `terraform import` instead.
6. **Set up monitoring** - Use [OneUptime](https://oneuptime.com) or CloudWatch to alert on failed applies and state lock issues.

For more on securing your S3 buckets, including the state bucket, check out our post on [S3 IAM policies for fine-grained access control](https://oneuptime.com/blog/post/s3-iam-policies-fine-grained-access-control/view).
