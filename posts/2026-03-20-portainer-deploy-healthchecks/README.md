# How to Deploy Healthchecks.io via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, HealthCheck, Cron Monitoring, Self-Hosted, Docker, Job Monitoring, Alerting

Description: Learn how to deploy a self-hosted Healthchecks.io instance via Portainer using Docker Compose. This guide covers PostgreSQL integration, email and notification setup, cron job ping configuration...

---

## Introduction

Healthchecks.io is a cron job and scheduled task monitoring service. It works on a "dead man's switch" principle: your cron jobs send an HTTP ping to a unique URL after completing successfully. If a ping is not received within the expected window, Healthchecks fires an alert via email, Slack, PagerDuty, or dozens of other integrations.

Running your own Healthchecks instance via Portainer keeps your monitoring data private, removes dependency on the SaaS version, and allows unlimited checks without subscription costs. This guide deploys the official `healthchecks/healthchecks` image with PostgreSQL for persistent storage and SMTP for email notifications.

## Prerequisites

Before starting, ensure you have:

- A Docker Standalone environment with Docker Engine 20.10+ and Portainer CE or BE running
- An SMTP server or relay for outbound email (e.g., SendGrid, Mailgun, or self-hosted Postfix)
- A domain name for the `SITE_ROOT` setting
- Basic familiarity with Portainer Stacks

## Step 1: Create the Docker Compose Stack

In Portainer on a Docker Standalone environment, go to **Stacks > Add Stack**, name it `healthchecks`, and paste the following:

```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: healthchecks-db
    restart: unless-stopped
    # Store PostgreSQL data in a named volume for persistence
    volumes:
      - healthchecks-db:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: hc
      POSTGRES_USER: hcuser
      # Use a strong password in production
      POSTGRES_PASSWORD: hcpassword
    networks:
      - healthchecks-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hcuser -d hc"]
      interval: 10s
      timeout: 5s
      retries: 5

  healthchecks:
    image: healthchecks/healthchecks:latest
    container_name: healthchecks
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      # Remove this if using a reverse proxy
      - "8000:8000"
    environment:
      # Database connection - must match the db service credentials above
      DB: postgres
      DB_HOST: db
      DB_PORT: "5432"
      DB_NAME: hc
      DB_USER: hcuser
      DB_PASSWORD: hcpassword

      # Secret key for Django sessions - generate with: openssl rand -hex 32
      SECRET_KEY: "changeme-generate-a-strong-secret-key-here"

      # Site root URL - used in notification emails and ping URLs
      SITE_ROOT: "https://hc.example.com"
      SITE_NAME: "My Healthchecks"

      # Email settings for sending alerts and account notifications
      DEFAULT_FROM_EMAIL: "healthchecks@example.com"
      EMAIL_HOST: "smtp.example.com"
      EMAIL_PORT: "587"
      EMAIL_HOST_USER: "smtp-user@example.com"
      EMAIL_HOST_PASSWORD: "smtp-password"
      EMAIL_USE_TLS: "True"

      # Allow registration of new accounts (set to False to lock down)
      REGISTRATION_OPEN: "True"
    networks:
      - healthchecks-net
    labels:
      # Traefik v3 reverse proxy labels - remove if not using Traefik
      - "traefik.enable=true"
      - "traefik.http.routers.healthchecks.rule=Host(`hc.example.com`)"
      - "traefik.http.routers.healthchecks.entrypoints=websecure"
      - "traefik.http.routers.healthchecks.tls.certresolver=letsencrypt"
      - "traefik.http.services.healthchecks.loadbalancer.server.port=8000"

volumes:
  healthchecks-db:
    driver: local

networks:
  healthchecks-net:
    driver: bridge
```

## Step 2: Configure Environment Variables

Before deploying, update the following values in the compose file, or replace them with `${...}` placeholders and define them under Portainer's stack environment variables:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Random 64-character hex string. Generate with `openssl rand -hex 32` |
| `SITE_ROOT` | Full URL where your instance is accessible |
| `EMAIL_HOST` | SMTP server hostname |
| `DB_PASSWORD` | Must match `POSTGRES_PASSWORD` in the db service |

If you want Portainer to inject these values, replace the hardcoded strings with `${VARIABLE}` placeholders and set them under **Stack Environment Variables** instead of storing literal secrets in the compose file.

## Step 3: Deploy the Stack

Click **Deploy the stack**. On a Docker Standalone environment, Portainer will start the PostgreSQL container first and wait for the health check to pass before starting the Healthchecks application container. On first boot, Healthchecks runs Django migrations automatically.

After the stack is running, create the initial admin user from the Docker host:

```bash
docker exec -it healthchecks /opt/healthchecks/manage.py createsuperuser --email admin@example.com --password 'change-this-admin-password'
```

Access the dashboard at your configured domain.

## Step 4: Create Your First Check

Log in with your superuser credentials and click **Add Check**:

- **Name**: Give the check a descriptive name (e.g., `Nightly DB Backup`)
- **Tags**: Optional labels for filtering
- **Period**: How often the job runs (e.g., `1 day`)
- **Grace Time**: How long to wait after a missed ping before alerting (e.g., `1 hour`)

After saving, you will see a unique ping URL like:

```text
https://hc.example.com/ping/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Step 5: Instrument Your Cron Jobs

Add a `curl` call at the end of your cron scripts to send a success ping:

```bash
#!/bin/bash
set -e

# Your actual job commands

pg_dump -U postgres mydb > /backup/mydb-$(date +%Y%m%d).sql
gzip /backup/mydb-$(date +%Y%m%d).sql

# Ping Healthchecks on success
curl -fsS --retry 3 "https://hc.example.com/ping/your-check-uuid" > /dev/null
```

For cron jobs that may fail, wrap with error handling:

```bash
#!/bin/bash
# Signal start
curl -fsS --retry 3 "https://hc.example.com/ping/your-check-uuid/start" > /dev/null

# Run the job, capture exit code
your-job-command
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  # Ping success
  curl -fsS --retry 3 "https://hc.example.com/ping/your-check-uuid" > /dev/null
else
  # Ping failure - triggers immediate alert
  curl -fsS --retry 3 "https://hc.example.com/ping/your-check-uuid/fail" > /dev/null
fi
```

## Step 6: Configure Notification Channels

Navigate to **Integrations** in the Healthchecks dashboard to configure where alerts are sent:

- **Email**: Available once your SMTP settings are configured
- **Slack**: Paste a Slack Incoming Webhook URL
- **PagerDuty**: Click **Connect PagerDuty** and authorize the integration with your PagerDuty account
- **Telegram**: Set `TELEGRAM_BOT_NAME` and `TELEGRAM_TOKEN`, run `/opt/healthchecks/manage.py settelegramwebhook` inside the container, then connect the bot from **Integrations** after sending `/start` in Telegram

Once an integration is created, toggle it on for the checks in the same project that should use it.

## Step 7: Monitoring Container and System Jobs

For containerized jobs running in Docker, use the `curl` ping approach within your container's entrypoint or as a sidecar command. For system crons on the Docker host:

```cron
# /etc/cron.d/healthchecks-example
0 2 * * * root /usr/local/bin/nightly-backup.sh
```

Ensure the host has `curl` installed, or use `wget`:

```bash
wget -q "https://hc.example.com/ping/your-check-uuid" -O /dev/null
```

## Step 8: Updating Healthchecks

To update to the latest version, go to **Portainer > Stacks > healthchecks** and click **Pull and redeploy**. Django migrations run automatically on container start, so database schema updates are handled without manual intervention.

## Conclusion

A self-hosted Healthchecks.io instance deployed via Portainer gives you complete visibility into your scheduled tasks and cron jobs without relying on external services. PostgreSQL provides a durable backend for check history and notification logs. By instrumenting your scripts with a single `curl` command and configuring notification channels for Slack, PagerDuty, or email, you get immediate alerts when critical jobs fail silently. The Portainer stack interface makes it straightforward to update the instance, inspect logs, and manage environment variables as your monitoring needs grow.
