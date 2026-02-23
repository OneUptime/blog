# How to Audit IAM Permissions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Security, Audit, Infrastructure as Code

Description: Learn how to audit and analyze IAM permissions across your AWS accounts using Terraform data sources, policy analysis, and automated compliance checks.

---

Auditing IAM permissions is a critical security practice that helps you understand who has access to what in your AWS environment. While manual audits are time-consuming and error-prone, Terraform provides powerful data sources and techniques for automating IAM permission analysis. In this guide, you will learn how to build a comprehensive IAM audit framework using Terraform.

## Why Audit IAM Permissions

Over time, IAM policies accumulate. Users gain permissions they no longer need. Service roles get overly broad access. Without regular auditing, your AWS environment can drift toward a state where the principle of least privilege is no longer enforced. Terraform helps by making your IAM configuration declarative and auditable.

## Setting Up the Provider

```hcl
# Configure AWS provider for IAM auditing
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Discovering IAM Users and Their Policies

The first step in any audit is understanding who exists in your account and what policies they have attached:

```hcl
# Fetch all IAM users in the account
data "aws_iam_users" "all" {}

# Get details for each user including their attached policies
data "aws_iam_user" "details" {
  for_each  = toset(data.aws_iam_users.all.names)
  user_name = each.value
}

# List all IAM policies in the account
data "aws_iam_policies" "all" {
  # Only get customer-managed policies (not AWS-managed)
  path_prefix = "/"
}

# Output user information for review
output "iam_users" {
  value = {
    for name, user in data.aws_iam_user.details : name => {
      user_id = user.user_id
      arn     = user.arn
      path    = user.path
    }
  }
}
```

## Analyzing Policy Permissions

To understand what each policy allows, you can fetch and analyze the policy documents:

```hcl
# Fetch specific policy details for analysis
data "aws_iam_policy" "audit_targets" {
  for_each = toset(data.aws_iam_policies.all.arns)
  arn      = each.value
}

# Get the actual policy document content
data "aws_iam_policy_document" "current_versions" {
  for_each = data.aws_iam_policy.audit_targets

  # Source from the existing policy to analyze its contents
  source_policy_documents = [each.value.policy]
}

# Output all policies and their permissions
output "policy_details" {
  value = {
    for arn, policy in data.aws_iam_policy.audit_targets : policy.name => {
      arn              = arn
      attachment_count = policy.attachment_count
      description      = policy.description
    }
  }
}
```

## Detecting Overly Permissive Policies

One of the most important audit tasks is finding policies that grant wildcard access:

```hcl
# Define a local that identifies dangerous permission patterns
locals {
  # Parse each policy document and check for wildcards
  dangerous_actions = ["*", "iam:*", "s3:*", "ec2:*"]

  # Collect policies with full admin access
  admin_policies = [
    for arn, policy in data.aws_iam_policy.audit_targets :
    policy.name if can(regex("\"Action\":\\s*\"\\*\"", policy.policy))
  ]

  # Collect policies with wildcard resources
  wildcard_resource_policies = [
    for arn, policy in data.aws_iam_policy.audit_targets :
    policy.name if can(regex("\"Resource\":\\s*\"\\*\"", policy.policy))
  ]
}

# Output warnings about overly permissive policies
output "admin_access_policies" {
  value       = local.admin_policies
  description = "Policies that grant full administrative access"
}

output "wildcard_resource_policies" {
  value       = local.wildcard_resource_policies
  description = "Policies that allow actions on all resources"
}
```

## Auditing Role Trust Relationships

IAM roles have trust policies that define who can assume them. Auditing these is essential for understanding cross-account access:

```hcl
# Fetch all IAM roles
data "aws_iam_roles" "all" {}

# Get details for each role
data "aws_iam_role" "details" {
  for_each = toset(data.aws_iam_roles.all.names)
  name     = each.value
}

# Analyze trust relationships
locals {
  # Extract roles that can be assumed by external accounts
  external_trust_roles = {
    for name, role in data.aws_iam_role.details : name => {
      trust_policy = role.assume_role_policy
      arn          = role.arn
    }
    if can(regex("arn:aws:iam::[0-9]+:root", role.assume_role_policy))
  }

  # Find roles trusting any AWS service
  service_roles = {
    for name, role in data.aws_iam_role.details : name => {
      trust_policy = role.assume_role_policy
      arn          = role.arn
    }
    if can(regex("amazonaws.com", role.assume_role_policy))
  }
}

output "external_trust_roles" {
  value       = local.external_trust_roles
  description = "Roles that can be assumed by external AWS accounts"
}
```

## Checking for Unused Credentials

Identifying unused IAM credentials helps reduce your attack surface:

```hcl
# Create a custom audit report using AWS Config
resource "aws_config_config_rule" "iam_user_unused_credentials" {
  name = "iam-user-unused-credentials-check"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_UNUSED_CREDENTIALS_CHECK"
  }

  # Check for credentials unused for 90 days
  input_parameters = jsonencode({
    maxCredentialUsageAge = "90"
  })

  depends_on = [aws_config_configuration_recorder.main]
}

# Enable AWS Config recorder if not already enabled
resource "aws_config_configuration_recorder" "main" {
  name     = "iam-audit-recorder"
  role_arn = aws_iam_role.config_role.arn

  recording_group {
    all_supported                 = false
    include_global_resource_types = true
    resource_types                = ["AWS::IAM::User", "AWS::IAM::Role", "AWS::IAM::Policy"]
  }
}

# IAM role for AWS Config
resource "aws_iam_role" "config_role" {
  name = "aws-config-iam-audit-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}
```

## Building an Automated Compliance Framework

You can create Terraform configurations that enforce compliance rules automatically:

```hcl
# Define compliance rules as local values
locals {
  compliance_rules = {
    no_inline_policies = true
    require_mfa        = true
    max_policy_age     = 365
    max_key_age        = 90
  }
}

# Check for inline policies (which are harder to audit)
data "aws_iam_user_policy" "inline_check" {
  for_each  = toset(data.aws_iam_users.all.names)
  user_name = each.value
  # This will fail if no inline policy exists, which is actually good
}

# Create an SNS topic for audit notifications
resource "aws_sns_topic" "iam_audit_alerts" {
  name = "iam-audit-alerts"
}

# Create a CloudWatch event rule to detect IAM changes
resource "aws_cloudwatch_event_rule" "iam_changes" {
  name        = "detect-iam-changes"
  description = "Detect any IAM configuration changes"

  event_pattern = jsonencode({
    source      = ["aws.iam"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["iam.amazonaws.com"]
      eventName = [
        "CreateUser",
        "DeleteUser",
        "AttachUserPolicy",
        "DetachUserPolicy",
        "PutUserPolicy",
        "CreateRole",
        "AttachRolePolicy"
      ]
    }
  })
}

# Send IAM change events to SNS
resource "aws_cloudwatch_event_target" "iam_changes_sns" {
  rule      = aws_cloudwatch_event_rule.iam_changes.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.iam_audit_alerts.arn
}
```

## Generating Audit Reports with Outputs

Terraform outputs make excellent audit reports that you can capture and store:

```hcl
# Comprehensive audit output
output "iam_audit_report" {
  value = {
    total_users           = length(data.aws_iam_users.all.names)
    total_roles           = length(data.aws_iam_roles.all.names)
    total_policies        = length(data.aws_iam_policies.all.arns)
    admin_policies        = local.admin_policies
    external_trust_roles  = keys(local.external_trust_roles)
    audit_timestamp       = timestamp()
  }
  description = "IAM audit report summary"
}
```

## Integrating with Terraform Cloud for Continuous Auditing

For ongoing auditing, schedule regular Terraform runs to refresh your audit data:

```hcl
# Store audit results in an S3 bucket for historical tracking
resource "aws_s3_bucket" "audit_reports" {
  bucket = "iam-audit-reports-${data.aws_caller_identity.current.account_id}"
}

# Enable versioning to keep audit history
resource "aws_s3_bucket_versioning" "audit_reports" {
  bucket = aws_s3_bucket.audit_reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Get current account identity
data "aws_caller_identity" "current" {}
```

## Best Practices

Run your IAM audit Terraform configuration regularly, ideally as part of a CI/CD pipeline. Store audit outputs in a versioned location so you can track changes over time. Pay special attention to policies with wildcard actions or resources. Audit cross-account trust relationships carefully since they represent your account's external attack surface. Combine Terraform auditing with AWS Access Analyzer for a complete picture.

For monitoring your AWS infrastructure health alongside IAM auditing, check out our guide on [CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-ec2-in-terraform/view).

## Conclusion

Auditing IAM permissions with Terraform transforms a manual, error-prone process into an automated, repeatable workflow. By leveraging Terraform data sources, you can discover all IAM entities, analyze their permissions, detect overly permissive policies, and generate comprehensive audit reports. When combined with AWS Config rules and CloudWatch event monitoring, you get a complete IAM governance solution that runs as code.
