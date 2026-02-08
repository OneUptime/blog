# How to Run Mattermost in Docker for Team Chat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Mattermost, Team Chat, Self-Hosted, Docker Compose, Slack Alternative, Communication

Description: Deploy Mattermost in Docker as a self-hosted Slack alternative for team messaging with full data control and enterprise features.

---

Mattermost is an open-source team messaging platform that works as a self-hosted alternative to Slack. It provides channels, direct messaging, file sharing, search, integrations, and bot support, all running on your own infrastructure. For organizations that need to keep communications internal (whether for compliance, security, or cost reasons), Mattermost delivers the collaboration features teams expect without sending data to a third party.

Running Mattermost in Docker simplifies deployment and maintenance. The official Docker images are well-maintained and cover the full stack. This guide walks through setting up Mattermost with Docker Compose, configuring it for production use, enabling integrations, and keeping it running reliably.

## Why Self-Host Team Chat

Slack is convenient until you need to keep messages on-premises, audit communication logs, or stop paying per-user fees that add up fast with growing teams. Mattermost's free tier (Team Edition) supports unlimited users and message history. The Enterprise Edition adds compliance features, LDAP/SAML authentication, and advanced permissions, but the free version covers most teams' needs.

## Prerequisites

Docker and Docker Compose are required. Mattermost recommends at least 2 GB of RAM for small teams (up to 100 users) and 4-8 GB for larger deployments.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Docker Compose Setup

Mattermost requires a PostgreSQL database and optionally uses Nginx or another reverse proxy for SSL termination. Here is the production-ready compose configuration.

```yaml
# docker-compose.yml - Mattermost Team Chat
version: "3.8"

services:
  mattermost:
    image: mattermost/mattermost-team-edition:latest
    container_name: mattermost
    restart: unless-stopped
    ports:
      - "8065:8065"
      # Calls plugin port (for voice and video calls)
      - "8443:8443/udp"
      - "8443:8443/tcp"
    volumes:
      # Persist configuration
      - mattermost-config:/mattermost/config
      # Persist uploaded files and data
      - mattermost-data:/mattermost/data
      # Persist log files
      - mattermost-logs:/mattermost/logs
      # Persist plugins
      - mattermost-plugins:/mattermost/plugins
      - mattermost-client-plugins:/mattermost/client/plugins
      # Persist bleve indexes for search
      - mattermost-bleve:/mattermost/bleve-indexes
    environment:
      # Timezone
      TZ: America/New_York
      # PostgreSQL connection string
      MM_SQLSETTINGS_DRIVERNAME: postgres
      MM_SQLSETTINGS_DATASOURCE: postgres://mattermost:${POSTGRES_PASSWORD}@mattermost-postgres:5432/mattermost?sslmode=disable&connect_timeout=10
      # Site URL - must match your public access URL
      MM_SERVICESETTINGS_SITEURL: https://chat.yourdomain.com
      # Disable diagnostics
      MM_LOGSETTINGS_ENABLEDIAGNOSTICS: "false"
      # Enable Bleve for full-text search (no Elasticsearch needed)
      MM_BLEVESETTINGS_INDEXDIR: /mattermost/bleve-indexes
      MM_BLEVESETTINGS_ENABLEINDEXING: "true"
      MM_BLEVESETTINGS_ENABLESEARCHING: "true"
      MM_BLEVESETTINGS_ENABLEAUTOCOMPLETE: "true"
    depends_on:
      mattermost-postgres:
        condition: service_healthy
    security_opt:
      - no-new-privileges:true
    pids_limit: 200
    tmpfs:
      - /tmp

  mattermost-postgres:
    image: postgres:16-alpine
    container_name: mattermost-postgres
    restart: unless-stopped
    volumes:
      - mattermost-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: mattermost
      POSTGRES_USER: mattermost
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mattermost"]
      interval: 10s
      timeout: 5s
      retries: 5
    security_opt:
      - no-new-privileges:true
    pids_limit: 100
    tmpfs:
      - /tmp
      - /var/run/postgresql

volumes:
  mattermost-config:
  mattermost-data:
  mattermost-logs:
  mattermost-plugins:
  mattermost-client-plugins:
  mattermost-bleve:
  mattermost-postgres-data:
```

Create the environment file.

```bash
# .env - Database credentials
POSTGRES_PASSWORD=your-secure-postgres-password
```

Start the stack.

```bash
# Launch Mattermost and PostgreSQL
docker compose up -d

# Watch startup logs for any errors
docker compose logs -f mattermost
```

Navigate to `https://chat.yourdomain.com` (or `http://your-server-ip:8065` without a reverse proxy) and create your admin account. The first user to register becomes the system administrator.

## Initial Configuration

After creating your admin account, configure essential settings through the System Console (accessible from the main menu).

Key settings to configure immediately:

```bash
# These can also be set via environment variables in the compose file

# Require email verification
MM_EMAILSETTINGS_REQUIREEMAILVERIFICATION=true

# SMTP settings for email notifications
MM_EMAILSETTINGS_SMTPSERVER=smtp.gmail.com
MM_EMAILSETTINGS_SMTPPORT=587
MM_EMAILSETTINGS_CONNECTIONSECURITY=STARTTLS
MM_EMAILSETTINGS_SMTPUSERNAME=your-email@gmail.com
MM_EMAILSETTINGS_SMTPPASSWORD=your-app-password
MM_EMAILSETTINGS_SENDEMAILNOTIFICATIONS=true

# File storage settings
MM_FILESETTINGS_MAXFILESIZE=52428800

# Rate limiting
MM_RATELIMITSETTINGS_ENABLE=true
MM_RATELIMITSETTINGS_PERSEC=10
MM_RATELIMITSETTINGS_MAXBURST=100
```

## Creating Teams and Channels

Mattermost organizes communication into teams (which contain channels) and direct messages.

```bash
# Use the mmctl CLI tool to manage Mattermost from the command line
# Install mmctl or use it from inside the container

# Create a new team
docker exec mattermost mmctl team create --name engineering --display-name "Engineering" --email admin@yourdomain.com

# Create a channel
docker exec mattermost mmctl channel create --team engineering --name deployments --display-name "Deployments"

# Add a user to a team
docker exec mattermost mmctl team users add engineering user@yourdomain.com

# Add a user to a channel
docker exec mattermost mmctl channel users add engineering:deployments user@yourdomain.com
```

## Incoming Webhooks for Alerts

Mattermost supports incoming webhooks, making it easy to send automated messages from scripts and monitoring tools.

1. Go to Main Menu > Integrations > Incoming Webhooks
2. Click "Add Incoming Webhook"
3. Select the channel and give it a name
4. Copy the webhook URL

```bash
# Send a message via incoming webhook
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Deployment to production completed successfully.",
    "username": "deploy-bot",
    "icon_url": "https://example.com/deploy-icon.png"
  }' \
  https://chat.yourdomain.com/hooks/your-webhook-id

# Send a formatted message with an attachment
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "attachments": [{
      "color": "#FF0000",
      "title": "Server Alert",
      "text": "CPU usage on web-server-01 exceeded 95%",
      "fields": [
        {"title": "Server", "value": "web-server-01", "short": true},
        {"title": "Current Usage", "value": "97%", "short": true}
      ]
    }]
  }' \
  https://chat.yourdomain.com/hooks/your-webhook-id
```

## Slash Commands

Create custom slash commands that trigger external services.

1. Go to Main Menu > Integrations > Slash Commands
2. Click "Add Slash Command"
3. Configure the command (e.g., `/deploy`) with a trigger URL

Your backend receives a POST request and should return a JSON response.

```python
# Example Flask endpoint for a /status slash command
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/mattermost/status', methods=['POST'])
def status_command():
    # Mattermost sends the command details as form data
    channel = request.form.get('channel_name')
    user = request.form.get('user_name')

    # Check server status (your logic here)
    status = check_servers()

    return jsonify({
        "response_type": "in_channel",
        "text": f"### Server Status Report\n| Server | Status | CPU |\n|--------|--------|-----|\n{status}"
    })
```

## Integrating with Monitoring Tools

Connect Mattermost to your monitoring stack for real-time alerts. For OneUptime or similar tools, use the incoming webhook integration to post alerts directly to a dedicated channel.

```bash
# Example: script that checks service health and posts to Mattermost
#!/bin/bash
WEBHOOK_URL="https://chat.yourdomain.com/hooks/your-webhook-id"

# Check if a service is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://yourapp.com/health)

if [ "$HTTP_CODE" != "200" ]; then
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"attachments\": [{
                \"color\": \"#FF0000\",
                \"title\": \"Service Down\",
                \"text\": \"yourapp.com health check failed with HTTP $HTTP_CODE\",
                \"fields\": [
                    {\"title\": \"Timestamp\", \"value\": \"$(date)\", \"short\": true},
                    {\"title\": \"HTTP Code\", \"value\": \"$HTTP_CODE\", \"short\": true}
                ]
            }]
        }" \
        "$WEBHOOK_URL"
fi
```

## Backup and Restore

Back up the database and all data volumes.

```bash
# Backup PostgreSQL
docker exec mattermost-postgres pg_dump -U mattermost mattermost > mattermost-db-$(date +%Y%m%d).sql

# Backup all Mattermost volumes
for vol in config data logs plugins client-plugins bleve; do
    docker run --rm \
        -v mattermost-${vol}:/source:ro \
        -v $(pwd)/backups:/backup \
        alpine tar czf /backup/mattermost-${vol}-$(date +%Y%m%d).tar.gz -C /source .
done
```

## Reverse Proxy Configuration

```yaml
# Traefik labels for Mattermost
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.mattermost.rule=Host(`chat.yourdomain.com`)"
  - "traefik.http.routers.mattermost.entrypoints=websecure"
  - "traefik.http.routers.mattermost.tls.certresolver=letsencrypt"
  - "traefik.http.services.mattermost.loadbalancer.server.port=8065"
```

## Summary

Mattermost in Docker gives you a full-featured team chat platform without recurring per-user costs or data sovereignty concerns. The webhook and slash command integrations make it a natural fit for DevOps workflows, piping deployment notifications, monitoring alerts, and CI/CD updates directly into the channels where your team works. Combined with OneUptime for infrastructure monitoring, you get a complete self-hosted communication and alerting stack.
