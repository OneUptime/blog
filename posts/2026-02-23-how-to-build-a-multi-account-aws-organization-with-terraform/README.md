# How to Build a Multi-Account AWS Organization with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, AWS, Multi-Account, AWS Organizations, Cloud Governance

Description: A step-by-step guide to building a multi-account AWS Organization with Terraform including OUs, SCPs, centralized logging, and cross-account access.

---

Running everything in a single AWS account works fine when you are small. But as your organization grows, you end up with a tangled mess of resources where dev, staging, and production live side by side. IAM policies become increasingly complex. A misconfigured security group in dev could accidentally expose production data. The solution is a multi-account strategy with AWS Organizations, and Terraform is the perfect tool to set it up consistently.

## Why Multi-Account?

The benefits are straightforward. Security isolation means a compromised dev account cannot touch production. Billing clarity means each team or project gets its own cost reporting. Service limits are per-account, so one team's experiment cannot exhaust quotas for everyone else. And compliance becomes simpler because you can enforce different policies at different levels.

## Architecture Overview

We will build:

- An AWS Organization with organizational units (OUs)
- Service Control Policies (SCPs) for guardrails
- Centralized logging in a dedicated account
- Cross-account IAM roles for access
- Account factory for creating new accounts
- Shared networking with AWS Transit Gateway

## Setting Up the Organization

Start with the organization and OU structure.

```hcl
# Create the AWS Organization
resource "aws_organizations_organization" "main" {
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "sso.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
  ]

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "TAG_POLICY",
  ]

  feature_set = "ALL"
}

# Organizational Units
resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads_prod" {
  name      = "Production"
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_organizational_unit" "workloads_nonprod" {
  name      = "NonProduction"
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = aws_organizations_organization.main.roots[0].id
}
```

## Creating Accounts

Each purpose gets its own account.

```hcl
# Security account - for centralized security tooling
resource "aws_organizations_account" "security" {
  name      = "security-tooling"
  email     = "aws-security@company.com"
  parent_id = aws_organizations_organizational_unit.security.id
  role_name = "OrganizationAccountAccessRole"

  lifecycle {
    ignore_changes = [role_name]
  }

  tags = {
    Purpose = "security-tooling"
  }
}

# Log archive account - for centralized logging
resource "aws_organizations_account" "log_archive" {
  name      = "log-archive"
  email     = "aws-logs@company.com"
  parent_id = aws_organizations_organizational_unit.security.id
  role_name = "OrganizationAccountAccessRole"

  tags = {
    Purpose = "log-archive"
  }
}

# Shared services account - for shared infrastructure
resource "aws_organizations_account" "shared_services" {
  name      = "shared-services"
  email     = "aws-shared@company.com"
  parent_id = aws_organizations_organizational_unit.infrastructure.id
  role_name = "OrganizationAccountAccessRole"

  tags = {
    Purpose = "shared-services"
  }
}

# Network account - for centralized networking
resource "aws_organizations_account" "network" {
  name      = "networking"
  email     = "aws-network@company.com"
  parent_id = aws_organizations_organizational_unit.infrastructure.id
  role_name = "OrganizationAccountAccessRole"

  tags = {
    Purpose = "networking"
  }
}

# Production workload accounts
resource "aws_organizations_account" "prod" {
  for_each = {
    "app-prod"     = "aws-app-prod@company.com"
    "data-prod"    = "aws-data-prod@company.com"
  }

  name      = each.key
  email     = each.value
  parent_id = aws_organizations_organizational_unit.workloads_prod.id
  role_name = "OrganizationAccountAccessRole"

  tags = {
    Purpose     = "workload"
    Environment = "production"
  }
}
```

## Service Control Policies

SCPs are the guardrails that prevent accounts from doing things they should not.

```hcl
# Deny actions outside approved regions
resource "aws_organizations_policy" "region_restriction" {
  name = "restrict-regions"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyOutsideApprovedRegions"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = ["us-east-1", "us-west-2", "eu-west-1"]
          }
          # Allow global services
          ArnNotLike = {
            "aws:PrincipalARN" = "arn:aws:iam::*:role/OrganizationAccountAccessRole"
          }
        }
      }
    ]
  })
}

resource "aws_organizations_policy_attachment" "region_restriction" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = aws_organizations_organizational_unit.workloads.id
}

# Deny leaving the organization
resource "aws_organizations_policy" "deny_leave_org" {
  name = "deny-leave-organization"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyLeaveOrganization"
        Effect   = "Deny"
        Action   = "organizations:LeaveOrganization"
        Resource = "*"
      }
    ]
  })
}

resource "aws_organizations_policy_attachment" "deny_leave" {
  policy_id = aws_organizations_policy.deny_leave_org.id
  target_id = aws_organizations_organization.main.roots[0].id
}

# Production-specific guardrails
resource "aws_organizations_policy" "prod_guardrails" {
  name = "production-guardrails"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyDeleteCloudTrail"
        Effect = "Deny"
        Action = [
          "cloudtrail:DeleteTrail",
          "cloudtrail:StopLogging",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyDeleteVPCFlowLogs"
        Effect = "Deny"
        Action = [
          "ec2:DeleteFlowLogs",
          "logs:DeleteLogGroup",
        ]
        Resource = "*"
      },
      {
        Sid    = "RequireIMDSv2"
        Effect = "Deny"
        Action = "ec2:RunInstances"
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringNotEquals = {
            "ec2:MetadataHttpTokens" = "required"
          }
        }
      }
    ]
  })
}

resource "aws_organizations_policy_attachment" "prod_guardrails" {
  policy_id = aws_organizations_policy.prod_guardrails.id
  target_id = aws_organizations_organizational_unit.workloads_prod.id
}
```

## Centralized Logging

All accounts should send their logs to the log archive account.

```hcl
# Organization-wide CloudTrail
resource "aws_cloudtrail" "organization" {
  name                       = "organization-trail"
  s3_bucket_name             = "log-archive-cloudtrail-${aws_organizations_account.log_archive.id}"
  is_organization_trail      = true
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.org_logging.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  tags = {
    Purpose = "organization-audit"
  }
}

# Organization-wide AWS Config aggregator
resource "aws_config_configuration_aggregator" "organization" {
  name = "organization-aggregator"

  organization_aggregation_source {
    all_regions = true
    role_arn    = aws_iam_role.config_aggregator.arn
  }
}
```

## Cross-Account Access Roles

Set up roles that allow controlled access between accounts.

```hcl
# In each workload account, create a role that admins can assume
# This would be applied via a Terraform module in each account
resource "aws_iam_role" "cross_account_admin" {
  name = "CrossAccountAdmin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.management_account_id}:root"
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

# Read-only role for security team
resource "aws_iam_role" "security_audit" {
  name = "SecurityAuditRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${aws_organizations_account.security.id}:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "security_audit" {
  role       = aws_iam_role.security_audit.name
  policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}
```

## Account Factory Module

Create a reusable module for provisioning new accounts with all the baseline configuration.

```hcl
# modules/account-factory/main.tf
variable "account_name" {}
variable "account_email" {}
variable "parent_ou_id" {}
variable "environment" {}

resource "aws_organizations_account" "this" {
  name      = var.account_name
  email     = var.account_email
  parent_id = var.parent_ou_id
  role_name = "OrganizationAccountAccessRole"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Output the account ID for use in other configurations
output "account_id" {
  value = aws_organizations_account.this.id
}

# Usage:
# module "new_team_account" {
#   source        = "./modules/account-factory"
#   account_name  = "team-analytics-prod"
#   account_email = "aws-analytics-prod@company.com"
#   parent_ou_id  = aws_organizations_organizational_unit.workloads_prod.id
#   environment   = "production"
# }
```

## Wrapping Up

A well-structured multi-account AWS Organization is the foundation of a secure, scalable cloud environment. SCPs prevent mistakes before they happen. Centralized logging gives you visibility across all accounts. Cross-account roles provide controlled access without sharing credentials.

The beauty of doing this in Terraform is that the entire structure is documented in code. New accounts get all baseline configurations automatically. Policy changes are reviewed in pull requests. And when someone asks "how is our AWS environment structured?" you point them to the Terraform repo.

For monitoring resources across all your AWS accounts from a single pane of glass, take a look at [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-multi-account-aws-organization-with-terraform/view) for cross-account observability.
