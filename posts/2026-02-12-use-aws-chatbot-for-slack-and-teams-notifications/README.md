# How to Use AWS Chatbot for Slack and Teams Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Chatbot, Slack, Microsoft Teams, Notifications

Description: Configure AWS Chatbot to send CloudWatch alarms, deployment notifications, and other AWS alerts directly to Slack and Microsoft Teams channels.

---

Getting AWS notifications in Slack or Microsoft Teams is one of those small things that makes a huge difference for operations teams. Instead of checking email or logging into the AWS console, your team sees alerts where they're already working. AWS Chatbot bridges the gap between SNS topics and your chat channels.

## What AWS Chatbot Does

AWS Chatbot isn't an AI chatbot. It's an integration service that:

1. Takes notifications from SNS topics
2. Formats them into readable chat messages
3. Posts them to Slack channels or Microsoft Teams channels
4. Lets you run some AWS CLI commands directly from chat

It supports notifications from CloudWatch Alarms, AWS Health events, CloudFormation updates, Security Hub findings, and any custom notifications you publish to SNS.

## Setting Up Slack Integration

### Step 1: Configure the Slack Workspace

Go to the AWS Chatbot console and click "Configure new client." Choose Slack.

This opens a Slack authorization page. You need to be a Slack workspace admin to approve the connection. Once approved, AWS Chatbot has permission to post to your workspace.

### Step 2: Create a Chatbot Channel Configuration

```bash
# Create a Slack channel configuration via CLI
aws chatbot create-slack-channel-configuration \
  --configuration-name "ops-alerts" \
  --slack-workspace-id "T01XXXXXXXX" \
  --slack-channel-id "C01XXXXXXXX" \
  --sns-topic-arns "arn:aws:sns:us-east-1:123456789:ops-alerts" \
  --iam-role-arn "arn:aws:iam::123456789:role/AWSChatbotRole" \
  --logging-level "INFO"
```

You'll need:
- **Slack Workspace ID** - found in Slack under workspace settings
- **Slack Channel ID** - right-click on the channel in Slack and copy the link to find it
- **SNS Topic ARN** - the topic that will feed notifications to this channel
- **IAM Role** - the role Chatbot assumes to read notifications

### Step 3: Create the IAM Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "chatbot.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role.

```bash
# Create the role
aws iam create-role \
  --role-name AWSChatbotRole \
  --assume-role-policy-document file://chatbot-trust-policy.json

# Attach the AWS managed policy for Chatbot
aws iam attach-role-policy \
  --role-name AWSChatbotRole \
  --policy-arn arn:aws:iam::aws:policy/AWSResourceExplorerReadOnlyAccess

# Add CloudWatch read access so Chatbot can show alarm details
aws iam attach-role-policy \
  --role-name AWSChatbotRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess
```

## Setting Up Microsoft Teams Integration

The Teams setup is similar but requires a few different steps.

### Step 1: Configure the Teams Client

In the AWS Chatbot console, choose Microsoft Teams. You'll need to:
1. Sign in with a Teams admin account
2. Approve the AWS Chatbot app in your Teams tenant
3. Add the AWS Chatbot app to the Teams channel where you want notifications

### Step 2: Create the Channel Configuration

```bash
aws chatbot create-microsoft-teams-channel-configuration \
  --configuration-name "ops-alerts-teams" \
  --team-id "YOUR_TEAM_ID" \
  --tenant-id "YOUR_TENANT_ID" \
  --channel-id "YOUR_CHANNEL_ID" \
  --sns-topic-arns "arn:aws:sns:us-east-1:123456789:ops-alerts" \
  --iam-role-arn "arn:aws:iam::123456789:role/AWSChatbotRole" \
  --logging-level "INFO"
```

## Routing Different Alerts to Different Channels

In practice, you don't want all alerts going to one channel. Route them by severity or service.

```bash
# Create SNS topics for different alert types
aws sns create-topic --name critical-alerts
aws sns create-topic --name warning-alerts
aws sns create-topic --name deployment-notifications
aws sns create-topic --name cost-alerts

# Create Chatbot configurations for each
aws chatbot create-slack-channel-configuration \
  --configuration-name "critical-alerts" \
  --slack-workspace-id "T01XXXXXXXX" \
  --slack-channel-id "C_CRITICAL_CHANNEL" \
  --sns-topic-arns "arn:aws:sns:us-east-1:123456789:critical-alerts" \
  --iam-role-arn "arn:aws:iam::123456789:role/AWSChatbotRole"

aws chatbot create-slack-channel-configuration \
  --configuration-name "deployments" \
  --slack-workspace-id "T01XXXXXXXX" \
  --slack-channel-id "C_DEPLOY_CHANNEL" \
  --sns-topic-arns "arn:aws:sns:us-east-1:123456789:deployment-notifications" \
  --iam-role-arn "arn:aws:iam::123456789:role/AWSChatbotRole"
```

## Sending CloudWatch Alarms to Chat

The most common use case is forwarding CloudWatch alarms. When you create an alarm, just point its action to the SNS topic that's connected to Chatbot.

```bash
# Create a CloudWatch alarm that notifies Slack
aws cloudwatch put-metric-alarm \
  --alarm-name "high-cpu-production" \
  --alarm-description "CPU usage above 80% on production" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789:critical-alerts" \
  --ok-actions "arn:aws:sns:us-east-1:123456789:critical-alerts" \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0
```

When this alarm fires, Chatbot will format it into a clean Slack or Teams message with the alarm name, description, metric details, and the current state.

## Custom Notifications

You can send any custom notification through SNS to Chatbot. Format it so Chatbot displays it nicely.

```python
import boto3
import json

sns = boto3.client('sns', region_name='us-east-1')

def send_deployment_notification(service, version, environment, status):
    """Send a deployment notification to Slack via Chatbot."""
    message = {
        'version': '1.0',
        'source': 'custom',
        'content': {
            'textType': 'client-markdown',
            'title': f'Deployment: {service}',
            'description': (
                f'**Service:** {service}\n'
                f'**Version:** {version}\n'
                f'**Environment:** {environment}\n'
                f'**Status:** {status}'
            )
        }
    }

    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789:deployment-notifications',
        Message=json.dumps(message),
        Subject=f'Deploy: {service} {version} to {environment}'
    )

# Send a notification
send_deployment_notification(
    'api-server',
    'v2.3.1',
    'production',
    'Completed successfully'
)
```

## Running AWS CLI Commands from Chat

One of the cooler features is running AWS commands directly from Slack. Type `@aws` followed by a CLI command.

For example, in Slack:
```
@aws cloudwatch describe-alarms --state-value ALARM
@aws ecs list-services --cluster production
@aws lambda list-functions
```

Chatbot executes the command using the IAM role you configured and posts the output back to the channel. This is great for quick checks during incidents without switching to a terminal.

To enable this, make sure the IAM role has the necessary permissions for the commands you want to run.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:Describe*",
        "cloudwatch:Get*",
        "cloudwatch:List*",
        "ecs:Describe*",
        "ecs:List*",
        "lambda:List*",
        "lambda:Get*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Notification Filtering

You can filter which notifications reach your channel by using SNS subscription filter policies.

```bash
# Only forward ALARM state changes (not OK or INSUFFICIENT_DATA)
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:ops-alerts \
  --protocol https \
  --notification-endpoint https://global.sns-api.chatbot.amazonaws.com \
  --attributes '{
    "FilterPolicy": "{\"AlarmState\": [\"ALARM\"]}"
  }'
```

## Integrating with SES Monitoring

If you're monitoring SES sending (bounces, complaints, delivery issues), route those alerts to a dedicated channel. For setting up SES monitoring, see [monitoring SES sending with CloudWatch](https://oneuptime.com/blog/post/monitor-ses-sending-with-cloudwatch/view).

```bash
# SES alerts to a dedicated email-ops channel
aws chatbot create-slack-channel-configuration \
  --configuration-name "ses-monitoring" \
  --slack-workspace-id "T01XXXXXXXX" \
  --slack-channel-id "C_SES_CHANNEL" \
  --sns-topic-arns "arn:aws:sns:us-east-1:123456789:ses-alerts" \
  --iam-role-arn "arn:aws:iam::123456789:role/AWSChatbotRole"
```

## Best Practices

1. **Don't flood channels.** Too many alerts leads to alert fatigue. Only send actionable notifications to chat.
2. **Use separate channels** for different severity levels and services.
3. **Keep the IAM role scoped.** Only grant permissions the team actually needs from chat.
4. **Set up both alarm and OK actions** so the team knows when an issue is resolved.
5. **Test your setup** by triggering a test alarm before relying on it for production.

## Summary

AWS Chatbot is the simplest way to get AWS notifications into Slack and Microsoft Teams. It takes about 15 minutes to set up and immediately improves your team's visibility into what's happening in your AWS environment. The key is being thoughtful about what you route to chat - not everything needs to be a notification. Focus on actionable alerts that require human attention, and keep informational logs in CloudWatch where they belong.
