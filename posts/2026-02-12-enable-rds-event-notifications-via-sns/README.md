# How to Enable RDS Event Notifications via SNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, SNS, Monitoring, Notifications

Description: Set up Amazon RDS event notifications through SNS to get real-time alerts for database failovers, maintenance events, configuration changes, and more.

---

CloudWatch alarms are great for metric-based thresholds, but they don't cover everything. What about when your RDS instance fails over to a standby? Or when AWS applies a pending maintenance update? Or when someone modifies a parameter group? These are events, not metrics, and they need a different notification mechanism.

RDS Event Notifications let you subscribe to specific event categories and get notified through Amazon SNS whenever they occur. You can route these to email, Slack, PagerDuty, Lambda, or any other SNS-compatible endpoint. Setting them up takes a few minutes and can save you hours of confusion during incidents.

## How RDS Events Work

RDS generates events for a wide range of activities across different source types:

- **DB instances**: Failovers, restarts, configuration changes, maintenance applied, storage full
- **DB clusters**: Aurora cluster events, failovers, cluster modifications
- **DB snapshots**: Snapshot creation started/completed, snapshot sharing changes
- **DB parameter groups**: Parameter group modifications
- **DB security groups**: Security group changes
- **DB proxies**: Proxy creation, modifications, and connection events

Each event belongs to a category like "availability", "configuration change", "creation", "deletion", "failover", "maintenance", "notification", or "recovery".

## Creating an SNS Topic

If you don't already have an SNS topic for database notifications, create one:

```bash
# Create an SNS topic for RDS event notifications
aws sns create-topic --name rds-events

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:rds-events \
  --protocol email \
  --notification-endpoint ops-team@example.com
```

Don't forget to confirm the subscription by clicking the link in the confirmation email.

## Setting Up Event Subscriptions

### Subscribe to All Events for a Specific Instance

If you want to know about everything that happens to your production database:

```bash
# Subscribe to all events for a specific RDS instance
aws rds create-event-subscription \
  --subscription-name prod-db-all-events \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:rds-events \
  --source-type db-instance \
  --source-ids my-production-db \
  --enabled
```

### Subscribe to Specific Event Categories

For most teams, subscribing to everything creates too much noise. Here's a more targeted approach - subscribe only to critical categories:

```bash
# Subscribe to availability and failover events (the critical ones)
aws rds create-event-subscription \
  --subscription-name prod-db-critical-events \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:rds-events \
  --source-type db-instance \
  --source-ids my-production-db \
  --event-categories '["availability","failover","failure","maintenance","recovery"]' \
  --enabled
```

### Subscribe to Events Across All Instances

You can omit the `--source-ids` flag to subscribe to events from all instances of that source type:

```bash
# Subscribe to maintenance events for ALL RDS instances in this region
aws rds create-event-subscription \
  --subscription-name all-rds-maintenance \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:rds-events \
  --source-type db-instance \
  --event-categories '["maintenance"]' \
  --enabled
```

### Subscribe to Snapshot Events

Monitoring snapshot events is useful for backup verification:

```bash
# Subscribe to snapshot creation and deletion events
aws rds create-event-subscription \
  --subscription-name snapshot-events \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:rds-events \
  --source-type db-snapshot \
  --event-categories '["creation","deletion","notification"]' \
  --enabled
```

## Event Categories Reference

Here's a breakdown of the most important event categories by source type:

### DB Instance Events

| Category | What It Covers |
|---|---|
| availability | Instance started, stopped, or restarted |
| failover | Multi-AZ failover started or completed |
| failure | Instance failure or storage issue |
| maintenance | Maintenance applied, pending maintenance |
| configuration change | Parameter group, security group, or instance modifications |
| creation | Instance created |
| deletion | Instance deleted |
| recovery | Instance recovery from snapshot or point-in-time |
| notification | Exceeding storage, approaching limits |

### DB Cluster Events (Aurora)

| Category | What It Covers |
|---|---|
| failover | Cluster failover events |
| maintenance | Engine patching and maintenance |
| notification | General cluster notifications |
| creation | Cluster created |

## Routing Notifications to Slack

Email notifications are a start, but most teams prefer Slack or a similar chat tool. You can route SNS notifications to Slack through a Lambda function:

```python
import json
import os
import urllib.request

def lambda_handler(event, context):
    """Forward RDS event notifications from SNS to Slack."""
    slack_webhook_url = os.environ['SLACK_WEBHOOK_URL']

    # Parse the SNS message
    sns_message = event['Records'][0]['Sns']
    subject = sns_message.get('Subject', 'RDS Event Notification')
    message = sns_message['Message']

    # Try to parse the message as JSON (RDS events come as JSON)
    try:
        event_data = json.loads(message)
        source_id = event_data.get('Source ID', 'Unknown')
        event_message = event_data.get('Event Message', message)
        event_source = event_data.get('Source Type', 'Unknown')

        # Format a nice Slack message
        slack_message = {
            'text': f':database: *RDS Event* - {subject}',
            'attachments': [
                {
                    'color': '#ff6600' if 'fail' in event_message.lower() else '#36a64f',
                    'fields': [
                        {'title': 'Source', 'value': source_id, 'short': True},
                        {'title': 'Type', 'value': event_source, 'short': True},
                        {'title': 'Message', 'value': event_message, 'short': False}
                    ]
                }
            ]
        }
    except json.JSONDecodeError:
        slack_message = {'text': f'RDS Event: {message}'}

    # Send to Slack
    req = urllib.request.Request(
        slack_webhook_url,
        data=json.dumps(slack_message).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    urllib.request.urlopen(req)

    return {'statusCode': 200}
```

Subscribe this Lambda function to your SNS topic:

```bash
# Give SNS permission to invoke the Lambda function
aws lambda add-permission \
  --function-name rds-event-to-slack \
  --statement-id sns-invoke \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn arn:aws:sns:us-east-1:123456789012:rds-events

# Subscribe the Lambda to the SNS topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:rds-events \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:rds-event-to-slack
```

## Viewing Past Events

You can view recent events (up to 14 days) directly from the CLI:

```bash
# View recent events for a specific instance
aws rds describe-events \
  --source-identifier my-production-db \
  --source-type db-instance \
  --duration 1440

# View all RDS events from the last 24 hours
aws rds describe-events --duration 1440

# Filter events by category
aws rds describe-events \
  --source-type db-instance \
  --event-categories '["failover","maintenance"]' \
  --duration 10080
```

## Managing Event Subscriptions

List your existing subscriptions:

```bash
# List all event subscriptions
aws rds describe-event-subscriptions
```

Modify a subscription to add or change event categories:

```bash
# Update an existing subscription to include additional categories
aws rds modify-event-subscription \
  --subscription-name prod-db-critical-events \
  --event-categories '["availability","failover","failure","maintenance","recovery","notification"]'
```

Delete a subscription you no longer need:

```bash
# Remove an event subscription
aws rds delete-event-subscription \
  --subscription-name old-subscription
```

## Recommended Subscription Strategy

For a typical production setup, I'd recommend three event subscriptions:

1. **Critical alerts** (routed to PagerDuty or on-call): Availability, failover, failure, and recovery events for production instances only.

2. **Operational awareness** (routed to Slack): Maintenance, configuration changes, and notifications for all instances.

3. **Backup monitoring** (routed to Slack or email): Snapshot creation and deletion events to verify backups are completing.

This gives you immediate alerting for urgent issues without drowning in noise for routine operations.

For more comprehensive monitoring, combine event notifications with [CloudWatch alarms for RDS metrics](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-rds-metrics/view) and [Performance Insights](https://oneuptime.com/blog/post/2026-02-12-monitor-rds-with-performance-insights/view). Events tell you what happened, alarms tell you what's currently wrong, and Performance Insights tells you why.
