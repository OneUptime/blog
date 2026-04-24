# How to Set Up Watchtower Notifications with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Notification, Slack, Email

Description: Learn how to configure Watchtower to send notifications when containers are updated, including Slack, email, Microsoft Teams, and generic webhook integrations for Portainer-managed environments.

## Introduction

Watchtower notifications keep your team informed when containers are automatically updated. Without notifications, auto-updates happen silently - you won't know when a new image was deployed or if an update caused issues. This guide covers configuring Watchtower notifications for common platforms when running as a Portainer stack.

## Prerequisites

- Watchtower deployed as a Portainer stack
- Access to your notification platform (Slack, email server, Teams, etc.)
- Webhook URLs or SMTP credentials ready

## Step 1: Slack Notifications

```yaml
# Portainer stack - Watchtower with Slack notifications

services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_POLL_INTERVAL: "86400"
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_NOTIFICATION_REPORT: "true"

      # Slack configuration
      WATCHTOWER_NOTIFICATIONS: "slack"
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: "${SLACK_WEBHOOK_URL}"
      WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER: "Watchtower@production-server"
      WATCHTOWER_NOTIFICATION_SLACK_CHANNEL: "#container-updates"
      WATCHTOWER_NOTIFICATION_SLACK_ICON_EMOJI: ":whale:"

      # Filter notifications by severity
      WATCHTOWER_NOTIFICATIONS_LEVEL: "info"    # panic, fatal, error, warn, info, debug, trace
```

Set the Portainer environment variable `SLACK_WEBHOOK_URL` to your Slack incoming webhook URL.

## Step 2: Email Notifications

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      WATCHTOWER_POLL_INTERVAL: "86400"
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_NOTIFICATION_REPORT: "true"

      # Email (SMTP) configuration
      WATCHTOWER_NOTIFICATIONS: "email"
      WATCHTOWER_NOTIFICATION_EMAIL_FROM: "watchtower@example.com"
      WATCHTOWER_NOTIFICATION_EMAIL_TO: "devops@example.com"
      WATCHTOWER_NOTIFICATION_EMAIL_SERVER: "smtp.gmail.com"
      WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PORT: "587"
      WATCHTOWER_NOTIFICATION_EMAIL_SERVER_USER: "watchtower@gmail.com"
      WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PASSWORD: "${SMTP_PASSWORD}"
      WATCHTOWER_NOTIFICATION_EMAIL_SUBJECTTAG: "[production]"    # Prefix for subject line
      WATCHTOWER_NOTIFICATION_EMAIL_DELAY: "2"    # Seconds between checks before sending email
```

## Step 3: Microsoft Teams Notifications

```yaml
services:
  watchtower:
    environment:
      WATCHTOWER_NOTIFICATION_REPORT: "true"
      WATCHTOWER_NOTIFICATIONS: "msteams"
      WATCHTOWER_NOTIFICATION_MSTEAMS_HOOK_URL: "${TEAMS_WEBHOOK_URL}"
      WATCHTOWER_NOTIFICATION_MSTEAMS_USE_LOG_DATA: "true"    # Include log details in message
```

Create the Teams webhook:
1. In Teams, open the channel and select **...**
2. Select **Manage channel** → **Edit**
3. Search for **Incoming Webhook**, select **Add**, then copy the webhook URL

## Step 4: Generic Webhook (for Custom Integrations)

Send notifications to any HTTP endpoint:

```yaml
services:
  watchtower:
    environment:
      WATCHTOWER_NOTIFICATION_REPORT: "true"
      # Generic webhook via shoutrrr:
      WATCHTOWER_NOTIFICATION_URL: "generic://webhook.example.com/watchtower?template=json&@Authorization=Bearer+TOKEN"
```

## Step 5: Shoutrrr URL Format (Multi-Provider)

Watchtower uses the Shoutrrr library for notifications, supporting a URL-based format:

```yaml
services:
  watchtower:
    environment:
      # Multiple notification channels using WATCHTOWER_NOTIFICATION_URL
      WATCHTOWER_NOTIFICATION_URL: >
        slack://hook:WEBHOOK_TOKEN@webhook?botname=Watchtower
        discord://TOKEN@CHANNELID

      # For multiple notifications, space-separate the URLs
```

```bash
# Shoutrrr URL examples:
# Slack:     slack://hook:WEBHOOK_TOKEN@webhook
# Discord:   discord://TOKEN@CHANNELID
# Telegram:  telegram://TOKEN@telegram?chats=CHATID
# Email:     smtp://USER:PASS@HOST:PORT/?from=FROM&to=TO
# Gotify:    gotify://HOSTNAME/TOKEN
# Pushover:  pushover://shoutrrr:APITOKEN@USERKEY/?devices=DEVICE
```

## Step 6: Notification Level Control

Control the verbosity of notifications:

```yaml
services:
  watchtower:
    environment:
      # Send verbose notifications, including debug entries
      WATCHTOWER_NOTIFICATIONS_LEVEL: "debug"

      # Default: send info, warning, and error notifications
      WATCHTOWER_NOTIFICATIONS_LEVEL: "info"

      # Only notify on warnings and errors (warn)
      WATCHTOWER_NOTIFICATIONS_LEVEL: "warn"

      # Use the session report for update/failure summaries
      WATCHTOWER_NOTIFICATION_REPORT: "true"
```

## Step 7: Test Notifications Before Deployment

```bash
# Test that notifications work by running Watchtower once with --debug
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WATCHTOWER_NOTIFICATIONS=slack \
  -e WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK" \
  -e WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER="Test" \
  -e WATCHTOWER_NOTIFICATIONS_LEVEL=debug \
  containrrr/watchtower \
  --run-once \
  --debug

# You should receive a startup/debug notification in Slack immediately
```

## Step 8: Sample Notification Message

A typical Watchtower session report notification looks like:

```text
2 Scanned, 2 Updated, 0 Failed
- nginx (containrrr/nginx:alpine): abc123def456 updated to fedcba654321
- myapp (mycompany/myapp:v1.2.3): 123abc456def updated to 456def123abc
```

## Conclusion

Watchtower notifications are essential visibility into your automated update process. Configure Slack or Teams webhooks for real-time team awareness when containers get updated, and use email for formal audit trails. Set `WATCHTOWER_NOTIFICATION_REPORT=true` if you want concise update/failure summaries instead of a message for every poll cycle, and keep `WATCHTOWER_NOTIFICATIONS_LEVEL=info` as a sensible default severity threshold. Store sensitive credentials like SMTP passwords and webhook tokens as Portainer environment variables rather than hardcoding them in the stack definition.
