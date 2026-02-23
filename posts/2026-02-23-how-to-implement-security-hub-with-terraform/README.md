# How to Implement Security Hub with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Security Hub, Compliance, Security

Description: Deploy AWS Security Hub with Terraform to centralize security findings, enable compliance standards, and automate security posture management across accounts.

---

AWS Security Hub gives you a centralized view of your security posture across AWS accounts and services. It aggregates findings from GuardDuty, Inspector, Macie, Firewall Manager, and third-party tools into a single dashboard. It also runs automated compliance checks against standards like CIS Benchmarks, PCI DSS, and AWS Foundational Security Best Practices. Managing it with Terraform ensures every account in your organization has consistent security monitoring.

## Enable Security Hub

Start by enabling Security Hub with the compliance standards you need:

```hcl
# Enable Security Hub
resource "aws_securityhub_account" "main" {}

# Enable AWS Foundational Security Best Practices
resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:aws:securityhub:${var.region}::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.main]
}

# Enable CIS AWS Foundations Benchmark
resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"

  depends_on = [aws_securityhub_account.main]
}

# Enable PCI DSS (if needed for compliance)
resource "aws_securityhub_standards_subscription" "pci_dss" {
  count = var.enable_pci_dss ? 1 : 0

  standards_arn = "arn:aws:securityhub:${var.region}::standards/pci-dss/v/3.2.1"

  depends_on = [aws_securityhub_account.main]
}

# Enable NIST 800-53 (if needed)
resource "aws_securityhub_standards_subscription" "nist" {
  count = var.enable_nist ? 1 : 0

  standards_arn = "arn:aws:securityhub:${var.region}::standards/nist-800-53/v/5.0.0"

  depends_on = [aws_securityhub_account.main]
}
```

## Organization-Wide Setup

For multi-account environments, designate a security account as the Security Hub administrator:

```hcl
# In the management account: designate admin
resource "aws_securityhub_organization_admin_account" "security" {
  provider = aws.management

  admin_account_id = var.security_account_id

  depends_on = [aws_securityhub_account.management]
}

# In the security account: configure organization settings
resource "aws_securityhub_organization_configuration" "main" {
  provider = aws.security

  auto_enable = true
  auto_enable_standards = "DEFAULT"

  depends_on = [aws_securityhub_organization_admin_account.security]
}

# Enable member accounts
resource "aws_securityhub_member" "accounts" {
  for_each = var.member_accounts

  provider = aws.security

  account_id = each.key
  email      = each.value.email
  invite     = true

  depends_on = [aws_securityhub_account.security]
}
```

## Configure Finding Aggregation

Aggregate findings from all regions into a single region for easier management:

```hcl
# Enable cross-region finding aggregation
resource "aws_securityhub_finding_aggregator" "main" {
  linking_mode = "ALL_REGIONS"

  depends_on = [aws_securityhub_account.main]
}
```

If you only want specific regions:

```hcl
resource "aws_securityhub_finding_aggregator" "selected" {
  linking_mode      = "SPECIFIED_REGIONS"
  specified_regions = ["us-east-1", "us-west-2", "eu-west-1"]

  depends_on = [aws_securityhub_account.main]
}
```

## Enable Product Integrations

Connect other AWS security services to Security Hub:

```hcl
# Enable GuardDuty integration
resource "aws_securityhub_product_subscription" "guardduty" {
  product_arn = "arn:aws:securityhub:${var.region}::product/aws/guardduty"

  depends_on = [aws_securityhub_account.main]
}

# Enable Inspector integration
resource "aws_securityhub_product_subscription" "inspector" {
  product_arn = "arn:aws:securityhub:${var.region}::product/aws/inspector"

  depends_on = [aws_securityhub_account.main]
}

# Enable Macie integration
resource "aws_securityhub_product_subscription" "macie" {
  product_arn = "arn:aws:securityhub:${var.region}::product/aws/macie"

  depends_on = [aws_securityhub_account.main]
}

# Enable Firewall Manager integration
resource "aws_securityhub_product_subscription" "firewall_manager" {
  product_arn = "arn:aws:securityhub:${var.region}::product/aws/firewall-manager"

  depends_on = [aws_securityhub_account.main]
}
```

## Disable Specific Controls

Some security controls might not be relevant to your environment. Disable them explicitly rather than ignoring them:

```hcl
# Disable controls that are not applicable
resource "aws_securityhub_standards_control" "disable_s3_logging" {
  standards_control_arn = "arn:aws:securityhub:${var.region}:${data.aws_caller_identity.current.account_id}:control/aws-foundational-security-best-practices/v/1.0.0/S3.9"
  control_status        = "DISABLED"
  disabled_reason       = "S3 access logging is handled by CloudTrail data events"

  depends_on = [aws_securityhub_standards_subscription.aws_foundational]
}

# Use a map for bulk disabling
variable "disabled_controls" {
  type = map(string)
  default = {
    "S3.9"     = "S3 access logging handled by CloudTrail data events"
    "EC2.8"    = "IMDSv2 enforcement in progress, tracked in JIRA-1234"
    "IAM.6"    = "Hardware MFA for root handled by physical security team"
  }
}

resource "aws_securityhub_standards_control" "disabled" {
  for_each = var.disabled_controls

  standards_control_arn = "arn:aws:securityhub:${var.region}:${data.aws_caller_identity.current.account_id}:control/aws-foundational-security-best-practices/v/1.0.0/${each.key}"
  control_status        = "DISABLED"
  disabled_reason       = each.value

  depends_on = [aws_securityhub_standards_subscription.aws_foundational]
}
```

## Set Up Automated Notifications

Route Security Hub findings to your team through EventBridge:

```hcl
# EventBridge rule for critical and high findings
resource "aws_cloudwatch_event_rule" "securityhub_findings" {
  name        = "securityhub-critical-findings"
  description = "Route critical Security Hub findings"

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
        RecordState = ["ACTIVE"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "securityhub_sns" {
  rule      = aws_cloudwatch_event_rule.securityhub_findings.name
  target_id = "securityhub-to-sns"
  arn       = aws_sns_topic.security_hub_alerts.arn
}

# SNS topic with encryption
resource "aws_sns_topic" "security_hub_alerts" {
  name              = "security-hub-alerts"
  kms_master_key_id = aws_kms_key.security.id
}

resource "aws_sns_topic_policy" "security_hub_alerts" {
  arn = aws_sns_topic.security_hub_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.security_hub_alerts.arn
      }
    ]
  })
}
```

## Create Custom Actions

Custom actions let security teams trigger workflows directly from the Security Hub console:

```hcl
# Custom action for sending findings to a remediation queue
resource "aws_securityhub_action_target" "remediate" {
  name        = "SendToRemediation"
  identifier  = "SendToRemediation"
  description = "Send finding to the remediation queue"

  depends_on = [aws_securityhub_account.main]
}

# EventBridge rule that triggers when the custom action is used
resource "aws_cloudwatch_event_rule" "remediation_action" {
  name = "securityhub-remediation-action"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Custom Action"]
    resources   = [aws_securityhub_action_target.remediate.arn]
  })
}

# Route to SQS for processing
resource "aws_cloudwatch_event_target" "remediation_queue" {
  rule      = aws_cloudwatch_event_rule.remediation_action.name
  target_id = "remediation-queue"
  arn       = aws_sqs_queue.remediation.arn
}
```

## Create a Custom Insight

Custom insights are saved filters that help you focus on specific security patterns:

```hcl
resource "aws_securityhub_insight" "unresolved_critical" {
  name               = "Unresolved Critical Findings"
  group_by_attribute = "ResourceType"

  filters {
    severity_label {
      comparison = "EQUALS"
      value      = "CRITICAL"
    }
    workflow_status {
      comparison = "EQUALS"
      value      = "NEW"
    }
    record_state {
      comparison = "EQUALS"
      value      = "ACTIVE"
    }
  }

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_insight" "failed_by_resource" {
  name               = "Failed Controls by Resource"
  group_by_attribute = "ResourceId"

  filters {
    compliance_status {
      comparison = "EQUALS"
      value      = "FAILED"
    }
    record_state {
      comparison = "EQUALS"
      value      = "ACTIVE"
    }
  }

  depends_on = [aws_securityhub_account.main]
}
```

## Multi-Region Deployment

Deploy Security Hub across all active regions using a module:

```hcl
# Deploy Security Hub in each region
module "security_hub" {
  source = "./modules/security-hub"

  for_each = toset(var.enabled_regions)

  providers = {
    aws = aws.regional[each.key]
  }

  region               = each.key
  enable_cis           = true
  enable_pci_dss       = var.pci_dss_required
  security_team_email  = var.security_team_email
}
```

## Summary

Security Hub with Terraform provides a centralized security posture management system that scales across accounts and regions. Start by enabling it with the compliance standards you need, connect your security services as data sources, configure finding aggregation, and build notification pipelines for critical issues. The real power comes from treating Security Hub configuration as code, so every account gets the same standards, controls, and alerting from the moment it is created.

For related guides, see [how to implement CIS Benchmarks with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cis-benchmarks-with-terraform/view) and [how to handle Terraform with compliance frameworks](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-with-compliance-frameworks-soc2-pci-hipaa/view).
