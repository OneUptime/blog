# How to Run Grafana OnCall in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Grafana, OnCall, Incident Management, Alerting, DevOps, Monitoring

Description: Deploy Grafana OnCall in Docker to manage on-call schedules, alert routing, and incident response for your engineering team.

---

Grafana OnCall is an open-source incident response and on-call management tool. It handles alert routing, escalation policies, on-call schedules, and notifications through multiple channels like Slack, phone calls, SMS, and email. Originally developed by Amixr and acquired by Grafana Labs, it integrates tightly with the Grafana ecosystem but also works as a standalone incident management tool. Grafana OnCall OSS entered maintenance mode on March 11, 2025 and was archived on March 24, 2026, so new production deployments should evaluate a maintained fork or Grafana Cloud IRM.

This guide covers deploying Grafana OnCall in Docker using the archived OSS (open-source) engine, connecting it to Grafana, and configuring alert routing and schedules.

## Architecture

Grafana OnCall consists of several components: the engine (Django-based API server), a Celery worker for background tasks, Redis for caching and task queuing, and a database. The hobby Docker Compose setup uses SQLite, while reliable production deployments should use the official Helm chart with an external database, Redis, and RabbitMQ. The Grafana OnCall plugin in Grafana provides the user interface.

```mermaid
graph LR
    A[Alertmanager] --> B[OnCall Engine]
    C[Grafana Alerts] --> B
    B --> D[Celery Worker]
    D --> E[Slack]
    D --> F[Phone/SMS]
    D --> G[Email]
    B --> H[Database]
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

services:
  # Grafana OnCall Engine - the main API server
  oncall-engine:
    image: grafana/oncall
    restart: unless-stopped
    command: sh -c "uwsgi --ini uwsgi.ini"
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
      SECRET_KEY: your-secret-key-change-in-production-32-chars-minimum

      # Hobby Docker settings
      DJANGO_SETTINGS_MODULE: settings.hobby

      # Base URL where OnCall is accessible
      BASE_URL: http://localhost:8080

      # Grafana connection settings
      GRAFANA_API_URL: http://grafana:3000

      # Celery broker
      BROKER_TYPE: redis
      CELERY_WORKER_QUEUE: default,critical,long,slack,telegram,mattermost,webhook,retry,celery,grafana
      CELERY_WORKER_CONCURRENCY: "1"
      CELERY_WORKER_MAX_TASKS_PER_CHILD: "100"
      CELERY_WORKER_SHUTDOWN_INTERVAL: 65m
      CELERY_WORKER_BEAT_ENABLED: "True"
    volumes:
      - oncall-data:/var/lib/oncall
    depends_on:
      oncall-db-migration:
        condition: service_completed_successfully
      redis:
        condition: service_healthy
    ports:
      - "8080:8080"
    networks:
      - oncall-net

  # Celery worker for background tasks (notifications, escalations)
  oncall-celery:
    image: grafana/oncall
    restart: unless-stopped
    command: sh -c "./celery_with_exporter.sh"
    environment:
      <<: *oncall-env
    volumes:
      - oncall-data:/var/lib/oncall
    depends_on:
      oncall-db-migration:
        condition: service_completed_successfully
      redis:
        condition: service_healthy
    networks:
      - oncall-net

  # Run database migrations before starting the engine and worker
  oncall-db-migration:
    image: grafana/oncall
    command: python manage.py migrate --noinput
    environment:
      <<: *oncall-env
    volumes:
      - oncall-data:/var/lib/oncall
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - oncall-net

  # Redis - task queue and caching
  redis:
    image: redis:7.0.15
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      timeout: 5s
      interval: 5s
      retries: 10
    networks:
      - oncall-net

  # Grafana with the OnCall plugin
  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    environment:
      # Install the OnCall plugin on startup
      GF_INSTALL_PLUGINS: grafana-oncall-app
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_FEATURE_TOGGLES_ENABLE: externalServiceAccounts
      GF_AUTH_MANAGED_SERVICE_ACCOUNTS_ENABLED: "true"
      GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS: grafana-oncall-app
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
        max_alerts: 100
```

For direct Grafana Alert integration, create a Grafana Alerting integration from OnCall's Integrations tab and use its Quick connect flow to create a Grafana contact point. Then connect that contact point to a notification policy in Grafana Alerting.

## Slack Integration

Slack integration enables alerts, acknowledgments, and resolution directly from Slack channels.

1. Create a Slack app at `https://api.slack.com/apps`
2. Enable the Slack integration in OnCall by setting `FEATURE_SLACK_INTEGRATION_ENABLED=True`
3. Configure the Slack app credentials in OnCall's environment variables
4. Install the integration from OnCall's ChatOps settings

```yaml
# Add these to the environment section of oncall-engine and oncall-celery
FEATURE_SLACK_INTEGRATION_ENABLED: "True"
SLACK_CLIENT_OAUTH_ID: your-slack-client-id
SLACK_CLIENT_OAUTH_SECRET: your-slack-client-secret
SLACK_SIGNING_SECRET: your-slack-signing-secret
SLACK_INSTALL_RETURN_REDIRECT_HOST: https://your-public-oncall-url
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

Cloud Connection for Grafana OnCall OSS ended on March 24, 2026. If you continue to run the archived OSS project, configure third-party providers such as Twilio for phone and SMS notifications and use a third-party push notification path instead of Grafana Cloud relay.

## Cleanup

```bash
docker compose down -v
```

## Conclusion

Grafana OnCall provides a solid on-call management and alert routing solution that integrates naturally with the Grafana ecosystem. The Docker deployment gives you a self-hosted alternative to commercial tools like PagerDuty and OpsGenie. For teams looking for a unified platform that combines on-call management with uptime monitoring, status pages, and incident tracking, [OneUptime](https://oneuptime.com) provides all of these features in a single integrated tool.
