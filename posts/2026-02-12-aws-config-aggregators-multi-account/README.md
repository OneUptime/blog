# How to Use AWS Config Aggregators for Multi-Account Visibility

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Config, Multi-Account, Organizations, Compliance

Description: Learn how to set up AWS Config aggregators to get a unified view of resource compliance across multiple AWS accounts and regions from a single dashboard.

---

When you're managing dozens or hundreds of AWS accounts, checking compliance one account at a time isn't going to work. You need a single place where you can see the compliance status of every resource across every account. That's exactly what AWS Config aggregators do.

An aggregator collects Config data from multiple source accounts and regions into a single aggregator account. From there, you can run queries, view compliance dashboards, and track which accounts have the most compliance violations - all without logging into each account individually.

## Types of Aggregators

There are two ways to set up an aggregator:

1. **Organization aggregator** - Automatically collects data from all accounts in your AWS Organization. This is the easiest approach if you're using Organizations.
2. **Individual account aggregator** - You specify which accounts to aggregate. Each source account must explicitly authorize the aggregator. More work, but doesn't require Organizations.

## Setting Up an Organization Aggregator

This is the recommended approach. It requires AWS Organizations with "all features" enabled.

### Enable Trusted Access

First, enable Config as a trusted service in Organizations.

```bash
# Enable trusted access for Config
aws organizations enable-aws-service-access \
  --service-principal config.amazonaws.com

# Also enable for the multi-account setup feature
aws organizations enable-aws-service-access \
  --service-principal config-multiaccountsetup.amazonaws.com
```

### Create the Aggregator

Create the aggregator in your management account (or a delegated administrator account).

```bash
# Create an organization aggregator that covers all regions
aws configservice put-configuration-aggregator \
  --configuration-aggregator-name org-aggregator \
  --organization-aggregation-source '{
    "RoleArn": "arn:aws:iam::111111111111:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig",
    "AllAwsRegions": true
  }'
```

If you only want to aggregate specific regions, replace `AllAwsRegions` with a list.

```bash
aws configservice put-configuration-aggregator \
  --configuration-aggregator-name org-aggregator \
  --organization-aggregation-source '{
    "RoleArn": "arn:aws:iam::111111111111:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig",
    "AwsRegions": ["us-east-1", "us-west-2", "eu-west-1"]
  }'
```

### Verify the Aggregator

Check that the aggregator is collecting data.

```bash
# Describe the aggregator
aws configservice describe-configuration-aggregators \
  --configuration-aggregator-names org-aggregator

# Check which accounts/regions are being aggregated
aws configservice describe-configuration-aggregator-sources-status \
  --configuration-aggregator-name org-aggregator
```

## Setting Up an Individual Account Aggregator

If you're not using Organizations, you can set up account-by-account aggregation.

### In the Aggregator Account

Create the aggregator and specify source accounts.

```bash
aws configservice put-configuration-aggregator \
  --configuration-aggregator-name manual-aggregator \
  --account-aggregation-sources '[{
    "AccountIds": ["222222222222", "333333333333", "444444444444"],
    "AllAwsRegions": true
  }]'
```

### In Each Source Account

Each source account needs to authorize the aggregator account.

```bash
# Run this in each source account
aws configservice put-aggregation-authorization \
  --authorized-account-id 111111111111 \
  --authorized-aws-region us-east-1
```

This explicit authorization step is what makes individual account aggregation more work. With the organization aggregator, it's automatic.

## Querying Aggregated Data

Once the aggregator is running, you can query compliance data across all accounts.

### Get Cross-Account Compliance Summary

```bash
# Get compliance summary grouped by account
aws configservice get-aggregate-compliance-details-by-config-rule \
  --configuration-aggregator-name org-aggregator \
  --config-rule-name restricted-ssh \
  --compliance-type NON_COMPLIANT \
  --limit 20
```

### Find Non-Compliant Resources Across Accounts

```bash
# List all non-compliant security groups across all accounts
aws configservice get-aggregate-discovered-resource-counts \
  --configuration-aggregator-name org-aggregator \
  --group-by-key RESOURCE_TYPE
```

### Use Advanced Queries

The aggregate advanced query feature lets you run SQL-like queries across all accounts.

```bash
# Find all S3 buckets without encryption across all accounts
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name org-aggregator \
  --expression "
    SELECT
      accountId,
      awsRegion,
      resourceId,
      resourceName,
      configuration.serverSideEncryptionConfiguration
    WHERE
      resourceType = 'AWS::S3::Bucket'
      AND configuration.serverSideEncryptionConfiguration IS NULL
  "
```

Here are some more useful aggregate queries.

```bash
# Count resources by account
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name org-aggregator \
  --expression "
    SELECT
      accountId,
      COUNT(resourceId)
    WHERE
      resourceType = 'AWS::EC2::Instance'
    GROUP BY
      accountId
  "

# Find all publicly accessible RDS instances
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name org-aggregator \
  --expression "
    SELECT
      accountId,
      awsRegion,
      resourceId,
      configuration.publiclyAccessible
    WHERE
      resourceType = 'AWS::RDS::DBInstance'
      AND configuration.publiclyAccessible = true
  "

# Find all unencrypted EBS volumes
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name org-aggregator \
  --expression "
    SELECT
      accountId,
      awsRegion,
      resourceId,
      configuration.encrypted
    WHERE
      resourceType = 'AWS::EC2::Volume'
      AND configuration.encrypted = false
  "
```

## Terraform Configuration

Here's the Terraform setup for an organization aggregator.

```hcl
resource "aws_config_configuration_aggregator" "organization" {
  name = "org-aggregator"

  organization_aggregation_source {
    all_regions = true
    role_arn    = aws_iam_role.config_aggregator.arn
  }
}

resource "aws_iam_role" "config_aggregator" {
  name = "ConfigAggregatorRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "config.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config_aggregator" {
  role       = aws_iam_role.config_aggregator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRoleForOrganizations"
}
```

## Building a Compliance Dashboard

You can build a custom compliance dashboard using the aggregator APIs. Here's a Python script that generates a compliance summary.

```python
import boto3
from collections import defaultdict

config = boto3.client('config')

def get_compliance_summary(aggregator_name):
    """Get compliance summary across all accounts."""

    # Get compliance by Config rule
    response = config.describe_aggregate_compliance_by_config_rules(
        ConfigurationAggregatorName=aggregator_name,
        Filters={'ComplianceType': 'NON_COMPLIANT'}
    )

    summary = defaultdict(list)

    for rule in response['AggregateComplianceByConfigRules']:
        rule_name = rule['ConfigRuleName']
        account = rule['AccountId']
        region = rule['AwsRegion']

        summary[rule_name].append({
            'account': account,
            'region': region,
            'compliance': rule['Compliance']['ComplianceType']
        })

    # Print results
    print(f"\nCompliance Summary for {aggregator_name}")
    print("=" * 60)

    for rule_name, violations in sorted(summary.items()):
        print(f"\n{rule_name}: {len(violations)} non-compliant account/region combinations")
        for v in violations[:5]:  # Show first 5
            print(f"  - Account {v['account']} in {v['region']}")
        if len(violations) > 5:
            print(f"  ... and {len(violations) - 5} more")

get_compliance_summary('org-aggregator')
```

## Prerequisites for Source Accounts

The aggregator only collects data from accounts that have Config enabled. If a member account doesn't have Config running, the aggregator won't show any data for it. Make sure you've:

1. [Enabled AWS Config](https://oneuptime.com/blog/post/2026-02-12-enable-aws-config-resource-compliance/view) in all source accounts
2. Deployed the same Config rules across all accounts (use [conformance packs](https://oneuptime.com/blog/post/2026-02-12-aws-config-conformance-packs/view) for this)
3. Enabled Config in all relevant regions

## Delegated Administrator

Instead of running the aggregator in the management account, you can designate a delegated administrator. This is a security best practice - it keeps the management account clean.

```bash
# Register a delegated administrator for Config
aws organizations register-delegated-administrator \
  --account-id 555555555555 \
  --service-principal config.amazonaws.com

aws organizations register-delegated-administrator \
  --account-id 555555555555 \
  --service-principal config-multiaccountsetup.amazonaws.com
```

Then create the aggregator in account 555555555555 instead of the management account.

## Wrapping Up

Config aggregators give you the cross-account visibility that's essential for managing compliance at scale. Combined with [conformance packs](https://oneuptime.com/blog/post/2026-02-12-aws-config-conformance-packs/view) for deploying rules consistently and [automatic remediation](https://oneuptime.com/blog/post/2026-02-12-remediate-non-compliant-resources-aws-config/view) for fixing violations, you've got a complete compliance management pipeline across your entire AWS organization.
