# How to Build a Landing Zone with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Landing Zone, AWS Organizations, Cloud Architecture, Infrastructure Patterns, Security

Description: A detailed guide to building an AWS landing zone with Terraform covering multi-account strategy, guardrails, networking, and centralized logging.

---

When organizations move to the cloud, the first question is not "what should we build?" but "how do we set up the foundation?" A landing zone is that foundation. It is a pre-configured, secure, multi-account environment that gives your teams a consistent and governed place to deploy workloads.

AWS offers Control Tower for this, but many teams prefer building their landing zone with Terraform for more control and flexibility. In this guide, we will build a production-ready landing zone from scratch.

## What Goes Into a Landing Zone?

A landing zone typically includes:

- An AWS Organizations structure with OUs and accounts
- Centralized logging and security
- Networking with shared VPCs and Transit Gateway
- IAM guardrails and SCPs
- A baseline that gets applied to every new account

## AWS Organizations Structure

Start with the organizational units (OUs) that match your team structure:

```hcl
# The organization root
resource "aws_organizations_organization" "main" {
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "sso.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
  ]

  feature_set          = "ALL"
  enabled_policy_types = ["SERVICE_CONTROL_POLICY"]
}

# Organizational units
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

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = aws_organizations_organization.main.roots[0].id
}
```

## Core Accounts

Every landing zone needs a set of core accounts for shared services:

```hcl
# Security/Audit account for centralized security tools
resource "aws_organizations_account" "security" {
  name      = "security-audit"
  email     = "aws-security@${var.domain}"
  parent_id = aws_organizations_organizational_unit.security.id
  role_name = "OrganizationAccountAccessRole"

  lifecycle {
    ignore_changes = [role_name]
  }
}

# Log archive account for centralized logging
resource "aws_organizations_account" "log_archive" {
  name      = "log-archive"
  email     = "aws-logs@${var.domain}"
  parent_id = aws_organizations_organizational_unit.security.id
  role_name = "OrganizationAccountAccessRole"
}

# Shared services / networking account
resource "aws_organizations_account" "shared_services" {
  name      = "shared-services"
  email     = "aws-shared@${var.domain}"
  parent_id = aws_organizations_organizational_unit.infrastructure.id
  role_name = "OrganizationAccountAccessRole"
}
```

## Service Control Policies

SCPs act as guardrails that prevent accounts from doing things they should not:

```hcl
# Prevent anyone from leaving the organization
resource "aws_organizations_policy" "deny_leave_org" {
  name        = "deny-leave-organization"
  description = "Prevent accounts from leaving the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyLeaveOrg"
        Effect    = "Deny"
        Action    = "organizations:LeaveOrganization"
        Resource  = "*"
      }
    ]
  })
}

# Restrict regions to approved list only
resource "aws_organizations_policy" "region_restriction" {
  name        = "restrict-regions"
  description = "Only allow resources in approved regions"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnapprovedRegions"
        Effect    = "Deny"
        NotAction = [
          "iam:*",
          "organizations:*",
          "sts:*",
          "support:*",
          "budgets:*"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = var.approved_regions
          }
        }
      }
    ]
  })
}

# Require encryption on S3 buckets
resource "aws_organizations_policy" "require_s3_encryption" {
  name = "require-s3-encryption"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedS3"
        Effect    = "Deny"
        Action    = "s3:PutObject"
        Resource  = "*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = ["aws:kms", "AES256"]
          }
        }
      }
    ]
  })
}

# Attach policies to OUs
resource "aws_organizations_policy_attachment" "deny_leave" {
  policy_id = aws_organizations_policy.deny_leave_org.id
  target_id = aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_policy_attachment" "region_restrict_workloads" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = aws_organizations_organizational_unit.workloads.id
}
```

## Centralized Logging

All accounts should send their CloudTrail logs to the log archive account:

```hcl
# Organization-wide CloudTrail
resource "aws_cloudtrail" "org_trail" {
  name                       = "${var.project_name}-org-trail"
  s3_bucket_name             = aws_s3_bucket.cloudtrail_logs.id
  is_organization_trail      = true
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.cloudtrail.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::"]
    }
  }
}

# S3 bucket in the log archive account for CloudTrail
resource "aws_s3_bucket" "cloudtrail_logs" {
  provider = aws.log_archive
  bucket   = "${var.project_name}-cloudtrail-logs-${var.org_id}"
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  provider = aws.log_archive
  bucket   = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.cloudtrail_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid       = "AllowCloudTrailCheck"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.cloudtrail_logs.arn
      }
    ]
  })
}
```

## AWS Config for Compliance

Enable AWS Config across all accounts to track resource configurations:

```hcl
# Config recorder in each account (deployed via baseline module)
resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "default"
  s3_bucket_name = var.config_bucket_name # Central bucket in log archive

  snapshot_delivery_properties {
    delivery_frequency = "TwentyFour_Hours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Config rules for compliance checking
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Account Baseline Module

Every new account gets the same baseline applied. Package this as a module:

```hcl
# modules/account_baseline/main.tf
# This gets applied to every new account in the organization

# Password policy
resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = 14
  require_uppercase_characters   = true
  require_lowercase_characters   = true
  require_numbers                = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 24
}

# Enable GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = true
}

# Block public S3 access at the account level
resource "aws_s3_account_public_access_block" "main" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Default EBS encryption
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}
```

## Networking Foundation

The landing zone networking typically follows a [hub-and-spoke pattern](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-hub-and-spoke-network-with-terraform/view) with a Transit Gateway in the shared services account.

## Wrapping Up

A landing zone is the most important infrastructure you will build in the cloud. Get it right, and every team in your organization has a secure, consistent place to deploy their workloads. Get it wrong, and you spend years cleaning up security gaps and configuration drift. Terraform gives you the ability to define this entire foundation as code, version it, review changes through pull requests, and apply it consistently. Start with the organizational structure and SCPs, add centralized logging and compliance, then layer on networking and shared services.
