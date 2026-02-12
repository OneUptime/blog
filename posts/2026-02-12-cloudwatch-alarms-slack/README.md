# How to Integrate CloudWatch Alarms with Slack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Slack, Notifications, ChatOps

Description: Step-by-step guide to sending CloudWatch Alarm notifications to Slack channels using SNS, Lambda, and AWS Chatbot for real-time team awareness.

---

Slack is where most engineering teams live during the workday. So it makes sense to send your CloudWatch alarm notifications there instead of relying on email that might sit unread for hours. There are three solid approaches to getting CloudWatch alarms into Slack, and which one you pick depends on how much customization you need.

The simplest option is AWS Chatbot, which is a managed service built for exactly this purpose. The middle ground is an SNS-to-Lambda pipeline that gives you full control over message formatting. And the quick-and-dirty approach is a direct webhook. Let's cover all three.

## Method 1: AWS Chatbot (Recommended)

AWS Chatbot is the official, AWS-managed way to send notifications to Slack. It handles the OAuth flow, message formatting, and even lets you run AWS CLI commands from Slack.

### Step 1: Set Up AWS Chatbot

Go to the AWS Chatbot console and click "Configure new client." Select Slack, and you'll be redirected to authorize the Chatbot app in your Slack workspace.

### Step 2: Create a Chatbot Channel Configuration

```bash
# Create a Chatbot configuration via CLI
aws chatbot create-slack-channel-configuration \
  --configuration-name "cloudwatch-alerts" \
  --slack-workspace-id "T0123ABC" \
  --slack-channel-id "C0456DEF" \
  --iam-role-arn arn:aws:iam::123456789012:role/AWSChatbotRole \
  --sns-topic-arns arn:aws:sns:us-east-1:123456789012:infrastructure-alerts \
  --logging-level ERROR
```

You'll need the Slack workspace ID and channel ID. You can find these in Slack by right-clicking a channel and selecting "Copy link" - the workspace and channel IDs are in the URL.

### Step 3: Create the IAM Role

AWS Chatbot needs an IAM role:

```json
// Trust policy for AWS Chatbot role
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

```bash
# Create the role and attach policies
aws iam create-role \
  --role-name AWSChatbotRole \
  --assume-role-policy-document file://chatbot-trust.json

# Attach the notification permissions policy
aws iam attach-role-policy \
  --role-name AWSChatbotRole \
  --policy-arn arn:aws:iam::aws:policy/AWSChatbotNotificationsOnly
```

### Step 4: Connect CloudWatch Alarms to the SNS Topic

```bash
# Create or update alarms to use the SNS topic connected to Chatbot
aws cloudwatch put-metric-alarm \
  --alarm-name "High-API-Latency" \
  --metric-name Latency \
  --namespace AWS/ApiGateway \
  --statistic Average \
  --period 300 \
  --threshold 3000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:infrastructure-alerts \
  --ok-actions arn:aws:sns:us-east-1:123456789012:infrastructure-alerts \
  --dimensions Name=ApiName,Value=my-api
```

That's it. CloudWatch alarm notifications will now appear in your Slack channel with AWS-formatted messages that include the alarm name, state, reason, and a link to the console.

## Method 2: Lambda with Slack Webhook (Custom Formatting)

If you want full control over how notifications look in Slack, use a Lambda function with Slack's incoming webhooks.

### Step 1: Create a Slack Incoming Webhook

In Slack, go to your workspace settings, then Apps > Incoming Webhooks. Create a new webhook and point it at the channel you want. Copy the webhook URL.

### Step 2: Create the Lambda Function

```python
# Lambda function to send formatted CloudWatch alarms to Slack
import json
import os
import urllib3

SLACK_WEBHOOK_URL = os.environ['SLACK_WEBHOOK_URL']
http = urllib3.PoolManager()

def lambda_handler(event, context):
    # Parse the CloudWatch alarm from the SNS message
    sns_message = json.loads(event['Records'][0]['Sns']['Message'])

    alarm_name = sns_message['AlarmName']
    new_state = sns_message['NewStateValue']
    old_state = sns_message['OldStateValue']
    reason = sns_message['NewStateReason']
    region = sns_message['Region']
    description = sns_message.get('AlarmDescription', 'No description')
    timestamp = sns_message['StateChangeTime']

    # Choose color and icon based on alarm state
    if new_state == 'ALARM':
        color = '#cc0000'  # Red
        state_text = 'TRIGGERED'
    elif new_state == 'OK':
        color = '#36a64f'  # Green
        state_text = 'RESOLVED'
    else:
        color = '#ffcc00'  # Yellow
        state_text = 'INSUFFICIENT DATA'

    # Build the console URL
    console_url = (
        f"https://{region}.console.aws.amazon.com/cloudwatch/home"
        f"?region={region}#alarmsV2:alarm/{alarm_name}"
    )

    # Build the Slack message with Block Kit
    slack_message = {
        'attachments': [
            {
                'color': color,
                'blocks': [
                    {
                        'type': 'header',
                        'text': {
                            'type': 'plain_text',
                            'text': f'{state_text}: {alarm_name}'
                        }
                    },
                    {
                        'type': 'section',
                        'fields': [
                            {
                                'type': 'mrkdwn',
                                'text': f'*State:*\n{old_state} -> {new_state}'
                            },
                            {
                                'type': 'mrkdwn',
                                'text': f'*Region:*\n{region}'
                            },
                            {
                                'type': 'mrkdwn',
                                'text': f'*Time:*\n{timestamp}'
                            },
                            {
                                'type': 'mrkdwn',
                                'text': f'*Description:*\n{description}'
                            }
                        ]
                    },
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': f'*Reason:*\n{reason}'
                        }
                    },
                    {
                        'type': 'actions',
                        'elements': [
                            {
                                'type': 'button',
                                'text': {
                                    'type': 'plain_text',
                                    'text': 'View in CloudWatch'
                                },
                                'url': console_url
                            }
                        ]
                    }
                ]
            }
        ]
    }

    # Send to Slack
    response = http.request(
        'POST',
        SLACK_WEBHOOK_URL,
        body=json.dumps(slack_message),
        headers={'Content-Type': 'application/json'}
    )

    if response.status != 200:
        raise Exception(f'Slack API error: {response.status} {response.data.decode()}')

    return {'statusCode': 200}
```

### Step 3: Deploy and Wire It Up

```bash
# Create the Lambda function
aws lambda create-function \
  --function-name cloudwatch-to-slack \
  --runtime python3.12 \
  --handler lambda_function.lambda_handler \
  --role arn:aws:iam::123456789012:role/LambdaSlackRole \
  --environment Variables={SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/xxx} \
  --zip-file fileb://function.zip

# Allow SNS to invoke the Lambda
aws lambda add-permission \
  --function-name cloudwatch-to-slack \
  --statement-id sns-invoke \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn arn:aws:sns:us-east-1:123456789012:infrastructure-alerts

# Subscribe Lambda to the SNS topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:infrastructure-alerts \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:cloudwatch-to-slack
```

## Method 3: Direct SNS to Slack (Quick Setup)

For the fastest possible setup, subscribe Slack's webhook directly to SNS as an HTTPS endpoint:

```bash
# Subscribe the Slack webhook directly to SNS
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:infrastructure-alerts \
  --protocol https \
  --notification-endpoint "https://hooks.slack.com/services/T00/B00/xxx"
```

The downside is that Slack receives the raw SNS message, which is ugly JSON. It works, but the Lambda approach produces much better-looking notifications.

## CloudFormation for the Lambda Approach

```yaml
# CloudFormation for CloudWatch-to-Slack pipeline
AWSTemplateFormatVersion: '2010-09-09'

Parameters:
  SlackWebhookUrl:
    Type: String
    NoEcho: true
    Description: Slack incoming webhook URL

Resources:
  AlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: slack-alerts

  SlackLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  SlackNotifier:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: cloudwatch-to-slack
      Runtime: python3.12
      Handler: index.lambda_handler
      Role: !GetAtt SlackLambdaRole.Arn
      Environment:
        Variables:
          SLACK_WEBHOOK_URL: !Ref SlackWebhookUrl
      Code:
        ZipFile: |
          import json, os, urllib3
          http = urllib3.PoolManager()
          def lambda_handler(event, context):
              msg = json.loads(event['Records'][0]['Sns']['Message'])
              state = msg['NewStateValue']
              color = '#cc0000' if state == 'ALARM' else '#36a64f'
              slack_msg = {
                  'attachments': [{
                      'color': color,
                      'text': f"*{msg['AlarmName']}* is {state}\n{msg.get('AlarmDescription', '')}\n{msg['NewStateReason']}"
                  }]
              }
              http.request('POST', os.environ['SLACK_WEBHOOK_URL'],
                           body=json.dumps(slack_msg),
                           headers={'Content-Type': 'application/json'})

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref SlackNotifier
      Action: lambda:InvokeFunction
      Principal: sns.amazonaws.com
      SourceArn: !Ref AlertsTopic

  SnsSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      TopicArn: !Ref AlertsTopic
      Protocol: lambda
      Endpoint: !GetAtt SlackNotifier.Arn
```

## Channel Strategy

Don't dump all alerts into one channel. Here's a pattern that works well:

- **#alerts-critical** - only production-breaking issues that need immediate action
- **#alerts-warning** - things that need attention but aren't emergencies
- **#alerts-info** - deployments, auto-scaling events, resolved alerts

Create separate SNS topics for each severity level and point them at different Slack channels.

## Testing

Test your integration thoroughly:

```bash
# Send a test alarm notification
aws cloudwatch set-alarm-state \
  --alarm-name "High-API-Latency" \
  --state-value ALARM \
  --state-reason "Testing Slack integration"

# Wait for the Slack message, then resolve
aws cloudwatch set-alarm-state \
  --alarm-name "High-API-Latency" \
  --state-value OK \
  --state-reason "Test complete"
```

## Wrapping Up

Getting CloudWatch alarms into Slack keeps your team informed without anyone needing to watch the AWS console. AWS Chatbot is the easiest path if you want something managed. The Lambda approach gives you beautiful, customized messages. Either way, pair your Slack notifications with [PagerDuty integration](https://oneuptime.com/blog/post/cloudwatch-alarms-pagerduty/view) for critical alerts that need guaranteed acknowledgment. Slack messages are easy to miss, but they're perfect for team awareness and non-urgent monitoring.
