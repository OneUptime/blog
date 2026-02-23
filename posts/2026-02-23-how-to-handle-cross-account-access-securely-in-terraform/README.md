# How to Handle Cross-Account Access Securely in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, AWS, Multi-Account, IAM

Description: Learn how to set up secure cross-account access patterns in Terraform using IAM role assumption, external IDs, and organizational policies.

---

Most AWS organizations outgrow a single account quickly. You end up with separate accounts for production, staging, development, security, logging, and shared services. Terraform needs to manage resources across these accounts, and doing this securely is critical. A poorly configured cross-account setup can give an attacker who compromises one account access to everything else.

This guide covers practical patterns for managing cross-account access with Terraform while maintaining strong security boundaries.

## The Cross-Account Model

The standard pattern is to run Terraform from a central management or CI/CD account and use IAM role assumption to reach target accounts. Terraform assumes a role in each target account, performs its work, and the temporary credentials expire.

```
CI/CD Account (111111111111)
    |
    |- Assumes role -> Production Account (222222222222)
    |- Assumes role -> Staging Account (333333333333)
    |- Assumes role -> Development Account (444444444444)
```

## Setting Up Cross-Account Roles

In each target account, create a role that the CI/CD account can assume:

```hcl
# This runs in the target account (e.g., production)
resource "aws_iam_role" "terraform_access" {
  name = "TerraformAccess"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::111111111111:role/TerraformCI"  # CI/CD account role
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.external_id  # Required for third-party access
          }
        }
      }
    ]
  })

  max_session_duration = 3600  # 1 hour max session

  tags = {
    Name    = "TerraformAccess"
    Purpose = "cross-account-terraform"
  }
}

# Attach permissions appropriate for what Terraform manages in this account
resource "aws_iam_role_policy_attachment" "terraform_admin" {
  role       = aws_iam_role.terraform_access.name
  policy_arn = aws_iam_policy.terraform_permissions.arn
}

# Scoped permissions - not full admin
resource "aws_iam_policy" "terraform_permissions" {
  name        = "TerraformPermissions"
  description = "Permissions for Terraform in this account"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ManageEC2"
        Effect = "Allow"
        Action = [
          "ec2:*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      },
      {
        Sid    = "ManageRDS"
        Effect = "Allow"
        Action = [
          "rds:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "ManageS3"
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyDangerousActions"
        Effect = "Deny"
        Action = [
          "organizations:*",
          "account:*",
          "iam:CreateUser",
          "iam:CreateAccessKey"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Using assume_role in Terraform Providers

Configure Terraform to assume roles in different accounts:

```hcl
# Default provider for the CI/CD account
provider "aws" {
  region = "us-east-1"
}

# Production account provider
provider "aws" {
  alias  = "production"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::222222222222:role/TerraformAccess"
    session_name = "terraform-production"
    external_id  = var.production_external_id
  }
}

# Staging account provider
provider "aws" {
  alias  = "staging"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::333333333333:role/TerraformAccess"
    session_name = "terraform-staging"
    external_id  = var.staging_external_id
  }
}

# Use the aliased providers for resources in those accounts
resource "aws_instance" "production_web" {
  provider = aws.production

  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name = "production-web"
  }
}

resource "aws_instance" "staging_web" {
  provider = aws.staging

  ami           = var.ami_id
  instance_type = "t3.small"

  tags = {
    Name = "staging-web"
  }
}
```

## External ID for Confused Deputy Prevention

The external ID prevents the confused deputy problem, where a third party could trick your account into assuming a role it should not:

```hcl
variable "production_external_id" {
  type        = string
  description = "External ID for production account role assumption"
  sensitive   = true
}

# The trust policy on the target account requires the external ID
# See the assume_role_policy in the role creation above
```

Generate unique external IDs per trust relationship and store them securely:

```bash
# Generate a unique external ID
python3 -c "import uuid; print(uuid.uuid4())"
# Store in your secrets manager, not in code
```

## Scope Permissions Per Account

Not every account needs the same Terraform permissions. Production should be more restricted:

```hcl
# Production - read-heavy, limited write
resource "aws_iam_policy" "terraform_production" {
  name = "TerraformProductionPermissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadAccess"
        Effect   = "Allow"
        Action   = [
          "ec2:Describe*",
          "rds:Describe*",
          "s3:Get*",
          "s3:List*"
        ]
        Resource = "*"
      },
      {
        Sid      = "ManagedWriteAccess"
        Effect   = "Allow"
        Action   = [
          "ec2:*",
          "rds:*",
          "s3:*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/ManagedBy" = "terraform"
          }
        }
      }
    ]
  })
}

# Development - broader permissions for experimentation
resource "aws_iam_policy" "terraform_development" {
  name = "TerraformDevelopmentPermissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "BroadAccess"
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      },
      {
        Sid    = "DenyDangerous"
        Effect = "Deny"
        Action = [
          "organizations:*",
          "iam:CreateUser",
          "iam:CreateAccessKey"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Centralized State with Cross-Account Access

Keep all state files in one account but scope access:

```hcl
# State bucket in the management account
terraform {
  backend "s3" {
    bucket         = "my-org-terraform-state"  # In management account
    key            = "production/network/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/terraform-state"
    dynamodb_table = "terraform-locks"
    # Role to assume for state access (separate from the resource access role)
    role_arn       = "arn:aws:iam::111111111111:role/TerraformStateAccess"
  }
}
```

## AWS Organizations Integration

Use AWS Organizations SCPs to set boundaries that Terraform cannot override:

```hcl
# Prevent any account from disabling CloudTrail
resource "aws_organizations_policy" "protect_security_controls" {
  name = "protect-security-controls"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PreventCloudTrailDisable"
        Effect = "Deny"
        Action = [
          "cloudtrail:DeleteTrail",
          "cloudtrail:StopLogging",
          "cloudtrail:UpdateTrail"
        ]
        Resource = "*"
        Condition = {
          ArnNotLike = {
            "aws:PrincipalARN" = "arn:aws:iam::*:role/SecurityAdmin"
          }
        }
      },
      {
        Sid    = "PreventGuardDutyDisable"
        Effect = "Deny"
        Action = [
          "guardduty:DeleteDetector",
          "guardduty:DisassociateFromMasterAccount"
        ]
        Resource = "*"
      },
      {
        Sid    = "RestrictRegions"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = ["us-east-1", "us-west-2", "eu-west-1"]
          }
          ArnNotLike = {
            "aws:PrincipalARN" = "arn:aws:iam::*:role/OrganizationAdmin"
          }
        }
      }
    ]
  })
}
```

## CI/CD Pipeline Configuration

```yaml
# GitHub Actions with cross-account role assumption
name: Deploy Production
on:
  push:
    branches: [main]
    paths: ['environments/production/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      # Assume CI/CD account role via OIDC
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111111111111:role/GitHubActions
          aws-region: us-east-1

      # Terraform then assumes the production account role
      # configured in the provider block
      - name: Terraform Apply
        run: |
          cd environments/production
          terraform init
          terraform apply -auto-approve
```

## Audit Cross-Account Activity

Track role assumptions with CloudTrail:

```hcl
# CloudTrail in the management account captures AssumeRole events
resource "aws_cloudtrail" "cross_account_audit" {
  name           = "cross-account-access-audit"
  s3_bucket_name = aws_s3_bucket.audit_logs.id
  enable_logging = true

  is_multi_region_trail         = true
  include_global_service_events = true
}

# Metric filter for cross-account role assumptions
resource "aws_cloudwatch_log_metric_filter" "cross_account_assume" {
  name           = "cross-account-assume-role"
  pattern        = "{ $.eventName = \"AssumeRole\" && $.requestParameters.roleArn = \"*TerraformAccess*\" }"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  metric_transformation {
    name      = "CrossAccountRoleAssumption"
    namespace = "Custom/Security"
    value     = "1"
  }
}
```

## Wrapping Up

Cross-account access in Terraform follows a clear pattern: create scoped IAM roles in target accounts, use provider aliases with `assume_role` in Terraform, protect against confused deputy attacks with external IDs, and audit everything with CloudTrail. The key is to give each account's Terraform role only the permissions it needs and to layer SCPs on top to prevent security controls from being disabled.

For monitoring across all your AWS accounts, [OneUptime](https://oneuptime.com) provides centralized monitoring, alerting, and incident management that works across your multi-account architecture.
