# How to Set Up AWS GuardDuty with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, GuardDuty, Security, Threat Detection, Infrastructure as Code

Description: Learn how to enable and configure AWS GuardDuty with OpenTofu to continuously monitor for malicious activity and unauthorized behavior across your AWS accounts.

## Introduction

AWS GuardDuty is a managed threat detection service that analyzes CloudTrail events, VPC Flow Logs, and DNS logs to identify malicious activity like crypto mining, compromised instances, unauthorized access, and data exfiltration. It uses ML, anomaly detection, and integrated threat intelligence without requiring agents or additional log ingestion.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with permissions for GuardDuty, S3, EventBridge, SNS, IAM, and AWS Organizations

## Step 1: Enable GuardDuty Detector

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  finding_publishing_frequency = "SIX_HOURS"  # FIFTEEN_MINUTES, ONE_HOUR, or SIX_HOURS

  tags = {
    Name        = "${var.project_name}-guardduty"
    Environment = var.environment
  }
}

resource "aws_guardduty_detector_feature" "s3_data_events" {
  detector_id = aws_guardduty_detector.main.id
  name        = "S3_DATA_EVENTS"
  status      = "ENABLED"  # Analyze S3 data plane events
}

resource "aws_guardduty_detector_feature" "eks_audit_logs" {
  detector_id = aws_guardduty_detector.main.id
  name        = "EKS_AUDIT_LOGS"
  status      = "ENABLED"  # Analyze EKS audit logs
}

resource "aws_guardduty_detector_feature" "ebs_malware_protection" {
  detector_id = aws_guardduty_detector.main.id
  name        = "EBS_MALWARE_PROTECTION"
  status      = "ENABLED"  # Scan EBS volumes for malware
}
```

## Step 2: Add Trusted IP List (Whitelist)

```hcl
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "guardduty_lists" {
  bucket = "${var.project_name}-guardduty-lists-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_object" "trusted_ips" {
  bucket  = aws_s3_bucket.guardduty_lists.id
  key     = "trusted-ips.txt"
  content = join("\n", var.trusted_ip_ranges)  # e.g., ["10.0.0.0/8", "172.16.0.0/12"]
}

resource "aws_guardduty_ipset" "trusted" {
  activate    = true
  detector_id = aws_guardduty_detector.main.id
  format      = "TXT"
  location    = "s3://${aws_s3_bucket.guardduty_lists.id}/${aws_s3_object.trusted_ips.key}"
  name        = "TrustedIPRanges"
}
```

## Step 3: Configure Findings via EventBridge

```hcl
# Route HIGH and CRITICAL severity GuardDuty findings to SNS

data "aws_iam_policy_document" "guardduty_sns" {
  statement {
    effect  = "Allow"
    actions = ["SNS:Publish"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    resources = [var.security_sns_topic_arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_cloudwatch_event_rule.guardduty_high_findings.arn]
    }
  }
}

resource "aws_sns_topic_policy" "guardduty_sns" {
  arn    = var.security_sns_topic_arn
  policy = data.aws_iam_policy_document.guardduty_sns.json
}

resource "aws_cloudwatch_event_rule" "guardduty_high_findings" {
  name        = "${var.project_name}-guardduty-high-severity"
  description = "Alert on HIGH and CRITICAL severity GuardDuty findings"

  event_pattern = jsonencode({
    source        = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", 7] }]  # HIGH (7-8.9) and CRITICAL (9-10)
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  depends_on = [aws_sns_topic_policy.guardduty_sns]
  rule      = aws_cloudwatch_event_rule.guardduty_high_findings.name
  target_id = "guardduty-alert"
  arn       = var.security_sns_topic_arn

  input_transformer {
    input_paths = {
      severity    = "$.detail.severity"
      type        = "$.detail.type"
      description = "$.detail.description"
      account     = "$.detail.accountId"
      region      = "$.region"
    }
    input_template = "\"GuardDuty ALERT: <type> in account <account> (<region>). Severity: <severity>. <description>\""
  }
}
```

## Step 4: Multi-Account Organization Setup

```hcl
# Run this in the AWS Organizations management account
resource "aws_guardduty_organization_admin_account" "main" {
  admin_account_id = var.security_account_id
}

# Run the following in the delegated GuardDuty administrator account
resource "aws_guardduty_organization_configuration" "main" {
  detector_id                      = aws_guardduty_detector.main.id
  auto_enable_organization_members = "ALL"  # or "NEW" / "NONE"
}

resource "aws_guardduty_organization_configuration_feature" "s3_data_events" {
  depends_on  = [aws_guardduty_organization_configuration.main]
  detector_id  = aws_guardduty_detector.main.id
  name         = "S3_DATA_EVENTS"
  auto_enable  = "ALL"
}

resource "aws_guardduty_organization_configuration_feature" "eks_audit_logs" {
  depends_on  = [aws_guardduty_organization_configuration.main]
  detector_id  = aws_guardduty_detector.main.id
  name         = "EKS_AUDIT_LOGS"
  auto_enable  = "ALL"
}

resource "aws_guardduty_organization_configuration_feature" "ebs_malware_protection" {
  depends_on  = [aws_guardduty_organization_configuration.main]
  detector_id  = aws_guardduty_detector.main.id
  name         = "EBS_MALWARE_PROTECTION"
  auto_enable  = "ALL"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check GuardDuty findings
aws guardduty list-findings \
  --detector-id <detector-id> \
  --finding-criteria '{"Criterion":{"severity":{"Gte":7}}}'
```

## Conclusion

GuardDuty should be enabled in every AWS account and region-the cost is based on data analyzed and is minimal compared to the security value. Enable S3 protection and EKS audit log monitoring for comprehensive coverage beyond EC2 and CloudTrail. For multi-account deployments, use Organizations integration to auto-enable GuardDuty in all current and future accounts and centralize findings in a security account.
