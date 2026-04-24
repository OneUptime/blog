# How to Deploy n8n Workflow Automation via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, n8n, Workflow Automation, Integration, Self-Hosted

Description: Deploy n8n via Portainer as a self-hosted workflow automation platform for connecting apps and automating tasks with a visual node-based editor.

## Introduction

n8n is a self-hostable workflow automation platform similar to Zapier or Make. It connects hundreds of services and APIs through a visual node-based editor. Deploying via Portainer with PostgreSQL provides a production-ready automation platform you control entirely.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    container_name: n8n
    environment:
      # Database
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: n8n-db
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: n8n_db_password
      
      # n8n settings
      N8N_HOST: "<host>"
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      
      # Timezone
      GENERIC_TIMEZONE: America/New_York
      
      # Security
      N8N_ENCRYPTION_KEY: generate_with_openssl_rand_hex_32
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "5678:5678"
    depends_on:
      n8n-db:
        condition: service_healthy
    restart: unless-stopped

  n8n-db:
    image: postgres:16-alpine
    container_name: n8n-db
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: n8n_db_password
    volumes:
      - n8n_db:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  n8n_data:
  n8n_db:
```

## Access and Setup

Navigate to `http://<host>:5678`. On first launch, create the owner account in the setup screen, then sign in with that account.

## Example Workflows

### DevOps Alert Routing

Create a workflow that:
1. **Webhook Trigger** → receives alerts from Prometheus Alertmanager
2. **Switch** node → routes by severity (critical vs. warning)
3. **Slack** node → sends critical alerts to `#incidents`
4. **Send Email** node → sends warning alerts to ops team

### Database Backup Notification

1. **Schedule Trigger** → runs daily at 3 AM
2. **SSH** node → runs backup script on the target host
3. **IF** node → checks if backup succeeded
4. **Slack** → posts success/failure status

### GitHub → Mattermost Pipeline

1. **GitHub Trigger** → fires on pull request events
2. **Code** node → formats message
3. **Mattermost** → posts to `#engineering` channel

## n8n Code Node Example

```javascript
// Custom Code node in n8n
// Process webhook data and format for Slack

const payload = items[0].json;

return [{
  json: {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Alert: ${payload.alertname}*\n*Severity:* ${payload.severity}\n*Description:* ${payload.description}`
        }
      }
    ]
  }
}];
```

## Installing Community Nodes

```bash
# Manually install a community node from npm

docker exec -it n8n sh
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm i n8n-nodes-minio
```

Then restart n8n.

Or in the UI: **Settings > Community Nodes > Install**

## Conclusion

n8n deployed via Portainer provides a powerful, self-hosted automation platform that replaces Zapier and Make for many use cases. The visual workflow editor makes it accessible to non-developers, while the Code node provides full JavaScript flexibility for complex transformations. Hundreds of built-in integrations cover most automation needs, and the Webhook node enables real-time reactive automations.
