# How to Create Inspector Assessments in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Inspector, Security, Vulnerability Scanning, Infrastructure as Code

Description: Learn how to configure Amazon Inspector for automated vulnerability assessments on EC2 instances, Lambda functions, and ECR images using Terraform.

---

Amazon Inspector is an automated vulnerability management service that continuously scans your AWS workloads for software vulnerabilities and unintended network exposure. Inspector v2 (the current version) automatically discovers and scans EC2 instances, Lambda functions, and container images in ECR. Setting up Inspector through Terraform ensures your vulnerability scanning is enabled consistently across all accounts and that findings are routed to the right places.

This guide covers enabling Inspector, configuring scan types, setting up suppression rules, and managing Inspector across an AWS Organization.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- EC2 instances with the SSM Agent installed (for EC2 scanning)
- ECR repositories (for container image scanning)

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

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

## Enabling Inspector

Inspector v2 is enabled at the account level. You choose which resource types to scan.

```hcl
# Enable Inspector with all scan types

resource "aws_inspector2_enabler" "main" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["EC2", "ECR", "LAMBDA", "LAMBDA_CODE"]
}

data "aws_caller_identity" "current" {}
```

## Organization-Wide Enablement

For multi-account setups, designate the delegated administrator from the AWS Organizations management account, then manage organization configuration and member associations from the delegated administrator account.

```hcl
provider "aws" {
  alias  = "management"
  region = "us-east-1"
}

provider "aws" {
  alias  = "security"
  region = "us-east-1"
}

# Designate a delegated administrator for Inspector
resource "aws_inspector2_delegated_admin_account" "security" {
  provider = aws.management

  account_id = var.security_account_id
}

# Auto-enable Inspector for new accounts in the organization
resource "aws_inspector2_organization_configuration" "main" {
  provider = aws.security

  auto_enable {
    ec2         = true
    ecr         = true
    lambda      = true
    lambda_code = true
  }

  depends_on = [aws_inspector2_delegated_admin_account.security]
}

# Associate member accounts
resource "aws_inspector2_member_association" "accounts" {
  provider = aws.security

  for_each = toset(var.member_account_ids)

  account_id = each.value

  depends_on = [aws_inspector2_delegated_admin_account.security]
}

variable "security_account_id" {
  type        = string
  description = "Account ID for the security/audit account"
}

variable "member_account_ids" {
  type        = list(string)
  description = "List of member account IDs to enable Inspector on"
  default     = []
}
```

## Suppression Rules (Filters)

Suppression rules let you filter out findings that you have accepted the risk for or that do not apply to your environment. This reduces noise and lets you focus on actionable findings.

```hcl
# Suppress findings for test/development instances
resource "aws_inspector2_filter" "suppress_dev_instances" {
  name        = "suppress-dev-instance-findings"
  description = "Suppress low and medium findings for development instances"
  action      = "SUPPRESS"

  filter_criteria {
    # Match development instances by tag
    resource_tags {
      comparison = "EQUALS"
      key        = "Environment"
      value      = "development"
    }

    # Only suppress low and medium severity
    severity {
      comparison = "EQUALS"
      value      = "LOW"
    }
  }
}

resource "aws_inspector2_filter" "suppress_dev_medium" {
  name        = "suppress-dev-medium-findings"
  description = "Suppress medium findings for development instances"
  action      = "SUPPRESS"

  filter_criteria {
    resource_tags {
      comparison = "EQUALS"
      key        = "Environment"
      value      = "development"
    }

    severity {
      comparison = "EQUALS"
      value      = "MEDIUM"
    }
  }
}

# Suppress findings for a specific CVE that has been risk-accepted
resource "aws_inspector2_filter" "accepted_cve" {
  name        = "accepted-cve-2024-xxxxx"
  description = "Risk-accepted CVE-2024-XXXXX - no fix available, compensating controls in place"
  action      = "SUPPRESS"

  filter_criteria {
    vulnerability_id {
      comparison = "EQUALS"
      value      = "CVE-2024-XXXXX"
    }
  }
}

# Suppress network reachability findings for intentionally public EC2 instances
resource "aws_inspector2_filter" "public_ec2_instances" {
  name        = "suppress-public-ec2-network-findings"
  description = "Suppress network exposure findings for intentionally public EC2 instances"
  action      = "SUPPRESS"

  filter_criteria {
    resource_type {
      comparison = "EQUALS"
      value      = "AWS_EC2_INSTANCE"
    }

    resource_tags {
      comparison = "EQUALS"
      key        = "PublicFacing"
      value      = "true"
    }

    finding_type {
      comparison = "EQUALS"
      value      = "NETWORK_REACHABILITY"
    }
  }
}
```

## EventBridge Integration for Findings

Route Inspector findings to EventBridge for automated response.

```hcl
# EventBridge rule to capture critical and high findings
resource "aws_cloudwatch_event_rule" "inspector_critical" {
  name        = "inspector-critical-findings"
  description = "Capture critical and high severity Inspector findings"

  event_pattern = jsonencode({
    source      = ["aws.inspector2"]
    "detail-type" = ["Inspector2 Finding"]
    detail = {
      severity = ["CRITICAL", "HIGH"]
      status   = ["ACTIVE"]
    }
  })

  tags = {
    Purpose = "security-alerting"
  }
}

# Send critical findings to SNS
resource "aws_sns_topic" "security_findings" {
  name = "inspector-critical-findings"
}

resource "aws_cloudwatch_event_target" "inspector_to_sns" {
  rule      = aws_cloudwatch_event_rule.inspector_critical.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.security_findings.arn
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.security_findings.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridge"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.security_findings.arn
      }
    ]
  })
}

# Route findings to a Lambda function for automated response
resource "aws_cloudwatch_event_target" "inspector_to_lambda" {
  rule      = aws_cloudwatch_event_rule.inspector_critical.name
  target_id = "invoke-remediation"
  arn       = aws_lambda_function.remediation.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowInspectorEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.remediation.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.inspector_critical.arn
}
```

## ECR Scan Configuration

Configure how Inspector scans container images in ECR.

```hcl
# ECR repository; enhanced scanning is configured at the registry level
resource "aws_ecr_repository" "app" {
  name                 = "my-application"
  image_tag_mutability = "IMMUTABLE"

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }

  tags = {
    Team = "platform"
  }
}

# ECR registry scanning configuration
resource "aws_ecr_registry_scanning_configuration" "main" {
  scan_type = "ENHANCED" # Uses Inspector for scanning

  rule {
    scan_frequency = "CONTINUOUS_SCAN"

    repository_filter {
      filter      = "*"
      filter_type = "WILDCARD"
    }
  }
}
```

## CloudWatch Dashboard for Inspector Alerts

Create custom CloudWatch metrics from the Inspector EventBridge feed, then build a dashboard from those metrics.

```hcl
# Log group for Inspector finding events
resource "aws_cloudwatch_log_group" "inspector_findings" {
  name              = "/aws/events/inspector-findings"
  retention_in_days = 90
}

resource "aws_cloudwatch_event_target" "inspector_to_logs" {
  rule      = aws_cloudwatch_event_rule.inspector_critical.name
  target_id = "send-to-cloudwatch-logs"
  arn       = aws_cloudwatch_log_group.inspector_findings.arn
}

resource "aws_cloudwatch_log_metric_filter" "inspector_critical" {
  name           = "inspector-critical-findings"
  log_group_name = aws_cloudwatch_log_group.inspector_findings.name
  pattern        = "{ $.detail.severity = \"CRITICAL\" }"

  metric_transformation {
    name      = "CriticalFindings"
    namespace = "InspectorFindings"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "inspector_high" {
  name           = "inspector-high-findings"
  log_group_name = aws_cloudwatch_log_group.inspector_findings.name
  pattern        = "{ $.detail.severity = \"HIGH\" }"

  metric_transformation {
    name      = "HighFindings"
    namespace = "InspectorFindings"
    value     = "1"
  }
}

# CloudWatch dashboard for Inspector alert events
resource "aws_cloudwatch_dashboard" "inspector" {
  dashboard_name = "inspector-findings-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["InspectorFindings", "CriticalFindings"],
            [".", "HighFindings"],
          ]
          period = 86400
          stat   = "Sum"
          region = "us-east-1"
          title  = "Inspector Critical and High Finding Events"
          view   = "timeSeries"
        }
      }
    ]
  })
}
```

## S3 Export for Long-Term Storage

Export Inspector findings to S3 for long-term retention and analysis.

```hcl
# S3 bucket for Inspector findings export
resource "aws_s3_bucket" "inspector_findings" {
  bucket = "my-org-inspector-findings-export"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_iam_policy_document" "inspector_findings_bucket" {
  statement {
    sid    = "AllowInspectorExport"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["inspector2.amazonaws.com"]
    }

    actions = [
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:AbortMultipartUpload",
    ]

    resources = ["${aws_s3_bucket.inspector_findings.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:inspector2:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:report/*"]
    }
  }
}

resource "aws_s3_bucket_policy" "inspector_findings" {
  bucket = aws_s3_bucket.inspector_findings.id
  policy = data.aws_iam_policy_document.inspector_findings_bucket.json
}

resource "aws_s3_bucket_server_side_encryption_configuration" "inspector_findings" {
  bucket = aws_s3_bucket.inspector_findings.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.inspector.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "inspector_findings" {
  bucket = aws_s3_bucket.inspector_findings.id

  rule {
    id     = "archive-old-findings"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# KMS key for encrypting exported findings
resource "aws_kms_key" "inspector" {
  description             = "KMS key for Inspector findings export"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

data "aws_iam_policy_document" "inspector_kms" {
  statement {
    sid    = "EnableIAMUserPermissions"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowInspectorExport"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["inspector2.amazonaws.com"]
    }

    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey*",
    ]

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:inspector2:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:report/*"]
    }
  }
}

resource "aws_kms_key_policy" "inspector" {
  key_id = aws_kms_key.inspector.id
  policy = data.aws_iam_policy_document.inspector_kms.json
}
```

## IAM Policies

```hcl
# Policy for security teams to view Inspector findings
resource "aws_iam_policy" "inspector_viewer" {
  name        = "inspector-findings-viewer"
  description = "Allows viewing Inspector findings and reports"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "inspector2:ListFindings",
          "inspector2:GetFindingsReportStatus",
          "inspector2:ListCoverage",
          "inspector2:ListCoverageStatistics",
          "inspector2:ListAccountPermissions",
          "inspector2:BatchGetAccountStatus",
          "inspector2:BatchGetFreeTrialInfo",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Best Practices

1. **Enable all scan types.** EC2, ECR, and Lambda scanning each catch different vulnerability types. Enable them all for comprehensive coverage.

2. **Use suppression rules sparingly.** Only suppress findings that have been formally risk-accepted. Document the reason in the filter description.

3. **Route critical findings to alerts.** Use EventBridge to send critical and high findings to your alerting system immediately.

4. **Continuously scan container images.** Configure ECR with enhanced scanning and continuous scan frequency so new vulnerabilities are detected after images are pushed.

5. **Enable organization-wide.** Use the delegated administrator and auto-enable features to ensure new accounts get Inspector coverage automatically.

6. **Export findings for compliance.** Store findings in S3 for long-term retention to satisfy audit requirements.

## Conclusion

Amazon Inspector with Terraform provides automated vulnerability management that scales across your AWS environment. From EC2 instances to container images to Lambda functions, Inspector continuously scans for known vulnerabilities and network exposure issues. By managing the configuration through Terraform, you ensure consistent coverage, systematic suppression of accepted risks, and reliable routing of critical findings to your security team.
