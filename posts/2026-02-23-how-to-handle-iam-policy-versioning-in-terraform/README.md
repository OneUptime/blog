# How to Handle IAM Policy Versioning in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Security, Versioning, Infrastructure as Code

Description: Learn how to manage IAM policy versions in Terraform, including version tracking, rollbacks, and maintaining policy history across deployments.

---

AWS IAM policies support versioning, allowing you to maintain up to five versions of a single managed policy. This versioning mechanism is crucial for tracking changes and enabling rollbacks. However, managing IAM policy versions through Terraform requires understanding how Terraform interacts with the AWS versioning system. This guide walks you through everything you need to know.

## Understanding IAM Policy Versions

Every managed IAM policy in AWS can have up to five versions. One version is always marked as the default, which is the version that AWS evaluates when making authorization decisions. When you update a policy, AWS creates a new version. If the policy already has five versions, you must delete an older version before creating a new one.

## Setting Up the Provider

```hcl
# Configure AWS provider
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

## How Terraform Manages Policy Versions

When you update an `aws_iam_policy` resource, Terraform creates a new version of the policy and sets it as the default. Terraform also handles the five-version limit by automatically deleting the oldest non-default version when needed:

```hcl
# Define a managed IAM policy
# Each terraform apply that changes the policy creates a new version
resource "aws_iam_policy" "application_access" {
  name        = "ApplicationAccessPolicy"
  description = "Policy for application service access"

  # When this JSON changes, Terraform creates a new policy version
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowDynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/app-*"
      }
    ]
  })
}
```

## Tracking Policy Changes with Terraform State

Terraform state naturally tracks the current version of your policy. To maintain a history of changes, you should use version-controlled Terraform configurations:

```hcl
# Use a data source to inspect the current policy version
data "aws_iam_policy" "current" {
  arn = aws_iam_policy.application_access.arn
}

# Output the current version information
output "policy_version_info" {
  value = {
    policy_id        = data.aws_iam_policy.current.policy_id
    arn              = data.aws_iam_policy.current.arn
    default_version  = data.aws_iam_policy.current.default_version_id
    attachment_count = data.aws_iam_policy.current.attachment_count
  }
}
```

## Implementing Policy Version History

Since Terraform does not natively track all policy versions, you can build a system that captures version history:

```hcl
# Store policy version history in an S3 bucket
resource "aws_s3_bucket" "policy_history" {
  bucket = "iam-policy-version-history"
}

resource "aws_s3_bucket_versioning" "policy_history" {
  bucket = aws_s3_bucket.policy_history.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Save each policy version to S3 for historical tracking
resource "aws_s3_object" "policy_snapshot" {
  bucket  = aws_s3_bucket.policy_history.id
  key     = "policies/${aws_iam_policy.application_access.name}/current.json"
  content = aws_iam_policy.application_access.policy

  # S3 versioning keeps all historical versions
  # Each update creates a new S3 object version
}

# Use a null resource to log version changes
resource "null_resource" "version_logger" {
  triggers = {
    policy_hash = sha256(aws_iam_policy.application_access.policy)
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Policy version changed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "Policy: ${aws_iam_policy.application_access.name}"
      echo "Version: ${aws_iam_policy.application_access.id}"

      # List all versions of this policy
      aws iam list-policy-versions \
        --policy-arn ${aws_iam_policy.application_access.arn} \
        --query 'Versions[*].[VersionId,IsDefaultVersion,CreateDate]' \
        --output table
    EOT
  }
}
```

## Managing Multiple Policy Versions with Modules

Create a module that standardizes policy management with version tracking:

```hcl
# modules/versioned-policy/main.tf
variable "policy_name" {
  type        = string
  description = "Name of the IAM policy"
}

variable "policy_description" {
  type        = string
  description = "Description of the IAM policy"
  default     = ""
}

variable "policy_document" {
  type        = string
  description = "The policy document JSON"
}

variable "history_bucket" {
  type        = string
  description = "S3 bucket for storing policy version history"
}

# Create the IAM policy
resource "aws_iam_policy" "this" {
  name        = var.policy_name
  description = var.policy_description
  policy      = var.policy_document
}

# Archive each version to S3
resource "aws_s3_object" "version_archive" {
  bucket  = var.history_bucket
  key     = "policies/${var.policy_name}/version-${sha256(var.policy_document)}.json"
  content = var.policy_document

  metadata = {
    policy_name = var.policy_name
    timestamp   = timestamp()
  }
}

output "policy_arn" {
  value = aws_iam_policy.this.arn
}

output "policy_version" {
  value = aws_iam_policy.this.id
}
```

## Using the Versioned Policy Module

```hcl
# Create a versioned policy using the module
module "api_policy" {
  source = "./modules/versioned-policy"

  policy_name        = "APIAccessPolicy"
  policy_description = "Controls access to API Gateway resources"
  history_bucket     = aws_s3_bucket.policy_history.id

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAPIGatewayInvoke"
        Effect = "Allow"
        Action = [
          "execute-api:Invoke"
        ]
        Resource = "arn:aws:execute-api:us-east-1:*:*/prod/*"
      }
    ]
  })
}
```

## Implementing Policy Rollbacks

While Terraform does not have a built-in rollback mechanism for IAM policies, you can implement one using your version control system:

```hcl
# Use a variable to control which policy version to deploy
variable "policy_version_override" {
  type        = string
  default     = ""
  description = "Set to a specific policy JSON to rollback to a previous version"
}

# The active policy document - either current or rollback version
locals {
  # Default policy definition
  current_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::app-data",
          "arn:aws:s3:::app-data/*"
        ]
      }
    ]
  })

  # Use override if provided, otherwise use current
  active_policy = var.policy_version_override != "" ? var.policy_version_override : local.current_policy
}

resource "aws_iam_policy" "rollbackable" {
  name   = "RollbackablePolicy"
  policy = local.active_policy
}
```

## Automating Version Cleanup

AWS limits you to five policy versions. While Terraform handles this automatically for policies it manages, you might need to clean up versions for policies managed outside Terraform:

```hcl
# Clean up old policy versions when importing existing policies
resource "null_resource" "version_cleanup" {
  triggers = {
    policy_arn = aws_iam_policy.application_access.arn
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Get non-default versions sorted by creation date
      OLD_VERSIONS=$(aws iam list-policy-versions \
        --policy-arn ${aws_iam_policy.application_access.arn} \
        --query 'Versions[?IsDefaultVersion==`false`].VersionId' \
        --output text)

      # Count total versions
      VERSION_COUNT=$(aws iam list-policy-versions \
        --policy-arn ${aws_iam_policy.application_access.arn} \
        --query 'length(Versions)' \
        --output text)

      echo "Current version count: $VERSION_COUNT"

      # If we have 5 versions, delete the oldest non-default
      if [ "$VERSION_COUNT" -ge 5 ]; then
        OLDEST=$(echo "$OLD_VERSIONS" | tr '\t' '\n' | head -1)
        echo "Deleting oldest version: $OLDEST"
        aws iam delete-policy-version \
          --policy-arn ${aws_iam_policy.application_access.arn} \
          --version-id "$OLDEST"
      fi
    EOT
  }
}
```

## Monitoring Policy Version Changes

Set up alerts when policy versions change unexpectedly:

```hcl
# CloudTrail event rule for policy version changes
resource "aws_cloudwatch_event_rule" "policy_version_changes" {
  name        = "iam-policy-version-changes"
  description = "Detect IAM policy version changes"

  event_pattern = jsonencode({
    source      = ["aws.iam"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["iam.amazonaws.com"]
      eventName   = ["CreatePolicyVersion", "DeletePolicyVersion", "SetDefaultPolicyVersion"]
    }
  })
}

resource "aws_sns_topic" "policy_alerts" {
  name = "iam-policy-version-alerts"
}

resource "aws_cloudwatch_event_target" "policy_version_sns" {
  rule      = aws_cloudwatch_event_rule.policy_version_changes.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.policy_alerts.arn
}
```

## Best Practices

Always use version control for your Terraform code so you have a complete history of policy changes. Store policy snapshots in S3 with versioning enabled for an independent audit trail. Use meaningful commit messages that explain why a policy changed, not just what changed. Test policy changes with the IAM Policy Simulator before applying. Consider using Terraform workspaces or separate state files for IAM policies so they can be managed independently from other infrastructure.

For more on testing IAM policies before deploying version changes, see our guide on [IAM policy simulator tests](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-policy-simulator-tests-in-terraform/view).

## Conclusion

Handling IAM policy versioning in Terraform requires understanding both AWS's native versioning system and how Terraform manages state changes. By combining Terraform's built-in version management with S3-based history tracking, CloudTrail monitoring, and reusable modules, you can build a robust system for managing policy changes over time. This approach gives you the audit trail and rollback capabilities that secure environments demand.
