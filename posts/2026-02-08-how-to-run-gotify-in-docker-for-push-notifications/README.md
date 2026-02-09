# How to Run Gotify in Docker for Push Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Gotify, Push Notifications, Self-Hosted, Alerts, Docker Compose, Monitoring

Description: Deploy Gotify in Docker to send and receive push notifications from your servers, scripts, and monitoring tools.

---

When a backup fails at 2 AM or your server runs out of disk space, you need to know about it fast. Gotify is a self-hosted push notification server that lets you send messages from any script, application, or monitoring tool to your phone or browser. Unlike services like Pushover or Slack, Gotify runs entirely on your infrastructure. No third-party dependencies, no monthly fees, no data leaving your network.

This guide covers deploying Gotify in Docker, configuring it for production use, sending notifications from scripts and monitoring tools, and setting up the mobile app.

## Why Gotify

There are plenty of notification services out there. What makes Gotify worth self-hosting?

First, it has zero external dependencies once deployed. Your notifications work even if the internet goes down, as long as the sender and your phone are on the same network. Second, the API is dead simple. A single curl command sends a notification. Third, it supports message priorities, so you can filter which notifications actually buzz your phone versus which ones sit quietly until you check.

## Prerequisites

You need Docker and Docker Compose on your server. Gotify is extremely lightweight, using less than 50 MB of RAM, so it runs happily on even the smallest VPS or Raspberry Pi.

```bash
# Verify Docker is ready
docker --version
docker compose version
```

## Quick Start with Docker Run

Get Gotify running in under a minute.

```bash
# Run Gotify with a persistent data volume
docker run -d \
  --name gotify \
  -p 8070:80 \
  -v gotify-data:/app/data \
  gotify/server
```

Open `http://your-server-ip:8070` in your browser. The default credentials are admin/admin. Change them immediately.

## Production Setup with Docker Compose

For a proper deployment, use Docker Compose with environment variables and resource limits.

```yaml
# docker-compose.yml - Gotify push notification server
version: "3.8"

services:
  gotify:
    image: gotify/server:latest
    container_name: gotify
    restart: unless-stopped
    ports:
      - "8070:80"
    volumes:
      # Persist messages, users, and application tokens
      - gotify-data:/app/data
    environment:
      # Set the default admin password on first run
      GOTIFY_DEFAULTUSER_NAME: admin
      GOTIFY_DEFAULTUSER_PASS: ${GOTIFY_ADMIN_PASSWORD}
      # Set timezone for correct message timestamps
      TZ: America/New_York
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 128M

volumes:
  gotify-data:
```

Create the environment file.

```bash
# .env - Store the admin password
GOTIFY_ADMIN_PASSWORD=your-secure-admin-password
```

Launch the service.

```bash
# Start Gotify
docker compose up -d

# Confirm it is healthy
docker compose ps
```

## Creating Applications and Tokens

In Gotify, each notification source is called an "application." Each application gets its own token. Log into the web interface and create applications for each of your use cases.

You can also create applications via the API.

```bash
# Create a new application via the API
curl -u admin:your-password \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "Server Alerts", "description": "Critical server notifications"}' \
  http://localhost:8070/application

# The response contains the token you will use to send messages
# {"id":1,"token":"Axxxxxxxxx","name":"Server Alerts",...}
```

Create separate applications for different notification sources so you can manage them independently. For example, you might have one for backup scripts, another for monitoring alerts, and a third for cron job failures.

## Sending Notifications

The simplest way to send a notification is a single curl command. This makes it easy to integrate with any script or tool.

```bash
# Send a basic notification
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"title": "Backup Complete", "message": "Daily backup finished successfully.", "priority": 5}' \
  "http://localhost:8070/message?token=your-app-token"
```

Priority levels control how the notification appears on your phone:
- 0: Minimum priority, no notification sound
- 1-3: Low priority
- 4-7: Normal priority, default notification behavior
- 8-10: High priority, persistent notification with sound

```bash
# Send a high-priority alert for critical issues
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"title": "DISK SPACE CRITICAL", "message": "Server disk usage at 95%. Immediate action required.", "priority": 9}' \
  "http://localhost:8070/message?token=your-app-token"
```

## Integration with Shell Scripts

Wrap the curl command in a function you can reuse across your scripts.

```bash
#!/bin/bash
# notify.sh - Reusable notification function

GOTIFY_URL="http://localhost:8070"
GOTIFY_TOKEN="your-app-token"

# Send a notification to Gotify
# Usage: notify "Title" "Message" [priority]
notify() {
    local title="$1"
    local message="$2"
    local priority="${3:-5}"

    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"title\": \"$title\", \"message\": \"$message\", \"priority\": $priority}" \
        "$GOTIFY_URL/message?token=$GOTIFY_TOKEN" > /dev/null
}

# Example: use in a backup script
if pg_dump mydb > /backups/mydb.sql 2>&1; then
    notify "Backup Success" "Database backup completed at $(date)"
else
    notify "Backup FAILED" "Database backup failed at $(date)" 9
fi
```

## Integration with Monitoring Tools

Gotify works well as a notification channel for monitoring systems.

For a simple disk space monitor:

```bash
#!/bin/bash
# disk-monitor.sh - Alert when disk usage exceeds threshold

THRESHOLD=85
GOTIFY_URL="http://localhost:8070"
GOTIFY_TOKEN="your-app-token"

# Check each mounted filesystem
df -h --output=pcent,target | tail -n +2 | while read usage mount; do
    # Remove the % sign and compare
    usage_num=${usage%%%}
    if [ "$usage_num" -gt "$THRESHOLD" ]; then
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"title\": \"Disk Alert: $mount\", \"message\": \"Usage at ${usage} on ${mount}\", \"priority\": 8}" \
            "$GOTIFY_URL/message?token=$GOTIFY_TOKEN" > /dev/null
    fi
done
```

Schedule this with cron.

```bash
# Run every 15 minutes
*/15 * * * * /usr/local/bin/disk-monitor.sh
```

## Setting Up the Mobile App

Gotify provides an Android app (available on F-Droid and GitHub releases). It maintains a WebSocket connection to your server and delivers notifications in real time.

1. Install the Gotify app from F-Droid or download the APK from GitHub
2. Open the app and enter your Gotify server URL (e.g., https://gotify.yourdomain.com)
3. Log in with your credentials
4. The app will create a client token and start receiving notifications

For iOS users, Gotify does not have an official app. You can use the web interface, which supports browser push notifications on supported browsers.

## Putting Gotify Behind a Reverse Proxy

For remote access with SSL, put Gotify behind Traefik or Nginx.

```yaml
# Traefik labels for Gotify
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.gotify.rule=Host(`gotify.yourdomain.com`)"
  - "traefik.http.routers.gotify.entrypoints=websecure"
  - "traefik.http.routers.gotify.tls.certresolver=letsencrypt"
  - "traefik.http.services.gotify.loadbalancer.server.port=80"
```

For Nginx, you need to proxy WebSocket connections for real-time delivery.

```nginx
# Nginx configuration for Gotify with WebSocket support
server {
    listen 443 ssl;
    server_name gotify.yourdomain.com;

    ssl_certificate /etc/ssl/certs/gotify.crt;
    ssl_certificate_key /etc/ssl/private/gotify.key;

    location / {
        proxy_pass http://localhost:8070;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WebSocket support is essential for real-time notifications
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Managing Messages via the API

You can list and delete messages programmatically.

```bash
# List all messages for the current user
curl -u admin:your-password http://localhost:8070/message

# Delete all messages for a specific application
curl -u admin:your-password -X DELETE http://localhost:8070/application/1/message

# Delete a specific message by ID
curl -u admin:your-password -X DELETE http://localhost:8070/message/42
```

## Backup

Gotify stores everything in a SQLite database inside the data volume. Back it up regularly.

```bash
# Backup the Gotify data volume
docker run --rm \
  -v gotify-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/gotify-backup-$(date +%Y%m%d).tar.gz -C /source .
```

## Summary

Gotify gives you a self-hosted, dependency-free push notification system that integrates with anything that can make an HTTP request. The API is simple enough that you can add notifications to any shell script in a single line. Combined with a monitoring tool like OneUptime for structured alerting and Gotify for quick ad-hoc notifications from scripts, you get complete visibility into your infrastructure without relying on external services.
