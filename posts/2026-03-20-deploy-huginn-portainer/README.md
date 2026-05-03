# How to Deploy Huginn via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Huginn, Automation, Docker, Self-Hosted

Description: Deploy Huginn automation platform using Portainer as a self-hosted alternative to IFTTT and Zapier.

## Introduction

Huginn is a self-hosted automation system that creates agents that monitor the web, send and receive webhooks, process data, and trigger actions. It is a self-hosted alternative to IFTTT and Zapier.

## Prerequisites

- Portainer installed with Docker
- At least 1 GB RAM

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Huginn

version: "3.8"

services:
  huginn:
    image: ghcr.io/huginn/huginn-single-process:latest
    container_name: huginn
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - RAILS_ENV=production
      - DATABASE_ADAPTER=mysql2
      - DATABASE_HOST=huginn_mysql
      - DATABASE_PORT=3306
      - DATABASE_NAME=huginn
      - DATABASE_USERNAME=huginn
      - DATABASE_PASSWORD=${DB_PASSWORD}
      - APP_SECRET_TOKEN=${APP_SECRET_TOKEN}
      - INVITATION_CODE=${INVITATION_CODE}
      - DOMAIN=localhost:3000
      - EMAIL_FROM_ADDRESS=huginn@yourdomain.com
      - SMTP_DOMAIN=yourdomain.com
      - SMTP_SERVER=${SMTP_SERVER}
      - SMTP_PORT=587
      - SMTP_AUTHENTICATION=plain
      - SMTP_USER_NAME=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
    depends_on:
      huginn_mysql:
        condition: service_healthy
    networks:
      - huginn_net

  huginn_mysql:
    image: mysql:8.0
    container_name: huginn_mysql
    restart: unless-stopped
    volumes:
      - huginn_mysql_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=huginn
      - MYSQL_USER=huginn
      - MYSQL_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - huginn_net

volumes:
  huginn_mysql_data:

networks:
  huginn_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
DB_PASSWORD=your-db-password
MYSQL_ROOT_PASSWORD=your-mysql-root-password
APP_SECRET_TOKEN=your-128-char-random-secret
INVITATION_CODE=your-invite-code
SMTP_SERVER=smtp.yourdomain.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
```

Generate a secret token:
```bash
openssl rand -hex 64
```

## Step 3: Access Huginn

Open `http://<host>:3000` and log in with the default account:
- Username: `admin`
- Password: `password`

Change the admin password immediately after first login.

## Step 4: Create an Agent

1. Click **New Agent**
2. Select an agent type (e.g., **Website Agent** to scrape a page)
3. Configure the agent:

```json
{
  "expected_update_period_in_days": "1",
  "url": "https://news.ycombinator.com/",
  "type": "html",
  "mode": "on_change",
  "extract": {
    "title": {
      "css": ".titleline > a",
      "value": "string(.)"
    },
    "url": {
      "css": ".titleline > a",
      "value": "@href"
    }
  }
}
```

## Step 5: Create a Scenario (Agent Chain)

1. Create a **Website Agent** to scrape data
2. Create a **Trigger Agent** to filter results
3. Create an **Email Agent** (or **Slack Agent**) to send notifications
4. Link them: set upstream agents in each agent's "Sources"

## Conclusion

Huginn's agents run on a configurable schedule and pass events down a pipeline. The MySQL backend persists all agent state and event history. For production, configure SMTP for email notifications and set a strong `INVITATION_CODE` to prevent unauthorized registrations. The `ghcr.io/huginn/huginn` image is the community-maintained Docker image for Huginn.
