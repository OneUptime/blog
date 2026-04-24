# How to Deploy Watchtower Alongside Portainer - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Auto-Update, Docker, Automation

Description: Learn how to deploy Watchtower as a Portainer stack for automatic container image updates, with configuration for update schedules, notifications, and safe rollout practices.

## Introduction

Watchtower monitors running Docker containers and automatically pulls new images and restarts containers when updates are detected. Deploying Watchtower as a Portainer stack gives you automated container updates with lifecycle management through Portainer's interface. This guide covers deploying Watchtower with appropriate configuration for production use.

## Prerequisites

- Portainer CE or BE running
- Docker Compose stacks running on the same host
- Understanding that Watchtower will restart containers during updates

## Step 1: Create the Watchtower Stack in Portainer

Navigate to **Stacks** → **Add Stack** in Portainer.

Name: `watchtower`

**Basic configuration (poll every 24 hours):**

```yaml
version: "3.8"

services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock    # Required to manage containers
    environment:
      # Poll interval in seconds (86400 = 24 hours)
      WATCHTOWER_POLL_INTERVAL: "86400"

      # Clean up old images after update
      WATCHTOWER_CLEANUP: "true"

      # Rolling restart disabled; updated containers restart together
      WATCHTOWER_ROLLING_RESTART: "false"

      # Log level
      WATCHTOWER_LOG_LEVEL: "info"

      # Timezone for logs and schedule expressions
      TZ: "UTC"
```

## Step 2: Schedule-Based Updates with Cron

Use a cron expression for precise scheduling (e.g., update at 3 AM Sunday):

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Cron schedule: At 03:00 on Sunday
      WATCHTOWER_SCHEDULE: "0 0 3 * * 0"    # seconds minutes hours dom month dow
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_INCLUDE_STOPPED: "false"    # Only update running containers
      WATCHTOWER_REVIVE_STOPPED: "false"     # Don't restart stopped containers
      TZ: "America/New_York"
```

## Step 3: Monitor-Only Mode (Safer for Production)

Run Watchtower in monitor mode first to see what would be updated:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_POLL_INTERVAL: "3600"    # Check hourly
      WATCHTOWER_MONITOR_ONLY: "true"     # Report updates but don't apply them
      WATCHTOWER_NOTIFICATIONS: "slack"
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: "${SLACK_WEBHOOK_URL}"
```

In monitor mode, Watchtower sends notifications about available updates without restarting containers - useful for evaluating the impact before enabling auto-updates.

## Step 4: Configure Private Registry Authentication

For containers from private registries, Watchtower needs Docker credentials:

```bash
# On the Docker host, authenticate to your private registry

printf '%s' 'password' | docker login registry.example.com --username username --password-stdin

# This creates/updates ~/.docker/config.json
```

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - <PATH_TO_HOME_DIR>/.docker/config.json:/config.json:ro    # Mount Docker credentials
```

## Step 5: Protect Portainer from Auto-Updates

You typically don't want Watchtower to update Portainer itself while you're using it:

```bash
# Add this label to your Portainer container to exclude it
# Either recreate the container with the label or add it to docker-compose:

# Recreate Portainer with the exclusion label, reusing the same image, tag, and other options you already run
docker stop portainer
docker rm portainer
docker run -d \
  --name portainer \
  --label "com.centurylinklabs.watchtower.enable=false" \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  <your-portainer-image>:<your-current-tag>
```

Or in a Portainer stack:
```yaml
services:
  portainer:
    labels:
      - "com.centurylinklabs.watchtower.enable=false"    # Exclude this service
```

## Step 6: Update Notifications Setup

```yaml
services:
  watchtower:
    environment:
      # Slack notifications
      WATCHTOWER_NOTIFICATIONS: "slack"
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: "https://hooks.slack.com/services/YOUR/HOOK/URL"
      WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER: "Watchtower on server1"
      WATCHTOWER_NOTIFICATION_SLACK_CHANNEL: "#deployments"

      # Email notifications
      # WATCHTOWER_NOTIFICATIONS: "email"
      # WATCHTOWER_NOTIFICATION_EMAIL_FROM: "watchtower@example.com"
      # WATCHTOWER_NOTIFICATION_EMAIL_TO: "admin@example.com"
      # WATCHTOWER_NOTIFICATION_EMAIL_SERVER: "smtp.gmail.com"
      # WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PORT: "587"
      # WATCHTOWER_NOTIFICATION_EMAIL_SERVER_USER: "smtp-user"
      # WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PASSWORD: "${SMTP_PASSWORD}"
```

## Step 7: Trigger Immediate Update Check

```bash
# Run Watchtower once immediately (without the daemon)
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --run-once \
  nginx    # Specific container name, or omit for all

# Or trigger the running Watchtower daemon via HTTP API
# Requires Watchtower to be started with --http-api-update, WATCHTOWER_HTTP_API_TOKEN, and port 8080 published
# Add --http-api-periodic-polls if you also want scheduled/interval checks to continue
curl http://localhost:8080/v1/update \
  -H "Authorization: Bearer mytoken"
```

## Conclusion

Deploying Watchtower as a Portainer stack gives you automated container image updates managed through a consistent interface. Start with monitor-only mode to evaluate what Watchtower would update before enabling automatic updates. Always exclude critical services like Portainer itself using the `com.centurylinklabs.watchtower.enable=false` label, set up notifications so your team knows when containers are updated, and prefer scheduled updates during maintenance windows to avoid disruptions during business hours.
