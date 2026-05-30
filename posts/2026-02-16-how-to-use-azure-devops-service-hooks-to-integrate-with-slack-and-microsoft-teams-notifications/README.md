# How to Use Azure DevOps Service Hooks to Integrate with Slack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, Service Hooks, Slack, Microsoft Teams, Notification, Integration, DevOps

Description: Step-by-step guide to configuring Azure DevOps service hooks for sending build, release, and work item notifications to Slack and Microsoft Teams.

---

Development teams live in their chat tools. Slack, Microsoft Teams - that is where conversations happen, decisions get made, and context gets shared. When something important happens in Azure DevOps - a build fails, a deployment completes, a pull request needs review - the team should hear about it where they already are, not in a separate tool they check occasionally.

Azure DevOps service hooks let you push notifications from Azure DevOps events directly to Slack and Microsoft Teams. No more switching between tabs to check build status. No more missing failed deployments because nobody looked at the pipeline. In this post, I will walk through setting up service hooks for both Slack and Teams, configuring the right events, and keeping the noise level manageable.

## What Are Service Hooks?

Service hooks are event-driven integrations in Azure DevOps. When a specific event occurs (build completes, work item changes, code is pushed), Azure DevOps sends a notification to an external service. The notification can be a webhook call, a Slack message, a Teams card, or an integration with services like Trello, Zendesk, and others.

The key events you can subscribe to include:

- **Build**: completed, failed, queued
- **Release**: deployment started, deployment completed, deployment approval pending
- **Code**: push, pull request created, pull request merged, pull request commented
- **Work items**: created, updated, deleted, commented
- **Pipelines**: run state changed, stage state changed

## Setting Up Slack Notifications

### Method 1: Using the Azure DevOps Slack Apps

The simplest approach is the official Azure DevOps apps for Slack. Azure Pipelines, Azure Repos, and Azure Boards each have their own Slack app and slash commands:

1. In Slack, go to the App Directory and search for "Azure Pipelines", "Azure Repos", or "Azure Boards"
2. Click "Add to Slack" and authorize the app
3. In any Slack channel, type the app's subscribe command followed by the repository, pipeline, or project URL
4. The app will prompt you to sign in to your Azure DevOps account

Once connected, you can subscribe to specific events:

```text
/azrepos subscribe https://dev.azure.com/myorg/myproject/_git/my-repo
/azpipelines subscribe https://dev.azure.com/myorg/myproject/_build?definitionId=42
/azboards link https://dev.azure.com/myorg/myproject
```

The app provides default subscriptions for common events, but you can customize them:

```text
# List current subscriptions

/azpipelines subscriptions

# Subscribe to specific events
/azpipelines subscribe https://dev.azure.com/myorg/myproject/_build?definitionId=42
/azrepos subscribe https://dev.azure.com/myorg/myproject/_git/my-repo

# Remove or edit noisy subscriptions from the subscriptions list
/azpipelines subscriptions
```

### Method 2: Using Incoming Webhooks

For more control over message formatting, use Slack incoming webhooks with Azure DevOps service hooks:

1. In Slack, create an incoming webhook for your channel (go to your Slack app settings, then Incoming Webhooks)
2. Copy the webhook URL

Then in Azure DevOps:

1. Go to Project Settings and then Service hooks
2. Click "Create subscription"
3. Select "Slack" as the service
4. Choose the event trigger (e.g., "Build completed")
5. Configure any filters (e.g., only for a specific build definition)
6. Paste your Slack webhook URL
7. Click "Test" to verify, then "Finish"

Here is what the service hook configuration looks like for a build completion event:

```text
Service: Slack
Event: Build completed
Filter:
  - Build pipeline: my-web-app-ci
  - Build status: Failed (only notify on failures)
Action: Post a message to Slack
  - Webhook URL: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## Setting Up Microsoft Teams Notifications

### Method 1: Using the Azure DevOps Teams Apps

Similar to Slack, there are official Azure DevOps apps for Microsoft Teams. Azure Pipelines, Azure Repos, and Azure Boards each have their own Teams app and bot commands:

1. In Teams, click on the Apps icon in the left sidebar
2. Search for "Azure Pipelines", "Azure Repos", or "Azure Boards" and click "Add"
3. Add the app to your desired team and channel
4. In the channel, type the app's subscribe command followed by the project, repository, or pipeline URL

```text
@azure pipelines subscribe https://dev.azure.com/myorg/myproject/_build?definitionId=42
@azure repos subscribe https://dev.azure.com/myorg/myproject/_git/my-repo
@azure boards link https://dev.azure.com/myorg/myproject
```

You can manage subscriptions with:

```text
@azure pipelines subscriptions
@azure repos subscriptions
@azure boards subscriptions
```

### Method 2: Using Incoming Webhooks (Workflows)

For customized notifications, use Teams incoming webhooks via Power Automate workflows. Microsoft is retiring Office 365 connectors, so the current replacement is a workflow that starts with the "When a Teams webhook request is received" trigger:

1. In Teams, open Workflows and create a workflow from the webhook trigger
2. Choose the team and channel where the workflow should post
3. Copy the webhook URL

Then configure the service hook in Azure DevOps to call a small router such as an Azure Function or Power Automate flow that transforms the Azure DevOps payload into the Teams message format:

1. Go to Project Settings, then Service hooks
2. Click "Create subscription"
3. Select "Web Hooks" as the service
4. Choose the event trigger
5. Set the URL to your router endpoint
6. Choose JSON as the format

You will need to format the message as an Adaptive Card for it to render nicely in Teams. Here is an example of the payload your router might send to the Teams workflow webhook:

```json
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
          {
            "type": "TextBlock",
            "text": "Build Failed: my-web-app-ci #456",
            "weight": "Bolder",
            "size": "Medium",
            "color": "Attention"
          },
          {
            "type": "FactSet",
            "facts": [
              {"title": "Pipeline", "value": "my-web-app-ci"},
              {"title": "Branch", "value": "feature/new-login"},
              {"title": "Triggered by", "value": "Jane Developer"},
              {"title": "Duration", "value": "3m 42s"}
            ]
          }
        ],
        "actions": [
          {
            "type": "Action.OpenUrl",
            "title": "View Build",
            "url": "https://dev.azure.com/myorg/myproject/_build/results?buildId=456"
          }
        ]
      }
    }
  ]
}
```

## Configuring the Right Events

The biggest mistake teams make with notifications is subscribing to everything. That leads to notification fatigue, and people start ignoring the channel entirely. Here is what I recommend:

### For a Development Channel

Subscribe to:
- Build failures (not successes - nobody needs to know things worked as expected)
- Pull request created (so reviewers know there is something to look at)
- Pull request merge conflicts
- Deployment failures

Skip:
- Build succeeded (too noisy)
- Work item updates (too noisy)
- Every code push (way too noisy)

### For a Release/Ops Channel

Subscribe to:
- Deployment started (for awareness)
- Deployment completed (success and failure)
- Deployment approval pending (action needed)
- Release created

### For a Project Management Channel

Subscribe to:
- Work item state changes (only for specific states like "Done" or "Blocked")
- Sprint start/end

## Filtering Events to Reduce Noise

Service hooks support filters to narrow down which events trigger notifications. Use them aggressively:

```text
Event: Build completed
Filters:
  Build definition: my-critical-pipeline  (not all pipelines)
  Build status: Failed                     (not succeeded)
  Branch: refs/heads/main                  (not feature branches)
```

For work item events:

```text
Event: Work item updated
Filters:
  Area path: MyProject\Backend            (only backend team items)
  Work item type: Bug                      (only bugs, not tasks)
  Changed fields: System.State            (only state changes)
```

## Using Azure Functions as a Notification Router

For sophisticated routing logic, put an Azure Function between Azure DevOps and your chat tools. The function can:

- Route different events to different channels
- Format messages with rich context
- Suppress duplicate notifications
- Add custom logic (e.g., only notify during business hours)

```python
import azure.functions as func
import json
import requests

# Webhook URLs for different channels
CHANNELS = {
    "build-failures": "https://hooks.slack.com/services/xxx/build-channel",
    "deployments": "https://hooks.slack.com/services/xxx/deploy-channel",
    "pull-requests": "https://hooks.slack.com/services/xxx/pr-channel",
}

def main(req: func.HttpRequest) -> func.HttpResponse:
    """Route Azure DevOps events to the appropriate Slack channel."""
    payload = req.get_json()
    event_type = payload.get("eventType", "")

    # Determine the target channel based on event type
    if "build.complete" in event_type:
        result = payload["resource"].get("result")
        if result == "failed":
            channel = CHANNELS["build-failures"]
            message = format_build_failure(payload)
        else:
            return func.HttpResponse("Skipping successful build", status_code=200)

    elif "release.deployment" in event_type:
        channel = CHANNELS["deployments"]
        message = format_deployment(payload)

    elif "git.pullrequest" in event_type:
        channel = CHANNELS["pull-requests"]
        message = format_pull_request(payload)

    else:
        return func.HttpResponse("Unknown event type", status_code=200)

    # Send to Slack
    requests.post(channel, json=message)
    return func.HttpResponse("Notification sent", status_code=200)


def format_build_failure(payload):
    """Format a build failure notification for Slack."""
    resource = payload["resource"]
    return {
        "text": f"Build Failed: {resource['definition']['name']} #{resource['buildNumber']}",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Build Failed:* {resource['definition']['name']} #{resource['buildNumber']}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Branch:*\n{resource.get('sourceBranch', 'N/A')}"},
                    {"type": "mrkdwn", "text": f"*Requested by:*\n{resource.get('requestedFor', {}).get('displayName', 'N/A')}"}
                ]
            },
            {
                "type": "actions",
                "elements": [{
                    "type": "button",
                    "text": {"type": "plain_text", "text": "View Build"},
                    "url": resource["_links"]["web"]["href"]
                }]
            }
        ]
    }


def format_deployment(payload):
    """Format a release deployment notification for Slack."""
    resource = payload["resource"]
    deployment = resource.get("deployment", {})
    release = resource.get("release", {})
    return {
        "text": f"Deployment update: {release.get('name', 'release')}",
        "blocks": [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Deployment update:* {release.get('name', 'release')} - {deployment.get('deploymentStatus', 'unknown')}"
            }
        }]
    }


def format_pull_request(payload):
    """Format a pull request notification for Slack."""
    resource = payload["resource"]
    return {
        "text": f"Pull request update: {resource.get('title', 'pull request')}",
        "blocks": [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Pull request update:* {resource.get('title', 'pull request')}"
            }
        }]
    }
```

## Managing Service Hooks at Scale

If you have many projects, managing service hooks manually becomes tedious. Use the REST API to automate it:

```bash
# List all service hooks in a project
curl -s \
  -H "Authorization: Basic $(echo -n :$PAT | base64)" \
  "https://dev.azure.com/myorg/_apis/hooks/subscriptions?api-version=7.1" \
  | jq '.value[] | {id: .id, eventType: .eventType, consumerActionId: .consumerActionId}'

# Create a service hook subscription programmatically
curl -s -X POST \
  -H "Authorization: Basic $(echo -n :$PAT | base64)" \
  -H "Content-Type: application/json" \
  "https://dev.azure.com/myorg/_apis/hooks/subscriptions?api-version=7.1" \
  -d '{
    "publisherId": "tfs",
    "eventType": "build.complete",
    "resourceVersion": "1.0",
    "consumerId": "slack",
    "consumerActionId": "postMessageToChannel",
    "publisherInputs": {
      "buildStatus": "failed",
      "projectId": "YOUR_PROJECT_ID"
    },
    "consumerInputs": {
      "url": "https://hooks.slack.com/services/xxx/xxx/xxx"
    }
  }'
```

## Wrapping Up

Service hooks bring Azure DevOps events to where your team is already paying attention. The key is being selective about what you notify on. Subscribe to events that require action (build failures, approval requests, PR reviews) and skip the informational noise. Use filters to narrow events to the right scope, and consider an Azure Function router for complex notification logic. When done right, your team gets timely, relevant updates without the fatigue that comes from an overly chatty integration.
