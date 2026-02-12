# How to Use EventBridge API Destinations for Webhooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EventBridge, Webhooks, API Destinations, Serverless, Integration

Description: Learn how to use Amazon EventBridge API Destinations to send events to external webhook endpoints reliably

---

Webhooks are everywhere. Slack, Stripe, GitHub, PagerDuty, Datadog - they all accept webhooks for integrations. The traditional approach on AWS is to write a Lambda function that formats the payload and makes an HTTP POST. It works, but it means maintaining code, handling retries, managing secrets, and dealing with rate limiting yourself.

EventBridge API Destinations let you skip all of that. You define an HTTP endpoint, configure authentication, set rate limits, and EventBridge handles the rest. No Lambda required.

## What Are API Destinations?

An API Destination is an EventBridge feature that lets you route events directly to an HTTP endpoint. It has three components:

1. **Connection** - Stores authentication credentials (API keys, OAuth tokens, basic auth)
2. **API Destination** - Defines the HTTP endpoint URL, method, and rate limit
3. **Rule** - Matches events and routes them to the API Destination with optional input transformation

```mermaid
graph LR
    A[Event Source] --> B[EventBridge Bus]
    B --> C[Rule with Pattern]
    C --> D[Input Transformer]
    D --> E[API Destination]
    E --> F[Connection Auth]
    F --> G[External Webhook Endpoint]
```

## Step 1: Create a Connection

Connections hold your authentication credentials securely. EventBridge supports three auth types: API Key, Basic Auth, and OAuth.

Here is an example creating a connection with an API key (common for services like Slack and PagerDuty):

```bash
# Create a connection with API key authentication for Slack
aws events create-connection \
  --name slack-webhook-connection \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "Authorization",
      "ApiKeyValue": "Bearer xoxb-your-slack-bot-token"
    }
  }'
```

For OAuth-based services:

```bash
# Create a connection with OAuth client credentials
aws events create-connection \
  --name oauth-service-connection \
  --authorization-type OAUTH_CLIENT_CREDENTIALS \
  --auth-parameters '{
    "OAuthParameters": {
      "ClientParameters": {
        "ClientID": "your-client-id",
        "ClientSecret": "your-client-secret"
      },
      "AuthorizationEndpoint": "https://auth.example.com/oauth/token",
      "HttpMethod": "POST",
      "OAuthHttpParameters": {
        "BodyParameters": [
          {"Key": "grant_type", "Value": "client_credentials"}
        ]
      }
    }
  }'
```

For basic auth:

```bash
# Create a connection with basic username/password authentication
aws events create-connection \
  --name basic-auth-connection \
  --authorization-type BASIC \
  --auth-parameters '{
    "BasicAuthParameters": {
      "Username": "webhook-user",
      "Password": "webhook-password"
    }
  }'
```

Connections store credentials in Secrets Manager behind the scenes. EventBridge manages the secret lifecycle automatically, including OAuth token refresh.

For more details on connection resources and their auth capabilities, see our guide on [EventBridge Connection Resources for Authentication](https://oneuptime.com/blog/post/use-eventbridge-connection-resources-for-authentication/view).

## Step 2: Create the API Destination

Now define where to send events:

```bash
# Create an API Destination pointing to a Slack webhook
aws events create-api-destination \
  --name slack-alerts-destination \
  --connection-arn arn:aws:events:us-east-1:123456789012:connection/slack-webhook-connection \
  --invocation-endpoint https://slack.com/api/chat.postMessage \
  --http-method POST \
  --invocation-rate-limit-per-second 10
```

The `invocation-rate-limit-per-second` setting is important. External services often have rate limits, and you do not want EventBridge to overwhelm them. Set this to a value below the target service's rate limit.

## Step 3: Create an EventBridge Rule

The rule matches events and routes them to the API Destination. You almost always need an input transformer to convert the EventBridge event format into the format the external service expects.

### Example: Sending EC2 State Changes to Slack

```bash
# Create a rule that sends EC2 state change events to Slack
aws events put-rule \
  --name ec2-state-to-slack \
  --event-pattern '{
    "source": ["aws.ec2"],
    "detail-type": ["EC2 Instance State-change Notification"],
    "detail": {
      "state": ["stopped", "terminated"]
    }
  }' \
  --state ENABLED
```

Now add the target with an input transformer that formats the message for Slack:

```bash
# Add the API Destination as a target with Slack-formatted payload
aws events put-targets \
  --rule ec2-state-to-slack \
  --targets '[{
    "Id": "slack-target",
    "Arn": "arn:aws:events:us-east-1:123456789012:api-destination/slack-alerts-destination",
    "RoleArn": "arn:aws:iam::123456789012:role/eventbridge-api-dest-role",
    "InputTransformer": {
      "InputPathsMap": {
        "instance": "$.detail.instance-id",
        "state": "$.detail.state",
        "time": "$.time"
      },
      "InputTemplate": "{\"channel\": \"#ops-alerts\", \"text\": \"EC2 instance <instance> changed to <state> at <time>\"}"
    }
  }]'
```

### Example: Sending CloudWatch Alarms to PagerDuty

```bash
# Rule for CloudWatch alarm state changes
aws events put-rule \
  --name alarms-to-pagerduty \
  --event-pattern '{
    "source": ["aws.cloudwatch"],
    "detail-type": ["CloudWatch Alarm State Change"],
    "detail": {
      "state": {"value": ["ALARM"]}
    }
  }' \
  --state ENABLED
```

PagerDuty expects a specific payload format:

```bash
# Route alarm events to PagerDuty with the Events API v2 format
aws events put-targets \
  --rule alarms-to-pagerduty \
  --targets '[{
    "Id": "pagerduty-target",
    "Arn": "arn:aws:events:us-east-1:123456789012:api-destination/pagerduty-destination",
    "RoleArn": "arn:aws:iam::123456789012:role/eventbridge-api-dest-role",
    "InputTransformer": {
      "InputPathsMap": {
        "alarm": "$.detail.alarmName",
        "reason": "$.detail.state.reason",
        "timestamp": "$.time"
      },
      "InputTemplate": "{\"routing_key\": \"your-pagerduty-routing-key\", \"event_action\": \"trigger\", \"payload\": {\"summary\": \"CloudWatch Alarm: <alarm>\", \"severity\": \"critical\", \"source\": \"aws-cloudwatch\", \"timestamp\": \"<timestamp>\", \"custom_details\": {\"reason\": \"<reason>\"}}}"
    }
  }]'
```

## IAM Role for API Destinations

EventBridge needs an IAM role to invoke API Destinations:

```json
// IAM policy allowing EventBridge to invoke API Destinations
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "events:InvokeApiDestination",
      "Resource": "arn:aws:events:us-east-1:123456789012:api-destination/*"
    }
  ]
}
```

The trust policy must allow `events.amazonaws.com` to assume the role.

## Retry Behavior

EventBridge retries failed API Destination calls automatically. The default retry policy is:

- Maximum age of event: 24 hours
- Maximum retry attempts: 185

You can customize this per target:

```bash
# Set custom retry policy: 2 hours max, 10 retries
aws events put-targets \
  --rule ec2-state-to-slack \
  --targets '[{
    "Id": "slack-target",
    "Arn": "arn:aws:events:us-east-1:123456789012:api-destination/slack-alerts-destination",
    "RoleArn": "arn:aws:iam::123456789012:role/eventbridge-api-dest-role",
    "RetryPolicy": {
      "MaximumEventAgeInSeconds": 7200,
      "MaximumRetryAttempts": 10
    }
  }]'
```

For events that fail all retries, configure a dead-letter queue (SQS) to capture them:

```bash
# Add a dead-letter queue for failed webhook deliveries
aws events put-targets \
  --rule ec2-state-to-slack \
  --targets '[{
    "Id": "slack-target",
    "Arn": "arn:aws:events:us-east-1:123456789012:api-destination/slack-alerts-destination",
    "RoleArn": "arn:aws:iam::123456789012:role/eventbridge-api-dest-role",
    "DeadLetterConfig": {
      "Arn": "arn:aws:sqs:us-east-1:123456789012:webhook-dlq"
    }
  }]'
```

## Monitoring API Destination Health

Track these CloudWatch metrics to monitor your webhook integrations:

- `Invocations` - Total number of API calls made
- `InvocationAttempts` - Including retries
- `TriggeredRules` - Rules that matched events
- `FailedInvocations` - Calls that failed after all retries

Set up alarms on `FailedInvocations` to catch problems early:

```bash
# Alarm when webhook failures spike
aws cloudwatch put-metric-alarm \
  --alarm-name webhook-failures \
  --namespace AWS/Events \
  --metric-name FailedInvocations \
  --dimensions Name=RuleName,Value=ec2-state-to-slack \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## When to Use API Destinations vs Lambda

Use API Destinations when:
- You are making a simple HTTP call with straightforward payload transformation
- You want built-in rate limiting and retry management
- You want to avoid managing Lambda code

Use Lambda when:
- You need complex payload transformations that input transformers cannot handle
- You need to make multiple API calls per event
- You need to call APIs that require custom signing (like AWS SigV4)
- You need to execute business logic alongside the webhook

## Wrapping Up

EventBridge API Destinations eliminate boilerplate Lambda functions for webhook integrations. You get managed authentication, automatic retries, rate limiting, and dead-letter queues without writing a single line of code. For most webhook use cases, this is the way to go on AWS.
