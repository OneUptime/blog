# How to Integrate CloudWatch Alarms with PagerDuty

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, PagerDuty, Incident Management, Alerting

Description: A practical guide to integrating Amazon CloudWatch Alarms with PagerDuty for incident management, escalation policies, and on-call alerting.

---

CloudWatch can tell you something is wrong, but it can't page your on-call engineer, escalate to the team lead after 15 minutes, or track the incident to resolution. That's PagerDuty's job. Connecting the two creates a proper incident management pipeline where AWS detects the problem and PagerDuty makes sure the right person handles it.

There are a couple of ways to set this up. The simplest uses SNS to push CloudWatch alarm notifications to PagerDuty's integration endpoint. There's also a more advanced approach using AWS EventBridge. We'll cover both.

## Method 1: SNS Integration (Simplest)

This is the most common approach and takes about 10 minutes to set up.

### Step 1: Create a PagerDuty Service

In PagerDuty, create a service for your AWS infrastructure (or use an existing one):

1. Go to Services > Service Directory > New Service
2. Name it something descriptive like "AWS Production Infrastructure"
3. Assign an escalation policy
4. For the integration, select "Amazon CloudWatch" from the integration list
5. Copy the Integration URL - you'll need this

The integration URL looks like: `https://events.pagerduty.com/integration/abc123def456/enqueue`

### Step 2: Create an SNS Topic

```bash
# Create an SNS topic for PagerDuty
aws sns create-topic --name pagerduty-alerts
```

### Step 3: Subscribe PagerDuty to the SNS Topic

```bash
# Subscribe PagerDuty's HTTPS endpoint to your SNS topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:pagerduty-alerts \
  --protocol https \
  --notification-endpoint "https://events.pagerduty.com/integration/abc123def456/enqueue"
```

PagerDuty automatically confirms the SNS subscription. You can verify it:

```bash
# List subscriptions to confirm it's active
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:123456789012:pagerduty-alerts
```

### Step 4: Point Your Alarms at the SNS Topic

Create new alarms that publish to the PagerDuty topic, or update existing ones:

```bash
# Create an alarm that triggers PagerDuty
aws cloudwatch put-metric-alarm \
  --alarm-name "Production-HighErrorRate" \
  --alarm-description "5xx error rate exceeds 5% - pages on-call" \
  --metric-name "5XXError" \
  --namespace "AWS/ApiGateway" \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:pagerduty-alerts \
  --ok-actions arn:aws:sns:us-east-1:123456789012:pagerduty-alerts \
  --dimensions Name=ApiName,Value=production-api
```

The `--ok-actions` part is important. When the alarm returns to OK state, it sends a resolve event to PagerDuty, which automatically resolves the incident. No manual intervention needed for self-healing issues.

### Step 5: Update Existing Alarms

If you already have alarms, add the PagerDuty SNS topic as an additional action:

```bash
# Add PagerDuty notification to an existing alarm
# First, get the current alarm config
aws cloudwatch describe-alarms --alarm-names "ExistingAlarm" \
  --query "MetricAlarms[0]"

# Then update it with the additional action
aws cloudwatch put-metric-alarm \
  --alarm-name "ExistingAlarm" \
  --alarm-actions \
    arn:aws:sns:us-east-1:123456789012:pagerduty-alerts \
    arn:aws:sns:us-east-1:123456789012:email-alerts \
  --ok-actions \
    arn:aws:sns:us-east-1:123456789012:pagerduty-alerts
```

## Method 2: EventBridge Integration

For more control over what gets sent to PagerDuty and how, use EventBridge:

```bash
# Create an EventBridge rule that captures CloudWatch alarm state changes
aws events put-rule \
  --name "CloudWatch-to-PagerDuty" \
  --event-pattern '{
    "source": ["aws.cloudwatch"],
    "detail-type": ["CloudWatch Alarm State Change"],
    "detail": {
      "state": {
        "value": ["ALARM"]
      }
    }
  }' \
  --state ENABLED
```

Then set PagerDuty as the target. You'll need an EventBridge API destination:

```bash
# Create a connection for PagerDuty authentication
aws events create-connection \
  --name "pagerduty-connection" \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "Authorization",
      "ApiKeyValue": "Token token=YOUR_PAGERDUTY_API_KEY"
    }
  }'

# Create an API destination pointing to PagerDuty Events API
aws events create-api-destination \
  --name "pagerduty-events" \
  --connection-arn arn:aws:events:us-east-1:123456789012:connection/pagerduty-connection \
  --http-method POST \
  --invocation-endpoint "https://events.pagerduty.com/v2/enqueue"
```

## Method 3: Lambda for Custom Formatting

If you want full control over the PagerDuty incident details, use a Lambda function between SNS and PagerDuty:

```python
# Lambda function to create rich PagerDuty incidents from CloudWatch alarms
import json
import urllib3

PAGERDUTY_ROUTING_KEY = "your-integration-key-here"

http = urllib3.PoolManager()

def lambda_handler(event, context):
    # Parse the CloudWatch alarm from the SNS message
    sns_message = json.loads(event['Records'][0]['Sns']['Message'])

    alarm_name = sns_message['AlarmName']
    new_state = sns_message['NewStateValue']
    reason = sns_message['NewStateReason']
    region = sns_message['Region']
    timestamp = sns_message['StateChangeTime']
    description = sns_message.get('AlarmDescription', 'No description')

    # Build the PagerDuty Events API v2 payload
    if new_state == 'ALARM':
        event_action = 'trigger'
        severity = 'critical'
    elif new_state == 'OK':
        event_action = 'resolve'
        severity = 'info'
    else:
        event_action = 'trigger'
        severity = 'warning'

    payload = {
        'routing_key': PAGERDUTY_ROUTING_KEY,
        'event_action': event_action,
        'dedup_key': alarm_name,  # Ensures resolve matches the trigger
        'payload': {
            'summary': f'{alarm_name}: {description}',
            'timestamp': timestamp,
            'severity': severity,
            'source': f'aws-cloudwatch-{region}',
            'component': alarm_name,
            'group': 'aws-infrastructure',
            'class': 'cloudwatch-alarm',
            'custom_details': {
                'alarm_name': alarm_name,
                'state': new_state,
                'reason': reason,
                'region': region,
                'console_link': f'https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}#alarmsV2:alarm/{alarm_name}'
            }
        },
        'links': [
            {
                'href': f'https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}#alarmsV2:alarm/{alarm_name}',
                'text': 'View Alarm in CloudWatch'
            }
        ]
    }

    # Send to PagerDuty
    response = http.request(
        'POST',
        'https://events.pagerduty.com/v2/enqueue',
        body=json.dumps(payload),
        headers={'Content-Type': 'application/json'}
    )

    print(f'PagerDuty response: {response.status} {response.data.decode()}')
    return {'statusCode': response.status}
```

Deploy this Lambda and subscribe it to your SNS topic:

```bash
# Grant SNS permission to invoke the Lambda
aws lambda add-permission \
  --function-name cloudwatch-to-pagerduty \
  --statement-id sns-trigger \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn arn:aws:sns:us-east-1:123456789012:pagerduty-alerts

# Subscribe the Lambda to the SNS topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:pagerduty-alerts \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:cloudwatch-to-pagerduty
```

## CloudFormation for the Full Setup

Here's a complete CloudFormation template:

```yaml
# CloudFormation for CloudWatch-to-PagerDuty integration
AWSTemplateFormatVersion: '2010-09-09'
Description: CloudWatch alarm to PagerDuty integration

Parameters:
  PagerDutyEndpoint:
    Type: String
    Description: PagerDuty integration URL

Resources:
  PagerDutyTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: pagerduty-critical-alerts

  PagerDutySubscription:
    Type: AWS::SNS::Subscription
    Properties:
      TopicArn: !Ref PagerDutyTopic
      Protocol: https
      Endpoint: !Ref PagerDutyEndpoint

  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: Production-HighErrorRate
      AlarmDescription: Error rate above threshold - pages on-call
      MetricName: 5XXError
      Namespace: AWS/ApiGateway
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref PagerDutyTopic
      OKActions:
        - !Ref PagerDutyTopic

  HighLatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: Production-HighLatency
      AlarmDescription: P99 latency above 5 seconds
      MetricName: Latency
      Namespace: AWS/ApiGateway
      ExtendedStatistic: p99
      Period: 300
      EvaluationPeriods: 3
      Threshold: 5000
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref PagerDutyTopic
      OKActions:
        - !Ref PagerDutyTopic
```

## Testing the Integration

Always test before you're in a real incident:

```bash
# Trigger a test alarm
aws cloudwatch set-alarm-state \
  --alarm-name "Production-HighErrorRate" \
  --state-value ALARM \
  --state-reason "Integration test - safe to ignore"

# Verify a PagerDuty incident was created
# Then resolve it
aws cloudwatch set-alarm-state \
  --alarm-name "Production-HighErrorRate" \
  --state-value OK \
  --state-reason "Integration test complete"
```

Check PagerDuty to confirm the incident was created and then resolved.

## Best Practices

**Use the dedup_key wisely.** When using the Lambda approach, set `dedup_key` to the alarm name. This ensures the ALARM and OK events are matched correctly - the resolve event closes the right incident.

**Don't page on warnings.** Route only critical alarms to PagerDuty. Warnings and informational alerts should go to email or Slack. Alert fatigue kills on-call morale faster than anything.

**Set meaningful alarm descriptions.** When an engineer gets paged, they see the alarm description in PagerDuty. Make it actionable: what's wrong, what's the impact, and where to start investigating.

**Include console links.** The Lambda approach lets you embed a direct link to the CloudWatch alarm in the PagerDuty incident. This saves the on-call engineer from navigating through the console.

**Test regularly.** Schedule monthly integration tests. Services change, endpoints expire, and SNS subscriptions can get into weird states.

For setting up SNS notifications themselves, check our [SNS notifications from CloudWatch Alarms](https://oneuptime.com/blog/post/sns-notifications-cloudwatch-alarms/view) guide. If you'd also like Slack notifications alongside PagerDuty, see our [CloudWatch to Slack integration](https://oneuptime.com/blog/post/cloudwatch-alarms-slack/view) guide.

## Wrapping Up

Integrating CloudWatch with PagerDuty takes your monitoring from "we noticed" to "we responded." The SNS method works great for most teams and takes minutes to set up. If you need custom incident details or want to control severity mapping, the Lambda approach gives you that flexibility. Either way, make sure you're sending both ALARM and OK events so incidents auto-resolve when the underlying metric recovers.
