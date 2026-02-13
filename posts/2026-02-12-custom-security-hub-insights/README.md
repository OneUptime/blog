# How to Create Custom Security Hub Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Security Hub, Insights, Security, Dashboards

Description: Learn how to create custom AWS Security Hub insights to build focused views of your security findings, track trends, and identify the most critical issues across your environment.

---

Security Hub collects thousands of findings from GuardDuty, Config, Inspector, and its own compliance checks. Scrolling through all of them isn't productive. You need focused views that answer specific questions: Which accounts have the most critical findings? What resource types are most often non-compliant? Are we improving or getting worse?

Security Hub insights are saved queries that group findings by a specific attribute and give you a count. They're essentially pre-built dashboards that update in real time. AWS provides some default insights, but the custom ones you build for your specific environment are where the real value is.

## How Insights Work

An insight has two components:

1. **Filters** - Define which findings to include (severity, product, compliance status, etc.)
2. **Group-by attribute** - The field to aggregate by (account ID, resource type, finding type, etc.)

The result is a ranked list showing the top contributors to whatever you're measuring. For example, "top 10 accounts with the most critical findings" or "resource types with the most compliance failures."

## Creating Your First Insight

Let's create an insight that shows which AWS accounts have the most high-severity findings.

```bash
aws securityhub create-insight \
  --name "Accounts with Most High-Severity Findings" \
  --filters '{
    "SeverityLabel": [
      {"Value": "HIGH", "Comparison": "EQUALS"},
      {"Value": "CRITICAL", "Comparison": "EQUALS"}
    ],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}]
  }' \
  --group-by-attribute "AwsAccountId"
```

View the results.

```bash
# Get results for an insight
INSIGHT_ARN=$(aws securityhub get-insights \
  --query 'Insights[?Name==`Accounts with Most High-Severity Findings`].InsightArn' \
  --output text)

aws securityhub get-insight-results --insight-arn $INSIGHT_ARN
```

## Useful Custom Insights

Here are insights that cover the most common security monitoring needs.

### Top Failing Compliance Controls

See which specific compliance checks fail most often across your environment.

```bash
aws securityhub create-insight \
  --name "Top Failing Compliance Controls" \
  --filters '{
    "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
    "ProductName": [{"Value": "Security Hub", "Comparison": "EQUALS"}]
  }' \
  --group-by-attribute "GeneratorId"
```

### Most Vulnerable Resource Types

Which types of resources have the most security issues?

```bash
aws securityhub create-insight \
  --name "Resource Types with Most Findings" \
  --filters '{
    "SeverityLabel": [
      {"Value": "HIGH", "Comparison": "EQUALS"},
      {"Value": "CRITICAL", "Comparison": "EQUALS"}
    ],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }' \
  --group-by-attribute "ResourceType"
```

### GuardDuty Threat Categories

See what types of threats GuardDuty is finding most often.

```bash
aws securityhub create-insight \
  --name "GuardDuty Finding Types" \
  --filters '{
    "ProductName": [{"Value": "GuardDuty", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}]
  }' \
  --group-by-attribute "Type"
```

### Findings by Region

Identify if certain regions have more security issues - useful for spotting unauthorized activity in regions you don't normally use.

```bash
aws securityhub create-insight \
  --name "Security Findings by Region" \
  --filters '{
    "SeverityLabel": [
      {"Value": "MEDIUM", "Comparison": "EQUALS"},
      {"Value": "HIGH", "Comparison": "EQUALS"},
      {"Value": "CRITICAL", "Comparison": "EQUALS"}
    ],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }' \
  --group-by-attribute "Region"
```

### Unresolved Findings by Age

Track how long findings go unaddressed. Group by creation date to see if old findings are piling up.

```bash
aws securityhub create-insight \
  --name "Stale Critical Findings" \
  --filters '{
    "SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}],
    "CreatedAt": [{"DateRange": {"Value": 30, "Unit": "DAYS"}}]
  }' \
  --group-by-attribute "AwsAccountId"
```

### S3 Security Issues

Focus specifically on S3 bucket security - one of the most common sources of data exposure.

```bash
aws securityhub create-insight \
  --name "S3 Bucket Security Issues" \
  --filters '{
    "ResourceType": [{"Value": "AwsS3Bucket", "Comparison": "EQUALS"}],
    "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }' \
  --group-by-attribute "ResourceId"
```

### IAM Security Issues

IAM misconfigurations are high-impact. Keep a focused view on them.

```bash
aws securityhub create-insight \
  --name "IAM Related Findings" \
  --filters '{
    "ResourceType": [
      {"Value": "AwsIamUser", "Comparison": "EQUALS"},
      {"Value": "AwsIamRole", "Comparison": "EQUALS"},
      {"Value": "AwsIamPolicy", "Comparison": "EQUALS"}
    ],
    "ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }' \
  --group-by-attribute "GeneratorId"
```

## Managing Insights

List, update, and delete your insights.

```bash
# List all custom insights
aws securityhub get-insights \
  --query 'Insights[?starts_with(InsightArn, `arn:aws:securityhub`)].{Name:Name,ARN:InsightArn}'

# Get results for a specific insight
aws securityhub get-insight-results \
  --insight-arn "arn:aws:securityhub:us-east-1:111111111111:insight/111111111111/custom/abc123"

# Update an insight
aws securityhub update-insight \
  --insight-arn "arn:aws:securityhub:us-east-1:111111111111:insight/111111111111/custom/abc123" \
  --name "Updated Insight Name" \
  --filters '{
    "SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }'

# Delete an insight
aws securityhub delete-insight \
  --insight-arn "arn:aws:securityhub:us-east-1:111111111111:insight/111111111111/custom/abc123"
```

## Building a Security Dashboard Script

You can automate insight retrieval to build a daily security report.

```python
import boto3
import json
from datetime import datetime

securityhub = boto3.client('securityhub')

def get_insight_results(insight_name):
    """Get results for a named insight."""
    insights = securityhub.get_insights()

    for insight in insights['Insights']:
        if insight['Name'] == insight_name:
            results = securityhub.get_insight_results(
                InsightArn=insight['InsightArn']
            )
            return results['InsightResults']['ResultValues']

    return []

def generate_report():
    """Generate a daily security summary."""

    report = f"Security Hub Daily Report - {datetime.now().strftime('%Y-%m-%d')}\n"
    report += "=" * 60 + "\n\n"

    # Top accounts with issues
    report += "Accounts with Most Critical/High Findings:\n"
    report += "-" * 40 + "\n"
    results = get_insight_results("Accounts with Most High-Severity Findings")
    for r in results[:10]:
        report += f"  Account {r['GroupByAttributeValue']}: {r['Count']} findings\n"

    # Top failing controls
    report += "\nTop Failing Compliance Controls:\n"
    report += "-" * 40 + "\n"
    results = get_insight_results("Top Failing Compliance Controls")
    for r in results[:10]:
        report += f"  {r['GroupByAttributeValue']}: {r['Count']} failures\n"

    # Finding types
    report += "\nGuardDuty Threat Types:\n"
    report += "-" * 40 + "\n"
    results = get_insight_results("GuardDuty Finding Types")
    for r in results[:10]:
        report += f"  {r['GroupByAttributeValue']}: {r['Count']} findings\n"

    return report

# Run and print the report
print(generate_report())
```

## Terraform Configuration

```hcl
resource "aws_securityhub_insight" "critical_by_account" {
  name               = "Accounts with Most Critical Findings"
  group_by_attribute = "AwsAccountId"

  filters {
    severity_label {
      comparison = "EQUALS"
      value      = "CRITICAL"
    }
    record_state {
      comparison = "EQUALS"
      value      = "ACTIVE"
    }
    workflow_status {
      comparison = "EQUALS"
      value      = "NEW"
    }
  }
}

resource "aws_securityhub_insight" "failing_controls" {
  name               = "Top Failing Compliance Controls"
  group_by_attribute = "GeneratorId"

  filters {
    compliance_status {
      comparison = "EQUALS"
      value      = "FAILED"
    }
    record_state {
      comparison = "EQUALS"
      value      = "ACTIVE"
    }
    product_name {
      comparison = "EQUALS"
      value      = "Security Hub"
    }
  }
}

resource "aws_securityhub_insight" "s3_issues" {
  name               = "S3 Bucket Security Issues"
  group_by_attribute = "ResourceId"

  filters {
    resource_type {
      comparison = "EQUALS"
      value      = "AwsS3Bucket"
    }
    compliance_status {
      comparison = "EQUALS"
      value      = "FAILED"
    }
    record_state {
      comparison = "EQUALS"
      value      = "ACTIVE"
    }
  }
}
```

## Available Group-By Attributes

Here are the most useful attributes you can group findings by:

| Attribute | Use Case |
|---|---|
| `AwsAccountId` | Which accounts have the most issues |
| `ResourceType` | Which resource types are most problematic |
| `Type` | What categories of findings are most common |
| `GeneratorId` | Which specific controls/rules fail most |
| `SeverityLabel` | Distribution of finding severities |
| `Region` | Geographic distribution of findings |
| `ResourceId` | Individual resources with the most findings |
| `ProductName` | Which products generate the most findings |
| `ComplianceStatus` | Pass/fail distribution |

## Tips for Effective Insights

1. **Keep filters focused** - An insight that returns everything isn't useful. Filter to specific severities, products, or resource types.
2. **Use workflow status** - Filter on `NEW` findings to see what needs attention, not what's already been resolved.
3. **Create insights for each audience** - Executives want account-level summaries. Engineers want specific resource and control details.
4. **Review weekly** - Use insights during your security review meetings to track progress.
5. **Automate reporting** - Use the script above to generate and email weekly reports.

For aggregating insights across multiple accounts, see [Security Hub cross-account aggregation](https://oneuptime.com/blog/post/2026-02-12-aggregate-security-hub-findings-across-accounts/view). And make sure you've got the right [compliance standards enabled](https://oneuptime.com/blog/post/2026-02-12-security-hub-compliance-standards-cis-pci/view) to generate the findings your insights depend on.
