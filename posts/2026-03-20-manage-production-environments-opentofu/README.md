# How to Manage Production Environments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Production, Infrastructure as Code, AWS, Change Management, Reliability, DevOps

Description: Learn how to manage production environments with OpenTofu using change control workflows, state protections, and operational practices that minimize risk.

---

Production infrastructure demands higher standards than dev or staging. Every change needs review, rollback must be instant, and partial deployments must be safe. OpenTofu's production practices go beyond just writing good HCL - they're operational disciplines that prevent incidents.

## Production Configuration

```hcl
# environments/production/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }

  backend "s3" {
    bucket         = "my-tofu-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/mrk-xxxxx"
    dynamodb_table = "tofu-state-lock-prod"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"
      ManagedBy   = "opentofu"
      Owner       = "platform-team"
    }
  }
}
```

## Protection Mechanisms

```hcl
# protections.tf
# Prevent accidental deletion of critical production resources
resource "aws_db_instance" "production" {
  identifier = "prod-database"
  # ... other configuration ...

  # These two settings prevent data loss
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "prod-database-final-snapshot"

  lifecycle {
    # Prevent Terraform from destroying this resource
    prevent_destroy = true
  }
}

# S3 bucket with deletion protection
resource "aws_s3_bucket" "production_data" {
  bucket = "company-production-data"

  lifecycle {
    prevent_destroy = true
  }
}

# S3 Object Lock requires versioning to be enabled first
resource "aws_s3_bucket_versioning" "production_data" {
  bucket = aws_s3_bucket.production_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Default object lock retention for new objects - retains object versions for 7 years
resource "aws_s3_bucket_object_lock_configuration" "production" {
  bucket = aws_s3_bucket_versioning.production_data.bucket

  rule {
    default_retention {
      mode  = "COMPLIANCE"
      years = 7
    }
  }
}
```

## Production IAM Constraints

```hcl
# production_iam.tf
# Production apply role - limited to CI/CD system, requires MFA for humans
resource "aws_iam_role" "production_deploy" {
  name = "ProductionDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow OIDC-based CI/CD to assume without MFA
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:sub" = "repo:myorg/infra:ref:refs/heads/main"
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
        }
      },
      {
        # Require MFA for human operators
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      }
    ]
  })
}
```

## Change Control Validation

```hcl
# validations.tf
# Prevent accidental deletion of multiple instances at once
resource "terraform_data" "production_safeguard" {
  lifecycle {
    precondition {
      condition     = var.desired_count >= 2
      error_message = "Production requires at least 2 instances for HA. Set desired_count >= 2."
    }

    precondition {
      condition     = var.multi_az_enabled == true
      error_message = "Production database must have multi-AZ enabled."
    }
  }
}
```

## Production Deployment Checklist

```hcl
# outputs.tf
# Output pre-deployment verification information
output "deployment_summary" {
  description = "Pre-deployment checklist summary"
  value = {
    environment      = "production"
    desired_count    = var.desired_count
    instance_type    = var.instance_type
    db_instance_type = var.db_instance_type
    multi_az         = var.multi_az_enabled
    backup_retention = var.backup_retention_days
    deletion_protection = true
  }
}
```

## Best Practices

- Use `prevent_destroy = true` lifecycle rule on databases, storage, and other critical stateful resources.
- Set `deletion_protection = true` on RDS instances - this is a secondary guard that prevents deletion even if `prevent_destroy` is removed.
- Require MFA for human operators assuming the production deploy role.
- Never run `tofu apply` directly against production from a laptop - always go through CI/CD with proper approvals.
- Set `skip_final_snapshot = false` on all production databases - you want that snapshot if the worst happens.
- Keep production state backend separate from staging/dev - use a dedicated S3 bucket with strict access controls.
