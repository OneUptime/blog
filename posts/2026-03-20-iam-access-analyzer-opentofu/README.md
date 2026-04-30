# How to Set Up IAM Access Analyzer with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Access Analyzer, Security, Compliance, Infrastructure as Code

Description: Learn how to configure AWS IAM Access Analyzer using OpenTofu to automatically detect resources shared with external entities and validate IAM policies for correctness.

## Introduction

AWS IAM Access Analyzer uses automated reasoning to analyze resource-based policies and identify resources accessible from outside your AWS account or organization. It generates findings for each externally accessible resource, helping you detect unintended access before it becomes a security incident.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM Access Analyzer permissions, and AWS Organizations permissions if you plan to create an organization-level analyzer

## Step 1: Create an Account-Level Access Analyzer

```hcl
# Account-level analyzer detects resources shared outside your account

resource "aws_accessanalyzer_analyzer" "account" {
  analyzer_name = "${var.account_name}-account-analyzer"
  type          = "ACCOUNT"  # Or "ORGANIZATION" for org-level

  tags = {
    Name        = "account-access-analyzer"
    Environment = var.environment
  }
}
```

## Step 2: Create an Organization-Level Analyzer

```hcl
# Organization-level analyzer detects resources shared outside the org
resource "aws_accessanalyzer_analyzer" "organization" {
  analyzer_name = "organization-access-analyzer"
  # Requires AWS Organizations trusted access.
  # If you create it from a member account, register that account as a delegated administrator first.
  type = "ORGANIZATION"

  tags = {
    Name = "org-access-analyzer"
    Scope = "Organization"
  }
}
```

## Step 3: Configure Archive Rules

```hcl
# Archive rule for approved cross-account access
# This prevents known-good findings from cluttering the console
resource "aws_accessanalyzer_archive_rule" "approved_partner" {
  analyzer_name = aws_accessanalyzer_analyzer.account.analyzer_name
  rule_name     = "approved-partner-access"

  filter {
    criteria = "principal.AWS"
    eq       = [var.partner_account_id]
  }

  filter {
    criteria = "resourceType"
    eq       = ["AWS::S3::Bucket"]
  }
}

# Archive rule for a known CloudFront-backed S3 origin bucket
resource "aws_accessanalyzer_archive_rule" "cloudfront_origin_bucket" {
  analyzer_name = aws_accessanalyzer_analyzer.account.analyzer_name
  rule_name     = "cloudfront-origin-bucket"

  filter {
    criteria = "resource"
    eq       = ["arn:aws:s3:::${var.origin_bucket_name}"]
  }

  filter {
    criteria = "resourceType"
    eq       = ["AWS::S3::Bucket"]
  }
}
```

## Step 4: Create EventBridge Rule for New Findings

```hcl
# Alert on new IAM Access Analyzer findings
resource "aws_cloudwatch_event_rule" "access_analyzer_findings" {
  name        = "access-analyzer-new-findings"
  description = "Alert when Access Analyzer creates new findings"

  event_pattern = jsonencode({
    source      = ["aws.access-analyzer"]
    detail-type = ["Access Analyzer Finding"]
    detail = {
      status = ["ACTIVE"]
    }
  })
}

resource "aws_cloudwatch_event_target" "finding_alert" {
  rule      = aws_cloudwatch_event_rule.access_analyzer_findings.name
  target_id = "SendToSNS"
  arn       = var.security_sns_topic_arn
}
```

## Step 5: Use Policy Validation

```bash
# Validate an IAM policy document for correctness before applying
aws accessanalyzer validate-policy \
  --policy-type IDENTITY_POLICY \
  --policy-document file://my-policy.json

# Validate a resource-based policy (e.g., S3 bucket policy)
aws accessanalyzer validate-policy \
  --policy-type RESOURCE_POLICY \
  --policy-document file://bucket-policy.json \
  --validate-policy-resource-type "AWS::S3::Bucket"

# List active findings
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/account-analyzer \
  --filter '{"status": {"eq": ["ACTIVE"]}}'
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

IAM Access Analyzer provides continuous monitoring for unintended resource exposure. Enable it in every AWS account and organization, configure archive rules for known-good configurations, and set up EventBridge alerts for new findings so your security team can respond promptly. Use the policy validation feature in CI/CD pipelines to catch IAM policy errors before deployment-it can identify errors like referencing non-existent actions or over-permissive wildcards.
