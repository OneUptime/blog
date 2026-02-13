# How to Enable Amazon Macie for S3 Data Discovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Macie, S3, Security, Data Privacy

Description: Learn how to enable and configure Amazon Macie for discovering sensitive data in S3 buckets, including automated scanning, custom data identifiers, and multi-account setup.

---

You probably don't know exactly what's in all your S3 buckets. Most organizations don't. Developers upload files, applications dump logs, data pipelines store intermediate results, and over time you end up with terabytes of data where some percentage contains sensitive information - credit card numbers, social security numbers, API keys, personal health information.

Amazon Macie uses machine learning and pattern matching to automatically discover and classify sensitive data in your S3 buckets. It's not cheap, but the cost of a data breach is significantly higher than the cost of knowing where your sensitive data lives.

## What Macie Does

Macie performs two main functions:

**Inventory and security posture assessment.** It catalogs all your S3 buckets and evaluates their security settings - public access, encryption, shared access, replication status. This is the free part.

**Sensitive data discovery.** It scans the actual contents of objects in your S3 buckets looking for patterns that match sensitive data types - PII, financial data, credentials, and more. This is the part that costs money.

Macie can detect over 100 types of sensitive data including:
- Credit card numbers (PAN)
- Social Security Numbers
- Passport numbers
- Email addresses and phone numbers
- AWS secret access keys
- Private keys and certificates
- Medical record numbers
- Driver's license numbers

## Enabling Macie

Enabling Macie is straightforward. It starts monitoring your S3 bucket inventory immediately.

```bash
# Enable Macie in your account
aws macie2 enable-macie

# Verify it's enabled
aws macie2 get-macie-session
```

After enabling, Macie automatically inventories all S3 buckets in the region and starts evaluating their security posture. This happens within minutes and doesn't cost anything.

To check the bucket inventory:

```bash
# List all buckets Macie is monitoring
aws macie2 describe-buckets \
  --query 'buckets[*].{Name:bucketName,Region:region,Encryption:serverSideEncryption.type,PublicAccess:publicAccess.effectivePermission}'
```

## Setting Up Sensitive Data Discovery

The bucket inventory is useful, but the real value comes from scanning object contents. You can run one-off discovery jobs or enable automated discovery.

First, let's set up a one-time discovery job targeting specific buckets.

```bash
# Create a classification job for specific buckets
aws macie2 create-classification-job \
  --job-type ONE_TIME \
  --name "initial-scan-production-data" \
  --s3-job-definition '{
    "bucketDefinitions": [
      {
        "accountId": "123456789012",
        "buckets": [
          "production-data-bucket",
          "customer-uploads-bucket",
          "analytics-output-bucket"
        ]
      }
    ],
    "scoping": {
      "includes": {
        "and": [
          {
            "simpleScopeTerm": {
              "comparator": "STARTS_WITH",
              "key": "OBJECT_KEY",
              "values": ["data/", "uploads/", "exports/"]
            }
          }
        ]
      },
      "excludes": {
        "and": [
          {
            "simpleScopeTerm": {
              "comparator": "STARTS_WITH",
              "key": "OBJECT_KEY",
              "values": ["logs/", "tmp/", "cache/"]
            }
          }
        ]
      }
    }
  }' \
  --description "Initial scan of production data buckets"
```

The scoping configuration lets you focus on paths that are likely to contain sensitive data and skip things like logs and temp files. This is important for controlling costs.

## Enabling Automated Discovery

For ongoing monitoring, enable automated sensitive data discovery. Macie will continuously sample objects from your buckets.

```bash
# Enable automated discovery
aws macie2 update-automated-discovery-configuration \
  --status ENABLED
```

Automated discovery uses a sampling approach - it doesn't scan every object, but it provides statistical coverage of your data. You can check what it's finding.

```bash
# Get automated discovery statistics
aws macie2 get-automated-discovery-configuration

# List recent findings
aws macie2 list-findings \
  --finding-criteria '{
    "criterion": {
      "category": {
        "eq": ["CLASSIFICATION"]
      }
    }
  }' \
  --sort-criteria '{"attributeName": "updatedAt", "orderBy": "DESC"}' \
  --max-results 20
```

## Terraform Configuration

Here's a complete Terraform setup for Macie with classification jobs.

```hcl
# Enable Macie
resource "aws_macie2_account" "main" {}

# Create a classification job
resource "aws_macie2_classification_job" "production" {
  job_type = "SCHEDULED"
  name     = "weekly-production-scan"

  s3_job_definition {
    bucket_definitions {
      account_id = data.aws_caller_identity.current.account_id
      buckets    = [
        aws_s3_bucket.production_data.id,
        aws_s3_bucket.customer_uploads.id
      ]
    }

    scoping {
      excludes {
        and {
          simple_scope_term {
            comparator = "STARTS_WITH"
            key        = "OBJECT_KEY"
            values     = ["logs/", "tmp/"]
          }
        }
      }
    }
  }

  schedule_frequency_details {
    weekly_schedule = "MONDAY"
  }

  depends_on = [aws_macie2_account.main]
}

# Enable automated discovery
resource "aws_macie2_automated_discovery_configuration" "main" {
  status = "ENABLED"

  depends_on = [aws_macie2_account.main]
}
```

## Custom Data Identifiers

Macie's built-in detectors cover common patterns, but you might have organization-specific data formats. Custom data identifiers let you define regex patterns for your own sensitive data types.

```bash
# Create a custom identifier for internal employee IDs
aws macie2 create-custom-data-identifier \
  --name "InternalEmployeeID" \
  --description "Matches our internal employee ID format (EMP-XXXXXX)" \
  --regex "EMP-[0-9]{6}" \
  --keywords '["employee", "emp id", "staff number"]' \
  --maximum-match-distance 50 \
  --severity-levels '[
    {"occurrencesThreshold": 1, "severity": "LOW"},
    {"occurrencesThreshold": 10, "severity": "MEDIUM"},
    {"occurrencesThreshold": 50, "severity": "HIGH"}
  ]'

# Create a custom identifier for internal account numbers
aws macie2 create-custom-data-identifier \
  --name "CustomerAccountNumber" \
  --description "Matches customer account numbers (ACCT-XXXX-XXXX)" \
  --regex "ACCT-[A-Z0-9]{4}-[A-Z0-9]{4}" \
  --keywords '["account", "customer", "acct"]'
```

Custom identifiers are automatically included in all subsequent discovery jobs.

## Multi-Account Setup

In an AWS Organizations environment, designate a Macie administrator account to manage findings across all member accounts.

```bash
# From the management account, designate a Macie admin
aws macie2 enable-organization-admin-account \
  --admin-account-id "222233334444"

# From the admin account, enable Macie for member accounts
aws macie2 create-member \
  --account '{"accountId": "333344445555", "email": "team@example.com"}'

# Auto-enable for new organization accounts
aws macie2 update-organization-configuration \
  --auto-enable
```

## Understanding Findings

Macie generates findings when it discovers sensitive data or security issues. Each finding includes the bucket, object key, type of sensitive data, and severity.

```bash
# Get finding details
aws macie2 get-findings \
  --finding-ids '["finding-id-123"]'

# Get a summary of findings by type
aws macie2 get-finding-statistics \
  --group-by "type" \
  --finding-criteria '{
    "criterion": {
      "severity.description": {
        "eq": ["High"]
      }
    }
  }'
```

## Publishing Findings to EventBridge

Route Macie findings to EventBridge for automated response.

```hcl
# EventBridge rule for high-severity Macie findings
resource "aws_cloudwatch_event_rule" "macie_high" {
  name = "macie-high-severity"

  event_pattern = jsonencode({
    source      = ["aws.macie"]
    detail-type = ["Macie Finding"]
    detail = {
      severity = {
        description = ["High"]
      }
    }
  })
}

# Send to SNS for alerting
resource "aws_cloudwatch_event_target" "macie_alert" {
  rule = aws_cloudwatch_event_rule.macie_high.name
  arn  = aws_sns_topic.security_alerts.arn
}
```

## Cost Management

Macie charges based on the amount of data scanned. As of early 2026:

- First 1 GB/month: $1.00 per GB
- Next 49,999 GB: $0.10 per GB
- 50TB+: $0.04 per GB
- Automated discovery: $0.012 per evaluated object

To control costs:

1. **Start with a targeted scan** of your most critical buckets
2. **Use scoping** to exclude known non-sensitive paths (logs, temp files)
3. **Sample before full scan** - run a one-time job on a subset to estimate costs
4. **Use automated discovery** for broad coverage at lower cost than full scans

```bash
# Check your Macie usage and costs
aws macie2 get-usage-totals

# Get usage by account in a multi-account setup
aws macie2 get-usage-statistics \
  --sort-by '{"attributeName": "totalEstimatedCost", "orderBy": "DESC"}'
```

For more on what Macie can find, check out our guide on [using Macie to find PII in S3](https://oneuptime.com/blog/post/2026-02-12-macie-find-pii-s3-buckets/view).

## Wrapping Up

Enabling Macie is a critical step toward understanding your data security posture. Start with the free bucket inventory to identify public or unencrypted buckets, then run targeted discovery jobs on your most sensitive data stores. Use automated discovery for ongoing monitoring, and set up EventBridge rules to alert on high-severity findings. The goal isn't to scan everything all the time - it's to have enough visibility to catch sensitive data before it becomes a problem.
