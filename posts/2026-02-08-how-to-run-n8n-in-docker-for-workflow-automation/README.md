# How to Run n8n in Docker for Workflow Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, n8n, Workflow Automation, Docker Compose, Self-Hosted, Integration, Low-Code

Description: Deploy n8n in Docker to build automated workflows that connect your apps, APIs, and services with a visual editor.

---

n8n is an open-source workflow automation tool that lets you connect different services and APIs without writing much code. Think of it as a self-hosted alternative to Zapier or Make (formerly Integromat). You build workflows visually by connecting nodes, where each node represents a trigger, an action, or a transformation. When a webhook fires, an email arrives, or a schedule ticks, n8n executes your workflow automatically.

Running n8n in Docker keeps it isolated, easy to update, and simple to back up. This guide covers the complete setup, from basic deployment to production-ready configuration with persistent storage, authentication, and reverse proxy integration.

## What Can You Automate with n8n

The use cases are broad. Here are some practical examples:

- Forward webhook alerts from monitoring tools to Slack with enriched context
- Sync data between your CRM and a spreadsheet on a schedule
- Process incoming emails, extract attachments, and store them in S3
- Trigger deployments when a GitHub PR gets merged
- Scrape a website daily and notify you when the content changes
- Aggregate RSS feeds and post summaries to Discord

n8n has over 400 built-in integrations and supports custom HTTP requests for anything not covered.

## Prerequisites

You need Docker and Docker Compose installed. n8n recommends at least 1 GB of RAM, though complex workflows with many parallel executions may need more.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Quick Start

Get n8n running in one command.

```bash
# Run n8n with a persistent data volume
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n-data:/home/node/.n8n \
  n8nio/n8n
```

Open `http://your-server-ip:5678` in your browser. You will see the n8n setup wizard where you create your owner account.

## Production Setup with Docker Compose

For production, you want persistent storage, a database backend, environment-based configuration, and proper security settings.

```yaml
# docker-compose.yml - n8n workflow automation with PostgreSQL
version: "3.8"

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    volumes:
      # Persist workflow data and credentials
      - n8n-data:/home/node/.n8n
      # Local files for file-based nodes
      - n8n-files:/files
    environment:
      # Database configuration - use PostgreSQL for production
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: n8n-postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      # Encryption key for stored credentials (generate a random string)
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      # Webhook URL - set this to your public URL
      WEBHOOK_URL: https://n8n.yourdomain.com/
      # Timezone
      GENERIC_TIMEZONE: America/New_York
      TZ: America/New_York
      # Execution settings
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: 168
    depends_on:
      n8n-postgres:
        condition: service_healthy

  n8n-postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    volumes:
      - n8n-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  n8n-data:
  n8n-files:
  n8n-postgres-data:
```

Create the environment file.

```bash
# .env - Sensitive configuration values
POSTGRES_PASSWORD=your-secure-postgres-password
N8N_ENCRYPTION_KEY=your-random-encryption-key-at-least-24-chars
```

Generate the encryption key.

```bash
# Generate a random encryption key
openssl rand -hex 24
```

Start the stack.

```bash
# Launch n8n and PostgreSQL
docker compose up -d

# Watch the startup logs
docker compose logs -f n8n
```

## Building Your First Workflow

After logging in, click "Add workflow" to create a new one. Here is a practical example: monitoring a website and sending a Slack notification when it goes down.

The workflow has three nodes:

1. **Schedule Trigger** - runs every 5 minutes
2. **HTTP Request** - checks if the website responds
3. **IF** - checks the response status
4. **Slack** - sends an alert if the site is down

You build this visually in the n8n editor, but you can also import workflows as JSON.

```json
{
  "name": "Website Health Check",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{"field": "minutes", "minutesInterval": 5}]
        }
      },
      "name": "Every 5 Minutes",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://yoursite.com",
        "options": {
          "timeout": 10000,
          "allowUnauthorizedCerts": false
        }
      },
      "name": "Check Website",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "continueOnFail": true
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{ $json.statusCode }}",
              "operation": "notEqual",
              "value2": 200
            }
          ]
        }
      },
      "name": "Is Down?",
      "type": "n8n-nodes-base.if",
      "position": [650, 300]
    }
  ]
}
```

## Webhook Workflows

One of n8n's most powerful features is receiving webhooks. Create a workflow that triggers when an external service sends a POST request.

```bash
# After creating a webhook trigger node, n8n gives you a URL like:
# https://n8n.yourdomain.com/webhook/abc123-def456

# Test it with curl
curl -X POST https://n8n.yourdomain.com/webhook/abc123-def456 \
  -H "Content-Type: application/json" \
  -d '{"alert": "CPU usage high", "server": "web-01", "value": 95}'
```

This makes n8n an excellent bridge between monitoring tools and notification channels. Your monitoring system fires a webhook, n8n processes it, enriches the data, and routes it to the right team via Slack, email, or PagerDuty.

## Credentials Management

n8n encrypts stored credentials using the N8N_ENCRYPTION_KEY. This key is critical. If you lose it, all stored credentials become unreadable.

```bash
# Back up the encryption key somewhere safe
echo "$N8N_ENCRYPTION_KEY" > /secure-location/n8n-encryption-key.txt
```

Add credentials through the n8n web interface under Settings > Credentials. Supported credential types include OAuth2, API keys, basic auth, and service-specific formats.

## Environment Variables for Configuration

n8n supports many environment variables for fine-tuning behavior.

```yaml
# Additional useful environment variables
environment:
  # Limit concurrent workflow executions
  N8N_CONCURRENCY_PRODUCTION_LIMIT: 10
  # Disable the public API if you do not need it
  N8N_PUBLIC_API_DISABLED: "false"
  # Log level for debugging
  N8N_LOG_LEVEL: info
  # Disable telemetry
  N8N_DIAGNOSTICS_ENABLED: "false"
  # User management
  N8N_USER_MANAGEMENT_DISABLED: "false"
```

## Backup Strategy

Your n8n workflows and credentials live in the PostgreSQL database and the n8n data directory. Back up both.

```bash
# Backup the PostgreSQL database
docker exec n8n-postgres pg_dump -U n8n n8n > n8n-db-backup-$(date +%Y%m%d).sql

# Backup the n8n data volume
docker run --rm \
  -v n8n-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/n8n-data-$(date +%Y%m%d).tar.gz -C /source .
```

You can also export workflows as JSON from the n8n interface for version control.

```bash
# Export all workflows via the n8n CLI
docker exec n8n n8n export:workflow --all --output=/home/node/.n8n/backups/workflows/
docker cp n8n:/home/node/.n8n/backups/workflows/ ./workflow-backups/
```

## Reverse Proxy Configuration

Put n8n behind a reverse proxy for SSL and clean URLs.

```yaml
# Traefik labels for n8n
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.n8n.rule=Host(`n8n.yourdomain.com`)"
  - "traefik.http.routers.n8n.entrypoints=websecure"
  - "traefik.http.routers.n8n.tls.certresolver=letsencrypt"
  - "traefik.http.services.n8n.loadbalancer.server.port=5678"
```

Make sure to set the WEBHOOK_URL environment variable to match your public URL, or incoming webhooks will not route correctly.

## Monitoring n8n

Watch for failed workflow executions and resource usage.

```bash
# Check container resource usage
docker stats n8n --no-stream

# View recent execution errors in the logs
docker compose logs --tail 100 n8n | grep -i error
```

Set up monitoring with OneUptime to track the n8n web interface availability and get alerts when workflows start failing unexpectedly.

## Summary

n8n in Docker gives you a powerful, self-hosted workflow automation platform that rivals commercial tools like Zapier. The visual editor makes it accessible to non-developers, while the code nodes and HTTP request capabilities give developers full flexibility. Using PostgreSQL as the backend, encrypting credentials, and setting up regular backups ensures your automations survive hardware failures. The webhook support makes n8n an ideal bridge between monitoring tools and notification channels in your infrastructure.
