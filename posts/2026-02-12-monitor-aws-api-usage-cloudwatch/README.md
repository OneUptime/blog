# How to Monitor AWS Account API Usage with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, API Monitoring, CloudTrail, Security

Description: Learn how to monitor AWS API usage across your account using CloudWatch, CloudTrail, and custom metrics to detect unusual activity and stay within service limits.

---

Every action in AWS is an API call. Launching an EC2 instance, reading from S3, querying DynamoDB - it's all API calls under the hood. Monitoring these API calls gives you visibility into who's doing what in your account, helps you detect unusual activity, and lets you track whether you're approaching service quotas.

There are two main approaches: CloudTrail for detailed API logging, and CloudWatch service usage metrics for quota monitoring. Combining both gives you a complete picture of API activity in your account.

## Approach 1: CloudTrail with CloudWatch Logs

CloudTrail records API calls and delivers them to CloudWatch Logs, where you can create metric filters and alarms.

### Enable CloudTrail Logging to CloudWatch

```bash
# Create a CloudWatch log group for CloudTrail
aws logs create-log-group \
  --log-group-name "/aws/cloudtrail/api-activity"

# Update your trail to send to CloudWatch Logs
aws cloudtrail update-trail \
  --name management-trail \
  --cloud-watch-logs-log-group-arn arn:aws:logs:us-east-1:123456789012:log-group:/aws/cloudtrail/api-activity:* \
  --cloud-watch-logs-role-arn arn:aws:iam::123456789012:role/CloudTrailCloudWatchRole
```

The IAM role needs these permissions:

```json
// IAM role for CloudTrail to write to CloudWatch Logs
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/cloudtrail/api-activity:*"
    }
  ]
}
```

### Create Metric Filters for Important Events

Metric filters turn log patterns into CloudWatch metrics. Here are the ones every account should have:

**Unauthorized API Calls:**

```bash
# Detect unauthorized API attempts
aws logs put-metric-filter \
  --log-group-name "/aws/cloudtrail/api-activity" \
  --filter-name "UnauthorizedAPICalls" \
  --filter-pattern '{ ($.errorCode = "*UnauthorizedAccess*") || ($.errorCode = "AccessDenied*") }' \
  --metric-transformations '[{
    "metricName": "UnauthorizedAPICalls",
    "metricNamespace": "CloudTrail/Security",
    "metricValue": "1",
    "defaultValue": 0
  }]'
```

**Console Sign-In Failures:**

```bash
# Detect failed console logins
aws logs put-metric-filter \
  --log-group-name "/aws/cloudtrail/api-activity" \
  --filter-name "ConsoleSignInFailures" \
  --filter-pattern '{ ($.eventName = "ConsoleLogin") && ($.errorMessage = "Failed authentication") }' \
  --metric-transformations '[{
    "metricName": "ConsoleSignInFailures",
    "metricNamespace": "CloudTrail/Security",
    "metricValue": "1",
    "defaultValue": 0
  }]'
```

**Root Account Usage:**

```bash
# Detect any root account usage
aws logs put-metric-filter \
  --log-group-name "/aws/cloudtrail/api-activity" \
  --filter-name "RootAccountUsage" \
  --filter-pattern '{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }' \
  --metric-transformations '[{
    "metricName": "RootAccountUsage",
    "metricNamespace": "CloudTrail/Security",
    "metricValue": "1",
    "defaultValue": 0
  }]'
```

**IAM Policy Changes:**

```bash
# Detect IAM policy modifications
aws logs put-metric-filter \
  --log-group-name "/aws/cloudtrail/api-activity" \
  --filter-name "IAMPolicyChanges" \
  --filter-pattern '{ ($.eventName = "DeleteGroupPolicy") || ($.eventName = "DeleteRolePolicy") || ($.eventName = "DeleteUserPolicy") || ($.eventName = "PutGroupPolicy") || ($.eventName = "PutRolePolicy") || ($.eventName = "PutUserPolicy") || ($.eventName = "CreatePolicy") || ($.eventName = "DeletePolicy") || ($.eventName = "AttachRolePolicy") || ($.eventName = "DetachRolePolicy") || ($.eventName = "AttachUserPolicy") || ($.eventName = "DetachUserPolicy") || ($.eventName = "AttachGroupPolicy") || ($.eventName = "DetachGroupPolicy") }' \
  --metric-transformations '[{
    "metricName": "IAMPolicyChanges",
    "metricNamespace": "CloudTrail/Security",
    "metricValue": "1",
    "defaultValue": 0
  }]'
```

**Security Group Changes:**

```bash
# Detect security group modifications
aws logs put-metric-filter \
  --log-group-name "/aws/cloudtrail/api-activity" \
  --filter-name "SecurityGroupChanges" \
  --filter-pattern '{ ($.eventName = "AuthorizeSecurityGroupIngress") || ($.eventName = "AuthorizeSecurityGroupEgress") || ($.eventName = "RevokeSecurityGroupIngress") || ($.eventName = "RevokeSecurityGroupEgress") || ($.eventName = "CreateSecurityGroup") || ($.eventName = "DeleteSecurityGroup") }' \
  --metric-transformations '[{
    "metricName": "SecurityGroupChanges",
    "metricNamespace": "CloudTrail/Security",
    "metricValue": "1",
    "defaultValue": 0
  }]'
```

### Create Alarms on These Metrics

```bash
# Alarm on unauthorized API calls
aws cloudwatch put-metric-alarm \
  --alarm-name "UnauthorizedAPICalls" \
  --alarm-description "Multiple unauthorized API calls detected" \
  --namespace "CloudTrail/Security" \
  --metric-name "UnauthorizedAPICalls" \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts

# Alarm on root account usage (any usage is suspicious)
aws cloudwatch put-metric-alarm \
  --alarm-name "RootAccountUsage" \
  --alarm-description "Root account was used - investigate immediately" \
  --namespace "CloudTrail/Security" \
  --metric-name "RootAccountUsage" \
  --statistic Sum \
  --period 60 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts

# Alarm on IAM policy changes
aws cloudwatch put-metric-alarm \
  --alarm-name "IAMPolicyChanges" \
  --alarm-description "IAM policies were modified" \
  --namespace "CloudTrail/Security" \
  --metric-name "IAMPolicyChanges" \
  --statistic Sum \
  --period 300 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
```

## Approach 2: Service Usage Metrics

AWS publishes service usage metrics in the `AWS/Usage` namespace. These track API call counts against your service quotas.

### Viewing Service Usage Metrics

```bash
# List available usage metrics
aws cloudwatch list-metrics \
  --namespace "AWS/Usage" \
  --query "Metrics[].{Name:MetricName,Service:Dimensions[?Name=='Service'].Value|[0]}" \
  --output table
```

### Monitoring API Call Rates

```bash
# Check EC2 API call usage
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "ec2_api",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/Usage",
          "MetricName": "CallCount",
          "Dimensions": [
            {"Name": "Type", "Value": "API"},
            {"Name": "Resource", "Value": "DescribeInstances"},
            {"Name": "Service", "Value": "EC2"},
            {"Name": "Class", "Value": "None"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      }
    }
  ]' \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
```

### Alarm When Approaching Service Limits

```bash
# Create an alarm for EC2 API rate approaching limits
aws cloudwatch put-metric-alarm \
  --alarm-name "EC2-API-Rate-High" \
  --alarm-description "EC2 API call rate is approaching service limits" \
  --namespace "AWS/Usage" \
  --metric-name "CallCount" \
  --dimensions \
    Name=Type,Value=API \
    Name=Resource,Value=DescribeInstances \
    Name=Service,Value=EC2 \
    Name=Class,Value=None \
  --statistic Sum \
  --period 300 \
  --threshold 800 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Querying CloudTrail Logs with Logs Insights

CloudWatch Logs Insights lets you run powerful queries against CloudTrail data:

```sql
-- Top 10 API callers in the last hour
stats count(*) as call_count by userIdentity.arn as caller
| sort call_count desc
| limit 10
```

```sql
-- Most called APIs
stats count(*) as calls by eventName
| sort calls desc
| limit 20
```

```sql
-- Failed API calls by error type
filter errorCode like /./
| stats count(*) as errors by errorCode, eventName
| sort errors desc
| limit 20
```

```sql
-- API activity by region
stats count(*) as calls by awsRegion
| sort calls desc
```

```sql
-- Track specific user's activity
filter userIdentity.arn like /suspicious-user/
| fields @timestamp, eventName, sourceIPAddress, awsRegion, errorCode
| sort @timestamp desc
| limit 50
```

```sql
-- Detect unusual source IPs
stats count(*) as calls by sourceIPAddress
| sort calls desc
| limit 20
```

## Building an API Activity Dashboard

Create a dashboard that shows API usage patterns:

```json
// CloudWatch dashboard for API activity monitoring
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Unauthorized API Calls",
        "metrics": [
          ["CloudTrail/Security", "UnauthorizedAPICalls", {"stat": "Sum"}]
        ],
        "period": 300,
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "IAM Policy Changes",
        "metrics": [
          ["CloudTrail/Security", "IAMPolicyChanges", {"stat": "Sum"}]
        ],
        "period": 300,
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Security Group Changes",
        "metrics": [
          ["CloudTrail/Security", "SecurityGroupChanges", {"stat": "Sum"}]
        ],
        "period": 300,
        "view": "timeSeries"
      }
    },
    {
      "type": "log",
      "properties": {
        "title": "Top API Callers (Last Hour)",
        "query": "SOURCE '/aws/cloudtrail/api-activity' | stats count(*) as calls by userIdentity.arn | sort calls desc | limit 10",
        "region": "us-east-1",
        "view": "table"
      }
    },
    {
      "type": "log",
      "properties": {
        "title": "Recent Failed Calls",
        "query": "SOURCE '/aws/cloudtrail/api-activity' | filter errorCode like /./ | fields @timestamp, eventName, userIdentity.arn, errorCode | sort @timestamp desc | limit 20",
        "region": "us-east-1",
        "view": "table"
      }
    }
  ]
}
```

## Automated Monitoring with Lambda

For more sophisticated monitoring, use a Lambda function that periodically analyzes API patterns:

```python
# Lambda function to detect unusual API activity patterns
import boto3
from datetime import datetime, timedelta

logs_client = boto3.client('logs')
sns_client = boto3.client('sns')

ALERT_TOPIC = 'arn:aws:sns:us-east-1:123456789012:security-alerts'

def lambda_handler(event, context):
    end_time = int(datetime.utcnow().timestamp())
    start_time = int((datetime.utcnow() - timedelta(hours=1)).timestamp())

    # Query for unusual API patterns
    query = """
    stats count(*) as calls by userIdentity.arn as caller, sourceIPAddress
    | filter calls > 1000
    | sort calls desc
    """

    response = logs_client.start_query(
        logGroupName='/aws/cloudtrail/api-activity',
        startTime=start_time,
        endTime=end_time,
        queryString=query
    )

    query_id = response['queryId']

    # Wait for results (in production, use Step Functions or check status)
    import time
    time.sleep(10)

    results = logs_client.get_query_results(queryId=query_id)

    # Check for anomalies
    for result in results['results']:
        fields = {field['field']: field['value'] for field in result}
        calls = int(fields.get('calls', 0))
        caller = fields.get('caller', 'unknown')
        ip = fields.get('sourceIPAddress', 'unknown')

        if calls > 5000:
            message = (
                f"HIGH API USAGE DETECTED\n"
                f"Caller: {caller}\n"
                f"Source IP: {ip}\n"
                f"API calls in last hour: {calls}\n"
                f"Investigate immediately."
            )

            sns_client.publish(
                TopicArn=ALERT_TOPIC,
                Subject='High API Usage Alert',
                Message=message
            )

    return {'checked': len(results['results'])}
```

## CloudFormation Template

Here's a complete setup for API monitoring:

```yaml
# CloudFormation for API usage monitoring
AWSTemplateFormatVersion: '2010-09-09'

Resources:
  CloudTrailLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /aws/cloudtrail/api-activity
      RetentionInDays: 90

  UnauthorizedCallsFilter:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref CloudTrailLogGroup
      FilterPattern: '{ ($.errorCode = "*UnauthorizedAccess*") || ($.errorCode = "AccessDenied*") }'
      MetricTransformations:
        - MetricName: UnauthorizedAPICalls
          MetricNamespace: CloudTrail/Security
          MetricValue: "1"
          DefaultValue: 0

  RootUsageFilter:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref CloudTrailLogGroup
      FilterPattern: '{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }'
      MetricTransformations:
        - MetricName: RootAccountUsage
          MetricNamespace: CloudTrail/Security
          MetricValue: "1"
          DefaultValue: 0

  SecurityAlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: security-alerts

  UnauthorizedCallsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: UnauthorizedAPICalls
      AlarmDescription: Multiple unauthorized API calls detected
      Namespace: CloudTrail/Security
      MetricName: UnauthorizedAPICalls
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SecurityAlertsTopic

  RootUsageAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: RootAccountUsage
      AlarmDescription: Root account was used
      Namespace: CloudTrail/Security
      MetricName: RootAccountUsage
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 0
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SecurityAlertsTopic
```

## Best Practices

**Enable CloudTrail in all regions.** Even if you only use one region, an attacker might use others. Multi-region trails catch this.

**Set up the CIS Benchmark metric filters.** The filters above are based on CIS AWS Foundations Benchmark recommendations. They're the bare minimum for security monitoring.

**Use Logs Insights for investigation.** Metric filters are great for alerting, but Logs Insights is where you do the actual investigation after an alert fires.

**Monitor API throttling.** If you're hitting API rate limits, your automation might be too aggressive. The `AWS/Usage` namespace shows this.

**Combine with AWS Config.** CloudTrail shows API calls, AWS Config tracks resource state changes. Together they give you a complete audit trail.

For setting up alerts from these monitoring signals, see our guides on [SNS notifications from CloudWatch Alarms](https://oneuptime.com/blog/post/sns-notifications-cloudwatch-alarms/view) and [integrating alarms with Slack](https://oneuptime.com/blog/post/cloudwatch-alarms-slack/view).

## Wrapping Up

Monitoring AWS API usage is equal parts operational awareness and security hygiene. The CloudTrail-to-CloudWatch pipeline gives you alerting on suspicious activity, while the `AWS/Usage` namespace keeps you from hitting service quotas. Both are straightforward to set up and provide critical visibility into what's happening in your account. If you haven't set these up yet, the security-focused metric filters alone are worth the 30 minutes it takes to implement them.
