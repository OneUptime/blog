# How to Set Up AWS Inspector with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Inspector, Vulnerability Management, Container Security, Infrastructure as Code

Description: Learn how to enable AWS Inspector v2 with OpenTofu to automatically scan EC2 instances, Lambda functions, and ECR container images for software vulnerabilities and unintended network exposure.

## Introduction

AWS Inspector v2 continuously scans EC2 instances, Lambda functions, and ECR container images for software vulnerabilities (CVEs), and it also analyzes EC2 instances for network reachability issues. It automatically starts scanning when new eligible resources launch or images are pushed, and it can send findings to Security Hub for centralized management when Security Hub is enabled. Inspector eliminates the need to schedule manual vulnerability scans.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Inspector and Organizations permissions

## Step 1: Enable Inspector v2

```hcl
data "aws_caller_identity" "current" {}

resource "aws_inspector2_enabler" "main" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["EC2", "ECR", "LAMBDA", "LAMBDA_CODE"]

  # Notes:
  # EC2 - Scans EC2 instances for package vulnerabilities and network reachability
  # ECR - Scans container images on push and periodically
  # LAMBDA - Scans Lambda function package dependencies
  # LAMBDA_CODE - Scans Lambda function custom application code
}
```

## Step 2: Delegate Inspector Admin to Security Account

```hcl
# Delegate Inspector administration to security account in Organizations.
# Run this in the AWS Organizations management account.

resource "aws_inspector2_delegated_admin_account" "main" {
  account_id = var.security_account_id
}

# In the delegated administrator (security) account - configure organization membership
resource "aws_inspector2_organization_configuration" "main" {
  depends_on = [aws_inspector2_delegated_admin_account.main]

  auto_enable {
    ec2         = true   # Auto-enable EC2 scanning for new organization member accounts
    ecr         = true   # Auto-enable ECR scanning for new organization member accounts
    lambda      = true   # Auto-enable Lambda scanning for new organization member accounts
    lambda_code = false  # Optional Lambda code scanning for new organization member accounts
  }
}
```

## Step 3: Route Critical and High Findings to SNS

```hcl
resource "aws_cloudwatch_event_rule" "inspector_critical" {
  name        = "${var.project_name}-inspector-critical"
  description = "Alert on CRITICAL and HIGH Inspector findings"

  event_pattern = jsonencode({
    source        = ["aws.inspector2"]
    "detail-type" = ["Inspector2 Finding"]
    detail = {
      severity = ["CRITICAL", "HIGH"]
      status   = ["ACTIVE"]
    }
  })
}

data "aws_iam_policy_document" "inspector_sns" {
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

resource "aws_sns_topic_policy" "inspector_events" {
  arn    = var.security_sns_topic_arn
  policy = data.aws_iam_policy_document.inspector_sns.json
}

resource "aws_cloudwatch_event_target" "inspector_sns" {
  depends_on = [aws_sns_topic_policy.inspector_events]
  rule      = aws_cloudwatch_event_rule.inspector_critical.name
  target_id = "inspector-alert"
  arn       = var.security_sns_topic_arn

  input_transformer {
    input_paths = {
      severity  = "$.detail.severity"
      title     = "$.detail.title"
      type      = "$.detail.type"
      resource  = "$.detail.resources[0].id"
      account   = "$.account"
    }
    input_template = "\"Inspector <severity>: <title>\\nType: <type>\\nResource: <resource>\\nAccount: <account>\""
  }
}
```

## Step 4: ECR Repository for Continuous Image Scanning

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}/app"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true  # This enables basic scanning; Inspector v2 provides enhanced scanning
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Name = "${var.project_name}/app"
  }
}

# Inspector v2 enables enhanced scanning for ECR at the registry level.
# Scan frequency (continuous scan or scan on push) is configured in Amazon ECR.
```

## Step 5: IAM Policy to View Inspector Findings

```hcl
resource "aws_iam_policy" "inspector_reader" {
  name        = "${var.project_name}-inspector-reader"
  description = "Read-only access to Inspector findings"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "inspector2:ListFindings",
        "inspector2:GetFindingsReportStatus",
        "inspector2:BatchGetFindingDetails",
        "inspector2:ListCoverage"
      ]
      Resource = "*"
    }]
  })
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# View critical findings
aws inspector2 list-findings \
  --filter-criteria '{"severity":[{"comparison":"EQUALS","value":"CRITICAL"}],"findingStatus":[{"comparison":"EQUALS","value":"ACTIVE"}]}' \
  --query 'findings[:5].{Title: title, Severity: severity, Resource: resources[0].id}'
```

## Conclusion

Inspector v2 delivers continuous vulnerability management without manual scan scheduling. For EC2, Inspector supports agent-based and agentless scanning depending on your configuration, and for ECR it integrates with enhanced scanning. Enable it organization-wide to get comprehensive coverage; Inspector automatically starts scanning new eligible resources after you enable the service. Focus remediation on CRITICAL findings first, particularly those with available fixes and exploitability scores. Integrate with Security Hub for centralized tracking and with Jira or other ticketing systems via EventBridge for automatic ticket creation.
