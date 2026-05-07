# How to Configure AWS Security Hub with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Security Hub, Security Standards, Compliance, Infrastructure as Code

Description: Learn how to enable AWS Security Hub with OpenTofu to aggregate security findings from GuardDuty, Inspector, Macie, and other AWS services into a centralized security posture dashboard.

## Introduction

AWS Security Hub provides a comprehensive view of security alerts and compliance posture across AWS accounts. It aggregates findings from integrated AWS services (GuardDuty, Inspector, Macie, Firewall Manager) and third-party products, runs automated compliance checks against standards like CIS, PCI-DSS, and AWS Foundational Security Best Practices, and provides a security score.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Security Hub and Organizations permissions
- AWS Config enabled and recording required resource types for the standards you plan to enable
- GuardDuty enabled (recommended)

## Step 1: Enable Security Hub

```hcl
resource "aws_securityhub_account" "main" {
  # Enable Security Hub in the current account and region
  enable_default_standards = false  # Manage standards explicitly
  auto_enable_controls     = true   # Automatically enable new controls
  control_finding_generator = "SECURITY_CONTROL"  # Consolidated findings
}
```

## Step 2: Enable Security Standards

```hcl
# AWS Foundational Security Best Practices

resource "aws_securityhub_standards_subscription" "aws_fsbp" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/aws-foundational-security-best-practices/v/1.0.0"
}

# CIS AWS Foundations Benchmark v1.4
resource "aws_securityhub_standards_subscription" "cis_1_4" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/cis-aws-foundations-benchmark/v/1.4.0"
}

# PCI DSS v4.0.1 (if applicable)
resource "aws_securityhub_standards_subscription" "pci_dss" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/pci-dss/v/4.0.1"
}
```

## Step 3: Configure Finding Aggregation

```hcl
# Enable finding aggregation to centralize findings from all regions
resource "aws_securityhub_finding_aggregator" "main" {
  depends_on   = [aws_securityhub_account.main]
  linking_mode = "ALL_REGIONS"  # or "SPECIFIED_REGIONS"

  # For SPECIFIED_REGIONS:
  # linking_mode = "SPECIFIED_REGIONS"
  # specified_regions = ["us-west-2", "eu-west-1"]
}
```

## Step 4: Route Critical Findings to SNS

```hcl
resource "aws_cloudwatch_event_rule" "security_hub_critical" {
  name        = "${var.project_name}-securityhub-critical"
  description = "Route CRITICAL Security Hub findings to SNS"

  event_pattern = jsonencode({
    source        = ["aws.securityhub"]
    "detail-type" = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Severity = {
          Label = ["CRITICAL", "HIGH"]
        }
        RecordState = ["ACTIVE"]
        Workflow = {
          Status = ["NEW"]
        }
      }
    }
  })
}

data "aws_iam_policy_document" "security_hub_sns" {
  statement {
    effect  = "Allow"
    actions = ["SNS:Publish"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    resources = [var.security_sns_topic_arn]
  }
}

resource "aws_sns_topic_policy" "security_hub_events" {
  arn    = var.security_sns_topic_arn
  policy = data.aws_iam_policy_document.security_hub_sns.json
}

resource "aws_cloudwatch_event_target" "security_hub_sns" {
  depends_on = [aws_sns_topic_policy.security_hub_events]
  rule      = aws_cloudwatch_event_rule.security_hub_critical.name
  target_id = "security-hub-alert"
  arn       = var.security_sns_topic_arn

  input_transformer {
    input_paths = {
      title       = "$.detail.findings[0].Title"
      severity    = "$.detail.findings[0].Severity.Label"
      description = "$.detail.findings[0].Description"
      account     = "$.detail.findings[0].AwsAccountId"
    }
    input_template = "\"Security Hub <severity>: <title> in account <account>. <description>\""
  }
}
```

## Step 5: Multi-Account Organization Setup

```hcl
# Designate Security Hub admin account
resource "aws_securityhub_organization_admin_account" "main" {
  admin_account_id = var.security_account_id
}

# Auto-enable for new organization members
resource "aws_securityhub_organization_configuration" "main" {
  depends_on            = [aws_securityhub_organization_admin_account.main]
  auto_enable           = true
  auto_enable_standards = "DEFAULT"  # Enable default standards for new accounts
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify Security Hub is enabled
aws securityhub describe-hub
```

## Conclusion

Security Hub's value compounds with integrations-enable GuardDuty, Inspector, Macie, and Config before enabling Security Hub to get populated findings immediately. The AWS Foundational Security Best Practices standard is the best starting point, providing actionable findings across 200+ controls. Use the finding aggregator to maintain a single-pane view in your security account, and route CRITICAL and HIGH findings to on-call channels for immediate response.
