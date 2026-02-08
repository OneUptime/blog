# How to Run Grafana OnCall in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Grafana, OnCall, Incident Management, Alerting, DevOps, Monitoring

Description: Deploy Grafana OnCall in Docker to manage on-call schedules, alert routing, and incident response for your engineering team.

---

Grafana OnCall is an open-source incident response and on-call management tool. It handles alert routing, escalation policies, on-call schedules, and notifications through multiple channels like Slack, phone calls, SMS, and email. Originally developed by Amixr and acquired by Grafana Labs, it integrates tightly with the Grafana ecosystem but also works as a standalone incident management tool.

This guide covers deploying Grafana OnCall in Docker using the OSS (open-source) engine, connecting it to Grafana, and configuring alert routing and schedules.

## Architecture

Grafana OnCall consists of several components: the engine (Django-based API server), a Celery worker for background tasks, Redis for caching and task queuing, and a MySQL or PostgreSQL database. The Grafana OnCall plugin in Grafana provides the user interface.

```mermaid
graph LR
    A[Alertmanager] --> B[OnCall Engine]
    C[Grafana Alerts] --> B
    B --> D[Celery Worker]
    D --> E[Slack]
    D --> F[Phone/SMS]
    D --> G[Email]
    B --> H[MySQL/PostgreSQL]
    B --> I[Redis]
    J[Grafana UI] --> B
```

## Prerequisites

You need Docker and Docker Compose installed. Grafana OnCall OSS requires at least 2GB of RAM.

```bash
docker --version
docker compose version
```

## Docker Compose Setup

Create the complete `docker-compose.yml` with all necessary services.

```yaml
# docker-compose.yml - Grafana OnCall stack
version: "3.8"

services:
  # Grafana OnCall Engine - the main API server
  oncall-engine:
    image: grafana/oncall:latest
    restart: unless-stopped
    command: >
      sh -c "python manage.py migrate &&
             python manage.py oncall_setup &&
             uwsgi --ini uwsgi.ini"
    environment: &oncall-env
      # Database configuration
      DATABASE_TYPE: sqlite3
      # For production, use MySQL or PostgreSQL instead:
      # DATABASE_TYPE: mysql
      # MYSQL_HOST: mysql
      # MYSQL_PORT: 3306
      # MYSQL_DB_NAME: oncall
      # MYSQL_USER: oncall
      # MYSQL_PASSWORD: oncall_password

      # Redis for Celery task queue
      REDIS_URI: redis://redis:6379/0

      # Secret key for Django (change this in production)
      SECRET_KEY: your-secret-key-change-in-production

      # Base URL where OnCall is accessible
      BASE_URL: http://localhost:8080

      # Grafana connection settings
      GRAFANA_API_URL: http://grafana:3000

      # Celery broker
      BROKER_TYPE: redis
      CELERY_WORKER_QUEUE: default,critical,long,slack,telegram,webhook
    volumes:
      - oncall-data:/var/lib/oncall
    depends_on:
      - redis
    ports:
      - "8080:8080"
    networks:
      - oncall-net

  # Celery worker for background tasks (notifications, escalations)
  oncall-celery:
    image: grafana/oncall:latest
    restart: unless-stopped
    command: >
      sh -c "python manage.py migrate --run-syncdb &&
             celery -A engine worker -l info -c 4 -Q default,critical,long,slack,telegram,webhook"
    environment:
      <<: *oncall-env
    volumes:
      - oncall-data:/var/lib/oncall
    depends_on:
      - redis
      - oncall-engine
    networks:
      - oncall-net

  # Redis - task queue and caching
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - oncall-net

  # Grafana with the OnCall plugin
  grafana:
    image: grafana/grafana:10.4.0
    restart: unless-stopped
    environment:
      # Install the OnCall plugin on startup
      - GF_INSTALL_PLUGINS=grafana-oncall-app
      - GF_SECURITY_ADMIN_PASSWORD=admin
      # Allow embedding for the OnCall UI
      - GF_SECURITY_ALLOW_EMBEDDING=true
      - GF_SECURITY_COOKIE_SAMESITE=lax
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - oncall-engine
    networks:
      - oncall-net

volumes:
  oncall-data:
  redis-data:
  grafana-data:

networks:
  oncall-net:
    driver: bridge
```

## Starting the Stack

```bash
# Start all services
docker compose up -d

# Wait for the engine to finish migrations (watch the logs)
docker compose logs -f oncall-engine
```

The engine takes about 30-60 seconds to run migrations and start. Once you see the uwsgi workers spawning, the service is ready.

## Connecting Grafana to OnCall

Open Grafana at `http://localhost:3000` and log in with admin/admin. Then configure the OnCall plugin.

1. Navigate to Administration > Plugins and search for "Grafana OnCall"
2. Click on the plugin and click "Enable"
3. In the plugin configuration, set the OnCall API URL to `http://oncall-engine:8080`
4. Click "Connect" to establish the connection

After connecting, the OnCall section appears in Grafana's sidebar menu.

## Setting Up On-Call Schedules

Navigate to OnCall > Schedules in Grafana. Create a new schedule for your team.

A typical rotation schedule might look like this: two engineers rotating weekly, with a primary and secondary on-call. The primary handles alerts first, and if they do not acknowledge within 10 minutes, the alert escalates to the secondary.

You can define schedules using the web UI or by importing iCal files from your team's calendar.

## Creating Escalation Chains

Escalation chains define what happens when an alert fires. Navigate to OnCall > Escalation Chains.

A standard escalation chain:

1. **Step 1**: Notify the current on-call engineer via Slack and push notification. Wait 5 minutes.
2. **Step 2**: If not acknowledged, send an SMS and phone call to the on-call engineer. Wait 10 minutes.
3. **Step 3**: If still not acknowledged, notify the secondary on-call and the team lead.
4. **Step 4**: If still unresolved after 30 minutes, notify the engineering manager.

## Configuring Alert Integrations

OnCall accepts alerts from multiple sources. The most common integrations are Alertmanager, Grafana Alerts, and generic webhooks.

For Alertmanager integration, create an integration in OnCall and configure Alertmanager to send alerts to it.

```yaml
# alertmanager.yml - Route alerts to Grafana OnCall
route:
  receiver: "grafana-oncall"
  group_by: ["alertname", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: "grafana-oncall"
    webhook_configs:
      - url: "http://oncall-engine:8080/integrations/v1/alertmanager/YOUR_INTEGRATION_TOKEN/"
        send_resolved: true
```

For direct Grafana Alert integration, simply select OnCall as a contact point in Grafana's alerting configuration. This is the easiest path since everything runs in the same stack.

## Slack Integration

Slack integration enables alerts, acknowledgments, and resolution directly from Slack channels.

1. Create a Slack app at `https://api.slack.com/apps`
2. Add the required OAuth scopes: `channels:read`, `chat:write`, `users:read`, `users:read.email`
3. Install the app to your workspace
4. Add the Slack bot token and signing secret to OnCall's environment variables

```yaml
# Add these to the environment section of oncall-engine and oncall-celery
- SLACK_API_TOKEN=xoxb-your-slack-bot-token
- SLACK_SIGNING_SECRET=your-slack-signing-secret
```

## Testing the Alert Pipeline

Send a test alert through the webhook integration to verify everything works.

```bash
# Send a test alert to the webhook integration
curl -X POST http://localhost:8080/integrations/v1/webhook/YOUR_INTEGRATION_TOKEN/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert - High CPU Usage",
    "message": "CPU usage on web-server-01 exceeded 90% for 5 minutes",
    "severity": "critical",
    "source": "prometheus"
  }'
```

The alert should appear in OnCall's alert groups, and the configured escalation chain should trigger notifications to the on-call engineer.

## Production Considerations

For production use, switch from SQLite to MySQL or PostgreSQL for better performance under concurrent load. Set a strong `SECRET_KEY` and enable HTTPS on the reverse proxy. Configure proper backup schedules for the database and Redis data.

## Cleanup

```bash
docker compose down -v
```

## Conclusion

Grafana OnCall provides a solid on-call management and alert routing solution that integrates naturally with the Grafana ecosystem. The Docker deployment gives you a self-hosted alternative to commercial tools like PagerDuty and OpsGenie. For teams looking for a unified platform that combines on-call management with uptime monitoring, status pages, and incident tracking, [OneUptime](https://oneuptime.com) provides all of these features in a single integrated tool.
