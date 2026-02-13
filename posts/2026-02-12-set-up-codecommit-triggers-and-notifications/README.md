# How to Set Up CodeCommit Triggers and Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeCommit, Lambda, SNS, DevOps

Description: Learn how to configure AWS CodeCommit triggers and notification rules to automate workflows, notify teams of repository events, and integrate with Lambda and SNS.

---

A Git repository without notifications is a black box. You don't know when someone pushed to main, when a pull request needs review, or when a branch was deleted. CodeCommit supports two notification mechanisms: triggers (which invoke Lambda or publish to SNS) and notification rules (which use AWS CodeStar Notifications for richer event handling).

Triggers are the older, simpler mechanism. They fire on push events and can call Lambda or SNS directly. Notification rules are newer and support more event types including pull request events, comment events, and approval events. Most teams should use both.

## Part 1: CodeCommit Triggers

Triggers fire when someone pushes to the repository. You can filter by branch and invoke either Lambda or SNS.

### Trigger to SNS (Team Notifications)

Set up an SNS topic that notifies your team whenever code is pushed to main.

```bash
# Create an SNS topic for repository events
aws sns create-topic --name codecommit-notifications

# Subscribe your team's Slack webhook or email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:codecommit-notifications \
  --protocol email \
  --notification-endpoint team@mycompany.com

# Create the trigger
aws codecommit put-repository-triggers \
  --repository-name my-application \
  --triggers '[
    {
      "name": "main-branch-push",
      "destinationArn": "arn:aws:sns:us-east-1:123456789012:codecommit-notifications",
      "branches": ["main", "production"],
      "events": ["all"]
    }
  ]'
```

### Trigger to Lambda (Automated Workflows)

Lambda triggers let you run custom code on every push. Common use cases: running linters, updating a build dashboard, or triggering a deployment.

Here's a Lambda function that processes push events.

```python
# codecommit_trigger.py
import json
import boto3
import os

codecommit = boto3.client('codecommit')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """Process CodeCommit push events."""

    for record in event['Records']:
        # Parse the event
        event_source_arn = record.get('eventSourceARN', '')
        repo_name = event_source_arn.split(':')[-1] if event_source_arn else 'unknown'

        # Get commit details from the event
        references = record.get('codecommit', {}).get('references', [])

        for ref in references:
            commit_id = ref.get('commit')
            branch = ref.get('ref', '').replace('refs/heads/', '')

            if not commit_id:
                continue

            # Get the commit details
            try:
                commit_info = codecommit.get_commit(
                    repositoryName=repo_name,
                    commitId=commit_id
                )
                commit = commit_info['commit']

                message = commit.get('message', 'No message')
                author = commit.get('author', {}).get('name', 'Unknown')
                email = commit.get('author', {}).get('email', '')

                print(f"Repo: {repo_name}, Branch: {branch}")
                print(f"Author: {author} <{email}>")
                print(f"Message: {message}")

                # Get the list of changed files
                if commit.get('parents'):
                    diff = codecommit.get_differences(
                        repositoryName=repo_name,
                        beforeCommitSpecifier=commit['parents'][0],
                        afterCommitSpecifier=commit_id
                    )
                    changed_files = [
                        d.get('afterBlob', d.get('beforeBlob', {})).get('path', 'unknown')
                        for d in diff.get('differences', [])
                    ]
                    print(f"Changed files: {changed_files}")

                # Example: notify if certain files changed
                critical_files = ['Dockerfile', 'docker-compose.yml', '.env.example']
                critical_changes = [f for f in changed_files if f in critical_files]

                if critical_changes:
                    sns.publish(
                        TopicArn=os.environ['ALERT_TOPIC_ARN'],
                        Subject=f'Critical file changed in {repo_name}',
                        Message=json.dumps({
                            'repository': repo_name,
                            'branch': branch,
                            'author': author,
                            'files': critical_changes,
                            'commit': commit_id[:8],
                            'message': message
                        }, indent=2)
                    )

            except Exception as e:
                print(f"Error processing commit {commit_id}: {e}")

    return {'statusCode': 200}
```

Deploy and configure the trigger.

```bash
# Create the Lambda function
zip lambda.zip codecommit_trigger.py

aws lambda create-function \
  --function-name codecommit-push-handler \
  --runtime python3.12 \
  --handler codecommit_trigger.lambda_handler \
  --role arn:aws:iam::123456789012:role/LambdaCodeCommitRole \
  --zip-file fileb://lambda.zip \
  --timeout 30 \
  --environment '{"Variables": {"ALERT_TOPIC_ARN": "arn:aws:sns:us-east-1:123456789012:codecommit-notifications"}}'

# Grant CodeCommit permission to invoke the function
aws lambda add-permission \
  --function-name codecommit-push-handler \
  --statement-id codecommit-trigger \
  --action lambda:InvokeFunction \
  --principal codecommit.amazonaws.com \
  --source-arn arn:aws:codecommit:us-east-1:123456789012:my-application

# Create the trigger
aws codecommit put-repository-triggers \
  --repository-name my-application \
  --triggers '[
    {
      "name": "push-to-lambda",
      "destinationArn": "arn:aws:lambda:us-east-1:123456789012:function:codecommit-push-handler",
      "branches": [],
      "events": ["all"]
    },
    {
      "name": "main-push-to-sns",
      "destinationArn": "arn:aws:sns:us-east-1:123456789012:codecommit-notifications",
      "branches": ["main"],
      "events": ["all"]
    }
  ]'
```

An empty `branches` array means the trigger fires for all branches.

## Part 2: Notification Rules

Notification rules cover a broader set of events: pull requests created, comments added, approvals given, branches created or deleted.

```bash
# Create a notification rule for pull request events
aws codestar-notifications create-notification-rule \
  --name my-app-pr-notifications \
  --resource "arn:aws:codecommit:us-east-1:123456789012:my-application" \
  --detail-type FULL \
  --event-type-ids \
    "codecommit-repository-pull-request-created" \
    "codecommit-repository-pull-request-status-changed" \
    "codecommit-repository-pull-request-merged" \
    "codecommit-repository-approvals-status-changed" \
    "codecommit-repository-comments-on-pull-requests" \
  --targets '[{
    "TargetType": "SNS",
    "TargetAddress": "arn:aws:sns:us-east-1:123456789012:codecommit-notifications"
  }]'

# Create a notification rule for branch and tag events
aws codestar-notifications create-notification-rule \
  --name my-app-branch-notifications \
  --resource "arn:aws:codecommit:us-east-1:123456789012:my-application" \
  --detail-type FULL \
  --event-type-ids \
    "codecommit-repository-branches-and-tags-created" \
    "codecommit-repository-branches-and-tags-deleted" \
    "codecommit-repository-branches-and-tags-updated" \
  --targets '[{
    "TargetType": "SNS",
    "TargetAddress": "arn:aws:sns:us-east-1:123456789012:codecommit-notifications"
  }]'
```

## Sending Notifications to Slack

Most teams want notifications in Slack, not just email. Here's a Lambda function that formats CodeCommit notifications for Slack.

```python
# slack_notifier.py
import json
import urllib.request
import os

SLACK_WEBHOOK_URL = os.environ['SLACK_WEBHOOK_URL']

def lambda_handler(event, context):
    """Format CodeCommit notifications for Slack."""

    for record in event['Records']:
        message = json.loads(record['Sns']['Message'])

        # Extract relevant details
        detail_type = message.get('detailType', 'Unknown Event')
        detail = message.get('detail', {})
        repo = detail.get('repositoryName', 'unknown')

        # Build the Slack message based on event type
        if 'pull-request' in detail_type.lower():
            title = detail.get('title', 'Untitled PR')
            author = detail.get('authorArn', '').split('/')[-1]
            status = detail.get('pullRequestStatus', 'UNKNOWN')

            slack_message = {
                'text': f"*Pull Request in {repo}*",
                'attachments': [{
                    'color': '#36a64f' if status == 'OPEN' else '#dc3545',
                    'fields': [
                        {'title': 'Title', 'value': title, 'short': True},
                        {'title': 'Author', 'value': author, 'short': True},
                        {'title': 'Status', 'value': status, 'short': True}
                    ]
                }]
            }
        else:
            # Generic notification
            slack_message = {
                'text': f"*CodeCommit Event: {detail_type}*\nRepository: {repo}\n```{json.dumps(detail, indent=2)[:500]}```"
            }

        # Send to Slack
        req = urllib.request.Request(
            SLACK_WEBHOOK_URL,
            data=json.dumps(slack_message).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(req)

    return {'statusCode': 200}
```

Subscribe this Lambda to your SNS topic.

```bash
# Deploy the Slack notifier Lambda
aws lambda create-function \
  --function-name codecommit-slack-notifier \
  --runtime python3.12 \
  --handler slack_notifier.lambda_handler \
  --role arn:aws:iam::123456789012:role/LambdaSNSRole \
  --zip-file fileb://slack_notifier.zip \
  --environment '{"Variables": {"SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"}}'

# Subscribe Lambda to the SNS topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:codecommit-notifications \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:codecommit-slack-notifier
```

## Verifying Triggers

Always test that your triggers are working.

```bash
# Test the triggers configuration
aws codecommit test-repository-triggers \
  --repository-name my-application \
  --triggers '[
    {
      "name": "test-trigger",
      "destinationArn": "arn:aws:sns:us-east-1:123456789012:codecommit-notifications",
      "branches": ["main"],
      "events": ["all"]
    }
  ]'

# List current triggers
aws codecommit get-repository-triggers \
  --repository-name my-application

# List notification rules
aws codestar-notifications list-notification-rules \
  --filters '[{"Name": "RESOURCE", "Value": "arn:aws:codecommit:us-east-1:123456789012:my-application"}]'
```

Getting notifications right is fundamental to a healthy development workflow. Nobody should be surprised by changes to critical branches, and pull requests shouldn't sit unreviewed because nobody knew they existed. For building a complete CI/CD pipeline from these triggers, check out our guide on [creating CodeBuild projects](https://oneuptime.com/blog/post/2026-02-12-create-aws-codebuild-projects/view) that kick off builds automatically from CodeCommit events.
