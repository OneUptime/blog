# How to Create Security Hub with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Security Hub, Terraform, Compliance

Description: Guide to enabling and configuring AWS Security Hub with Terraform, covering security standards, integrations, custom actions, and multi-account organization setup.

---

AWS Security Hub gives you a centralized view of your security posture across AWS accounts. It aggregates findings from GuardDuty, Inspector, Macie, and other security services into a single dashboard, then evaluates your environment against security standards like CIS Benchmarks, PCI DSS, and AWS Foundational Security Best Practices.

Think of it as the security command center for your AWS environment. Individual services detect threats and misconfigurations - Security Hub pulls everything together so you can see the full picture.

## Enabling Security Hub

The basic setup is straightforward. Enable Security Hub and choose which security standards to activate.

This enables Security Hub with the most common security standards:

```hcl
resource "aws_securityhub_account" "main" {}

# AWS Foundational Security Best Practices
resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.main]
}

# CIS AWS Foundations Benchmark v1.4.0
resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:us-east-1::standards/cis-aws-foundations-benchmark/v/1.4.0"

  depends_on = [aws_securityhub_account.main]
}

# PCI DSS (only if you handle payment card data)
resource "aws_securityhub_standards_subscription" "pci_dss" {
  standards_arn = "arn:aws:securityhub:us-east-1::standards/pci-dss/v/3.2.1"

  depends_on = [aws_securityhub_account.main]
}
```

A note on standards: each standard you enable generates Config rules behind the scenes. More standards means more Config rule evaluations, which means higher AWS Config costs. Enable only the standards that match your compliance requirements.

## Disabling Specific Controls

Not every control in a standard is relevant to every environment. You can disable individual controls that don't apply.

This disables specific controls that generate noise in your environment:

```hcl
# Disable the "IAM user MFA" check if you only use SSO
resource "aws_securityhub_standards_control" "iam_user_mfa" {
  standards_control_arn = "arn:aws:securityhub:us-east-1:${data.aws_caller_identity.current.account_id}:control/aws-foundational-security-best-practices/v/1.0.0/IAM.6"
  control_status        = "DISABLED"
  disabled_reason       = "We use SSO exclusively - no IAM user passwords"

  depends_on = [aws_securityhub_standards_subscription.aws_foundational]
}

# Disable CloudTrail multi-region check if handled by organization trail
resource "aws_securityhub_standards_control" "cloudtrail_multi_region" {
  standards_control_arn = "arn:aws:securityhub:us-east-1:${data.aws_caller_identity.current.account_id}:control/cis-aws-foundations-benchmark/v/1.4.0/3.1"
  control_status        = "DISABLED"
  disabled_reason       = "Multi-region CloudTrail is managed by the organization master account"

  depends_on = [aws_securityhub_standards_subscription.cis]
}

data "aws_caller_identity" "current" {}
```

## Enabling Product Integrations

Security Hub can receive findings from other AWS services and third-party products.

This enables integrations with GuardDuty, Inspector, and Macie:

```hcl
# GuardDuty integration
resource "aws_securityhub_product_subscription" "guardduty" {
  product_arn = "arn:aws:securityhub:us-east-1::product/aws/guardduty"

  depends_on = [aws_securityhub_account.main]
}

# Inspector integration
resource "aws_securityhub_product_subscription" "inspector" {
  product_arn = "arn:aws:securityhub:us-east-1::product/aws/inspector"

  depends_on = [aws_securityhub_account.main]
}

# Macie integration (for S3 data security)
resource "aws_securityhub_product_subscription" "macie" {
  product_arn = "arn:aws:securityhub:us-east-1::product/aws/macie"

  depends_on = [aws_securityhub_account.main]
}

# AWS Firewall Manager integration
resource "aws_securityhub_product_subscription" "firewall_manager" {
  product_arn = "arn:aws:securityhub:us-east-1::product/aws/firewall-manager"

  depends_on = [aws_securityhub_account.main]
}
```

## Organization-Wide Setup

In multi-account environments with AWS Organizations, designate an admin account and auto-enable Security Hub for all member accounts.

This configures Security Hub as an organization-wide service:

```hcl
# Designate admin account (run in the management account)
resource "aws_securityhub_organization_admin_account" "main" {
  admin_account_id = var.security_account_id
}

# In the admin account, configure organization settings
resource "aws_securityhub_organization_configuration" "main" {
  auto_enable           = true
  auto_enable_standards = "DEFAULT"

  depends_on = [aws_securityhub_account.main]
}
```

For individual member accounts:

```hcl
resource "aws_securityhub_member" "accounts" {
  for_each = var.member_accounts

  account_id = each.key
  email      = each.value

  depends_on = [aws_securityhub_account.main]
}

variable "member_accounts" {
  type = map(string)
  default = {
    "111111111111" = "dev@example.com"
    "222222222222" = "staging@example.com"
    "333333333333" = "prod@example.com"
  }
}
```

## Custom Actions

Custom actions let you take action on findings directly from the Security Hub console. They trigger EventBridge events that you can route to Lambda functions or other targets.

This creates a custom action for sending findings to a Slack channel:

```hcl
resource "aws_securityhub_action_target" "send_to_slack" {
  name        = "SendToSlack"
  identifier  = "SendToSlack"
  description = "Send finding details to the security Slack channel"

  depends_on = [aws_securityhub_account.main]
}

# EventBridge rule that triggers when the custom action is used
resource "aws_cloudwatch_event_rule" "securityhub_to_slack" {
  name = "securityhub-custom-action-slack"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Custom Action"]
    detail = {
      actionName = ["SendToSlack"]
    }
  })
}

resource "aws_cloudwatch_event_target" "slack_lambda" {
  rule      = aws_cloudwatch_event_rule.securityhub_to_slack.name
  target_id = "slack-notification"
  arn       = aws_lambda_function.slack_notifier.arn
}

resource "aws_lambda_permission" "securityhub_slack" {
  statement_id  = "AllowSecurityHub"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_notifier.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.securityhub_to_slack.arn
}
```

## Automated Findings Notifications

Route all new critical and high-severity findings to your alerting system.

This sends critical findings from Security Hub to SNS:

```hcl
resource "aws_cloudwatch_event_rule" "critical_findings" {
  name = "securityhub-critical-findings"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Severity = {
          Label = ["CRITICAL", "HIGH"]
        }
        Workflow = {
          Status = ["NEW"]
        }
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "critical_to_sns" {
  rule      = aws_cloudwatch_event_rule.critical_findings.name
  target_id = "critical-findings-sns"
  arn       = aws_sns_topic.security_alerts.arn
}

resource "aws_sns_topic" "security_alerts" {
  name = "security-hub-critical-alerts"
}

resource "aws_sns_topic_policy" "security_alerts" {
  arn = aws_sns_topic.security_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "events.amazonaws.com"
      }
      Action   = "SNS:Publish"
      Resource = aws_sns_topic.security_alerts.arn
    }]
  })
}
```

## Finding Aggregation Across Regions

If you operate in multiple regions, set up cross-region aggregation so you can see all findings in one place.

This configures finding aggregation to pull findings from all enabled regions:

```hcl
resource "aws_securityhub_finding_aggregator" "main" {
  linking_mode = "ALL_REGIONS"

  depends_on = [aws_securityhub_account.main]
}
```

You can also specify individual regions:

```hcl
resource "aws_securityhub_finding_aggregator" "specific" {
  linking_mode      = "SPECIFIED_REGIONS"
  specified_regions = ["us-east-1", "us-west-2", "eu-west-1"]

  depends_on = [aws_securityhub_account.main]
}
```

## Insight Rules

Insights are saved filters that group findings by specific attributes.

This creates an insight that shows findings grouped by AWS account:

```hcl
resource "aws_securityhub_insight" "by_account" {
  name               = "Findings by Account"
  group_by_attribute = "AwsAccountId"

  filters {
    workflow_status {
      comparison = "EQUALS"
      value      = "NEW"
    }

    severity_label {
      comparison = "EQUALS"
      value      = "CRITICAL"
    }
  }

  depends_on = [aws_securityhub_account.main]
}
```

## Prerequisites

Security Hub relies on AWS Config for its security standards checks. Make sure Config is enabled first. See our guide on [enabling AWS Config with Terraform](https://oneuptime.com/blog/post/enable-aws-config-terraform/view) for the full setup.

Also, enable GuardDuty for threat detection findings that feed into Security Hub. We cover that in our [GuardDuty setup guide](https://oneuptime.com/blog/post/create-guardduty-detector-terraform/view).

## Wrapping Up

Security Hub is the aggregation point for your AWS security posture. Enable it with the standards that match your compliance needs, integrate it with GuardDuty and other detection services, and set up notifications for critical findings. In multi-account environments, the organization-wide setup ensures every account is monitored from day one. The custom actions feature is particularly useful for building quick-response workflows when security issues arise.
