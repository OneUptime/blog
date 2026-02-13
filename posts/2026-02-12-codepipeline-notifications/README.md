# How to Set Up CodePipeline Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodePipeline, Notifications, DevOps, SNS

Description: Configure AWS CodePipeline notifications for pipeline events using notification rules, SNS topics, EventBridge, and Slack integration for real-time alerts.

---

A CI/CD pipeline that fails silently is worse than no pipeline at all. If nobody knows that the production deployment failed at 2 AM, you're going to have a bad morning. Setting up proper notifications for CodePipeline is one of those things that takes 15 minutes and saves you hours of pain.

AWS gives you several ways to get notified about pipeline events: notification rules (the recommended approach), EventBridge rules, and direct SNS integration. I'll cover all three, plus how to pipe alerts to Slack.

## Option 1: Notification Rules (Recommended)

CodePipeline notification rules are the simplest way to set up alerts. They support SNS topics and AWS Chatbot (for Slack/Teams integration).

### Create an SNS Topic

```bash
# Create an SNS topic for pipeline notifications
aws sns create-topic --name codepipeline-notifications

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:codepipeline-notifications \
  --protocol email \
  --notification-endpoint devops@example.com
```

### Create the Notification Rule

```bash
# Create a notification rule for pipeline events
aws codestar-notifications create-notification-rule \
  --name "my-pipeline-alerts" \
  --resource "arn:aws:codepipeline:us-east-1:123456789:my-app-pipeline" \
  --detail-type FULL \
  --event-type-ids \
    "codepipeline-pipeline-pipeline-execution-failed" \
    "codepipeline-pipeline-pipeline-execution-succeeded" \
    "codepipeline-pipeline-pipeline-execution-started" \
    "codepipeline-pipeline-manual-approval-needed" \
    "codepipeline-pipeline-manual-approval-succeeded" \
    "codepipeline-pipeline-manual-approval-failed" \
  --targets '[{"TargetType":"SNS","TargetAddress":"arn:aws:sns:us-east-1:123456789:codepipeline-notifications"}]'
```

Available event types include:

| Event Type ID | When it fires |
|---|---|
| codepipeline-pipeline-pipeline-execution-started | Pipeline starts |
| codepipeline-pipeline-pipeline-execution-succeeded | Pipeline completes successfully |
| codepipeline-pipeline-pipeline-execution-failed | Pipeline fails |
| codepipeline-pipeline-pipeline-execution-canceled | Pipeline is canceled |
| codepipeline-pipeline-pipeline-execution-superseded | Execution is superseded by a newer one |
| codepipeline-pipeline-stage-execution-started | A stage starts |
| codepipeline-pipeline-stage-execution-failed | A stage fails |
| codepipeline-pipeline-action-execution-failed | An action fails |
| codepipeline-pipeline-manual-approval-needed | Approval action waiting |
| codepipeline-pipeline-manual-approval-succeeded | Approval granted |
| codepipeline-pipeline-manual-approval-failed | Approval rejected or timed out |

For most teams, you'll want at minimum: pipeline failed, pipeline succeeded, and manual approval needed.

## Option 2: EventBridge Rules

EventBridge gives you more flexibility for routing and transforming events. You can filter on specific pipelines, stages, or actions and route to multiple targets.

```bash
# Create an EventBridge rule for pipeline failures
aws events put-rule \
  --name codepipeline-failure-alert \
  --event-pattern '{
    "source": ["aws.codepipeline"],
    "detail-type": ["CodePipeline Pipeline Execution State Change"],
    "detail": {
      "state": ["FAILED"],
      "pipeline": ["my-app-pipeline"]
    }
  }'

# Add SNS as a target
aws events put-targets \
  --rule codepipeline-failure-alert \
  --targets '[{
    "Id": "sns-target",
    "Arn": "arn:aws:sns:us-east-1:123456789:codepipeline-notifications"
  }]'
```

For stage-level events:

```bash
# Alert when the deploy stage fails
aws events put-rule \
  --name deploy-stage-failure \
  --event-pattern '{
    "source": ["aws.codepipeline"],
    "detail-type": ["CodePipeline Stage Execution State Change"],
    "detail": {
      "state": ["FAILED"],
      "pipeline": ["my-app-pipeline"],
      "stage": ["Deploy"]
    }
  }'
```

## Option 3: Slack Integration

There are two ways to get CodePipeline notifications in Slack: AWS Chatbot and a custom Lambda function.

### AWS Chatbot (Easy Way)

AWS Chatbot provides native Slack integration:

```bash
# Create a Chatbot Slack channel configuration
aws chatbot create-slack-channel-configuration \
  --configuration-name pipeline-alerts \
  --slack-team-id T0XXXXXXX \
  --slack-channel-id C0XXXXXXX \
  --iam-role-arn arn:aws:iam::123456789012:role/ChatbotRole \
  --sns-topic-arns arn:aws:sns:us-east-1:123456789:codepipeline-notifications
```

You'll need to install the AWS Chatbot app in your Slack workspace first through the AWS Console.

### Custom Lambda (More Control)

For formatted, branded notifications, use a Lambda function:

```python
# slack_notifier.py - Format CodePipeline events for Slack
import json
import urllib3
import os

SLACK_WEBHOOK = os.environ['SLACK_WEBHOOK_URL']

def handler(event, context):
    detail = event.get('detail', {})
    pipeline = detail.get('pipeline', 'Unknown')
    state = detail.get('state', 'Unknown')
    execution_id = detail.get('execution-id', 'Unknown')

    # Set color based on state
    color_map = {
        'SUCCEEDED': '#36a64f',  # green
        'FAILED': '#d00000',     # red
        'STARTED': '#2196F3',    # blue
        'CANCELED': '#FFA500',   # orange
    }
    color = color_map.get(state, '#808080')

    # Build the Slack message
    region = os.environ.get('AWS_REGION', 'us-east-1')
    console_url = f"https://{region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/{pipeline}/view"

    message = {
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Pipeline:* {pipeline}\n*Status:* {state}\n*Execution:* {execution_id[:8]}"
                        }
                    },
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": {"type": "plain_text", "text": "View Pipeline"},
                                "url": console_url
                            }
                        ]
                    }
                ]
            }
        ]
    }

    # Handle stage-level events
    if 'stage' in detail:
        stage = detail['stage']
        message['attachments'][0]['blocks'][0]['text']['text'] += f"\n*Stage:* {stage}"

    http = urllib3.PoolManager()
    response = http.request(
        'POST',
        SLACK_WEBHOOK,
        body=json.dumps(message),
        headers={'Content-Type': 'application/json'}
    )

    return {'statusCode': response.status}
```

Wire it up with EventBridge:

```bash
# Create EventBridge rule targeting the Lambda
aws events put-rule \
  --name pipeline-slack-notifications \
  --event-pattern '{
    "source": ["aws.codepipeline"],
    "detail-type": [
      "CodePipeline Pipeline Execution State Change",
      "CodePipeline Stage Execution State Change"
    ]
  }'

aws events put-targets \
  --rule pipeline-slack-notifications \
  --targets '[{
    "Id": "slack-lambda",
    "Arn": "arn:aws:lambda:us-east-1:123456789:function:slack-notifier"
  }]'

# Grant EventBridge permission to invoke the Lambda
aws lambda add-permission \
  --function-name slack-notifier \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:123456789:rule/pipeline-slack-notifications
```

## Notification for Approval Actions

Approval notifications deserve special attention. When a pipeline is waiting for approval, you want the notification to reach the right people quickly.

Create a dedicated SNS topic for approvals:

```bash
# Separate topic for approval notifications
aws sns create-topic --name pipeline-approvals

# Subscribe the on-call channel
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:pipeline-approvals \
  --protocol email \
  --notification-endpoint release-managers@example.com
```

Then create a specific EventBridge rule:

```bash
# EventBridge rule specifically for approval events
aws events put-rule \
  --name pipeline-approval-needed \
  --event-pattern '{
    "source": ["aws.codepipeline"],
    "detail-type": ["CodePipeline Action Execution State Change"],
    "detail": {
      "type": {"category": ["Approval"]},
      "state": ["STARTED"]
    }
  }'
```

## Best Practices

Keep these in mind when setting up notifications:

- Don't alert on everything. Pipeline started events create noise. Focus on failures, approvals, and maybe successes.
- Use separate channels for different severity levels. Failures go to the on-call channel, successes go to a general channel.
- Include actionable information. A notification that says "pipeline failed" isn't helpful without a link to view the details.
- Set up notifications before you need them. Don't wait for a production incident to realize you don't have alerts configured.

For comprehensive monitoring beyond just pipeline events, [OneUptime](https://oneuptime.com) can monitor your applications, infrastructure, and deployment pipelines in one place. If pipelines are failing repeatedly, our guide on [troubleshooting CodePipeline failures](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-codepipeline-failures/view) can help you dig into the root causes.
