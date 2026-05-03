# How to Deploy Healthchecks.io via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, HealthCheck, Cron Monitoring, Docker, Self-Hosting, Alerting

Description: Learn how to deploy a self-hosted Healthchecks.io instance via Portainer for monitoring cron jobs and scheduled tasks with ping-based dead man's switch alerts.

---

Healthchecks.io monitors whether your cron jobs and scheduled tasks are running on time. Each check gets a unique ping URL; if a ping is not received within the expected window, you get an alert. The open-source version can be self-hosted easily via Portainer.

## Prerequisites

- Portainer running
- An SMTP server for email alerts
- At least 256MB RAM

## Compose Stack

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: hc
      POSTGRES_USER: hc
      POSTGRES_PASSWORD: hcpass           # Change this
    volumes:
      - hc_db:/var/lib/postgresql/data

  healthchecks:
    image: healthchecks/healthchecks:latest
    container_name: healthchecks
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "8000:8000"
    environment:
      SECRET_KEY: changeme-50-char-string   # Change this
      ALLOWED_HOSTS: healthchecks.example.com,localhost
      DEFAULT_FROM_EMAIL: noreply@example.com
      EMAIL_HOST: smtp.example.com
      EMAIL_PORT: 587
      EMAIL_HOST_USER: noreply@example.com
      EMAIL_HOST_PASSWORD: emailpass        # Change this
      EMAIL_USE_TLS: "True"
      DB: postgres
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: hc
      DB_USER: hc
      DB_PASSWORD: hcpass                  # Must match db service
      SITE_ROOT: https://healthchecks.example.com
      SITE_NAME: My Healthchecks

volumes:
  hc_db:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `healthchecks`.
3. Update all environment variables.
4. Click **Deploy the stack**.

Open `http://<host>:8000` and create a superuser:

```bash
docker exec -it healthchecks ./manage.py createsuperuser
```

## Monitoring a Cron Job

Create a check in the Healthchecks UI and copy the ping URL. Add a ping to your cron job:

```bash
# Example crontab entry: run backup every day at 2 AM

# The curl at the end pings Healthchecks on success
0 2 * * * /usr/local/bin/backup.sh && curl -fsS --retry 3 https://healthchecks.example.com/ping/your-uuid
```

If the backup script fails or never runs, Healthchecks will send an alert after the grace period expires.

## Monitoring

Use OneUptime to monitor `http://<host>:8000` for HTTP 200. Healthchecks downtime means you lose visibility into all your scheduled jobs - alert immediately on any outage.
