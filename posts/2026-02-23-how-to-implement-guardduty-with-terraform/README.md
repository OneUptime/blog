# How to Implement GuardDuty with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, GuardDuty, Security, Threat Detection

Description: Deploy and configure AWS GuardDuty with Terraform for automated threat detection including multi-account setup, notification pipelines, and finding management.

---

AWS GuardDuty is a managed threat detection service that continuously monitors your AWS accounts and workloads for malicious activity. It analyzes CloudTrail logs, VPC Flow Logs, and DNS logs to identify threats like compromised instances, reconnaissance attacks, and account compromise. Setting it up with Terraform means every account in your organization gets consistent threat detection from day one.

This guide covers deploying GuardDuty with Terraform, from single-account setup to organization-wide deployment with automated response.

## Basic GuardDuty Setup

Enabling GuardDuty in a single account is straightforward:

```hcl
# Enable GuardDuty detector
resource "aws_guardduty_detector" "main" {
  enable = true

  # Enable optional data sources
  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  # Set finding publishing frequency
  # Options: FIFTEEN_MINUTES, ONE_HOUR, SIX_HOURS
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = {
    Name        = "guardduty-detector"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

The `finding_publishing_frequency` controls how often GuardDuty publishes updated findings to EventBridge and other consumers. For security-critical environments, use `FIFTEEN_MINUTES`.

## Organization-Wide Deployment

If you use AWS Organizations, you can enable GuardDuty across all accounts from a delegated administrator:

```hcl
# Designate a security account as the GuardDuty administrator
resource "aws_guardduty_organization_admin_account" "security" {
  provider = aws.management_account

  admin_account_id = var.security_account_id
}

# In the security account, enable auto-enrollment for new accounts
resource "aws_guardduty_organization_configuration" "main" {
  provider = aws.security_account

  auto_enable_organization_members = "ALL"
  detector_id                      = aws_guardduty_detector.main.id

  datasources {
    s3_logs {
      auto_enable = true
    }
    kubernetes {
      audit_logs {
        auto_enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          auto_enable = true
        }
      }
    }
  }
}
```

For existing member accounts that need to be enrolled:

```hcl
# Invite existing accounts
resource "aws_guardduty_member" "accounts" {
  for_each = var.member_accounts

  account_id  = each.key
  detector_id = aws_guardduty_detector.main.id
  email       = each.value.email

  invite                      = true
  disable_email_notification = true

  lifecycle {
    ignore_changes = [email]
  }
}
```

## Set Up Finding Notifications

GuardDuty publishes findings to EventBridge. You can route these to SNS, Lambda, or any other target:

```hcl
# EventBridge rule for GuardDuty findings
resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name        = "guardduty-findings"
  description = "Capture GuardDuty findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [
        { numeric = [">=", 4] }  # Medium severity and above
      ]
    }
  })

  tags = {
    Name = "guardduty-findings-rule"
  }
}

# Send findings to SNS
resource "aws_cloudwatch_event_target" "guardduty_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_findings.name
  target_id = "guardduty-to-sns"
  arn       = aws_sns_topic.security_findings.arn

  input_transformer {
    input_paths = {
      severity    = "$.detail.severity"
      type        = "$.detail.type"
      description = "$.detail.description"
      account     = "$.detail.accountId"
      region      = "$.detail.region"
    }
    input_template = <<EOF
"GuardDuty Finding: <type> (Severity: <severity>) in account <account> (<region>). <description>"
EOF
  }
}

# SNS topic for security findings
resource "aws_sns_topic" "security_findings" {
  name              = "guardduty-security-findings"
  kms_master_key_id = aws_kms_key.security.id
}

resource "aws_sns_topic_policy" "security_findings" {
  arn = aws_sns_topic.security_findings.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgePublish"
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

# Email subscription for the security team
resource "aws_sns_topic_subscription" "security_email" {
  topic_arn = aws_sns_topic.security_findings.arn
  protocol  = "email"
  endpoint  = var.security_team_email
}
```

## Automated Response with Lambda

For high-severity findings, you might want automated response:

```hcl
# Lambda function for automated remediation
resource "aws_lambda_function" "guardduty_response" {
  filename         = data.archive_file.guardduty_response.output_path
  function_name    = "guardduty-auto-response"
  role             = aws_iam_role.guardduty_response.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.guardduty_response.output_base64sha256
  runtime          = "python3.12"
  timeout          = 60

  environment {
    variables = {
      QUARANTINE_SG_ID = aws_security_group.quarantine.id
      SNS_TOPIC_ARN    = aws_sns_topic.security_findings.arn
    }
  }
}

# EventBridge rule for high severity findings only
resource "aws_cloudwatch_event_rule" "guardduty_high_severity" {
  name        = "guardduty-high-severity"
  description = "Capture high severity GuardDuty findings for auto-response"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [
        { numeric = [">=", 7] }  # High severity threshold
      ]
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_lambda" {
  rule      = aws_cloudwatch_event_rule.guardduty_high_severity.name
  target_id = "guardduty-auto-response"
  arn       = aws_lambda_function.guardduty_response.arn
}

resource "aws_lambda_permission" "guardduty_invoke" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.guardduty_response.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.guardduty_high_severity.arn
}

# Quarantine security group for compromised instances
resource "aws_security_group" "quarantine" {
  name        = "quarantine-sg"
  description = "Quarantine SG - no inbound or outbound traffic"
  vpc_id      = var.vpc_id

  # No ingress or egress rules - completely isolated
  tags = {
    Name = "quarantine-sg"
  }
}
```

## Manage Trusted IP Lists and Threat Lists

GuardDuty supports trusted IP lists (to suppress findings from known IPs) and threat intelligence lists (to flag traffic to known bad IPs):

```hcl
# Upload a trusted IP list (e.g., your office IPs)
resource "aws_s3_object" "trusted_ips" {
  bucket  = aws_s3_bucket.guardduty_lists.id
  key     = "trusted-ips.txt"
  content = join("\n", var.trusted_ip_cidrs)
}

resource "aws_guardduty_ipset" "trusted" {
  activate    = true
  detector_id = aws_guardduty_detector.main.id
  format      = "TXT"
  location    = "s3://${aws_s3_object.trusted_ips.bucket}/${aws_s3_object.trusted_ips.key}"
  name        = "trusted-ips"
}

# Upload a custom threat intelligence list
resource "aws_s3_object" "threat_ips" {
  bucket  = aws_s3_bucket.guardduty_lists.id
  key     = "threat-intel.txt"
  content = join("\n", var.threat_intel_ips)
}

resource "aws_guardduty_threatintelset" "custom" {
  activate    = true
  detector_id = aws_guardduty_detector.main.id
  format      = "TXT"
  location    = "s3://${aws_s3_object.threat_ips.bucket}/${aws_s3_object.threat_ips.key}"
  name        = "custom-threat-intel"
}
```

## Suppress Known False Positives

Use suppression filters to reduce noise from known benign patterns:

```hcl
# Suppress findings from a known scanning tool
resource "aws_guardduty_filter" "suppress_scanner" {
  name        = "suppress-internal-scanner"
  action      = "ARCHIVE"
  detector_id = aws_guardduty_detector.main.id
  rank        = 1

  finding_criteria {
    criterion {
      field  = "service.action.networkConnectionAction.remoteIpDetails.ipAddressV4"
      equals = var.security_scanner_ips
    }
    criterion {
      field  = "type"
      equals = ["Recon:EC2/PortProbeUnprotectedPort"]
    }
  }
}
```

## Export Findings to S3

For long-term retention and analysis, export findings to S3:

```hcl
resource "aws_guardduty_publishing_destination" "s3" {
  detector_id     = aws_guardduty_detector.main.id
  destination_arn = aws_s3_bucket.guardduty_findings.arn
  kms_key_arn     = aws_kms_key.security.arn

  depends_on = [aws_s3_bucket_policy.guardduty_findings]
}
```

## Summary

GuardDuty with Terraform gives you automated, consistent threat detection across your AWS environment. The setup involves enabling the detector with all data sources, configuring organization-wide enrollment, building a notification pipeline through EventBridge and SNS, and optionally adding automated response for high-severity findings. Once running, GuardDuty works in the background analyzing billions of events to surface actual threats.

For a complete security monitoring stack, combine this with [CloudTrail logging](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cloudtrail-logging-with-terraform/view) and [Security Hub](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-security-hub-with-terraform/view).
