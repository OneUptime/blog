# How to Deploy Mattermost via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Mattermost, Team Chat, Collaboration, Self-Hosted

Description: Deploy Mattermost via Portainer as a self-hosted Slack alternative for team communication with persistent message history, file sharing, and plugin support.

## Introduction

Mattermost is an open-source team messaging platform similar to Slack. It provides channels, direct messages, file sharing, and a robust plugin ecosystem. Deploying via Portainer with PostgreSQL gives you a complete team communication platform that your organization controls.

## Deploy as a Stack

```yaml
services:
  mattermost:
    image: mattermost/mattermost-team-edition:latest
    container_name: mattermost
    environment:
      MM_SQLSETTINGS_DRIVERNAME: postgres
      MM_SQLSETTINGS_DATASOURCE: postgres://mattermost:mattermost_password@mattermost-db:5432/mattermost?sslmode=disable&connect_timeout=10
      MM_BLEVESETTINGS_INDEXDIR: /mattermost/bleve-indexes
      MM_SERVICESETTINGS_SITEURL: http://chat.example.com:8065
      MM_SERVICESETTINGS_ENABLEEMAILINVITATIONS: "true"
      MM_EMAILSETTINGS_SENDEMAILNOTIFICATIONS: "true"
      MM_EMAILSETTINGS_ENABLESMTPAUTH: "true"
      MM_EMAILSETTINGS_SMTPSERVER: smtp.example.com
      MM_EMAILSETTINGS_SMTPPORT: 587
      MM_EMAILSETTINGS_CONNECTIONSECURITY: STARTTLS
      MM_EMAILSETTINGS_SMTPUSERNAME: mattermost@example.com
      MM_EMAILSETTINGS_SMTPPASSWORD: smtp_password
      MM_EMAILSETTINGS_FEEDBACKEMAIL: mattermost@example.com
    volumes:
      - mattermost_config:/mattermost/config:rw
      - mattermost_data:/mattermost/data:rw
      - mattermost_logs:/mattermost/logs:rw
      - mattermost_plugins:/mattermost/plugins:rw
      - mattermost_client_plugins:/mattermost/client/plugins:rw
      - mattermost_bleve:/mattermost/bleve-indexes:rw
    ports:
      - "8065:8065"
    depends_on:
      mattermost-db:
        condition: service_healthy
    restart: unless-stopped

  mattermost-db:
    image: postgres:16-alpine
    container_name: mattermost-db
    environment:
      POSTGRES_DB: mattermost
      POSTGRES_USER: mattermost
      POSTGRES_PASSWORD: mattermost_password
    volumes:
      - mattermost_db:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mattermost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mattermost_config:
  mattermost_data:
  mattermost_logs:
  mattermost_plugins:
  mattermost_client_plugins:
  mattermost_bleve:
  mattermost_db:
```

## Initial Setup

1. Access the URL configured in `MM_SERVICESETTINGS_SITEURL` (for example, `http://chat.example.com:8065`)
2. Create the first admin account
3. Create your team
4. Invite team members via email or invitation link

## Creating Channels

By default, Mattermost creates `#town-square` and `#off-topic`. Add more:

1. Click **+** next to **Channels**
2. Create channels for:
   - `#engineering`, `#general`, `#random`
   - `#ops-alerts` - For monitoring alerts
   - `#deployments` - For CI/CD notifications

## Integrations

### Webhook for CI/CD Notifications

1. **Product Menu > Integrations > Incoming Webhooks > Add Incoming Webhook**
2. Select channel `#deployments`
3. Copy the webhook URL

Send notifications from scripts:

```bash
curl -X POST "http://chat.example.com:8065/hooks/your-webhook-token" \
  -H "Content-Type: application/json" \
  -d '{
    "text": ":white_check_mark: Deployment successful!\n**App:** myapp\n**Version:** 1.2.3\n**Environment:** production"
  }'
```

## Mattermost vs Slack

| Feature | Mattermost | Slack |
|---------|------------|-------|
| Message history | Unlimited (self-hosted) | Limited (free tier) |
| File storage | Your storage | Limited |
| Cost | Free (open-source) | Paid per user |
| Privacy | Complete control | Cloud provider |
| Plugins | Open source | Closed ecosystem |

## Conclusion

Mattermost deployed via Portainer provides a complete Slack alternative with unlimited message history and full data ownership. The webhook and bot integration ecosystem enables CI/CD notifications, monitoring alerts, and chatbot automation. For organizations concerned about data privacy or Slack costs, self-hosted Mattermost is a compelling alternative.
