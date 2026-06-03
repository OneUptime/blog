# How to Use AWS Health Dashboard for Service Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Health Dashboard, Monitoring, Incident Management

Description: Learn how to use the AWS Health Dashboard to monitor AWS service status, track incidents affecting your resources, and set up automated notifications.

---

When something breaks in production and you suspect AWS is the culprit, the first thing you probably do is check if others are reporting the same issue on Twitter or Reddit. That's not a great strategy. AWS has a dedicated service for this: the AWS Health Dashboard. It comes in two flavors - Service health (public, shows AWS service availability) and Your account health (account-specific, shows events that actually affect your resources).

Let's look at both and learn how to get the most out of them.

## Service Health vs. Your Account Health

The **AWS Health Dashboard - Service health** (health.aws.amazon.com/health/status) is a public page that shows AWS service availability by service and region. Anyone can view it. It's useful for getting a broad picture, but it doesn't tell you if an issue specifically affects your resources.

The **AWS Health Dashboard - Your account health** is tied to your AWS account. It shows account-specific events that matter to you - things like scheduled maintenance on your EC2 instances, service degradation in the regions you actually use, and operational issues impacting resources you own. This is where you should be looking first.

## Navigating Your Account Health

In the AWS Console, find Health Dashboard in the search bar or navigate to health.aws.amazon.com/health/home. Under Your account health, you'll see these views:

- **Open and recent issues** - Active problems and recently resolved ones
- **Scheduled changes** - Upcoming maintenance that affects your resources
- **Other notifications** - Service announcements and operational notes
- **Event log** - All events from the past 90 days

Each event includes the affected service, region, start time, status, and a list of your specific resources that are impacted. This last part is what makes it so much more useful than the public status page.

## Using the AWS Health API

For programmatic access, AWS provides the Health API. The active endpoint is usually us-east-1, with us-east-2 available as a passive endpoint, and the API requires an AWS Business Support+, AWS Enterprise Support, or AWS Unified Operations plan. In regions or accounts that haven't transitioned to those plans, Business, Enterprise On-Ramp, or Enterprise Support also provide access.

List recent events affecting your account:

```bash
# List recent health events for your account

aws health describe-events \
  --region us-east-1 \
  --filter '{
    "eventStatusCodes": ["open", "upcoming", "closed"],
    "startTimes": [{"from": "2026-02-01T00:00:00Z"}]
  }' \
  --query "events[].{Service:service,Region:region,Status:statusCode,Category:eventTypeCategory,Start:startTime}" \
  --output table
```

Get details about a specific event:

```bash
# Get detailed description of a health event
aws health describe-event-details \
  --region us-east-1 \
  --event-arns '["arn:aws:health:us-east-1::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/abc123"]' \
  --query "successfulSet[].{Description:eventDescription.latestDescription,Start:event.startTime,End:event.endTime}"
```

Find which of your resources are affected by an event:

```bash
# Get affected resources for a health event
aws health describe-affected-entities \
  --region us-east-1 \
  --filter '{
    "eventArns": ["arn:aws:health:us-east-1::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/abc123"]
  }' \
  --query "entities[].{ResourceId:entityValue,Status:statusCode,Tags:tags}" \
  --output table
```

## Event Scopes and Organization Views

Health events and organization views show up in a few useful ways:

**Account-specific events** are the most important. These are events that directly impact resources in your account - like scheduled maintenance on one of your EC2 instances, or a hardware failure affecting your EBS volume.

**Public events** are broad service issues that affect many customers. These show up on the public Service health page too.

**Organization events** (if you're using AWS Organizations) aggregate health events across all accounts in your org, giving management visibility into issues affecting any team.

## Setting Up Notifications with EventBridge

Don't rely on checking the dashboard manually. Set up EventBridge rules to get notified automatically when health events occur.

This rule catches all health events and sends them to SNS:

```bash
# Create EventBridge rule for all health events
aws events put-rule \
  --name "aws-health-notifications" \
  --event-pattern '{
    "source": ["aws.health"],
    "detail-type": ["AWS Health Event"]
  }' \
  --region us-east-1

# Send to SNS
aws events put-targets \
  --rule "aws-health-notifications" \
  --targets '[{
    "Id": "sns-target",
    "Arn": "arn:aws:sns:us-east-1:123456789012:aws-health-alerts"
  }]' \
  --region us-east-1
```

Make sure the SNS topic's resource policy allows `events.amazonaws.com` to publish to it. The EventBridge console can add this automatically, but CLI and SDK workflows often need the topic policy updated separately.

You can get more specific. This rule only fires for operational issues (not scheduled maintenance) affecting EC2 and RDS:

```bash
# More specific rule: only operational issues for EC2 and RDS
aws events put-rule \
  --name "critical-health-events" \
  --event-pattern '{
    "source": ["aws.health"],
    "detail-type": ["AWS Health Event"],
    "detail": {
      "service": ["EC2", "RDS"],
      "eventTypeCategory": ["issue"]
    }
  }' \
  --region us-east-1
```

## Automated Responses to Health Events

Beyond notifications, you can trigger automated responses. Here's a Lambda function that handles EC2 scheduled maintenance by stopping and starting the instance (which migrates it to new hardware):

```python
import boto3
import json

def lambda_handler(event, context):
    """
    Automatically handle EC2 scheduled retirement events
    by stopping and starting the instance to migrate it.
    """
    detail = event.get('detail', {})
    service = detail.get('service')
    event_type = detail.get('eventTypeCode', '')

    # Only handle EC2 scheduled retirements
    if service != 'EC2' or 'RETIREMENT' not in event_type:
        print(f"Ignoring event: {service}/{event_type}")
        return

    ec2 = boto3.client('ec2', region_name=detail.get('eventRegion'))

    # Get affected instance IDs from the event
    affected = detail.get('affectedEntities', [])
    for entity in affected:
        entity_value = entity.get('entityValue', '')
        instance_id = entity_value.rsplit('/', 1)[-1]
        if not instance_id.startswith('i-'):
            continue

        print(f"Handling retirement for {instance_id}")

        # Check if instance is EBS-backed (instance store can't be stopped)
        response = ec2.describe_instances(InstanceIds=[instance_id])
        root_device = response['Reservations'][0]['Instances'][0]['RootDeviceType']

        if root_device != 'ebs':
            print(f"{instance_id} is instance-store backed, cannot stop/start")
            # Send alert for manual handling
            notify_team(instance_id, "Instance-store backed, needs manual migration")
            continue

        # Stop the instance
        ec2.stop_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])

        # Start it back up (will launch on new hardware)
        ec2.start_instances(InstanceIds=[instance_id])
        print(f"{instance_id} migrated successfully")

def notify_team(instance_id, message):
    sns = boto3.client('sns')
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:ops-team',
        Subject=f'Manual action needed: {instance_id}',
        Message=message
    )
```

## Organization-Wide Health Monitoring

If you're using AWS Organizations, you can enable organizational health events to get a unified view across all accounts.

First, enable the organizational view:

```bash
# Enable organizational view (must be run from management account)
aws health enable-health-service-access-for-organization \
  --region us-east-1
```

Then query events across all accounts:

```bash
# Get health events across the organization
aws health describe-events-for-organization \
  --region us-east-1 \
  --filter '{
    "startTime": {"from": "2026-02-01T00:00:00Z"},
    "eventStatusCodes": ["open"]
  }' \
  --query "events[].{Accounts:affectedAccounts,Service:service,Region:region,Status:statusCode}" \
  --output table
```

## Integrating Health Dashboard with Your Monitoring Stack

The Health Dashboard shouldn't exist in isolation. Feed it into whatever monitoring and incident management tools you're already using.

For Slack notifications, create a Lambda function that formats health events into Slack messages:

```python
import json
import urllib.request

SLACK_WEBHOOK = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

def lambda_handler(event, context):
    detail = event.get('detail', {})

    severity_colors = {
        'issue': '#FF0000',       # Red for issues
        'accountNotification': '#FFA500',  # Orange for notifications
        'scheduledChange': '#FFFF00'       # Yellow for maintenance
    }

    category = detail.get('eventTypeCategory', 'unknown')
    color = severity_colors.get(category, '#808080')
    descriptions = detail.get('eventDescription') or []
    description = descriptions[0].get('latestDescription', 'No description') if descriptions else 'No description'

    message = {
        "attachments": [{
            "color": color,
            "title": f"AWS Health: {detail.get('eventTypeCode', 'Unknown Event')}",
            "fields": [
                {"title": "Service", "value": detail.get('service', 'N/A'), "short": True},
                {"title": "Region", "value": detail.get('eventRegion', 'N/A'), "short": True},
                {"title": "Category", "value": category, "short": True},
                {"title": "Status", "value": detail.get('statusCode', 'N/A'), "short": True},
                {"title": "Description", "value": description, "short": False}
            ]
        }]
    }

    req = urllib.request.Request(
        SLACK_WEBHOOK,
        data=json.dumps(message).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    urllib.request.urlopen(req)
```

## Correlating AWS Health with Your Own Monitoring

Here's an important pattern: when one of your monitoring alerts fires and you suspect an AWS issue, programmatically check the Health API to confirm. This saves your team from chasing application bugs when the real problem is on AWS's side.

```python
import boto3
from datetime import datetime, timedelta, timezone

def check_aws_health_for_service(service_name, region):
    """
    Check if there are active AWS health events for a given service.
    Call this from your alert handlers to correlate with AWS issues.
    """
    health = boto3.client('health', region_name='us-east-1')

    response = health.describe_events(
        filter={
            'services': [service_name],
            'regions': [region],
            'eventStatusCodes': ['open', 'upcoming'],
            'startTimes': [{'from': datetime.now(timezone.utc) - timedelta(hours=24)}]
        }
    )

    active_events = response.get('events', [])
    if active_events:
        return {
            'aws_issue_detected': True,
            'events': [{
                'type': e['eventTypeCode'],
                'category': e['eventTypeCategory'],
                'start': str(e['startTime'])
            } for e in active_events]
        }
    return {'aws_issue_detected': False}
```

For a comprehensive monitoring setup that includes AWS service health alongside your application metrics, check out our post on [setting up AWS Health Dashboard notifications](https://oneuptime.com/blog/post/2026-02-12-aws-personal-health-dashboard-notifications/view).

## Best Practices

1. **Set up EventBridge rules immediately** - Don't wait until you need it. Health notifications should be flowing to your team from day one.
2. **Automate what you can** - Scheduled retirement events are perfectly automatable for EBS-backed instances.
3. **Include health checks in your incident process** - When investigating an issue, checking AWS Health should be a standard step.
4. **Use the organization view** if you have multiple accounts. One dashboard to rule them all.
5. **Don't ignore scheduled changes** - Maintenance windows are predictable, so plan around them.

## Wrapping Up

The AWS Health Dashboard is your primary source of truth for AWS service status as it relates to your specific account. Combined with EventBridge notifications and automated responses, it transforms from a passive dashboard into an active part of your operational toolkit. Set up the notifications, build the automations, and you'll catch AWS-side issues before your customers notice them.
