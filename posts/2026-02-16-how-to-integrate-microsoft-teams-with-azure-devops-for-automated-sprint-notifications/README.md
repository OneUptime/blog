# How to Integrate Microsoft Teams with Azure DevOps for Automated Sprint Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Teams, Azure DevOps, Sprint Notifications, Automation, DevOps, Agile, Webhooks

Description: Integrate Microsoft Teams with Azure DevOps to send automated sprint notifications for stand-ups, burndown updates, and PR reviews.

---

Development teams that use Azure DevOps for sprint management and Microsoft Teams for communication often end up context-switching between the two all day. Someone asks "what is the status of that bug?" in Teams, and someone else opens Azure DevOps to check. Sprint reviews require pulling up boards manually. Pull request notifications get lost in email.

You can close this gap by automating notifications from Azure DevOps to Teams. Sprint status updates, PR reviews, build results, and work item changes can all flow into the right Teams channel automatically. In this guide, I will set up several practical integrations.

## Integration Options

There are three ways to connect Azure DevOps with Teams:

1. **Azure DevOps app for Teams** - The official app that provides basic notifications and commands
2. **Service hooks with incoming webhooks** - Custom notifications triggered by DevOps events
3. **Azure Functions with Logic Apps** - Complex workflows with custom formatting and logic

I will cover all three, starting from the simplest.

## Step 1 - Install the Azure DevOps App for Teams

The official app gives you basic integration without any code.

In Microsoft Teams, go to Apps, search for "Azure DevOps", and install it. Then add it to your development channel.

Once installed, use these commands in the Teams channel:

```
@Azure DevOps subscribe https://dev.azure.com/yourorg/yourproject
```

This subscribes the channel to notifications from that project. You can filter what events to receive:

```
@Azure DevOps subscribe https://dev.azure.com/yourorg/yourproject --area-path "TeamProject\Sprint1"
@Azure DevOps subscribe https://dev.azure.com/yourorg/yourproject --event pullrequest.created
@Azure DevOps subscribe https://dev.azure.com/yourorg/yourproject --event build.complete
```

The app handles common events well, but the formatting is generic and you cannot customize the message content. For tailored notifications, use service hooks.

## Step 2 - Set Up Custom Sprint Notifications with Service Hooks

Service hooks trigger on Azure DevOps events and can post to a Teams incoming webhook. This gives you control over what triggers a notification and what the message looks like.

First, create an incoming webhook in your Teams channel.

1. In Teams, right-click the channel and select "Manage channel"
2. Go to Connectors
3. Find "Incoming Webhook" and click Configure
4. Name it "Sprint Notifications" and save the webhook URL

Now configure Azure DevOps service hooks. Here is how to create one using the Azure DevOps REST API.

```python
import requests
import json

DEVOPS_ORG = "https://dev.azure.com/yourorg"
DEVOPS_PAT = "your-personal-access-token"
TEAMS_WEBHOOK_URL = "https://yourteam.webhook.office.com/webhookb2/..."

def create_work_item_hook():
    """Create a service hook that notifies Teams when work items are updated."""
    url = f"{DEVOPS_ORG}/_apis/hooks/subscriptions?api-version=7.0"

    headers = {
        "Content-Type": "application/json"
    }

    # Basic auth with PAT
    auth = ("", DEVOPS_PAT)

    payload = {
        "publisherId": "tfs",
        "eventType": "workitem.updated",
        "consumerId": "webHooks",
        "consumerActionId": "httpRequest",
        "publisherInputs": {
            "projectId": "your-project-id",
            "areaPath": "",
            "workItemType": "Bug"
        },
        "consumerInputs": {
            "url": TEAMS_WEBHOOK_URL
        }
    }

    response = requests.post(url, headers=headers, auth=auth, json=payload)
    print(f"Hook created: {response.status_code}")

create_work_item_hook()
```

## Step 3 - Build a Daily Sprint Summary Bot

For a truly useful integration, build an Azure Function that generates a daily sprint summary and posts it to Teams every morning. This replaces the manual status checking that happens at the start of every standup.

```python
import azure.functions as func
import json
import requests
import os
from datetime import datetime

app = func.FunctionApp()

DEVOPS_ORG = os.environ["DEVOPS_ORG_URL"]
DEVOPS_PAT = os.environ["DEVOPS_PAT"]
TEAMS_WEBHOOK = os.environ["TEAMS_WEBHOOK_URL"]
PROJECT = os.environ["DEVOPS_PROJECT"]

@app.timer_trigger(schedule="0 0 9 * * 1-5", arg_name="timer")  # 9 AM Mon-Fri
def daily_sprint_summary(timer: func.TimerRequest):
    """Generate and post a daily sprint summary to Teams."""
    # Get the current sprint iteration
    iteration = get_current_iteration()
    if not iteration:
        return

    # Get work items in the current sprint
    work_items = get_sprint_work_items(iteration["path"])

    # Calculate summary metrics
    total = len(work_items)
    done = len([wi for wi in work_items if wi["fields"]["System.State"] == "Done"])
    in_progress = len([wi for wi in work_items if wi["fields"]["System.State"] == "Active"])
    new_items = len([wi for wi in work_items if wi["fields"]["System.State"] == "New"])
    blocked = len([wi for wi in work_items if "Blocked" in wi["fields"].get("System.Tags", "")])

    # Calculate progress percentage
    progress_pct = round((done / total * 100), 1) if total > 0 else 0

    # Build the Teams adaptive card message
    card = {
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
                            "text": f"Sprint Summary - {iteration['name']}",
                            "weight": "Bolder",
                            "size": "Large"
                        },
                        {
                            "type": "TextBlock",
                            "text": f"Date: {datetime.utcnow().strftime('%B %d, %Y')}",
                            "isSubtle": True
                        },
                        {
                            "type": "ColumnSet",
                            "columns": [
                                build_metric_column("Done", done, "Good"),
                                build_metric_column("In Progress", in_progress, "Attention"),
                                build_metric_column("New", new_items, "Default"),
                                build_metric_column("Blocked", blocked, "Warning")
                            ]
                        },
                        {
                            "type": "TextBlock",
                            "text": f"Progress: {progress_pct}% complete ({done}/{total})",
                            "weight": "Bolder"
                        },
                        build_progress_bar(progress_pct)
                    ]
                }
            }
        ]
    }

    # Add blocked items detail if any exist
    if blocked > 0:
        blocked_items = [wi for wi in work_items if "Blocked" in wi["fields"].get("System.Tags", "")]
        blocked_section = {
            "type": "TextBlock",
            "text": "**Blocked Items:**\n" + "\n".join([
                f"- [{wi['fields']['System.Title']}]({DEVOPS_ORG}/{PROJECT}/_workitems/edit/{wi['id']}) "
                f"(Assigned to: {wi['fields'].get('System.AssignedTo', {}).get('displayName', 'Unassigned')})"
                for wi in blocked_items
            ]),
            "wrap": True
        }
        card["attachments"][0]["content"]["body"].append(blocked_section)

    # Post to Teams
    response = requests.post(TEAMS_WEBHOOK, json=card)
    print(f"Sprint summary posted: {response.status_code}")

def get_current_iteration():
    """Get the current sprint iteration from Azure DevOps."""
    url = f"{DEVOPS_ORG}/{PROJECT}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0"
    response = requests.get(url, auth=("", DEVOPS_PAT))
    iterations = response.json().get("value", [])
    return iterations[0] if iterations else None

def get_sprint_work_items(iteration_path: str):
    """Get all work items in the specified sprint."""
    # Use WIQL to query work items in the iteration
    wiql_url = f"{DEVOPS_ORG}/{PROJECT}/_apis/wit/wiql?api-version=7.0"
    query = {
        "query": f"""
            SELECT [System.Id], [System.Title], [System.State],
                   [System.AssignedTo], [System.Tags], [System.WorkItemType]
            FROM WorkItems
            WHERE [System.IterationPath] = '{iteration_path}'
            AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
            ORDER BY [System.State]
        """
    }

    response = requests.post(wiql_url, auth=("", DEVOPS_PAT), json=query)
    item_refs = response.json().get("workItems", [])

    if not item_refs:
        return []

    # Fetch full details for each work item
    ids = ",".join([str(ref["id"]) for ref in item_refs[:200]])
    details_url = f"{DEVOPS_ORG}/{PROJECT}/_apis/wit/workitems?ids={ids}&api-version=7.0"
    details = requests.get(details_url, auth=("", DEVOPS_PAT))

    return details.json().get("value", [])

def build_metric_column(label: str, value: int, style: str) -> dict:
    """Build a column for the metric display."""
    return {
        "type": "Column",
        "width": "stretch",
        "items": [
            {"type": "TextBlock", "text": str(value), "size": "ExtraLarge",
             "weight": "Bolder", "horizontalAlignment": "Center"},
            {"type": "TextBlock", "text": label, "size": "Small",
             "horizontalAlignment": "Center", "isSubtle": True}
        ]
    }

def build_progress_bar(pct: float) -> dict:
    """Build a visual progress indicator."""
    filled = int(pct / 5)  # 20 segments total
    empty = 20 - filled
    bar = "=" * filled + "-" * empty
    return {"type": "TextBlock", "text": f"[{bar}]", "fontType": "Monospace"}
```

## Step 4 - PR Review Notifications

Pull request reviews are time-sensitive. The longer a PR sits without review, the more context the author loses. This function posts PR notifications to the team channel.

```python
@app.function_name("prNotification")
@app.route(route="hooks/pr", methods=["POST"])
def pr_notification(req: func.HttpRequest) -> func.HttpResponse:
    """Handle Azure DevOps PR webhooks and post to Teams."""
    event = req.get_json()
    event_type = event.get("eventType", "")

    if event_type == "git.pullrequest.created":
        pr = event["resource"]
        card = build_pr_card(
            title=f"New PR: {pr['title']}",
            author=pr["createdBy"]["displayName"],
            description=pr.get("description", "No description"),
            url=pr["url"].replace("_apis/git/repositories", "_git").replace("/pullRequests/", "/pullrequest/"),
            reviewers=[r["displayName"] for r in pr.get("reviewers", [])],
            status="New"
        )
        requests.post(TEAMS_WEBHOOK, json=card)

    elif event_type == "git.pullrequest.updated":
        pr = event["resource"]
        if pr.get("status") == "completed":
            # PR was merged
            message = {
                "text": f"PR merged: **{pr['title']}** by {pr['createdBy']['displayName']}"
            }
            requests.post(TEAMS_WEBHOOK, json=message)

    return func.HttpResponse("OK", status_code=200)

def build_pr_card(title, author, description, url, reviewers, status):
    """Build an adaptive card for a PR notification."""
    return {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": [
                    {"type": "TextBlock", "text": title, "weight": "Bolder", "size": "Medium"},
                    {"type": "TextBlock", "text": f"Author: {author}", "isSubtle": True},
                    {"type": "TextBlock", "text": description[:200], "wrap": True},
                    {"type": "TextBlock", "text": f"Reviewers: {', '.join(reviewers) if reviewers else 'None assigned'}"}
                ],
                "actions": [
                    {"type": "Action.OpenUrl", "title": "Review PR", "url": url}
                ]
            }
        }]
    }
```

## Step 5 - Build Failure Alerts

When a build or release fails, the team needs to know immediately. Configure a webhook that posts build results to Teams.

```python
@app.function_name("buildNotification")
@app.route(route="hooks/build", methods=["POST"])
def build_notification(req: func.HttpRequest) -> func.HttpResponse:
    """Post build results to Teams, emphasizing failures."""
    event = req.get_json()
    build = event.get("resource", {})
    result = build.get("result", "unknown")

    # Only post failures and partially succeeded builds
    if result in ["failed", "partiallySucceeded"]:
        emoji = "X" if result == "failed" else "!"
        card = {
            "text": f"**Build {result.upper()}**: {build.get('definition', {}).get('name', 'Unknown')} "
                    f"#{build.get('buildNumber', '')} - "
                    f"Triggered by {build.get('requestedFor', {}).get('displayName', 'Unknown')}"
        }
        requests.post(TEAMS_WEBHOOK, json=card)

    return func.HttpResponse("OK", status_code=200)
```

## Wrapping Up

Connecting Azure DevOps with Teams keeps your development team informed without forcing them to constantly check multiple tools. Start with the official Azure DevOps app for basic notifications. Add service hooks for custom event routing. Build Azure Functions for rich notifications like daily sprint summaries, PR review cards with action buttons, and build failure alerts. The goal is to bring the right information to the right channel at the right time so your team stays aligned without drowning in noise.
