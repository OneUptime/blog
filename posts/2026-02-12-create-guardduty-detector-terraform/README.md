# How to Create GuardDuty Detector with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, GuardDuty, Terraform, Security

Description: Step-by-step guide to enabling and configuring AWS GuardDuty with Terraform, including multi-account setup, finding notifications, and automated remediation.

---

AWS GuardDuty is a threat detection service that continuously monitors your AWS accounts for malicious activity. It analyzes CloudTrail logs, VPC Flow Logs, and DNS query logs to identify threats like compromised instances, unauthorized access, and cryptocurrency mining. The best part is there's no infrastructure to manage - you just enable it and it starts working.

Getting GuardDuty running in Terraform is quick. The real work is in setting up notifications, multi-account management, and automated responses to findings.

## Enabling GuardDuty

The core resource is the detector. Enabling it is a single resource.

This enables GuardDuty with all available data sources:

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  # Publish findings to CloudWatch Events every 15 minutes
  finding_publishing_frequency = "FIFTEEN_MINUTES"

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

  tags = {
    ManagedBy   = "terraform"
    Environment = "production"
  }
}
```

That's it for the basic setup. GuardDuty starts analyzing your logs immediately. But without notifications, you'll only see findings if someone checks the console.

## Setting Up Finding Notifications

GuardDuty publishes findings to EventBridge. You can route these to SNS, Lambda, or any other EventBridge target.

This sends all GuardDuty findings to an SNS topic:

```hcl
resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name        = "guardduty-findings"
  description = "Route GuardDuty findings to SNS"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
  })
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_findings.name
  target_id = "guardduty-to-sns"
  arn       = aws_sns_topic.security_alerts.arn

  input_transformer {
    input_paths = {
      severity    = "$.detail.severity"
      title       = "$.detail.title"
      description = "$.detail.description"
      account     = "$.detail.accountId"
      region      = "$.detail.region"
      type        = "$.detail.type"
    }

    input_template = "\"GuardDuty Finding in <account> (<region>)\\nSeverity: <severity>\\nType: <type>\\nTitle: <title>\\nDescription: <description>\""
  }
}

resource "aws_sns_topic" "security_alerts" {
  name = "security-alerts"
}

resource "aws_sns_topic_policy" "security_alerts" {
  arn = aws_sns_topic.security_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowEventBridge"
      Effect = "Allow"
      Principal = {
        Service = "events.amazonaws.com"
      }
      Action   = "SNS:Publish"
      Resource = aws_sns_topic.security_alerts.arn
    }]
  })
}

resource "aws_sns_topic_subscription" "security_email" {
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = "security-team@example.com"
}
```

## Filtering by Severity

You probably don't want to get paged for every low-severity finding at 3 AM. Create separate rules for different severity levels.

This routes high-severity findings to PagerDuty and lower-severity findings to a Slack channel:

```hcl
# High severity findings (7.0-8.9) - page the on-call
resource "aws_cloudwatch_event_rule" "guardduty_high" {
  name = "guardduty-high-severity"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{
        numeric = [">=", 7.0]
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_high_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_high.name
  target_id = "high-severity-pagerduty"
  arn       = aws_sns_topic.pagerduty.arn
}

# Medium severity findings (4.0-6.9) - send to Slack
resource "aws_cloudwatch_event_rule" "guardduty_medium" {
  name = "guardduty-medium-severity"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{
        numeric = [">=", 4.0, "<", 7.0]
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_medium_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_medium.name
  target_id = "medium-severity-slack"
  arn       = aws_sns_topic.slack_alerts.arn
}

resource "aws_sns_topic" "pagerduty" {
  name = "guardduty-pagerduty"
}

resource "aws_sns_topic" "slack_alerts" {
  name = "guardduty-slack"
}
```

## Suppression Filters

Some findings are expected in your environment. Rather than ignoring them, create suppression filters to automatically archive them.

This suppression filter ignores DNS findings from a known internal DNS resolver:

```hcl
resource "aws_guardduty_filter" "suppress_internal_dns" {
  name        = "suppress-internal-dns"
  action      = "ARCHIVE"
  detector_id = aws_guardduty_detector.main.id
  rank        = 1

  finding_criteria {
    criterion {
      field  = "type"
      equals = ["Trojan:EC2/DNSDataExfiltration"]
    }

    criterion {
      field  = "resource.instanceDetails.instanceId"
      equals = ["i-0abc123def456789"]  # Your internal DNS resolver
    }
  }
}
```

## Multi-Account Setup

In AWS Organizations, you designate an administrator account for GuardDuty that can manage member accounts.

This configures the administrator account and adds member accounts:

```hcl
# In the administrator account
resource "aws_guardduty_organization_admin_account" "main" {
  admin_account_id = data.aws_caller_identity.current.account_id
}

# Enable auto-enrollment for new accounts in the organization
resource "aws_guardduty_organization_configuration" "main" {
  auto_enable_organization_members = "ALL"
  detector_id                      = aws_guardduty_detector.main.id

  datasources {
    s3_logs {
      auto_enable = true
    }

    kubernetes {
      audit_logs {
        enable = true
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

data "aws_caller_identity" "current" {}
```

For member accounts that are already part of the organization:

```hcl
resource "aws_guardduty_member" "member_account" {
  account_id  = "111111111111"
  detector_id = aws_guardduty_detector.main.id
  email       = "admin@member-account.example.com"
  invite      = true
}
```

## Trusted IP Lists and Threat Lists

You can tell GuardDuty about IP addresses it should trust (like your VPN exit points) and custom threat intelligence feeds.

This uploads a trusted IP list and a threat intelligence feed:

```hcl
resource "aws_s3_object" "trusted_ips" {
  bucket  = aws_s3_bucket.guardduty_lists.id
  key     = "trusted-ips.txt"
  content = <<-EOF
    203.0.113.0/24
    198.51.100.0/24
  EOF
}

resource "aws_guardduty_ipset" "trusted" {
  activate    = true
  detector_id = aws_guardduty_detector.main.id
  format      = "TXT"
  location    = "s3://${aws_s3_bucket.guardduty_lists.id}/trusted-ips.txt"
  name        = "trusted-ips"

  depends_on = [aws_s3_object.trusted_ips]
}

resource "aws_s3_object" "threat_ips" {
  bucket  = aws_s3_bucket.guardduty_lists.id
  key     = "threat-ips.txt"
  content = <<-EOF
    192.0.2.0/24
    100.64.0.0/10
  EOF
}

resource "aws_guardduty_threatintelset" "custom" {
  activate    = true
  detector_id = aws_guardduty_detector.main.id
  format      = "TXT"
  location    = "s3://${aws_s3_bucket.guardduty_lists.id}/threat-ips.txt"
  name        = "custom-threats"

  depends_on = [aws_s3_object.threat_ips]
}

resource "aws_s3_bucket" "guardduty_lists" {
  bucket = "guardduty-ip-lists-${data.aws_caller_identity.current.account_id}"
}
```

## Automated Remediation

For certain finding types, you can automatically respond with a Lambda function. A common pattern is automatically blocking compromised instance network access.

This Lambda function isolates an EC2 instance when GuardDuty detects it's been compromised:

```hcl
resource "aws_cloudwatch_event_rule" "compromised_instance" {
  name = "guardduty-compromised-instance"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      type = [
        "CryptoCurrency:EC2/BitcoinTool.B",
        "CryptoCurrency:EC2/BitcoinTool.B!DNS",
        "Backdoor:EC2/C&CActivity.B",
        "Backdoor:EC2/C&CActivity.B!DNS"
      ]
    }
  })
}

resource "aws_cloudwatch_event_target" "isolate_instance" {
  rule      = aws_cloudwatch_event_rule.compromised_instance.name
  target_id = "isolate-instance"
  arn       = aws_lambda_function.isolate_instance.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.isolate_instance.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.compromised_instance.arn
}
```

For setting up the notification pipeline using EventBridge, see our guide on [EventBridge rules with Terraform](https://oneuptime.com/blog/post/create-eventbridge-rules-terraform/view).

## Cost Considerations

GuardDuty pricing is based on the volume of data it analyzes. The first 30 days are free, and after that you pay per GB for CloudTrail events, VPC Flow Logs, and DNS logs. For most accounts, this runs between $1 and $50 per month, which is a small price for continuous threat detection.

## Wrapping Up

GuardDuty is one of the easiest security services to enable, and there's very little reason not to run it in every AWS account. The detector itself is a one-liner in Terraform. The real value comes from the notification pipeline, severity-based routing, and automated remediation. Start with the detector and SNS notifications, then add suppression filters as you learn what's normal for your environment, and gradually build out automated responses for the most critical finding types.
