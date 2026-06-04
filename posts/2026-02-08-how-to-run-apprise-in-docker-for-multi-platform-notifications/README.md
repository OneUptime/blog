# How to Run Apprise in Docker for Multi-Platform Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Apprise, Notification, Multi-Platform, Slack, Email, Docker Compose, Alerting

Description: Deploy Apprise in Docker to send notifications to Slack, Discord, Telegram, email, and 80+ other services from a single API.

---

Sending notifications to multiple platforms usually means juggling different APIs, authentication methods, and payload formats. Apprise solves this by providing a single, unified API that can deliver messages to over 80 different notification services. Slack, Discord, Telegram, email, Pushover, Microsoft Power Automate / Workflows, Gotify, ntfy, and dozens more, all through one interface.

Running Apprise as a Docker container gives you a REST API endpoint that any script or application can call. Instead of hardcoding notification logic for each platform, you configure your notification targets once and send messages to all of them with a single HTTP request.

## What Apprise Supports

The list of supported services is extensive. Here are some of the most commonly used ones:

- Chat platforms: Slack, Discord, Microsoft Power Automate / Workflows, Mattermost, Rocket.Chat
- Messaging apps: Telegram, Signal, WhatsApp (via Twilio)
- Push notifications: Pushover, Pushbullet, Gotify, ntfy
- Email: SMTP, Gmail, SendGrid, Mailgun
- Incident management: PagerDuty, Opsgenie
- SMS: Twilio, Vonage
- Webhooks: Generic JSON and XML webhooks

## Prerequisites

Docker and Docker Compose installed on your server. Apprise is lightweight and uses minimal resources.

```bash
# Verify Docker installation

docker --version
docker compose version
```

## Quick Start

Get Apprise running with the API server in one command.

```bash
# Run the Apprise API server
docker run -d \
  --name apprise \
  -p 8000:8000 \
  -v apprise-config:/config \
  -e APPRISE_STATEFUL_MODE=simple \
  -e APPRISE_WORKER_COUNT=1 \
  -e APPRISE_ADMIN=y \
  caronc/apprise:latest
```

Send a test notification.

```bash
# Send a notification to a Slack webhook URL
curl -X POST http://localhost:8000/notify/ \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["slack://tokenA/tokenB/tokenC"],
    "title": "Test Notification",
    "body": "Apprise is working!"
  }'
```

## Production Setup with Docker Compose

For a proper deployment, use Docker Compose with persistent configuration.

```yaml
# docker-compose.yml - Apprise notification gateway
version: "3.8"

services:
  apprise:
    image: caronc/apprise:latest
    container_name: apprise
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      # Persist saved notification configurations
      - apprise-config:/config
    environment:
      # Store configurations as human-readable files under /config
      APPRISE_STATEFUL_MODE: simple
      # Use a single worker for low-resource deployments
      APPRISE_WORKER_COUNT: "1"
      # Enable listing saved keys in the web UI
      APPRISE_ADMIN: "y"
      # Keep the configuration API writable
      APPRISE_CONFIG_LOCK: "no"
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8000/status >/dev/null || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

volumes:
  apprise-config:
```

```bash
# Start Apprise
docker compose up -d
```

## Configuring Notification Targets

Apprise uses URL-based configuration. Each notification service is represented by a URL with a specific schema. You can store these URLs as named configurations using the API.

```bash
# Save a configuration with multiple notification targets
curl -X POST http://localhost:8000/add/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "slack://tokenA/tokenB/tokenC",
      "discord://webhook_id/webhook_token",
      "tgram://123456789:ABCdefGHIjklMNOpqrstUVWxyz/987654321",
      "mailto://user:password@gmail.com?to=admin@example.com"
    ]
  }'
```

Now you can send notifications to all configured targets by referencing the tag name.

```bash
# Send to all targets in the "alerts" configuration
curl -X POST http://localhost:8000/notify/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Server Alert",
    "body": "Disk usage exceeded 90% on web-server-01",
    "type": "warning"
  }'
```

## Apprise URL Formats

Each service has its own URL format. Here are the most commonly used ones.

```bash
# Slack - using incoming webhook
# Format: slack://tokenA/tokenB/tokenC
slack://T024GQEEF/B0ABCDEF/abcdefghijklmnop

# Discord - using webhook URL
# Format: discord://webhook_id/webhook_token
discord://123456789012345678/abcdefghijklmnopqrstuvwxyz

# Telegram - using bot token and chat ID
# Format: tgram://bot_token/chat_id
tgram://123456789:ABCdefGHIjklMNOpqrstUVWxyz/987654321

# Email via SMTP
# Format: mailto://user:password@smtp-server?to=recipient
mailto://sender:app-password@smtp.gmail.com?to=admin@example.com

# Pushover
# Format: pover://user_key@api_token
pover://user123456@app789012

# ntfy
# Format: ntfy://topic or ntfys://topic for HTTPS
ntfys://ntfy.yourdomain.com/server-alerts

# Gotify
# Format: gotify://hostname/token
gotify://gotify.yourdomain.com/your-app-token

# Microsoft Power Automate / Workflows
# Format: workflows://host/workflow_id/signature
workflows://prod-00.westus.logic.azure.com/123ABC_abc/DEF456-def/

# Generic webhook (JSON)
# Format: json://hostname/path
json://hooks.example.com/webhook-endpoint
```

## Using Configuration Files

Instead of adding URLs through the API, you can use a YAML configuration file. This is useful for version-controlled setups.

```yaml
# apprise.yml - Notification targets organized by tags

# Critical alerts go to all channels
version: 1

urls:
  - slack://tokenA/tokenB/tokenC:
      tag: critical, all

  - discord://webhook_id/webhook_token:
      tag: critical, all

  - tgram://123456789:ABCdefGHIjklMNOpqrstUVWxyz/987654321:
      tag: critical, all

  - mailto://sender:password@smtp.gmail.com?to=admin@example.com:
      tag: critical, email

  # Info-level messages only go to Slack
  - slack://tokenA/tokenB/tokenC/#info-channel:
      tag: info

  # Development team notifications
  - discord://dev_webhook_id/dev_webhook_token:
      tag: dev
```

Mount the config file into the container.

```yaml
# Add to docker-compose.yml volumes
volumes:
  - ./apprise.yml:/config/alerts.yml:ro
```

## Sending Notifications from Scripts

Create a reusable shell function for sending notifications through Apprise.

```bash
#!/bin/bash
# apprise-notify.sh - Send notifications via Apprise API

APPRISE_URL="http://localhost:8000"

# Send a notification using a saved configuration
# Usage: apprise_notify "config_tag" "title" "message" "type"
# Types: info, success, warning, failure
apprise_notify() {
    local tag="$1"
    local title="$2"
    local body="$3"
    local type="${4:-info}"

    curl -s -X POST "$APPRISE_URL/notify/$tag" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"$title\",
            \"body\": \"$body\",
            \"type\": \"$type\"
        }" > /dev/null
}

# Example usage in a deployment script
apprise_notify "all" "Deployment Started" "Deploying v2.3.1 to production" "info"

# Run the deployment
if deploy_app; then
    apprise_notify "all" "Deployment Success" "v2.3.1 deployed to production" "success"
else
    apprise_notify "critical" "Deployment FAILED" "v2.3.1 deployment failed, rolling back" "failure"
fi
```

## Python Integration

Apprise is a Python library at its core, so it integrates natively with Python applications.

```python
# notify.py - Send notifications using Apprise as a library
import apprise

# Create an Apprise instance
apobj = apprise.Apprise()

# Add notification targets
apobj.add("slack://tokenA/tokenB/tokenC")
apobj.add("tgram://123456789:ABCdefGHIjklMNOpqrstUVWxyz/987654321")
apobj.add("mailto://user:pass@gmail.com?to=admin@example.com")

# Send a notification to all targets
apobj.notify(
    body="Database migration completed successfully.",
    title="Migration Complete",
    notify_type=apprise.NotifyType.SUCCESS,
)
```

If you prefer to use the API server from Python:

```python
# api_notify.py - Send notifications via the Apprise REST API
import requests

def send_notification(tag, title, body, notify_type="info"):
    """Send a notification through the Apprise API."""
    response = requests.post(
        f"http://localhost:8000/notify/{tag}",
        json={
            "title": title,
            "body": body,
            "type": notify_type,
        }
    )
    return response.ok

# Usage
send_notification("critical", "Alert", "CPU usage at 98%", "warning")
```

## Message Types and Formatting

Apprise supports four message types that affect how the notification appears on each platform.

```bash
# Info - blue color on most platforms
curl -X POST http://localhost:8000/notify/alerts \
  -d '{"title": "Info", "body": "Scheduled maintenance starting", "type": "info"}'

# Success - green
curl -X POST http://localhost:8000/notify/alerts \
  -d '{"title": "Success", "body": "Backup completed", "type": "success"}'

# Warning - yellow/orange
curl -X POST http://localhost:8000/notify/alerts \
  -d '{"title": "Warning", "body": "Memory usage above 80%", "type": "warning"}'

# Failure - red
curl -X POST http://localhost:8000/notify/alerts \
  -d '{"title": "Failure", "body": "Service crashed", "type": "failure"}'
```

## Putting Apprise Behind a Reverse Proxy

For production use with SSL, add Traefik labels.

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.apprise.rule=Host(`apprise.yourdomain.com`)"
  - "traefik.http.routers.apprise.entrypoints=websecure"
  - "traefik.http.routers.apprise.tls.certresolver=letsencrypt"
  - "traefik.http.services.apprise.loadbalancer.server.port=8000"
```

## Summary

Apprise eliminates the pain of integrating with multiple notification platforms. Instead of maintaining separate code for Slack, Discord, email, and Telegram, you configure all your targets once and send through a single API. Running it in Docker makes deployment trivial, and the persistent configuration means your notification targets survive container restarts. For monitoring setups with OneUptime, Apprise can serve as a notification gateway that fans out alerts to every channel your team uses.
