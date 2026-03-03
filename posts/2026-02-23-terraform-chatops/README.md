# How to Use Terraform with ChatOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, ChatOps, Slack, DevOps, Infrastructure as Code, Automation

Description: Learn how to integrate Terraform with ChatOps platforms like Slack and Microsoft Teams to trigger infrastructure changes, review plans, and get deployment notifications directly from chat.

---

ChatOps brings infrastructure operations into the communication tools your team already uses. Instead of switching between Slack, a terminal, and a CI/CD dashboard, engineers can trigger Terraform plans, review changes, and approve applies directly from a chat channel. This approach increases visibility, speeds up collaboration, and creates a natural audit trail of who requested what changes and when.

In this guide, we will build a ChatOps workflow for Terraform that lets teams interact with infrastructure through Slack. You will learn how to trigger plans from chat, post plan summaries for review, handle approvals, and notify channels about completed applies.

## Why ChatOps for Terraform

Traditional Terraform workflows happen in isolation. An engineer runs `terraform plan` on their laptop, reviews the output in their terminal, and applies the changes. Nobody else sees what happened unless they check the CI/CD logs.

With ChatOps, every plan and apply happens in a shared channel. The team sees what changes are proposed, can discuss them in context, and approvals happen right there in the conversation. This is especially valuable for production changes where multiple sets of eyes should review the plan before it is applied.

## Architecture Overview

A typical Terraform ChatOps setup involves three components: a chat platform like Slack, a bot service that handles commands and webhooks, and a CI/CD system that runs Terraform.

```text
User types /terraform plan prod
       |
       v
Slack receives slash command
       |
       v
Bot service processes the command
       |
       v
CI/CD pipeline runs terraform plan
       |
       v
Plan output posted back to Slack
       |
       v
User clicks "Approve" button
       |
       v
CI/CD pipeline runs terraform apply
       |
       v
Apply result posted to Slack
```

## Setting Up the Slack Bot

First, create a Slack app that handles slash commands and interactive messages.

```python
# chatops_bot.py - Terraform ChatOps bot using Flask and Slack SDK

from flask import Flask, request, jsonify
from slack_sdk import WebClient
from slack_sdk.signature import SignatureVerifier
import subprocess
import json
import threading
import os

app = Flask(__name__)
slack_client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])
verifier = SignatureVerifier(signing_secret=os.environ["SLACK_SIGNING_SECRET"])

# Allowed channels for Terraform operations
ALLOWED_CHANNELS = {
    "C0123456789": "infrastructure-ops",
    "C9876543210": "platform-team"
}

# Map environment names to Terraform workspaces
ENVIRONMENTS = {
    "dev": {"workspace": "development", "auto_approve": True},
    "staging": {"workspace": "staging", "auto_approve": True},
    "prod": {"workspace": "production", "auto_approve": False}
}

@app.route("/slack/commands", methods=["POST"])
def handle_slash_command():
    """Handle /terraform slash commands from Slack."""
    # Verify the request came from Slack
    if not verifier.is_valid_request(request.get_data(), request.headers):
        return "Invalid request", 401

    channel_id = request.form["channel_id"]
    user_id = request.form["user_id"]
    text = request.form["text"].strip()

    # Only allow commands from approved channels
    if channel_id not in ALLOWED_CHANNELS:
        return "This command is only available in approved channels."

    # Parse the command
    parts = text.split()
    if len(parts) < 2:
        return "Usage: /terraform <plan|apply|status> <environment>"

    action = parts[0]
    environment = parts[1]

    if environment not in ENVIRONMENTS:
        return f"Unknown environment: {environment}. Available: {', '.join(ENVIRONMENTS.keys())}"

    if action == "plan":
        # Run plan asynchronously
        threading.Thread(
            target=run_terraform_plan,
            args=(channel_id, user_id, environment)
        ).start()
        return f"Running terraform plan for {environment}..."

    elif action == "apply":
        env_config = ENVIRONMENTS[environment]
        if not env_config["auto_approve"]:
            return post_approval_request(channel_id, user_id, environment)
        else:
            threading.Thread(
                target=run_terraform_apply,
                args=(channel_id, user_id, environment)
            ).start()
            return f"Running terraform apply for {environment}..."

    elif action == "status":
        return get_terraform_status(environment)

    return f"Unknown action: {action}"

def run_terraform_plan(channel_id, user_id, environment):
    """Execute terraform plan and post results to Slack."""
    workspace = ENVIRONMENTS[environment]["workspace"]

    result = subprocess.run(
        ["terraform", "plan", "-no-color",
         f"-var-file=environments/{environment}.tfvars"],
        capture_output=True, text=True,
        cwd="/opt/terraform/infrastructure"
    )

    # Summarize the plan output
    output = result.stdout
    summary = extract_plan_summary(output)

    # Post the plan to Slack with approval buttons
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"Terraform Plan - {environment}"}
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"Requested by: <@{user_id}>"}
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"```{summary}```"}
        }
    ]

    # Add approve/reject buttons for production
    if not ENVIRONMENTS[environment]["auto_approve"]:
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Approve Apply"},
                    "style": "primary",
                    "action_id": "approve_apply",
                    "value": json.dumps({
                        "environment": environment,
                        "requester": user_id
                    })
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Reject"},
                    "style": "danger",
                    "action_id": "reject_apply",
                    "value": environment
                }
            ]
        })

    slack_client.chat_postMessage(
        channel=channel_id,
        blocks=blocks,
        text=f"Terraform plan for {environment}"
    )

def extract_plan_summary(plan_output):
    """Extract the summary line from terraform plan output."""
    for line in plan_output.split("\n"):
        if "Plan:" in line or "No changes" in line:
            return line
    return "Plan completed. Check full output for details."
```

## Handling Approvals with Interactive Messages

When someone clicks the Approve button in Slack, the bot receives an interaction payload.

```python
@app.route("/slack/interactions", methods=["POST"])
def handle_interaction():
    """Handle button clicks and other interactive components."""
    payload = json.loads(request.form["payload"])

    if not verifier.is_valid_request(request.get_data(), request.headers):
        return "Invalid request", 401

    action = payload["actions"][0]
    action_id = action["action_id"]
    approver_id = payload["user"]["id"]
    channel_id = payload["channel"]["id"]

    if action_id == "approve_apply":
        data = json.loads(action["value"])
        environment = data["environment"]
        requester = data["requester"]

        # Prevent self-approval for production
        if approver_id == requester and environment == "prod":
            slack_client.chat_postMessage(
                channel=channel_id,
                text="You cannot approve your own production changes."
            )
            return "", 200

        # Notify the channel and run apply
        slack_client.chat_postMessage(
            channel=channel_id,
            text=f"<@{approver_id}> approved the apply for {environment}. Applying now..."
        )

        threading.Thread(
            target=run_terraform_apply,
            args=(channel_id, approver_id, environment)
        ).start()

    elif action_id == "reject_apply":
        environment = action["value"]
        slack_client.chat_postMessage(
            channel=channel_id,
            text=f"<@{approver_id}> rejected the apply for {environment}."
        )

    return "", 200

def run_terraform_apply(channel_id, user_id, environment):
    """Execute terraform apply and post results to Slack."""
    result = subprocess.run(
        ["terraform", "apply", "-auto-approve", "-no-color",
         f"-var-file=environments/{environment}.tfvars"],
        capture_output=True, text=True,
        cwd="/opt/terraform/infrastructure"
    )

    status = "succeeded" if result.returncode == 0 else "failed"
    output = result.stdout if result.returncode == 0 else result.stderr

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"Terraform Apply {status.title()} - {environment}"}
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"Applied by: <@{user_id}>"}
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"```{output[-3000:]}```"}
        }
    ]

    slack_client.chat_postMessage(
        channel=channel_id,
        blocks=blocks,
        text=f"Terraform apply {status} for {environment}"
    )
```

## Managing Slack Resources with Terraform

You can also use Terraform to manage the Slack workspace itself, creating channels and configuring webhooks.

```hcl
# Configure notifications channel using Slack provider
terraform {
  required_providers {
    slack = {
      source  = "pablovarela/slack"
      version = "~> 1.2"
    }
  }
}

provider "slack" {
  token = var.slack_token
}

# Create a dedicated channel for infrastructure notifications
resource "slack_conversation" "infra_notifications" {
  name       = "infra-notifications"
  topic      = "Automated infrastructure change notifications"
  purpose    = "Terraform plan and apply notifications"
  is_private = false
}

# Create a webhook for CI/CD notifications
resource "aws_sns_topic" "terraform_notifications" {
  name = "terraform-notifications"
}

resource "aws_sns_topic_subscription" "slack_webhook" {
  topic_arn = aws_sns_topic.terraform_notifications.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}
```

## CI/CD Integration for ChatOps

Connect your CI/CD pipeline to post Terraform results to Slack automatically.

```yaml
# .github/workflows/terraform-chatops.yml
name: Terraform ChatOps

on:
  issue_comment:
    types: [created]

jobs:
  terraform:
    if: contains(github.event.comment.body, '/terraform')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Parse command
        id: parse
        run: |
          COMMENT="${{ github.event.comment.body }}"
          ACTION=$(echo "$COMMENT" | awk '{print $2}')
          ENV=$(echo "$COMMENT" | awk '{print $3}')
          echo "action=$ACTION" >> $GITHUB_OUTPUT
          echo "environment=$ENV" >> $GITHUB_OUTPUT

      - name: Terraform Plan
        if: steps.parse.outputs.action == 'plan'
        run: |
          terraform init
          terraform plan -no-color > plan_output.txt 2>&1

      - name: Post plan to Slack
        run: |
          PLAN=$(cat plan_output.txt | tail -20)
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"Terraform Plan for ${{ steps.parse.outputs.environment }}:\n\`\`\`${PLAN}\`\`\`\"}"
```

## Best Practices

Restrict ChatOps commands to specific channels. Do not allow Terraform operations from any channel. Designate an infrastructure operations channel and verify the channel ID in your bot.

Require different approvers for production. The person who requests a production change should not be the one who approves it. Implement this check in your bot logic.

Rate-limit commands. Prevent accidental flooding by limiting how often Terraform commands can be run from chat.

Log everything. Store all ChatOps interactions in an audit log separate from Slack. Slack message retention policies might delete old messages, but your audit log should persist.

For more on CI/CD Terraform workflows, see our guide on [Terraform Pipeline with GitHub Actions](https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view).

## Conclusion

ChatOps transforms Terraform from a solo activity into a team sport. By bringing plans, approvals, and applies into shared channels, you increase visibility, improve collaboration, and create a natural audit trail. The combination of slash commands for triggering actions, interactive messages for approvals, and automated notifications for results creates a complete workflow that keeps the entire team informed about infrastructure changes.
