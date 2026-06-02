# How to Set Up Fargate Task Retirement Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Fargate, Monitoring, EventBridge

Description: Learn how to set up automated notifications for Fargate task retirements so you can track infrastructure changes and respond to unexpected task replacements.

---

Fargate occasionally retires tasks. This happens when AWS needs to replace an older Fargate platform version revision with a newer revision that includes updates to the runtime software and underlying dependencies. When a service task is retired, ECS launches a replacement automatically when it can. Your service stays up when ECS can maintain the desired count, but the replacement task gets a new IP address, loses any ephemeral storage data, and starts from scratch.

Most of the time, this is invisible and harmless. But sometimes you need to know about it - for audit purposes, to correlate with application issues, or to understand why a long-running task suddenly restarted. Setting up retirement notifications gives you that visibility.

## How Task Retirement Works

When Fargate decides to retire a task, here's what happens:

1. AWS sends an AWS Health retirement notification event
2. ECS launches a replacement task if the task belongs to a service and the service configuration allows it
3. The old task receives a SIGTERM signal
4. After the stop timeout (default 30 seconds), it receives SIGKILL if it has not exited
5. The replacement task registers with the load balancer and starts receiving traffic

```mermaid
graph TD
    A[Retirement Initiated] --> B[SIGTERM sent to task]
    B --> C{App handles shutdown?}
    C -->|yes| D[Graceful shutdown]
    C -->|no| E[Wait for stop timeout]
    D --> F[Task stopped]
    E --> F
    F --> G[ECS maintains desired count]
    G --> H[Service restored]
```

The key thing to understand is that retirement is a normal Fargate operation. It's not an error. But without notifications, you might mistake it for an application crash.

## Setting Up EventBridge Rules

AWS Health publishes Fargate task retirement notifications to Amazon EventBridge. You can create rules that match those retirement events and route them to your notification targets.

### Step 1: Create an SNS Topic for Notifications

```bash
# Create the notification topic

aws sns create-topic \
  --name fargate-task-retirements

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:fargate-task-retirements \
  --protocol email \
  --notification-endpoint ops-team@company.com

# Or subscribe a Slack webhook via Lambda
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:fargate-task-retirements \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:slack-notifier

aws lambda add-permission \
  --function-name slack-notifier \
  --statement-id sns-invoke \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn arn:aws:sns:us-east-1:123456789012:fargate-task-retirements
```

### Step 2: Create the EventBridge Rule

AWS Health sends Fargate task retirement notifications as `AWS Health Event` events. You can filter for the Fargate task patching retirement event type:

```bash
# Create an EventBridge rule for Fargate retirement notifications
aws events put-rule \
  --name fargate-task-retirement \
  --description "Capture Fargate task retirements" \
  --event-pattern '{
    "source": ["aws.health"],
    "detail-type": ["AWS Health Event"],
    "detail": {
      "service": ["ECS"],
      "eventTypeCode": ["AWS_ECS_TASK_PATCHING_RETIREMENT"],
      "eventTypeCategory": ["scheduledChange"]
    }
  }'

# Add the SNS topic as a target
aws events put-targets \
  --rule fargate-task-retirement \
  --targets '[
    {
      "Id": "retirement-notifications",
      "Arn": "arn:aws:sns:us-east-1:123456789012:fargate-task-retirements",
      "InputTransformer": {
        "InputPathsMap": {
          "eventArn": "$.detail.eventArn",
          "eventTypeCode": "$.detail.eventTypeCode",
          "eventRegion": "$.detail.eventRegion",
          "statusCode": "$.detail.statusCode",
          "startTime": "$.detail.startTime",
          "affectedEntities": "$.detail.affectedEntities"
        },
        "InputTemplate": "\"Fargate Task Retirement Scheduled\\nEvent: <eventArn>\\nType: <eventTypeCode>\\nRegion: <eventRegion>\\nStatus: <statusCode>\\nStart Time: <startTime>\\nAffected Entities: <affectedEntities>\""
      }
    }
  ]'
```

The `InputTransformer` formats the notification into a readable message instead of dumping the entire raw JSON event.

EventBridge needs permission to publish to the SNS topic:

```bash
aws sns set-topic-attributes \
  --topic-arn arn:aws:sns:us-east-1:123456789012:fargate-task-retirements \
  --attribute-name Policy \
  --attribute-value '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Service": "events.amazonaws.com"},
        "Action": "sns:Publish",
        "Resource": "arn:aws:sns:us-east-1:123456789012:fargate-task-retirements"
      }
    ]
  }'
```

## Broader Task Stop Monitoring

You might want to track all task stops, not just retirements. Different stop codes indicate different reasons:

| Stop Code | Meaning |
|-----------|---------|
| TaskFailedToStart | Task couldn't start (image pull, etc.) |
| EssentialContainerExited | A container marked essential stopped |
| UserInitiated | Someone stopped the task manually |
| ServiceSchedulerInitiated | Service scaling event |
| SpotInterruption | Fargate Spot capacity reclaimed |
| TerminationNotice | A task received a termination notice |

Here's a rule that captures all non-normal task stops:

```bash
# Catch all unexpected task stops
aws events put-rule \
  --name ecs-unexpected-task-stops \
  --description "Capture unexpected ECS task stops" \
  --event-pattern '{
    "source": ["aws.ecs"],
    "detail-type": ["ECS Task State Change"],
    "detail": {
      "lastStatus": ["STOPPED"],
      "stopCode": ["EssentialContainerExited", "TaskFailedToStart", "SpotInterruption", "TerminationNotice"]
    }
  }'
```

## Processing Events with Lambda

For more sophisticated handling, route events to a Lambda function:

```python
# lambda_function.py - Process Fargate task retirement notifications
import json
import boto3
import os
from datetime import datetime, timezone

def lambda_handler(event, context):
    detail = event['detail']

    event_arn = detail['eventArn']
    event_type = detail.get('eventTypeCode', 'Unknown')
    event_region = detail.get('eventRegion', 'Unknown')
    status = detail.get('statusCode', 'Unknown')
    start_time = detail.get('startTime', 'Unknown')
    affected_entities = detail.get('affectedEntities', [])
    affected_values = [
        entity.get('entityValue', 'Unknown')
        for entity in affected_entities
    ]

    # Log the event for auditing
    print(json.dumps({
        'event_type': event_type,
        'event_arn': event_arn,
        'event_region': event_region,
        'status': status,
        'start_time': start_time,
        'affected_entities': affected_values,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }))

    # Send to Slack
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
    if slack_webhook:
        import urllib.request

        message = {
            'text': f':warning: *Fargate Task Retirement Scheduled*\n'
                    f'*Event:* {event_type}\n'
                    f'*Region:* {event_region}\n'
                    f'*Status:* {status}\n'
                    f'*Start Time:* {start_time}\n'
                    f'*Affected Entities:* {", ".join(affected_values) or "None listed"}'
        }

        req = urllib.request.Request(
            slack_webhook,
            data=json.dumps(message).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(req)

    # Optionally track retirement frequency in CloudWatch
    cloudwatch = boto3.client('cloudwatch')
    cloudwatch.put_metric_data(
        Namespace='Custom/ECS',
        MetricData=[
            {
                'MetricName': 'TaskRetirements',
                'Dimensions': [
                    {'Name': 'EventTypeCode', 'Value': event_type},
                    {'Name': 'EventRegion', 'Value': event_region}
                ],
                'Value': 1,
                'Unit': 'Count'
            }
        ]
    )

    return {'statusCode': 200}
```

Deploy this Lambda and add it as a target:

```bash
# Add Lambda as an EventBridge target
aws events put-targets \
  --rule fargate-task-retirement \
  --targets '[
    {
      "Id": "retirement-lambda",
      "Arn": "arn:aws:lambda:us-east-1:123456789012:function:task-retirement-handler"
    }
  ]'

# Grant EventBridge permission to invoke the Lambda
aws lambda add-permission \
  --function-name task-retirement-handler \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:123456789012:rule/fargate-task-retirement
```

## Tracking Retirement Frequency

Once you're publishing retirement count metrics, set up a dashboard to track retirement frequency over time:

```bash
# Create an alarm for unusual retirement frequency
aws cloudwatch put-metric-alarm \
  --alarm-name "high-task-retirement-rate" \
  --namespace "Custom/ECS" \
  --metric-name TaskRetirements \
  --dimensions Name=EventTypeCode,Value=AWS_ECS_TASK_PATCHING_RETIREMENT Name=EventRegion,Value=us-east-1 \
  --statistic Sum \
  --period 3600 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

This alerts you if more than 10 retirement notifications are received in a single hour, which could indicate a larger infrastructure event.

## Making Your Application Retirement-Ready

Since retirements are inevitable, your application should handle them gracefully:

1. **Handle SIGTERM.** When ECS stops a Linux container, it sends the container stop signal, which defaults to SIGTERM. Your application should catch this signal and shut down cleanly:

```javascript
// Handle graceful shutdown in Node.js
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM - starting graceful shutdown');

  // Stop accepting new requests
  server.close();

  // Finish in-flight requests
  // Close database connections
  // Flush buffers

  console.log('Graceful shutdown complete');
  process.exit(0);
});
```

2. **Set an appropriate stop timeout.** The default is 30 seconds. If your application needs more time to drain connections:

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "stopTimeout": 120
    }
  ]
}
```

3. **Don't rely on ephemeral state.** Since retirement destroys ephemeral storage, any state that matters should be stored externally (database, S3, EFS).

4. **Use health check grace periods.** After a replacement task starts, give it time to initialize before the load balancer starts sending traffic.

## CloudFormation Setup

If you manage your infrastructure as code, here's the CloudFormation template for the complete notification setup:

```yaml
Resources:
  RetirementTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: fargate-task-retirements

  RetirementRule:
    Type: AWS::Events::Rule
    Properties:
      Name: fargate-task-retirement
      EventPattern:
        source:
          - aws.health
        detail-type:
          - "AWS Health Event"
        detail:
          service:
            - ECS
          eventTypeCode:
            - AWS_ECS_TASK_PATCHING_RETIREMENT
          eventTypeCategory:
            - scheduledChange
      Targets:
        - Arn: !Ref RetirementTopic
          Id: retirement-sns

  TopicPolicy:
    Type: AWS::SNS::TopicPolicy
    Properties:
      Topics:
        - !Ref RetirementTopic
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: events.amazonaws.com
            Action: sns:Publish
            Resource: !Ref RetirementTopic
```

## Wrapping Up

Fargate task retirements are a normal part of running containers on managed infrastructure. They're not a problem to solve, but they are something you should be aware of. Setting up notifications lets you correlate application issues with infrastructure events, maintain audit trails, and track retirement patterns over time.

The setup is straightforward: an EventBridge rule matching task retirement events, routed to SNS or Lambda. Once it's in place, you'll never be surprised by a task restart again. For broader monitoring, see our guide on [monitoring ECS tasks with CloudWatch metrics](https://oneuptime.com/blog/post/2026-02-12-monitor-ecs-tasks-cloudwatch-metrics/view).
