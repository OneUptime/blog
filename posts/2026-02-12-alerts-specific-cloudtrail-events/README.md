# How to Set Up Alerts for Specific CloudTrail Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudTrail, CloudWatch, Alerting, Security

Description: Learn how to create targeted alerts for specific AWS CloudTrail events using CloudWatch metric filters, EventBridge rules, and SNS notifications.

---

Having CloudTrail enabled is just the first step. The real value comes from knowing when something important happens - not 15 minutes later when you're checking logs, but immediately. Whether it's someone creating a new IAM user, disabling encryption on an S3 bucket, or modifying a VPC, you need alerts that tell you about it in real time.

There are two main approaches to alerting on CloudTrail events: CloudWatch metric filters and EventBridge rules. Each has its strengths, and you'll probably end up using both.

## Approach 1: CloudWatch Metric Filters

This approach requires [CloudTrail integrated with CloudWatch Logs](https://oneuptime.com/blog/post/2026-02-12-integrate-cloudtrail-cloudwatch-logs/view). Metric filters parse the JSON events as they arrive and increment a CloudWatch metric when a pattern matches. You then create alarms on those metrics.

### The CIS Benchmark Alerts

The CIS AWS Foundations Benchmark defines specific CloudTrail events you should be alerting on. Here's how to set up the complete set.

Unauthorized API calls should be monitored because a spike in access-denied errors often indicates compromised credentials or an attacker probing your environment.

```bash
# 1. Unauthorized API calls
aws logs put-metric-filter \
  --log-group-name CloudTrail/DefaultLogGroup \
  --filter-name UnauthorizedAPICalls \
  --filter-pattern '{ ($.errorCode = "*UnauthorizedAccess") || ($.errorCode = "AccessDenied*") }' \
  --metric-transformations \
    metricName=UnauthorizedAPICalls,metricNamespace=CISBenchmark,metricValue=1,defaultValue=0

aws cloudwatch put-metric-alarm \
  --alarm-name CIS-UnauthorizedAPICalls \
  --metric-name UnauthorizedAPICalls \
  --namespace CISBenchmark \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:111111111111:security-alerts
```

Network gateway changes can expose internal services to the internet, so they need immediate attention.

```bash
# 2. Network gateway changes
aws logs put-metric-filter \
  --log-group-name CloudTrail/DefaultLogGroup \
  --filter-name NetworkGatewayChanges \
  --filter-pattern '{ ($.eventName = "CreateCustomerGateway") || ($.eventName = "DeleteCustomerGateway") || ($.eventName = "AttachInternetGateway") || ($.eventName = "CreateInternetGateway") || ($.eventName = "DeleteInternetGateway") || ($.eventName = "DetachInternetGateway") }' \
  --metric-transformations \
    metricName=NetworkGatewayChanges,metricNamespace=CISBenchmark,metricValue=1,defaultValue=0

aws cloudwatch put-metric-alarm \
  --alarm-name CIS-NetworkGatewayChanges \
  --metric-name NetworkGatewayChanges \
  --namespace CISBenchmark \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:111111111111:security-alerts
```

CloudTrail configuration changes themselves need to be monitored - an attacker's first move is often to disable logging.

```bash
# 3. CloudTrail configuration changes
aws logs put-metric-filter \
  --log-group-name CloudTrail/DefaultLogGroup \
  --filter-name CloudTrailChanges \
  --filter-pattern '{ ($.eventName = "CreateTrail") || ($.eventName = "UpdateTrail") || ($.eventName = "DeleteTrail") || ($.eventName = "StartLogging") || ($.eventName = "StopLogging") }' \
  --metric-transformations \
    metricName=CloudTrailChanges,metricNamespace=CISBenchmark,metricValue=1,defaultValue=0

aws cloudwatch put-metric-alarm \
  --alarm-name CIS-CloudTrailChanges \
  --metric-name CloudTrailChanges \
  --namespace CISBenchmark \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:111111111111:security-alerts
```

S3 bucket policy changes can accidentally make data public, so they warrant close monitoring.

```bash
# 4. S3 bucket policy changes
aws logs put-metric-filter \
  --log-group-name CloudTrail/DefaultLogGroup \
  --filter-name S3BucketPolicyChanges \
  --filter-pattern '{ ($.eventSource = "s3.amazonaws.com") && (($.eventName = "PutBucketAcl") || ($.eventName = "PutBucketPolicy") || ($.eventName = "PutBucketCors") || ($.eventName = "PutBucketLifecycle") || ($.eventName = "PutBucketReplication") || ($.eventName = "DeleteBucketPolicy") || ($.eventName = "DeleteBucketCors") || ($.eventName = "DeleteBucketLifecycle") || ($.eventName = "DeleteBucketReplication")) }' \
  --metric-transformations \
    metricName=S3BucketPolicyChanges,metricNamespace=CISBenchmark,metricValue=1,defaultValue=0
```

## Approach 2: EventBridge Rules

EventBridge is the newer, more flexible approach. It catches CloudTrail events directly without needing the CloudWatch Logs integration. The event patterns are more expressive, and you can route events to more target types.

### Alert on IAM User Creation

Here's an EventBridge rule that fires whenever a new IAM user is created.

```bash
# Create the EventBridge rule
aws events put-rule \
  --name iam-user-created \
  --event-pattern '{
    "source": ["aws.iam"],
    "detail-type": ["AWS API Call via CloudTrail"],
    "detail": {
      "eventSource": ["iam.amazonaws.com"],
      "eventName": ["CreateUser"]
    }
  }' \
  --description "Alert when a new IAM user is created"

# Add SNS as the target
aws events put-targets \
  --rule iam-user-created \
  --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:111111111111:security-alerts"
```

### Alert on Console Login from New IP

This one's a bit more involved. Use a Lambda function to check the source IP against known IPs.

```python
import json
import boto3
import os

sns = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['KNOWN_IPS_TABLE'])

def handler(event, context):
    detail = event['detail']
    source_ip = detail.get('sourceIPAddress', 'unknown')
    user = detail.get('userIdentity', {}).get('arn', 'unknown')

    # Check if this IP is known
    response = table.get_item(Key={'ip': source_ip})

    if 'Item' not in response:
        # New IP - send alert
        message = f"""
New console login detected from unknown IP!

User: {user}
IP: {source_ip}
Time: {detail.get('eventTime', 'unknown')}
Region: {detail.get('awsRegion', 'unknown')}
MFA Used: {detail.get('additionalEventData', {}).get('MFAUsed', 'unknown')}
"""
        sns.publish(
            TopicArn=os.environ['ALERT_TOPIC_ARN'],
            Subject='Console Login from New IP',
            Message=message
        )

        # Record the IP for future reference
        table.put_item(Item={
            'ip': source_ip,
            'first_seen': detail.get('eventTime', ''),
            'user': user
        })
```

The corresponding EventBridge rule looks like this.

```bash
aws events put-rule \
  --name console-login-monitor \
  --event-pattern '{
    "source": ["aws.signin"],
    "detail-type": ["AWS Console Sign In via CloudTrail"],
    "detail": {
      "eventName": ["ConsoleLogin"],
      "responseElements": {
        "ConsoleLogin": ["Success"]
      }
    }
  }'
```

### Alert on KMS Key Deletion

KMS key deletion is particularly dangerous because it can make encrypted data permanently inaccessible.

```bash
aws events put-rule \
  --name kms-key-deletion \
  --event-pattern '{
    "source": ["aws.kms"],
    "detail-type": ["AWS API Call via CloudTrail"],
    "detail": {
      "eventSource": ["kms.amazonaws.com"],
      "eventName": ["DisableKey", "ScheduleKeyDeletion"]
    }
  }' \
  --description "Alert when a KMS key is disabled or scheduled for deletion"
```

### Alert on EC2 Instance Launches in Unusual Regions

If you only operate in `us-east-1` and `eu-west-1`, any EC2 instance launched elsewhere is suspicious.

```bash
aws events put-rule \
  --name ec2-unusual-region \
  --event-pattern '{
    "source": ["aws.ec2"],
    "detail-type": ["AWS API Call via CloudTrail"],
    "detail": {
      "eventSource": ["ec2.amazonaws.com"],
      "eventName": ["RunInstances"],
      "awsRegion": [{
        "anything-but": ["us-east-1", "eu-west-1"]
      }]
    }
  }'
```

That `anything-but` pattern is one of the things that makes EventBridge more powerful than CloudWatch metric filters.

## Enriching Alert Messages with Lambda

Raw CloudTrail events are verbose and hard to read in an email. A Lambda function between EventBridge and SNS can produce much better notifications.

```python
import json
import boto3

sns = boto3.client('sns')

def handler(event, context):
    detail = event['detail']

    # Extract useful fields
    who = detail.get('userIdentity', {}).get('arn', 'Unknown')
    what = detail.get('eventName', 'Unknown')
    service = detail.get('eventSource', 'Unknown')
    where = detail.get('awsRegion', 'Unknown')
    when = detail.get('eventTime', 'Unknown')
    source_ip = detail.get('sourceIPAddress', 'Unknown')
    error = detail.get('errorCode', 'None')

    message = f"""
Security Event Detected
=======================
Action: {what}
Service: {service}
Region: {where}
Time: {when}

Who: {who}
Source IP: {source_ip}
Error: {error}

Request Parameters:
{json.dumps(detail.get('requestParameters', {}), indent=2)[:1000]}
"""

    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:111111111111:security-alerts',
        Subject=f'Security Alert: {what} in {where}',
        Message=message
    )
```

## Which Approach Should You Use?

Use CloudWatch metric filters when:
- You want to aggregate events over time (e.g., more than 10 access denied errors in 5 minutes)
- You need CloudWatch dashboards showing event trends
- You're following the CIS Benchmark requirements

Use EventBridge rules when:
- You want immediate, per-event alerting
- You need complex event pattern matching (like `anything-but`)
- You want to trigger Lambda functions for automated remediation
- You don't want to set up the CloudWatch Logs integration

In practice, use both. EventBridge for critical one-off events (like root logins or key deletions) and CloudWatch metric filters for aggregate patterns (like excessive unauthorized API calls).

## Avoiding Alert Fatigue

The biggest risk with security alerting is getting so many alerts that you stop paying attention. A few tips:

- Start with a small number of high-confidence, high-impact alerts
- Tune thresholds based on your actual baseline activity
- Use separate SNS topics for different severity levels
- Route critical alerts to PagerDuty or similar, and informational ones to a Slack channel
- Review and prune your alerts quarterly

For a broader view of security findings across your accounts, check out [AWS Security Hub](https://oneuptime.com/blog/post/2026-02-12-enable-aws-security-hub/view), which aggregates alerts from CloudTrail, GuardDuty, and other sources into a single dashboard.
