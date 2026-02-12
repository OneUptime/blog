# How to Use Trusted Advisor for Cost Optimization Recommendations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Trusted Advisor, Cost Optimization, Best Practices

Description: Learn how to use AWS Trusted Advisor cost optimization checks to find idle resources, underutilized instances, and savings opportunities across your account.

---

AWS Trusted Advisor is like having a consultant that continuously reviews your account and flags waste, security risks, and performance issues. The cost optimization checks are particularly valuable - they identify specific resources that are costing you money without providing value.

The catch is that the free tier of Trusted Advisor only includes a limited set of checks. You need a Business or Enterprise support plan ($100+/month) to access all cost optimization checks. But even the free checks are worth using, and if you're spending enough on AWS to justify a support plan, the savings Trusted Advisor finds usually pay for the plan many times over.

## What Cost Optimization Checks Are Available

Trusted Advisor's cost optimization category covers these areas:

**Free tier (all accounts):**
- Amazon EC2 Reserved Instance Lease Expiration
- S3 Bucket Permissions (indirectly affects cost through security)

**Business/Enterprise support plans (full set):**
- Low Utilization Amazon EC2 Instances
- Idle Load Balancers
- Underutilized Amazon EBS Volumes
- Unassociated Elastic IP Addresses
- Amazon RDS Idle DB Instances
- Amazon Redshift Cluster Configuration
- Amazon EC2 Reserved Instance Optimization
- Lambda Functions with High Error Rates
- Lambda Functions with Excessive Timeouts
- Amazon S3 Incomplete Multipart Uploads

## Accessing Trusted Advisor Checks via CLI

You can retrieve Trusted Advisor recommendations programmatically:

```bash
# List all available Trusted Advisor checks
aws support describe-trusted-advisor-checks \
  --language en \
  --query "checks[?category=='cost_optimizing'].{Id: id, Name: name}" \
  --output table
```

To get results for a specific check:

```bash
# Get results for the Low Utilization EC2 Instances check
# First, find the check ID
CHECK_ID=$(aws support describe-trusted-advisor-checks \
  --language en \
  --query "checks[?name=='Low Utilization Amazon EC2 Instances'].id" \
  --output text)

# Get the check results
aws support describe-trusted-advisor-check-result \
  --check-id $CHECK_ID \
  --language en
```

## Automating Trusted Advisor Reviews

Here's a Python script that pulls all cost optimization recommendations and generates a report:

```python
import boto3
import json

def get_cost_recommendations():
    """Pull all cost optimization recommendations from Trusted Advisor"""
    # Trusted Advisor API requires us-east-1
    support = boto3.client('support', region_name='us-east-1')

    # Get all checks in the cost_optimizing category
    checks = support.describe_trusted_advisor_checks(language='en')

    cost_checks = [
        c for c in checks['checks']
        if c['category'] == 'cost_optimizing'
    ]

    print(f"Found {len(cost_checks)} cost optimization checks\n")

    total_savings = 0

    for check in cost_checks:
        try:
            result = support.describe_trusted_advisor_check_result(
                checkId=check['id'],
                language='en'
            )

            status = result['result']['status']
            flagged = result['result'].get('flaggedResources', [])

            if status == 'warning' or status == 'error':
                print(f"\n{'='*60}")
                print(f"CHECK: {check['name']}")
                print(f"Status: {status}")
                print(f"Flagged resources: {len(flagged)}")

                # Try to extract estimated savings
                summary = result['result'].get('categorySpecificSummary', {})
                cost_summary = summary.get('costOptimizing', {})
                savings = cost_summary.get('estimatedMonthlySavings', 0)

                if savings:
                    print(f"Estimated monthly savings: ${savings:.2f}")
                    total_savings += savings

                # Print first 5 flagged resources
                headers = check.get('metadata', [])
                for resource in flagged[:5]:
                    metadata = resource.get('metadata', [])
                    resource_info = dict(zip(headers, metadata))
                    print(f"  - {json.dumps(resource_info, indent=4)}")

                if len(flagged) > 5:
                    print(f"  ... and {len(flagged) - 5} more")

        except Exception as e:
            print(f"Could not retrieve {check['name']}: {e}")

    print(f"\n{'='*60}")
    print(f"TOTAL ESTIMATED MONTHLY SAVINGS: ${total_savings:.2f}")
    print(f"TOTAL ESTIMATED ANNUAL SAVINGS: ${total_savings * 12:.2f}")

get_cost_recommendations()
```

## Refresh Checks Automatically

Trusted Advisor results aren't real-time - they're updated periodically. You can trigger manual refreshes:

```python
import boto3
import time

def refresh_cost_checks():
    """Refresh all cost optimization checks"""
    support = boto3.client('support', region_name='us-east-1')

    checks = support.describe_trusted_advisor_checks(language='en')
    cost_checks = [c for c in checks['checks'] if c['category'] == 'cost_optimizing']

    for check in cost_checks:
        try:
            support.refresh_trusted_advisor_check(checkId=check['id'])
            print(f"Refreshed: {check['name']}")
        except support.exceptions.InvalidParameterValueException:
            # Some checks can't be refreshed manually
            print(f"Cannot refresh: {check['name']}")
        time.sleep(1)  # Avoid rate limiting

    print("\nChecks refreshed. Results will be available in a few minutes.")

refresh_cost_checks()
```

## Setting Up Automated Alerts

Use CloudWatch Events to get notified when Trusted Advisor flags new issues:

```bash
# Create an EventBridge rule for Trusted Advisor check status changes
aws events put-rule \
  --name "trusted-advisor-cost-alerts" \
  --event-pattern '{
    "source": ["aws.trustedadvisor"],
    "detail-type": ["Trusted Advisor Check Item Refresh Notification"],
    "detail": {
      "check-item-detail": {
        "status": ["warning", "error"]
      }
    }
  }' \
  --description "Alert when Trusted Advisor finds cost optimization issues"

# Route alerts to an SNS topic
aws events put-targets \
  --rule trusted-advisor-cost-alerts \
  --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:123456789012:cost-alerts"
```

## Acting on Common Recommendations

Let's walk through how to act on the most impactful Trusted Advisor findings:

**Low Utilization EC2 Instances** - Instances with CPU utilization below 10% for the past 14 days. Options:
1. Right-size to a smaller instance type
2. Stop the instance if it's not needed
3. Move to a spot or Graviton instance

```bash
# Modify the instance type (requires a stop/start)
aws ec2 stop-instances --instance-ids i-0a1b2c3d4e5f67890
aws ec2 modify-instance-attribute \
  --instance-id i-0a1b2c3d4e5f67890 \
  --instance-type t3.small
aws ec2 start-instances --instance-ids i-0a1b2c3d4e5f67890
```

**Idle Load Balancers** - ALBs with no active connections for 7+ days:

```bash
# Delete an idle load balancer
aws elbv2 delete-load-balancer \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/idle-lb/abc123
```

**Underutilized EBS Volumes** - Volumes with low IOPS usage. Consider switching to a cheaper volume type:

```bash
# Switch from io1 to gp3 for a volume that doesn't need provisioned IOPS
aws ec2 modify-volume \
  --volume-id vol-0a1b2c3d4e5f67890 \
  --volume-type gp3
```

**Unassociated Elastic IPs:**

```bash
# Release unassociated EIPs
aws ec2 release-address --allocation-id eipalloc-0a1b2c3d4e5f67890
```

## Building a Weekly Review Process

Create a weekly report that summarizes all Trusted Advisor cost findings:

```python
import boto3
from datetime import datetime

def weekly_cost_report():
    """Generate a weekly Trusted Advisor cost optimization report"""
    support = boto3.client('support', region_name='us-east-1')
    sns = boto3.client('sns')

    checks = support.describe_trusted_advisor_checks(language='en')
    cost_checks = [c for c in checks['checks'] if c['category'] == 'cost_optimizing']

    report = []
    report.append(f"Trusted Advisor Weekly Cost Report - {datetime.now().strftime('%Y-%m-%d')}")
    report.append("=" * 60)

    total_savings = 0

    for check in cost_checks:
        try:
            result = support.describe_trusted_advisor_check_result(
                checkId=check['id'],
                language='en'
            )

            flagged = result['result'].get('flaggedResources', [])
            summary = result['result'].get('categorySpecificSummary', {})
            savings = summary.get('costOptimizing', {}).get('estimatedMonthlySavings', 0)

            if flagged:
                report.append(f"\n{check['name']}")
                report.append(f"  Flagged resources: {len(flagged)}")
                if savings:
                    report.append(f"  Estimated savings: ${savings:.2f}/mo")
                    total_savings += savings

        except Exception:
            pass

    report.append(f"\nTOTAL MONTHLY SAVINGS OPPORTUNITY: ${total_savings:.2f}")

    # Send the report
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:weekly-cost-report',
        Subject=f'Weekly Cost Optimization Report - ${total_savings:.0f}/mo savings available',
        Message='\n'.join(report)
    )

weekly_cost_report()
```

## Trusted Advisor vs. Cost Explorer vs. Compute Optimizer

These three tools serve different purposes:

- **Trusted Advisor** identifies specific resources that are wasteful or misconfigured. Think of it as a checklist.
- **Cost Explorer** shows you spending trends, forecasts, and breakdowns. It answers "where is my money going?"
- **Compute Optimizer** provides specific right-sizing recommendations for EC2, Lambda, and EBS based on ML analysis.

Use all three together for a complete picture. For more on anomaly detection and cost tracking, check out our guide on [setting up anomaly detection for AWS costs](https://oneuptime.com/blog/post/set-up-anomaly-detection-for-aws-costs/view).

## Key Takeaways

Trusted Advisor is most valuable when it's automated. Set up a weekly review process, configure alerts for new findings, and track savings over time. The cost optimization checks alone typically identify 10-20% savings for accounts that haven't been actively optimized. Start with the highest-savings findings first, and work through the recommendations systematically.
