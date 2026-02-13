# How to Enable AWS Security Hub for Centralized Security Findings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Security Hub, Security, Compliance, Centralization

Description: Learn how to enable AWS Security Hub to centralize security findings from GuardDuty, Config, Inspector, and other AWS services into a single unified dashboard.

---

Every AWS security service generates its own findings in its own format in its own console. GuardDuty has threat detections. AWS Config has compliance violations. Inspector has vulnerability assessments. Firewall Manager has policy violations. If your security team is bouncing between all these dashboards, they're wasting time and missing connections between findings.

AWS Security Hub pulls all of this together. It aggregates findings from AWS security services and third-party tools into one dashboard with a normalized format. It also runs its own compliance checks based on industry standards like CIS and PCI DSS. Think of it as the central nervous system for your AWS security posture.

## What Security Hub Does

Security Hub serves three main functions:

1. **Finding aggregation** - Collects findings from GuardDuty, Config, Inspector, Firewall Manager, IAM Access Analyzer, and third-party products
2. **Compliance standards** - Runs automated security checks against frameworks like CIS AWS Foundations Benchmark and PCI DSS
3. **Custom insights** - Lets you create saved queries to track specific security metrics

All findings are normalized to the AWS Security Finding Format (ASFF), which means you can compare and correlate findings across services regardless of where they originated.

## Enabling Security Hub

Enabling Security Hub is quick. You can do it through the console or CLI.

```bash
# Enable Security Hub with default standards
aws securityhub enable-security-hub \
  --enable-default-standards

# Or enable without default standards (add them manually later)
aws securityhub enable-security-hub \
  --no-enable-default-standards
```

The `--enable-default-standards` flag automatically enables the CIS AWS Foundations Benchmark and the AWS Foundational Security Best Practices standard. If you want to be selective about which standards to enable, use `--no-enable-default-standards`.

Verify it's enabled.

```bash
# Check Security Hub status
aws securityhub describe-hub
```

## Enabling Compliance Standards

Security Hub comes with several compliance standards you can enable. Each standard consists of dozens of automated checks.

```bash
# List available standards
aws securityhub describe-standards

# Enable CIS AWS Foundations Benchmark v1.4.0
aws securityhub batch-enable-standards \
  --standards-subscription-requests '[{
    "StandardsArn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"
  }]'

# Enable AWS Foundational Security Best Practices
aws securityhub batch-enable-standards \
  --standards-subscription-requests '[{
    "StandardsArn": "arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0"
  }]'

# Enable PCI DSS
aws securityhub batch-enable-standards \
  --standards-subscription-requests '[{
    "StandardsArn": "arn:aws:securityhub:us-east-1::standards/pci-dss/v/3.2.1"
  }]'
```

For more details on compliance standards, see [using Security Hub compliance standards](https://oneuptime.com/blog/post/2026-02-12-security-hub-compliance-standards-cis-pci/view).

## Enabling Product Integrations

Enable integrations with other AWS services to start receiving their findings.

```bash
# Enable GuardDuty integration
aws securityhub enable-import-findings-for-product \
  --product-arn "arn:aws:securityhub:us-east-1::product/aws/guardduty"

# Enable Inspector integration
aws securityhub enable-import-findings-for-product \
  --product-arn "arn:aws:securityhub:us-east-1::product/aws/inspector"

# Enable IAM Access Analyzer integration
aws securityhub enable-import-findings-for-product \
  --product-arn "arn:aws:securityhub:us-east-1::product/aws/access-analyzer"

# Enable Firewall Manager integration
aws securityhub enable-import-findings-for-product \
  --product-arn "arn:aws:securityhub:us-east-1::product/aws/firewall-manager"
```

List all available product integrations.

```bash
# See what products can integrate with Security Hub
aws securityhub describe-products --query 'Products[].{Name:ProductName,ARN:ProductArn}' --output table
```

## Terraform Configuration

Here's the complete Terraform setup for Security Hub.

```hcl
# Enable Security Hub
resource "aws_securityhub_account" "main" {}

# Enable CIS Benchmark
resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.main]
}

# Enable AWS Foundational Security Best Practices
resource "aws_securityhub_standards_subscription" "aws_best_practices" {
  standards_arn = "arn:aws:securityhub:${data.aws_region.current.name}::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}

# Enable PCI DSS
resource "aws_securityhub_standards_subscription" "pci" {
  standards_arn = "arn:aws:securityhub:${data.aws_region.current.name}::standards/pci-dss/v/3.2.1"
  depends_on    = [aws_securityhub_account.main]
}

# Enable GuardDuty integration
resource "aws_securityhub_product_subscription" "guardduty" {
  product_arn = "arn:aws:securityhub:${data.aws_region.current.name}::product/aws/guardduty"
  depends_on  = [aws_securityhub_account.main]
}

# Enable Inspector integration
resource "aws_securityhub_product_subscription" "inspector" {
  product_arn = "arn:aws:securityhub:${data.aws_region.current.name}::product/aws/inspector"
  depends_on  = [aws_securityhub_account.main]
}
```

## Querying Findings

Security Hub provides a rich filtering API for finding exactly what you need.

```bash
# Get all active high-severity findings
aws securityhub get-findings \
  --filters '{
    "SeverityLabel": [{"Value": "HIGH", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}]
  }' \
  --max-items 20

# Get findings for a specific resource
aws securityhub get-findings \
  --filters '{
    "ResourceId": [{"Value": "arn:aws:s3:::my-important-bucket", "Comparison": "EQUALS"}]
  }'

# Get findings from a specific product
aws securityhub get-findings \
  --filters '{
    "ProductName": [{"Value": "GuardDuty", "Comparison": "EQUALS"}],
    "SeverityLabel": [
      {"Value": "HIGH", "Comparison": "EQUALS"},
      {"Value": "CRITICAL", "Comparison": "EQUALS"}
    ]
  }'

# Get compliance check failures
aws securityhub get-findings \
  --filters '{
    "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}],
    "ProductName": [{"Value": "Security Hub", "Comparison": "EQUALS"}]
  }'
```

## Setting Up Notifications

Use EventBridge to get notified about new findings.

```bash
# Alert on critical findings from any source
aws events put-rule \
  --name security-hub-critical \
  --event-pattern '{
    "source": ["aws.securityhub"],
    "detail-type": ["Security Hub Findings - Imported"],
    "detail": {
      "findings": {
        "Severity": {
          "Label": ["CRITICAL"]
        },
        "Workflow": {
          "Status": ["NEW"]
        }
      }
    }
  }'

aws events put-targets \
  --rule security-hub-critical \
  --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:111111111111:security-critical"
```

## Disabling Specific Controls

Some compliance checks might not be relevant to your environment. You can disable specific controls rather than turning off entire standards.

```bash
# List controls for a standard
aws securityhub describe-standards-controls \
  --standards-subscription-arn "arn:aws:securityhub:us-east-1:111111111111:subscription/cis-aws-foundations-benchmark/v/1.4.0" \
  --query 'Controls[?ControlStatus==`ENABLED`].{Id:ControlId,Title:Title}' \
  --output table

# Disable a specific control
aws securityhub update-standards-control \
  --standards-control-arn "arn:aws:securityhub:us-east-1:111111111111:control/cis-aws-foundations-benchmark/v/1.4.0/1.14" \
  --control-status DISABLED \
  --disabled-reason "Not applicable - we use SSO instead of IAM users"
```

## Understanding the Security Score

Security Hub calculates a security score (0-100%) for each standard based on the ratio of passing to failing controls. The score appears on the Security Hub dashboard.

A 100% score means all enabled controls are passing. It doesn't mean you're perfectly secure - just that you're meeting the checks in the enabled standards.

To improve your score:
1. Fix the failing controls (start with critical and high severity)
2. Disable controls that genuinely don't apply to your environment (with documented reasons)
3. Don't game the score by disabling everything that fails

## Costs

Security Hub charges per finding ingested and per compliance check run:
- Finding ingestion: First 10,000 findings per account per region per month are free, then $0.00003 per finding
- Security checks: First 1,000 checks per account per region per month are free, then $0.0010 per check

For most accounts, Security Hub costs $10-50/month. The value of centralized security visibility far outweighs this cost.

## What's Next

With Security Hub enabled, explore [compliance standards in detail](https://oneuptime.com/blog/post/2026-02-12-security-hub-compliance-standards-cis-pci/view), create [custom insights](https://oneuptime.com/blog/post/2026-02-12-custom-security-hub-insights/view) for your specific monitoring needs, and set up [cross-account finding aggregation](https://oneuptime.com/blog/post/2026-02-12-aggregate-security-hub-findings-across-accounts/view) for multi-account environments. Make sure you've also [integrated GuardDuty](https://oneuptime.com/blog/post/2026-02-12-integrate-guardduty-security-hub/view) to get threat detection findings flowing into Security Hub.
