# How to Build a Serverless Slack Bot on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Slack Bot, API Gateway, Serverless, ChatOps

Description: Build a serverless Slack bot on AWS using Lambda and API Gateway for slash commands, interactive messages, and event handling

---

Slack bots are everywhere in modern engineering teams. They deploy code, query dashboards, manage incidents, and automate repetitive tasks. The traditional approach is running a bot server 24/7 listening for events. But most Slack bots sit idle 99% of the time, doing nothing between occasional commands.

A serverless Slack bot with Lambda and API Gateway eliminates that idle cost. Lambda wakes up when a command arrives, processes it, and goes back to sleep. You pay only for the milliseconds of actual execution.

## Architecture

```mermaid
graph LR
    A[Slack User] -->|Slash Command| B[Slack API]
    B -->|POST| C[API Gateway]
    C --> D[Lambda Handler]
    D -->|Respond| B
    D -->|Async Work| E[SQS Queue]
    E --> F[Worker Lambda]
    F -->|Update Message| B
```

There are three types of Slack interactions your bot needs to handle:

1. **Slash commands** - User types `/deploy production`
2. **Events** - Messages in channels, reactions, user joins
3. **Interactive components** - Button clicks, menu selections, modal submissions

## Step 1: Create the Slack App

Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app. You will need:

- **Bot Token** (`xoxb-...`) for sending messages
- **Signing Secret** for verifying requests come from Slack
- **Slash Command** URL pointing to your API Gateway

Store these in Secrets Manager:

```bash
# Store Slack credentials securely
aws secretsmanager create-secret \
  --name slack-bot-credentials \
  --secret-string '{
    "bot_token": "xoxb-your-bot-token",
    "signing_secret": "your-signing-secret"
  }'
```

## Step 2: Build the Slash Command Handler

Slack requires a response within 3 seconds. For quick commands, respond immediately. For slow operations, acknowledge immediately and send the actual response later.

```python
# Slack slash command handler with request verification
import boto3
import json
import hashlib
import hmac
import time
import os
import urllib.parse

secrets_client = boto3.client('secretsmanager')

# Cache credentials across invocations
_credentials = None

def get_credentials():
    global _credentials
    if _credentials is None:
        response = secrets_client.get_secret_value(SecretId='slack-bot-credentials')
        _credentials = json.loads(response['SecretString'])
    return _credentials

def handler(event, context):
    # Verify the request is from Slack
    if not verify_slack_signature(event):
        return {'statusCode': 401, 'body': 'Invalid signature'}

    # Parse the slash command payload
    body = urllib.parse.parse_qs(event.get('body', ''))
    command = body.get('command', [''])[0]
    text = body.get('text', [''])[0]
    response_url = body.get('response_url', [''])[0]
    user_id = body.get('user_id', [''])[0]
    channel_id = body.get('channel_id', [''])[0]

    print(f"Command: {command} {text} from user {user_id} in {channel_id}")

    # Route to the appropriate handler
    if command == '/deploy':
        return handle_deploy(text, response_url, user_id, channel_id)
    elif command == '/status':
        return handle_status(text, user_id)
    elif command == '/oncall':
        return handle_oncall(text, user_id)
    else:
        return slack_response(f"Unknown command: {command}")

def verify_slack_signature(event):
    """Verify that the request actually came from Slack."""
    creds = get_credentials()
    signing_secret = creds['signing_secret']

    headers = event.get('headers', {})
    timestamp = headers.get('X-Slack-Request-Timestamp', '')
    signature = headers.get('X-Slack-Signature', '')

    # Reject requests older than 5 minutes
    if abs(time.time() - int(timestamp)) > 300:
        return False

    # Compute the expected signature
    sig_basestring = f"v0:{timestamp}:{event.get('body', '')}"
    expected = 'v0=' + hmac.new(
        signing_secret.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)

def slack_response(text, response_type='ephemeral'):
    """Return a Slack-formatted response."""
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'response_type': response_type,
            'text': text
        })
    }
```

## Step 3: Handle Slow Commands with Async Processing

For commands that take more than 3 seconds (deployments, database queries, etc.), acknowledge immediately and send the result later via the response URL.

```python
# Handle deploy command asynchronously via SQS
import requests

sqs = boto3.client('sqs')
QUEUE_URL = os.environ['ASYNC_QUEUE_URL']

def handle_deploy(text, response_url, user_id, channel_id):
    """Handle /deploy command - acknowledge and process async."""
    parts = text.split()
    environment = parts[0] if parts else 'staging'

    # Validate the environment
    valid_envs = ['staging', 'production', 'canary']
    if environment not in valid_envs:
        return slack_response(f"Invalid environment. Choose from: {', '.join(valid_envs)}")

    # Send to SQS for async processing
    sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps({
            'action': 'deploy',
            'environment': environment,
            'user_id': user_id,
            'channel_id': channel_id,
            'response_url': response_url
        })
    )

    # Acknowledge immediately (within 3 seconds)
    return slack_response(f"Starting deployment to `{environment}`... I will update you when it is done.")
```

### The Async Worker Lambda

```python
# Async worker that processes slow commands and posts results to Slack
import boto3
import json
import requests

def handler(event, context):
    for record in event['Records']:
        body = json.loads(record['body'])
        action = body['action']

        if action == 'deploy':
            process_deploy(body)

def process_deploy(body):
    """Execute the deployment and report back to Slack."""
    environment = body['environment']
    response_url = body['response_url']

    try:
        # Your deployment logic here
        result = run_deployment(environment)

        # Send the result back to Slack via the response URL
        requests.post(response_url, json={
            'response_type': 'in_channel',
            'text': f"Deployment to `{environment}` complete! Version: `{result['version']}`"
        })

    except Exception as e:
        requests.post(response_url, json={
            'response_type': 'ephemeral',
            'text': f"Deployment to `{environment}` failed: {str(e)}"
        })

def run_deployment(environment):
    # Your actual deployment logic
    return {'version': 'v2.3.1'}
```

## Step 4: Handle Interactive Components

When users click buttons or interact with modals, Slack sends a POST to your interactions URL.

```python
# Handle interactive component callbacks (buttons, menus, modals)
import json
import urllib.parse

def handle_interaction(event, context):
    # Interaction payloads are URL-encoded JSON
    body = urllib.parse.parse_qs(event['body'])
    payload = json.loads(body['payload'][0])

    interaction_type = payload['type']

    if interaction_type == 'block_actions':
        return handle_block_action(payload)
    elif interaction_type == 'view_submission':
        return handle_modal_submission(payload)
    elif interaction_type == 'shortcut':
        return handle_shortcut(payload)

    return {'statusCode': 200}

def handle_block_action(payload):
    """Handle button clicks and menu selections."""
    actions = payload['actions']
    action = actions[0]
    action_id = action['action_id']
    value = action['value']

    if action_id == 'approve_deploy':
        # User clicked the approve button
        environment = value
        return approve_deployment(environment, payload)
    elif action_id == 'reject_deploy':
        return reject_deployment(value, payload)

    return {'statusCode': 200}
```

### Sending Interactive Messages

```python
# Send a message with interactive approve/reject buttons
import requests

def request_deploy_approval(environment, user_id, channel_id):
    creds = get_credentials()

    requests.post('https://slack.com/api/chat.postMessage', json={
        'channel': channel_id,
        'text': f'Deployment approval requested for `{environment}`',
        'blocks': [
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': f'*Deployment Approval*\n<@{user_id}> wants to deploy to `{environment}`'
                }
            },
            {
                'type': 'actions',
                'elements': [
                    {
                        'type': 'button',
                        'text': {'type': 'plain_text', 'text': 'Approve'},
                        'style': 'primary',
                        'action_id': 'approve_deploy',
                        'value': environment
                    },
                    {
                        'type': 'button',
                        'text': {'type': 'plain_text', 'text': 'Reject'},
                        'style': 'danger',
                        'action_id': 'reject_deploy',
                        'value': environment
                    }
                ]
            }
        ]
    }, headers={
        'Authorization': f"Bearer {creds['bot_token']}",
        'Content-Type': 'application/json'
    })
```

## Step 5: Handle Slack Events

For responding to messages, reactions, and other events, enable the Events API.

```python
# Handle Slack Events API webhook
import json

def handle_event(event, context):
    body = json.loads(event['body'])

    # Slack sends a challenge for URL verification
    if body.get('type') == 'url_verification':
        return {
            'statusCode': 200,
            'body': json.dumps({'challenge': body['challenge']})
        }

    # Process the actual event
    slack_event = body.get('event', {})
    event_type = slack_event.get('type')

    if event_type == 'app_mention':
        handle_mention(slack_event)
    elif event_type == 'message':
        handle_message(slack_event)

    return {'statusCode': 200}

def handle_mention(event):
    """Respond when the bot is @mentioned."""
    creds = get_credentials()
    channel = event['channel']
    text = event.get('text', '')
    user = event.get('user', '')

    # Simple keyword-based responses
    if 'help' in text.lower():
        response_text = (
            "*Available Commands:*\n"
            "- `/deploy [env]` - Deploy to an environment\n"
            "- `/status [service]` - Check service status\n"
            "- `/oncall` - Show the current on-call schedule\n"
        )
    else:
        response_text = f"Hi <@{user}>! Type `help` to see what I can do."

    requests.post('https://slack.com/api/chat.postMessage', json={
        'channel': channel,
        'text': response_text
    }, headers={
        'Authorization': f"Bearer {creds['bot_token']}",
        'Content-Type': 'application/json'
    })
```

## Step 6: Set Up API Gateway Routes

```bash
# Create routes for different Slack endpoints
# /slack/commands - Slash commands
# /slack/interactions - Button clicks, modals
# /slack/events - Events API

API_ID=$(aws apigateway create-rest-api \
  --name slack-bot-api \
  --query 'id' --output text)

ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[0].id' --output text)

# Create /slack parent resource
SLACK_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part slack \
  --query 'id' --output text)

# Create /slack/commands
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $SLACK_ID \
  --path-part commands
```

## Handling the 3-Second Timeout

Slack requires a response within 3 seconds for slash commands. Lambda cold starts can eat 1-2 seconds of that. Options:

1. **Provisioned Concurrency** - Keep instances warm (adds cost)
2. **Always respond immediately** - Acknowledge and process async via SQS
3. **Use ARM64 runtime** - ARM Lambda cold starts are faster
4. **Minimize package size** - Fewer dependencies means faster cold starts

The safest approach is option 2: always acknowledge immediately and do real work asynchronously. This pattern handles both the 3-second timeout and any slow operations.

## Wrapping Up

A serverless Slack bot on AWS handles three interaction types - slash commands, interactive components, and events - all through API Gateway and Lambda. The async pattern with SQS handles the 3-second timeout constraint gracefully. You get a bot that costs virtually nothing when idle, scales automatically during incidents (when everyone is running commands), and requires zero infrastructure management.

For integrating your Slack bot with approval workflows, check out our guide on [building human approval workflows with Step Functions](https://oneuptime.com/blog/post/build-human-approval-workflows-with-step-functions/view). For building scheduled bot messages, see [building serverless cron jobs with EventBridge and Lambda](https://oneuptime.com/blog/post/build-a-serverless-cron-job-with-eventbridge-and-lambda/view).
