# How to Configure Macie Automated Sensitive Data Discovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Macie, S3, Security, Data Discovery

Description: Learn how to configure Amazon Macie's automated sensitive data discovery for continuous monitoring of S3 buckets, including bucket-level controls, cost optimization, and finding management.

---

Running one-off Macie classification jobs gives you point-in-time snapshots, but data changes constantly. New files get uploaded, existing files get modified, and what was clean yesterday might contain sensitive data today. Automated sensitive data discovery solves this by continuously sampling objects across your S3 buckets without you having to schedule individual jobs.

It's a different approach from classification jobs - instead of scanning specific buckets exhaustively, automated discovery uses intelligent sampling to maintain ongoing visibility across all your buckets. Let's set it up and configure it properly.

## How Automated Discovery Differs from Classification Jobs

Understanding the difference is important for setting expectations.

**Classification jobs** scan specific buckets that you choose, examining every object that matches your scoping criteria. They're thorough but expensive for large buckets.

**Automated discovery** runs continuously across all your buckets, sampling a representative subset of objects. It's less thorough for any individual bucket but gives you broad coverage at a lower cost.

Think of classification jobs as a deep audit and automated discovery as continuous monitoring. Most organizations need both.

## Enabling Automated Discovery

The setup is simple - one API call to turn it on.

```bash
# Enable automated sensitive data discovery
aws macie2 update-automated-discovery-configuration \
  --status ENABLED

# Verify the configuration
aws macie2 get-automated-discovery-configuration
```

The response shows you the current status and when discovery started.

```json
{
    "autoEnableOrganizationMembers": "NONE",
    "classificationScopeId": "scope-id-here",
    "disabledAt": null,
    "firstEnabledAt": "2026-02-12T10:00:00Z",
    "lastUpdatedAt": "2026-02-12T10:00:00Z",
    "sensitivityInspectionTemplateId": "template-id-here",
    "status": "ENABLED"
}
```

Once enabled, Macie starts evaluating your buckets within 48 hours. It prioritizes buckets it hasn't scanned before and buckets where new objects have been added.

## Terraform Configuration

```hcl
# Enable Macie account first
resource "aws_macie2_account" "main" {}

# Enable automated discovery
resource "aws_macie2_automated_discovery_configuration" "main" {
  status = "ENABLED"

  depends_on = [aws_macie2_account.main]
}
```

## Configuring Bucket-Level Controls

You might not want Macie scanning every bucket. Some buckets contain only logs or infrastructure data where scanning would be a waste of money. You can exclude specific buckets or include only certain ones.

```bash
# Exclude specific buckets from automated discovery
aws macie2 update-resource-profile \
  --resource-arn "arn:aws:s3:::cloudtrail-logs-bucket" \
  --sensitivity-score-override -1

# Exclude another bucket
aws macie2 update-resource-profile \
  --resource-arn "arn:aws:s3:::access-logs-bucket" \
  --sensitivity-score-override -1
```

A sensitivity score of -1 tells Macie to skip the bucket entirely. You can also set it to 0 (not sensitive) through 100 (highly sensitive).

To view which buckets are included and their current sensitivity scores:

```bash
# List bucket profiles with sensitivity scores
aws macie2 list-resource-profile-artifacts \
  --resource-arn "arn:aws:s3:::my-bucket"

# Get sensitivity score for all buckets
aws macie2 list-resource-profile-detections \
  --resource-arn "arn:aws:s3:::customer-data-bucket"
```

## Configuring the Sensitivity Inspection Template

The sensitivity inspection template controls which managed and custom data identifiers are used during automated discovery.

```bash
# Get the current template ID
TEMPLATE_ID=$(aws macie2 get-automated-discovery-configuration \
  --query 'sensitivityInspectionTemplateId' \
  --output text)

# View the current template
aws macie2 get-sensitivity-inspection-template \
  --id "$TEMPLATE_ID"

# Update the template to include specific identifiers
aws macie2 update-sensitivity-inspection-template \
  --id "$TEMPLATE_ID" \
  --includes '{
    "managedDataIdentifierIds": [
      "CREDIT_CARD_NUMBER",
      "US_SOCIAL_SECURITY_NUMBER",
      "EMAIL_ADDRESS",
      "AWS_SECRET_ACCESS_KEY",
      "US_PASSPORT_NUMBER"
    ]
  }' \
  --excludes '{
    "managedDataIdentifierIds": [
      "IP_ADDRESS",
      "MAC_ADDRESS"
    ]
  }'
```

By narrowing the identifiers, you reduce noise from findings that aren't relevant to your compliance requirements.

## Multi-Account Organization Setup

In an AWS Organizations setup, the delegated Macie administrator can enable automated discovery for all member accounts.

```bash
# From the Macie admin account, enable for all members
aws macie2 update-automated-discovery-configuration \
  --status ENABLED \
  --auto-enable-organization-members ALL

# Or enable selectively for specific accounts
aws macie2 batch-update-automated-discovery-accounts \
  --accounts '[
    {"accountId": "111122223333", "status": "ENABLED"},
    {"accountId": "444455556666", "status": "ENABLED"},
    {"accountId": "777788889999", "status": "DISABLED"}
  ]'
```

## Understanding the Discovery Results

Automated discovery generates two types of outputs: sensitivity scores for buckets and detailed findings for specific objects.

Bucket-level sensitivity scores give you a quick overview.

```bash
# Get bucket statistics
aws macie2 describe-buckets \
  --criteria '{
    "sensitivityScore": {
      "gte": 50
    }
  }' \
  --query 'buckets[*].{Name:bucketName,Score:sensitivityScore,ObjectCount:objectCount}'
```

For individual findings, query the findings API.

```bash
# Get recent automated discovery findings
aws macie2 list-findings \
  --finding-criteria '{
    "criterion": {
      "category": {
        "eq": ["CLASSIFICATION"]
      },
      "classificationDetails.originType": {
        "eq": ["AUTOMATED_SENSITIVE_DATA_DISCOVERY"]
      }
    }
  }' \
  --sort-criteria '{"attributeName": "severity.score", "orderBy": "DESC"}' \
  --max-results 10
```

## Setting Up Alerts for Discovery Findings

You want to know when automated discovery finds something important. Route high-severity findings to your alerting system.

```hcl
# EventBridge rule for automated discovery findings
resource "aws_cloudwatch_event_rule" "macie_discovery" {
  name = "macie-automated-discovery"

  event_pattern = jsonencode({
    source      = ["aws.macie"]
    detail-type = ["Macie Finding"]
    detail = {
      severity = {
        description = ["High", "Medium"]
      }
      classificationDetails = {
        originType = ["AUTOMATED_SENSITIVE_DATA_DISCOVERY"]
      }
    }
  })
}

# Send high-severity findings to SNS
resource "aws_cloudwatch_event_target" "macie_sns" {
  rule = aws_cloudwatch_event_rule.macie_discovery.name
  arn  = aws_sns_topic.security_alerts.arn

  input_transformer {
    input_paths = {
      severity = "$.detail.severity.description"
      bucket   = "$.detail.resourcesAffected.s3Bucket.name"
      key      = "$.detail.resourcesAffected.s3Object.key"
      type     = "$.detail.type"
    }
    input_template = "\"Macie found <type> in s3://<bucket>/<key> (severity: <severity>)\""
  }
}
```

## Integrating with Security Hub

Macie findings automatically integrate with Security Hub, giving you a centralized view alongside other security findings.

```bash
# Enable Security Hub integration
aws macie2 put-findings-publication-configuration \
  --security-hub-configuration '{
    "publishClassificationFindings": true,
    "publishPolicyFindings": true
  }'
```

This sends both sensitive data findings (from automated discovery and classification jobs) and policy findings (like public buckets) to Security Hub.

## Cost Optimization

Automated discovery charges per object evaluated. Here are strategies to control costs.

**Exclude non-sensitive buckets.** Set sensitivity score to -1 for buckets that clearly don't contain sensitive data - logs, infrastructure state, build artifacts.

```bash
# Bulk exclude infrastructure buckets
for bucket in cloudtrail-logs terraform-state vpc-flow-logs build-artifacts; do
  aws macie2 update-resource-profile \
    --resource-arn "arn:aws:s3:::$bucket" \
    --sensitivity-score-override -1
done
```

**Monitor spending.** Check usage regularly.

```bash
# Check automated discovery costs
aws macie2 get-usage-totals \
  --query 'usageTotals[?type==`AUTOMATED_SENSITIVE_DATA_DISCOVERY`]'

# Detailed usage by time period
aws macie2 get-usage-statistics \
  --filter-by '[
    {"key": "serviceLimit", "comparator": "CONTAINS", "values": ["AUTOMATED_SENSITIVE_DATA_DISCOVERY"]}
  ]'
```

**Pause during cost spikes.** If costs are higher than expected, you can temporarily disable automated discovery.

```bash
# Temporarily disable automated discovery
aws macie2 update-automated-discovery-configuration \
  --status DISABLED

# Re-enable when ready
aws macie2 update-automated-discovery-configuration \
  --status ENABLED
```

## Reviewing Discovery Coverage

Macie provides statistics on how well automated discovery is covering your data.

```bash
# Check coverage statistics
aws macie2 get-bucket-statistics

# Get detailed coverage for a specific bucket
aws macie2 describe-buckets \
  --criteria '{
    "bucketName": {
      "prefix": "customer-data"
    }
  }'
```

The sensitivity score updates as Macie processes more objects in each bucket. A score of -1 means excluded, 0 means nothing found yet, and 1-100 indicates increasing levels of sensitive data.

## Best Practices

1. **Start with automated discovery for broad coverage.** It gives you a baseline understanding of sensitive data across all buckets.
2. **Follow up with targeted classification jobs** for buckets where automated discovery finds issues.
3. **Exclude buckets systematically.** Create a process for new buckets to be tagged, and use those tags to decide whether to include them.
4. **Review sensitivity scores weekly.** Sudden changes in a bucket's score could indicate new data patterns.
5. **Combine with S3 event notifications.** Trigger on-demand scans when new objects are uploaded to critical buckets.

For the initial Macie setup, see our guide on [enabling Macie](https://oneuptime.com/blog/post/enable-amazon-macie-s3-data-discovery/view). For targeted PII scanning, check out [using Macie to find PII](https://oneuptime.com/blog/post/macie-find-pii-s3-buckets/view).

## Wrapping Up

Automated sensitive data discovery is the "set it and forget it" approach to data classification. It won't find everything in every bucket, but it gives you continuous visibility that classification jobs alone can't provide. Enable it, exclude the obvious non-sensitive buckets, set up alerts for high-severity findings, and let it run. Combined with periodic targeted scans, it provides solid coverage for compliance and security monitoring.
