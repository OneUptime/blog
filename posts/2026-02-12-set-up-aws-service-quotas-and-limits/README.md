# How to Set Up AWS Service Quotas and Limits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Service Quotas, Limit, Governance, Operation

Description: Learn how to view, monitor, and manage AWS service quotas to prevent resource limits from blocking deployments and causing outages.

---

Every AWS service has limits on how many resources you can create. These are called service quotas, and hitting them at the wrong time can take down a deployment, block auto-scaling, or prevent disaster recovery from working. It's one of those problems that never shows up in testing but hits you hard in production.

Common quota-related incidents include: auto-scaling failing because you've hit the EC2 instance limit, VPCs running out of available IP addresses, Lambda concurrency limits throttling your API during a traffic spike, and EBS volume creation failing during a failover.

Let's set up proper quota management so these surprises don't happen to you.

## Viewing Current Quotas

AWS Service Quotas provides a unified view of all your limits:

```bash
# List all services that have quotas

aws service-quotas list-services \
  --query "Services[].{Code: ServiceCode, Name: ServiceName}" \
  --output table
```

Check quotas for a specific service:

```bash
# List all EC2 quotas
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query "Quotas[].{
    Name: QuotaName,
    Value: Value,
    Adjustable: Adjustable
  }" \
  --output table

# Get a specific quota (e.g., running on-demand instances)
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A
```

For quotas that aren't yet in the Service Quotas service, check the older AWS Trusted Advisor limits check:

```bash
# Get service limits from Trusted Advisor
aws support describe-trusted-advisor-checks \
  --language en \
  --query "checks[?category=='service_limits'].{Id: id, Name: name}" \
  --output table
```

## Checking Current Usage Against Quotas

Knowing your quotas is only useful if you also know your current usage. Here's a script that checks the most critical ones:

```python
import boto3

def check_critical_quotas():
    """Check current usage against critical service quotas"""
    ec2 = boto3.client('ec2')
    sq = boto3.client('service-quotas')

    checks = []

    # EC2: Running On-Demand Standard quota is measured in vCPUs
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    running_vcpus = sum(
        i.get('CpuOptions', {}).get('CoreCount', 1) *
        i.get('CpuOptions', {}).get('ThreadsPerCore', 1)
        for r in instances['Reservations']
        for i in r['Instances']
    )

    # Get the quota for running on-demand instances
    try:
        quota = sq.get_service_quota(
            ServiceCode='ec2',
            QuotaCode='L-1216C47A'  # Running On-Demand Standard instances
        )
        limit = quota['Quota']['Value']
        checks.append({
            'service': 'EC2',
            'quota': 'Running On-Demand Standard vCPUs',
            'used': running_vcpus,
            'limit': int(limit),
            'pct': (running_vcpus / limit * 100) if limit > 0 else 0
        })
    except Exception as e:
        print(f"Could not check EC2 quota: {e}")

    # VPCs per region
    vpcs = ec2.describe_vpcs()
    vpc_count = len(vpcs['Vpcs'])
    try:
        quota = sq.get_service_quota(ServiceCode='vpc', QuotaCode='L-F678F1CE')
        limit = quota['Quota']['Value']
        checks.append({
            'service': 'VPC',
            'quota': 'VPCs per Region',
            'used': vpc_count,
            'limit': int(limit),
            'pct': (vpc_count / limit * 100) if limit > 0 else 0
        })
    except Exception:
        pass

    # EBS gp3 storage
    volumes = ec2.describe_volumes()
    gp3_tib = sum(v['Size'] for v in volumes['Volumes'] if v['VolumeType'] == 'gp3') / 1024
    try:
        quota = sq.get_service_quota(ServiceCode='ebs', QuotaCode='L-7A658B76')
        limit = quota['Quota']['Value']
        checks.append({
            'service': 'EBS',
            'quota': 'gp3 storage (TiB)',
            'used': round(gp3_tib, 2),
            'limit': int(limit),
            'pct': (gp3_tib / limit * 100) if limit > 0 else 0
        })
    except Exception:
        pass

    # Elastic IPs
    addresses = ec2.describe_addresses()
    eip_count = len(addresses['Addresses'])
    try:
        quota = sq.get_service_quota(ServiceCode='ec2', QuotaCode='L-0263D0A3')
        limit = quota['Quota']['Value']
        checks.append({
            'service': 'EC2',
            'quota': 'Elastic IPs',
            'used': eip_count,
            'limit': int(limit),
            'pct': (eip_count / limit * 100) if limit > 0 else 0
        })
    except Exception:
        pass

    # VPC security groups per Region
    try:
        sgs = ec2.describe_security_groups()
        sg_count = len(sgs['SecurityGroups'])
        quota = sq.get_service_quota(ServiceCode='vpc', QuotaCode='L-E79EC296')
        limit = quota['Quota']['Value']
        if sg_count > limit * 0.8:
            checks.append({
                'service': 'VPC',
                'quota': 'Security Groups per Region',
                'used': sg_count,
                'limit': int(limit),
                'pct': sg_count / limit * 100
            })
    except Exception:
        pass

    # Print report
    print(f"\n{'Service':<10} {'Quota':<40} {'Used':<8} {'Limit':<8} {'Usage %'}")
    print("-" * 80)
    for check in sorted(checks, key=lambda x: x['pct'], reverse=True):
        warning = " *** WARNING ***" if check['pct'] > 80 else ""
        print(f"{check['service']:<10} {check['quota']:<40} {check['used']:<8} "
              f"{check['limit']:<8} {check['pct']:.0f}%{warning}")

check_critical_quotas()
```

## Setting Up CloudWatch Alarms for Quotas

AWS Service Quotas integrates with CloudWatch. You can create alarms that trigger when usage approaches a limit:

```bash
# Create a CloudWatch alarm for Lambda account concurrency
# First, get the quota value
LAMBDA_QUOTA=$(aws service-quotas get-service-quota \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --query "Quota.Value" \
  --output text)

# Calculate 80% threshold
THRESHOLD=$(echo "$LAMBDA_QUOTA * 0.8" | bc)

# Create the alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-ClaimedAccountConcurrency-80pct" \
  --metric-name ClaimedAccountConcurrency \
  --namespace AWS/Lambda \
  --statistic Maximum \
  --period 300 \
  --threshold $THRESHOLD \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:quota-alerts \
  --alarm-description "Lambda claimed account concurrency at 80% of quota"
```

To request a quota increase from the CLI:

```bash
# Request a Lambda concurrent executions quota increase
aws service-quotas request-service-quota-increase \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --desired-value 2000
```

## Automated Quota Monitoring Lambda

Set up a Lambda function that runs daily and reports on quotas approaching their limits:

```python
import boto3
from datetime import datetime, timedelta, timezone

sq = boto3.client('service-quotas')
sns = boto3.client('sns')
cw = boto3.client('cloudwatch')
ALERT_TOPIC = 'arn:aws:sns:us-east-1:123456789012:quota-alerts'

# Critical services to monitor
SERVICES = ['ec2', 'vpc', 'elasticloadbalancing', 'lambda',
            'rds', 'dynamodb', 'ecs', 's3']

WARNING_THRESHOLD = 80  # Alert at 80% usage

def lambda_handler(event, context):
    warnings = []
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=1)

    for service_code in SERVICES:
        try:
            paginator = sq.get_paginator('list_service_quotas')
            for page in paginator.paginate(ServiceCode=service_code):
                for quota in page['Quotas']:
                    # Only check quotas with usage metrics
                    if quota.get('UsageMetric'):
                        try:
                            # Get current usage from CloudWatch
                            metric = quota['UsageMetric']
                            statistic = metric.get('MetricStatisticRecommendation', 'Maximum')

                            response = cw.get_metric_statistics(
                                Namespace=metric['MetricNamespace'],
                                MetricName=metric['MetricName'],
                                Dimensions=[
                                    {'Name': k, 'Value': v}
                                    for k, v in metric.get('MetricDimensions', {}).items()
                                ],
                                StartTime=start_time,
                                EndTime=end_time,
                                Period=86400,
                                Statistics=[statistic]
                            )

                            if response['Datapoints']:
                                latest = max(response['Datapoints'], key=lambda x: x['Timestamp'])
                                usage = latest.get(statistic, 0)
                                limit = quota['Value']

                                if limit > 0:
                                    pct = (usage / limit) * 100
                                    if pct >= WARNING_THRESHOLD:
                                        warnings.append(
                                            f"{service_code}: {quota['QuotaName']} "
                                            f"at {pct:.0f}% ({usage:.0f}/{limit:.0f})"
                                        )
                        except Exception:
                            continue

        except Exception as e:
            print(f"Error checking {service_code}: {e}")

    if warnings:
        message = "Service Quota Warnings:\n\n"
        for w in warnings:
            message += f"  - {w}\n"

        sns.publish(
            TopicArn=ALERT_TOPIC,
            Subject=f'AWS Quota Alert: {len(warnings)} quotas approaching limits',
            Message=message
        )

    return {'warnings': len(warnings), 'details': warnings}
```

## Key Quotas to Monitor

Here are the quotas that most commonly cause problems:

| Service | Quota | Default Limit | Why It Matters |
|---|---|---|---|
| EC2 | Running On-Demand Standard vCPUs | Varies | Blocks scaling and launches |
| VPC | VPCs per region | 5 | Blocks new environment creation |
| VPC | Subnets per VPC | 200 | Blocks network expansion |
| EBS | gp3 storage per region | 50 TiB | Blocks volume creation |
| Lambda | Concurrent executions | 1,000 | Throttles entire application |
| RDS | DB instances | 40 | Blocks database creation |
| ECS | Tasks per service | 5,000 | Limits scaling |
| S3 | General purpose buckets per account | 10,000 | Blocks new bucket creation |
| IAM | Roles per account | 1,000 | Blocks deployments |
| CloudFormation | Stacks per region | 2,000 | Blocks IaC deployments |

## Proactive Quota Planning

Don't wait for quotas to become a problem. Build quota checks into your deployment pipeline:

```python
import boto3

def pre_deployment_quota_check(required_resources):
    """Check quotas before deploying new resources"""
    ec2 = boto3.client('ec2')
    sq = boto3.client('service-quotas')

    issues = []

    # Check EC2 vCPU quota
    if 'ec2_vcpus' in required_resources:
        needed = required_resources['ec2_vcpus']
        current = sum(
            i.get('CpuOptions', {}).get('CoreCount', 1) *
            i.get('CpuOptions', {}).get('ThreadsPerCore', 1)
            for r in ec2.describe_instances(
                Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
            )['Reservations']
            for i in r['Instances']
        )
        quota = sq.get_service_quota(
            ServiceCode='ec2', QuotaCode='L-1216C47A'
        )['Quota']['Value']

        if current + needed > quota:
            issues.append(
                f"EC2: Need {needed} vCPUs but only "
                f"{int(quota) - current} available (quota: {int(quota)}, used: {current})"
            )

    # Check EBS gp3 storage quota
    if 'ebs_gp3_gib' in required_resources:
        needed = required_resources['ebs_gp3_gib']
        current = sum(
            v['Size'] for v in ec2.describe_volumes()['Volumes']
            if v['VolumeType'] == 'gp3'
        )
        quota_tib = sq.get_service_quota(
            ServiceCode='ebs', QuotaCode='L-7A658B76'
        )['Quota']['Value']
        quota_gib = int(quota_tib * 1024)
        available = quota_gib - current

        if needed > available:
            issues.append(
                f"EBS: Need {needed} GiB of gp3 storage but only {available} GiB available"
            )

    if issues:
        print("DEPLOYMENT BLOCKED - Quota issues:")
        for issue in issues:
            print(f"  - {issue}")
        print("\nRequest quota increases before deploying.")
        return False

    print("All quota checks passed.")
    return True

# Example usage
pre_deployment_quota_check({
    'ec2_vcpus': 40,
    'ebs_gp3_gib': 500
})
```

For details on requesting quota increases, check out our guide on [requesting AWS service quota increases](https://oneuptime.com/blog/post/2026-02-12-request-aws-service-quota-increases/view).

## Key Takeaways

Service quotas are a silent risk that most teams ignore until they get burned. Set up monitoring for the critical quotas listed above, run a daily scan, and build quota checks into your deployment pipeline. The 30 minutes it takes to set this up is nothing compared to the hours you'll spend debugging a production incident caused by a quota limit you didn't know you'd hit.
