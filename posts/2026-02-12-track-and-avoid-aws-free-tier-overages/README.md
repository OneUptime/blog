# How to Track and Avoid AWS Free Tier Overages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Free Tier, Billing, Cost Management, Monitoring

Description: Set up automated tracking and alerts to prevent AWS Free Tier overages before they hit your bill, with scripts and CloudWatch alarms.

---

The worst part about exceeding the AWS Free Tier isn't the charge itself - it's the surprise. You thought you were running for free, then a $47 bill shows up because you left a NAT Gateway running or forgot about an RDS instance in a region you stopped using two months ago.

AWS does send free tier usage alerts by email, but they're often too late (you've already exceeded the limit) and easy to miss in a crowded inbox. Let's build something better.

## Enable AWS Free Tier Usage Alerts

Start with the built-in option. AWS can email you when you reach 85% of a free tier limit:

```bash
# Check if billing alerts are enabled
aws ce get-preferences

# The free tier alerts are enabled through the Billing console
# But you can create your own budget-based alerts with more control
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "ZeroDollarBudget",
    "BudgetLimit": {"Amount": "0.01", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 0.01
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "your-email@example.com"}
      ]
    }
  ]'
```

This zero-dollar budget sends an alert the moment any charge appears on your account. It's the simplest way to catch free tier overages immediately.

## Check Free Tier Usage Programmatically

AWS provides an API to check your free tier usage. Here's a script that pulls current usage for all free tier services:

```python
import boto3

def check_free_tier_usage():
    """Check current free tier usage across all services"""
    client = boto3.client('freetier', region_name='us-east-1')

    paginator = client.get_paginator('get_free_tier_usage')

    print(f"{'Service':<25} {'Usage Type':<35} {'Used':<12} {'Limit':<12} {'% Used'}")
    print("-" * 100)

    warnings = []

    for page in paginator.paginate():
        for item in page['freeTierUsages']:
            service = item['service']
            description = item['description'][:33]
            actual = item['actualUsageAmount']
            limit = item['forecastedUsageAmount'] if 'forecastedUsageAmount' in item else item['limit']
            free_limit = item['limit']

            if free_limit > 0:
                pct = (actual / free_limit) * 100
            else:
                pct = 0

            status = ""
            if pct >= 80:
                status = " WARNING"
                warnings.append(f"{service}: {description} at {pct:.0f}%")

            print(f"{service:<25} {description:<35} {actual:<12.2f} {free_limit:<12.2f} {pct:.0f}%{status}")

    if warnings:
        print(f"\n{'='*50}")
        print("WARNINGS - approaching free tier limits:")
        for w in warnings:
            print(f"  - {w}")

    return warnings

check_free_tier_usage()
```

## Build an Automated Daily Scanner

Set up a Lambda function that runs daily and checks for resources that could generate charges:

```python
import boto3
import json
from datetime import datetime

sns = boto3.client('sns')
ALERT_TOPIC = 'arn:aws:sns:us-east-1:123456789012:free-tier-alerts'

def lambda_handler(event, context):
    issues = []

    # Check for more than one running EC2 instance
    ec2 = boto3.client('ec2')
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    running = []
    for r in instances['Reservations']:
        for i in r['Instances']:
            running.append({
                'id': i['InstanceId'],
                'type': i['InstanceType'],
                'az': i['Placement']['AvailabilityZone']
            })

    if len(running) > 1:
        issues.append(f"WARNING: {len(running)} running EC2 instances (free tier covers 1)")
    for inst in running:
        if inst['type'] not in ['t2.micro', 't3.micro']:
            issues.append(f"WARNING: {inst['id']} is {inst['type']} (not free tier eligible)")

    # Check for unattached Elastic IPs
    addresses = ec2.describe_addresses()
    unattached = [a for a in addresses['Addresses'] if 'AssociationId' not in a]
    if unattached:
        issues.append(f"WARNING: {len(unattached)} unattached Elastic IPs (costs $0.005/hr each)")

    # Check for NAT Gateways (never free)
    nat_gws = ec2.describe_nat_gateways(
        Filters=[{'Name': 'state', 'Values': ['available']}]
    )
    if nat_gws['NatGateways']:
        issues.append(f"WARNING: {len(nat_gws['NatGateways'])} NAT Gateways running ($32/mo each)")

    # Check for unattached EBS volumes
    volumes = ec2.describe_volumes(
        Filters=[{'Name': 'status', 'Values': ['available']}]
    )
    if volumes['Volumes']:
        total_gb = sum(v['Size'] for v in volumes['Volumes'])
        issues.append(f"WARNING: {len(volumes['Volumes'])} unattached EBS volumes ({total_gb}GB)")

    # Check EBS total storage
    all_volumes = ec2.describe_volumes()
    total_ebs = sum(v['Size'] for v in all_volumes['Volumes'])
    if total_ebs > 30:
        issues.append(f"WARNING: Total EBS storage is {total_ebs}GB (free tier is 30GB)")

    # Check for RDS instances
    rds = boto3.client('rds')
    db_instances = rds.describe_db_instances()['DBInstances']
    for db in db_instances:
        if db['DBInstanceClass'] not in ['db.t2.micro', 'db.t3.micro', 'db.t4g.micro']:
            issues.append(f"WARNING: RDS {db['DBInstanceIdentifier']} is {db['DBInstanceClass']} (not free tier)")
        if db.get('MultiAZ'):
            issues.append(f"WARNING: RDS {db['DBInstanceIdentifier']} has Multi-AZ enabled (doubles hours)")

    # Check for Elastic Load Balancers (not free)
    elbv2 = boto3.client('elbv2')
    lbs = elbv2.describe_load_balancers()
    if lbs['LoadBalancers']:
        issues.append(f"WARNING: {len(lbs['LoadBalancers'])} load balancers running (not free tier)")

    # Send notification if there are issues
    if issues:
        message = "Free Tier Daily Audit Report\n"
        message += f"Date: {datetime.now().strftime('%Y-%m-%d')}\n\n"
        message += "\n".join(issues)
        message += "\n\nReview and clean up resources to avoid charges."

        sns.publish(
            TopicArn=ALERT_TOPIC,
            Subject=f'Free Tier Alert: {len(issues)} issue(s) found',
            Message=message
        )

    return {
        'issues_found': len(issues),
        'details': issues
    }
```

Schedule it to run daily:

```bash
# Create a daily schedule for the scanner
aws events put-rule \
  --name "daily-free-tier-audit" \
  --schedule-expression "rate(1 day)" \
  --description "Daily scan for free tier overage risks"

aws events put-targets \
  --rule daily-free-tier-audit \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:free-tier-scanner"
```

## Track Usage Over Time with CloudWatch

Create a dashboard that shows your free tier consumption trends:

```bash
# Create a CloudWatch dashboard for free tier monitoring
aws cloudwatch put-dashboard \
  --dashboard-name FreeTierUsage \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "title": "EC2 Instance Hours",
          "metrics": [
            ["AWS/EC2", "CPUUtilization", "InstanceId", "i-0a1b2c3d"]
          ],
          "period": 3600,
          "stat": "SampleCount"
        }
      },
      {
        "type": "metric",
        "properties": {
          "title": "Lambda Invocations",
          "metrics": [
            ["AWS/Lambda", "Invocations"]
          ],
          "period": 86400,
          "stat": "Sum"
        }
      },
      {
        "type": "metric",
        "properties": {
          "title": "S3 Requests",
          "metrics": [
            ["AWS/S3", "AllRequests", "BucketName", "my-bucket", "FilterId", "AllMetrics"]
          ],
          "period": 86400,
          "stat": "Sum"
        }
      }
    ]
  }'
```

## Common Overage Scenarios and Fixes

Here are the most common ways people exceed free tier, and how to fix each one:

**Forgot to terminate an instance in another region:**

```bash
# Check ALL regions for running instances
for region in $(aws ec2 describe-regions --query "Regions[].RegionName" --output text); do
  instances=$(aws ec2 describe-instances \
    --region $region \
    --filters "Name=instance-state-name,Values=running" \
    --query "length(Reservations[].Instances[])" \
    --output text)
  if [ "$instances" != "0" ] && [ "$instances" != "None" ]; then
    echo "Region $region: $instances running instance(s)"
  fi
done
```

**EBS snapshots accumulating:**

```bash
# Check total snapshot storage across the account
aws ec2 describe-snapshots \
  --owner-ids self \
  --query "{Count: length(Snapshots), TotalGB: sum(Snapshots[].VolumeSize)}"
```

**CloudWatch Logs growing unbounded:**

```bash
# Check log group sizes
aws logs describe-log-groups \
  --query "logGroups[].{Name: logGroupName, StoredMB: storedBytes}" \
  --output table
```

Set retention policies to prevent log growth:

```bash
# Set 7-day retention on all log groups
for lg in $(aws logs describe-log-groups --query "logGroups[].logGroupName" --output text); do
  aws logs put-retention-policy --log-group-name "$lg" --retention-in-days 7
  echo "Set 7-day retention on $lg"
done
```

## Set Up a Kill Switch

For extra safety, create a Lambda function that can automatically stop non-essential resources when spending exceeds a threshold:

```python
import boto3

ec2 = boto3.client('ec2')

def emergency_stop(event, context):
    """Stop all non-essential instances when budget threshold is breached"""
    # Find running instances without a 'keep-running' tag
    response = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running']},
        ]
    )

    stopped = []
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            tags = {t['Key']: t['Value'] for t in instance.get('Tags', [])}
            if tags.get('KeepRunning') != 'true':
                ec2.stop_instances(InstanceIds=[instance['InstanceId']])
                stopped.append(instance['InstanceId'])

    return {'stopped_instances': stopped}
```

Connect it to a budget alert so it triggers automatically when you exceed your threshold.

## Key Takeaways

Avoiding free tier overages comes down to three things: set up alerts before you start using services, run a daily audit to catch forgotten resources, and check all regions since resources in regions you've forgotten about are the most common source of surprise charges. The zero-dollar budget alert is the single most important thing to configure - it catches everything else.

For more on getting the most out of AWS Free Tier, see our guide on [using AWS Free Tier effectively](https://oneuptime.com/blog/post/use-aws-free-tier-effectively/view). And if you're ready to move beyond free tier, check out [creating a cost optimization strategy for AWS](https://oneuptime.com/blog/post/create-a-cost-optimization-strategy-for-aws/view).
