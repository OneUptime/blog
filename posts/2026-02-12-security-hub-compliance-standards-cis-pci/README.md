# How to Use Security Hub Compliance Standards (CIS, PCI DSS)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Security Hub, CIS, PCI DSS, Compliance

Description: Learn how to enable and manage Security Hub compliance standards including CIS AWS Foundations Benchmark and PCI DSS for automated security posture assessments.

---

Compliance frameworks like CIS and PCI DSS define hundreds of security controls. Manually checking each one across your AWS environment would take weeks. Security Hub automates this by continuously evaluating your resources against these standards and giving you a compliance score that updates in real time.

Each standard is a collection of controls - automated checks that evaluate specific aspects of your AWS configuration. When a control fails, Security Hub generates a finding that tells you exactly what's wrong and how to fix it. Let's walk through the available standards and how to get the most out of them.

## Available Compliance Standards

Security Hub currently supports several standards:

1. **CIS AWS Foundations Benchmark v1.4.0** - The most widely adopted AWS security benchmark. Covers IAM, logging, monitoring, and networking controls.
2. **AWS Foundational Security Best Practices (FSBP)** - AWS's own best practices standard. Broader coverage than CIS, with controls for over 30 AWS services.
3. **PCI DSS v3.2.1** - Required for organizations that process credit card payments. Maps AWS controls to PCI DSS requirements.
4. **NIST SP 800-53 Rev. 5** - US government security framework used by federal agencies and contractors.

## Enabling Standards

You can enable one or multiple standards simultaneously.

```bash
# Enable CIS Benchmark
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

# Enable NIST 800-53
aws securityhub batch-enable-standards \
  --standards-subscription-requests '[{
    "StandardsArn": "arn:aws:securityhub:us-east-1::standards/nist-800-53/v/5.0.0"
  }]'
```

Check which standards are enabled.

```bash
aws securityhub get-enabled-standards
```

## Understanding CIS AWS Foundations Benchmark

The CIS Benchmark is organized into sections:

- **Section 1: Identity and Access Management** - Password policy, MFA, access key rotation, root account usage
- **Section 2: Storage** - S3 bucket security, EBS encryption
- **Section 3: Logging** - CloudTrail, CloudWatch, VPC Flow Logs
- **Section 4: Monitoring** - CloudWatch alarms for security-relevant events
- **Section 5: Networking** - Security groups, NACLs, VPC configuration

Here are some of the most commonly failed CIS controls and how to fix them.

### CIS 1.4 - Ensure no root account access keys exist

```bash
# Check for root access keys
aws iam get-account-summary \
  --query 'SummaryMap.AccountAccessKeysPresent'

# If the result is 1, delete the root access keys through the console
# (Cannot be done via CLI for safety)
```

### CIS 1.10 - Ensure MFA is enabled for all IAM users

```bash
# Find users without MFA
aws iam generate-credential-report
aws iam get-credential-report \
  --query 'Content' --output text | base64 --decode | \
  awk -F, '$4 == "true" && $8 == "false" {print $1, "- password enabled but no MFA"}'
```

### CIS 2.1.1 - Ensure S3 buckets have server-side encryption

```bash
# Check each bucket for encryption
for bucket in $(aws s3api list-buckets --query 'Buckets[].Name' --output text); do
  echo -n "$bucket: "
  aws s3api get-bucket-encryption --bucket $bucket 2>/dev/null \
    && echo "encrypted" || echo "NOT ENCRYPTED"
done
```

### CIS 3.1 - Ensure CloudTrail is enabled in all regions

```bash
# Check for multi-region trail
aws cloudtrail describe-trails \
  --query 'trailList[?IsMultiRegionTrail==`true`].{Name:Name,Logging:HasCustomEventSelectors}'
```

## Understanding PCI DSS Controls

PCI DSS controls in Security Hub map to specific PCI requirements. Not all PCI requirements can be automated - Security Hub covers the ones that relate to AWS infrastructure configuration.

Key PCI controls in Security Hub include:

- **PCI.CloudTrail.1** - CloudTrail should be enabled
- **PCI.EC2.2** - VPC default security group should not allow all traffic
- **PCI.IAM.1** - IAM root user should not have access keys
- **PCI.S3.1** - S3 buckets should prohibit public read access
- **PCI.S3.2** - S3 buckets should prohibit public write access

Remember that passing all Security Hub PCI checks doesn't mean you're PCI DSS compliant. The standard has many requirements (like physical security and process controls) that can't be verified by automated tools.

## Viewing Compliance Results

Check your compliance score and failing controls.

```bash
# Get the security score for each standard
aws securityhub get-enabled-standards \
  --query 'StandardsSubscriptions[].{ARN:StandardsArn,Status:StandardsStatus}'

# Get all failing controls for CIS
aws securityhub get-findings \
  --filters '{
    "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}],
    "GeneratorId": [{"Value": "cis-aws-foundations-benchmark", "Comparison": "PREFIX"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }' \
  --sort-criteria '{"Field": "SeverityLabel", "SortOrder": "desc"}' \
  --max-items 20
```

## Disabling Individual Controls

Not every control applies to every organization. Maybe you don't use IAM users at all (SSO only), or certain controls conflict with your architecture. You can disable specific controls.

```bash
# List all controls for a standard and their status
aws securityhub describe-standards-controls \
  --standards-subscription-arn "arn:aws:securityhub:us-east-1:111111111111:subscription/cis-aws-foundations-benchmark/v/1.4.0"

# Disable a control with a reason
aws securityhub update-standards-control \
  --standards-control-arn "arn:aws:securityhub:us-east-1:111111111111:control/cis-aws-foundations-benchmark/v/1.4.0/1.14" \
  --control-status DISABLED \
  --disabled-reason "We use AWS SSO exclusively - no IAM user passwords to rotate"
```

Always document why you've disabled a control. Auditors will ask.

## Automating Remediation

You can set up automated remediation for failing controls using EventBridge and Lambda or Systems Manager.

```bash
# EventBridge rule for specific failing CIS controls
aws events put-rule \
  --name cis-failed-controls-remediation \
  --event-pattern '{
    "source": ["aws.securityhub"],
    "detail-type": ["Security Hub Findings - Imported"],
    "detail": {
      "findings": {
        "Compliance": {
          "Status": ["FAILED"]
        },
        "GeneratorId": [
          {"prefix": "cis-aws-foundations-benchmark"}
        ],
        "Severity": {
          "Label": ["CRITICAL", "HIGH"]
        }
      }
    }
  }'
```

## Terraform Configuration

```hcl
resource "aws_securityhub_account" "main" {}

# CIS Benchmark
resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.main]
}

# AWS Foundational Security Best Practices
resource "aws_securityhub_standards_subscription" "fsbp" {
  standards_arn = "arn:aws:securityhub:${data.aws_region.current.name}::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}

# Disable specific controls
resource "aws_securityhub_standards_control" "no_iam_users" {
  standards_control_arn = "arn:aws:securityhub:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:control/cis-aws-foundations-benchmark/v/1.4.0/1.14"
  control_status        = "DISABLED"
  disabled_reason       = "We use AWS SSO exclusively"

  depends_on = [aws_securityhub_standards_subscription.cis]
}
```

## Which Standard Should You Start With?

If you're not sure which standard to enable first:

1. **Start with AWS Foundational Security Best Practices** - It has the broadest coverage and is specifically designed for AWS. It covers over 30 services with practical checks.

2. **Add CIS Benchmark** - If you need to demonstrate compliance to auditors or partners, CIS is the most recognized cloud security benchmark.

3. **Add PCI DSS** - Only if you process payment card data and need PCI compliance.

4. **Add NIST 800-53** - If you work with US government agencies.

Note that there's significant overlap between standards. A resource that fails CIS 3.1 (CloudTrail enabled) will likely also fail the equivalent FSBP and PCI checks. Security Hub handles this by mapping overlapping controls.

## Tracking Improvement Over Time

Your security score will likely start low - that's normal. Focus on improving it systematically:

1. Fix all critical-severity failures first
2. Address high-severity failures next
3. Disable controls with documented business reasons
4. Set a quarterly goal to increase the score by a specific percentage

For custom monitoring views, create [Security Hub insights](https://oneuptime.com/blog/post/2026-02-12-custom-security-hub-insights/view). And for multi-account compliance tracking, set up [cross-account aggregation](https://oneuptime.com/blog/post/2026-02-12-aggregate-security-hub-findings-across-accounts/view).
