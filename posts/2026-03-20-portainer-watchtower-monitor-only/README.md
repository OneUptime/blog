# How to Use Watchtower Monitor-Only Mode with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Monitor, Notification, Update

Description: Learn how to run Watchtower in monitor-only mode alongside Portainer to receive update notifications without automatic container restarts, giving you visibility into available updates while...

## Introduction

Watchtower's monitor-only mode checks for new container image versions and sends notifications, but does not automatically replace or restart containers. Watchtower can still pull updated images to compare digests, even in monitor-only mode. This provides the visibility benefits of Watchtower - knowing when updates are available - without the risk of unexpected container restarts in production. This guide covers deploying and using Watchtower in monitor-only mode.

## Prerequisites

- Portainer deployed for container management
- At least one notification channel configured (Slack, email, etc.)
- Docker socket accessible to Watchtower

## Step 1: Deploy Watchtower in Monitor-Only Mode

```yaml
# Portainer stack - monitor-only Watchtower

services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower-monitor
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Core: enable monitor-only mode
      WATCHTOWER_MONITOR_ONLY: "true"         # Check for updates but DO NOT apply them

      # Poll every 6 hours for update availability
      WATCHTOWER_POLL_INTERVAL: "21600"

      # Notifications (recommended to get value from monitor-only mode)
      WATCHTOWER_NOTIFICATIONS: "slack"
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: "${SLACK_WEBHOOK_URL}"
      WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER: "Update Monitor@production"
      WATCHTOWER_NOTIFICATION_SLACK_CHANNEL: "#update-alerts"

      # Report level: info shows updates when found
      WATCHTOWER_NOTIFICATIONS_LEVEL: "info"
```

## Step 2: Per-Container Monitor-Only Overrides

Even with Watchtower set to auto-update globally, mark individual containers as monitor-only:

```yaml
# Portainer application stack
services:
  # This container: auto-update (default behavior)
  nginx:
    image: nginx:alpine
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  # This container: monitor only (override global setting)
  postgres:
    image: postgres:15-alpine
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.monitor-only=true"    # Watch but don't update
```

## Step 3: Monitor-Only with Manual Update Workflow

Monitor-only mode pairs well with a manual update workflow via Portainer:

```bash
#!/bin/bash
# review-and-update.sh - Pull the latest image, then redeploy the stack manually

CONTAINER_NAME="${1:?Usage: review-and-update.sh <container-name>}"

# 1. Get the current image reference
IMAGE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_NAME")"

# 2. Pull the latest image for that tag
docker pull "$IMAGE"

# 3. Redeploy the stack manually so Docker recreates the container
echo "Pulled latest image for $CONTAINER_NAME: $IMAGE"
echo "Next step: redeploy the stack in Portainer."
```

In Portainer, the manual update workflow is:
1. **Stacks** → select the stack with outdated containers
2. If the stack was deployed from Git, click **Pull and redeploy**
3. If the stack was deployed from the Web Editor, edit the stack, change the image tag, and click **Update the stack**

## Step 4: Monitor Specific Containers Only

Watch a subset of containers while ignoring others:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      WATCHTOWER_MONITOR_ONLY: "true"
      WATCHTOWER_POLL_INTERVAL: "21600"
      WATCHTOWER_NOTIFICATIONS: "slack"
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: "${SLACK_WEBHOOK_URL}"
    # Specify container names to monitor (positional arguments)
    # Monitors ONLY these containers:
    command: >
      --monitor-only
      --interval 21600
      nginx
      myapp-api
      myapp-frontend
```

## Step 5: Graduated Update Strategy

Use monitor-only on production, auto-update on staging:

```yaml
# Production server: monitor only
services:
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      WATCHTOWER_MONITOR_ONLY: "true"            # Production: notify only
      WATCHTOWER_NOTIFICATIONS: "slack"
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: "${SLACK_WEBHOOK_URL}"
      WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER: "PRODUCTION Monitor"
```

```yaml
# Staging server: auto-update to validate new images
services:
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      WATCHTOWER_MONITOR_ONLY: "false"           # Staging: auto-update
      WATCHTOWER_POLL_INTERVAL: "3600"           # Check hourly on staging
      WATCHTOWER_NOTIFICATIONS: "slack"
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: "${SLACK_WEBHOOK_URL}"
      WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER: "STAGING Auto-Updater"
```

## Step 6: Combine with Portainer Webhooks for Semi-Automation

Use monitor-only notification to trigger a human-approved deployment:

```bash
# When Watchtower notifies about an update via Slack:
# 1. Team reviews the update (release notes, security advisories)
# 2. Approved team member triggers Portainer webhook manually

# Portainer stack webhook for manual trigger (Business Edition only):
curl -X POST "https://portainer.example.com:9443/api/stacks/webhooks/YOUR-WEBHOOK-UUID"

# Or via Portainer API with auth for a Git-based stack:
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/stacks/1/git/redeploy?endpointId=1" \
  -d '{"RepullImageAndRedeploy": true}'
```

## Step 7: Check Watchtower Monitor Logs

```bash
# View monitor activity
docker logs watchtower-monitor --follow

# See common update-related messages
docker logs watchtower-monitor 2>&1 | grep -i "session done\|pull\|update\|monitor"

# Sample output can vary by Watchtower version and log level:
# DEBU Checking containers for updated images
# DEBU Digests did not match, doing a pull.
# INFO Session done                              Failed=0 Scanned=8 Updated=2
# (No restarts because monitor-only is enabled)
```

## Conclusion

Monitor-only mode gives you the update visibility of Watchtower without the operational risk of automatic container restarts in production. Pair it with Slack notifications so your team sees update alerts in real time, and use Portainer's stack management to apply updates manually after reviewing release notes. For a graduated approach, run auto-update on staging and monitor-only on production - if an image update works smoothly on staging, you have higher confidence when applying it to production through Portainer.
