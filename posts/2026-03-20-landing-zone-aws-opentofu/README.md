# How to Build a Landing Zone with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Landing Zone, Architecture, OpenTofu, Organization, Control Tower, Security

Description: Learn how to build an AWS Landing Zone using OpenTofu with AWS Organizations, Service Control Policies, centralized logging, and security baselines for enterprise-grade multi-account governance.

## Overview

An AWS Landing Zone provides a pre-configured, secure multi-account environment. OpenTofu provisions the organizational structure, foundational accounts, Service Control Policies, and centralized logging without AWS Control Tower, giving full IaC control.

## Step 1: AWS Organizations Structure

```hcl
# main.tf - AWS Organizations setup

resource "aws_organizations_organization" "org" {
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "sso.amazonaws.com",
    "securityhub.amazonaws.com",
    "guardduty.amazonaws.com",
  ]

  feature_set = "ALL"

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "TAG_POLICY",
  ]
}

# Organizational Unit hierarchy
resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = aws_organizations_organization.org.roots[0].id
}
```

## Step 2: Service Control Policies

```hcl
# Deny member account root user usage
resource "aws_organizations_policy" "deny_root" {
  name    = "DenyRootAccountUsage"
  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyRootAccountUsage"
      Effect   = "Deny"
      Action   = ["*"]
      Resource = ["*"]
      Condition = {
        StringLike = {
          "aws:PrincipalArn" = ["arn:aws:iam::*:root"]
        }
      }
    }]
  })
}

# Restrict to approved AWS regions
resource "aws_organizations_policy" "restrict_regions" {
  name    = "RestrictRegions"
  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyNonApprovedRegions"
      Effect   = "Deny"
      NotAction = [
        "cloudfront:*", "iam:*", "route53:*", "support:*",
        "sts:*", "organizations:*"
      ]
      Resource = ["*"]
      Condition = {
        StringNotEquals = {
          "aws:RequestedRegion" = ["us-east-1", "us-west-2", "eu-west-1"]
        }
      }
    }]
  })
}

# Attach policies to the organization root
resource "aws_organizations_policy_attachment" "deny_root_to_root" {
  policy_id = aws_organizations_policy.deny_root.id
  target_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_policy_attachment" "restrict_regions_to_root" {
  policy_id = aws_organizations_policy.restrict_regions.id
  target_id = aws_organizations_organization.org.roots[0].id
}
```

## Step 3: Centralized Logging and Log Archive Account

```hcl
# Create Log Archive account
resource "aws_organizations_account" "log_archive" {
  name  = "log-archive"
  email = "aws-log-archive@example.com"
  parent_id = aws_organizations_organizational_unit.security.id

  # Prevent account deletion via IaC
  close_on_deletion = false
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

resource "aws_s3_bucket" "log_archive" {
  bucket = "org-trail-logs-${data.aws_caller_identity.current.account_id}"
}

data "aws_iam_policy_document" "cloudtrail_log_bucket" {
  statement {
    sid    = "AWSCloudTrailAclCheck20150319"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.log_archive.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:cloudtrail:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:trail/org-trail"]
    }
  }

  statement {
    sid    = "AWSCloudTrailWrite20150319"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.log_archive.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:cloudtrail:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:trail/org-trail"]
    }
  }

  statement {
    sid    = "AWSCloudTrailOrganizationWrite20150319"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.log_archive.arn}/AWSLogs/${aws_organizations_organization.org.id}/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:cloudtrail:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:trail/org-trail"]
    }
  }
}

resource "aws_s3_bucket_policy" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id
  policy = data.aws_iam_policy_document.cloudtrail_log_bucket.json
}

# Organization trail in the management account sending to a central S3 bucket
resource "aws_cloudtrail" "org_trail" {
  depends_on = [aws_s3_bucket_policy.log_archive]

  name                          = "org-trail"
  s3_bucket_name                = aws_s3_bucket.log_archive.id
  is_organization_trail         = true  # Captures the management account and all member accounts
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:${data.aws_partition.current.partition}:s3"]
    }
  }
}
```

## Step 4: Security Baseline (GuardDuty + Security Hub)

```hcl
# Create Security account
resource "aws_organizations_account" "security_tooling" {
  name      = "security-tooling"
  email     = "aws-security-tooling@example.com"
  parent_id = aws_organizations_organizational_unit.security.id

  # Prevent account deletion via IaC
  close_on_deletion = false
}

# Enable GuardDuty in the current account
resource "aws_guardduty_detector" "main" {
  enable = true
}

resource "aws_guardduty_detector_feature" "s3_data_events" {
  detector_id = aws_guardduty_detector.main.id
  name        = "S3_DATA_EVENTS"
  status      = "ENABLED"
}

resource "aws_guardduty_detector_feature" "eks_audit_logs" {
  detector_id = aws_guardduty_detector.main.id
  name        = "EKS_AUDIT_LOGS"
  status      = "ENABLED"
}

resource "aws_guardduty_detector_feature" "ebs_malware_protection" {
  detector_id = aws_guardduty_detector.main.id
  name        = "EBS_MALWARE_PROTECTION"
  status      = "ENABLED"
}

# Delegate GuardDuty administration to the Security account in this region
resource "aws_guardduty_organization_admin_account" "security" {
  depends_on = [aws_organizations_organization.org]

  admin_account_id = aws_organizations_account.security_tooling.id
}

# Enable Security Hub in the current account
resource "aws_securityhub_account" "main" {
  enable_default_standards = false
}

resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.id}::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}

# Delegate Security Hub administration to the Security account in this region
resource "aws_securityhub_organization_admin_account" "security" {
  depends_on = [aws_organizations_organization.org, aws_securityhub_account.main]

  admin_account_id = aws_organizations_account.security_tooling.id
}
```

## Summary

An AWS Landing Zone built with OpenTofu establishes multi-account governance before any workloads are deployed. Service Control Policies enforce guardrails for member accounts, including the member account root user. Centralized CloudTrail logging with log file validation provides a tamper-evident audit trail across the organization. Delegating GuardDuty and Security Hub administration to a dedicated Security account centralizes security operations, but both services are configured per Region and should be repeated in each enabled Region.
