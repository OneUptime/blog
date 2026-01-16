# How to Set Up Docker Container Auto-Updates with Watchtower

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Watchtower, DevOps, Automation, Container Management

Description: Learn how to automatically update Docker containers when new images are available using Watchtower, including configuration options, notifications, and production considerations.

---

Keeping containers up-to-date with the latest images is tedious if done manually. Watchtower monitors your running containers and automatically updates them when new images are pushed to the registry. It's like having an automated deployment system for your Docker environment.

## Quick Start

Run Watchtower to monitor and update all containers:

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower
```

Watchtower will:
1. Poll registries for new images every 24 hours (default)
2. Pull new images when available
3. Stop the old container
4. Start a new container with the same configuration
5. Remove the old container

## Docker Compose Setup

```yaml
version: '3.8'

services:
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=3600
```

## Configuration Options

### Polling Interval

```bash
# Check every hour
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 3600

# Or using environment variable
docker run -d \
  -e WATCHTOWER_POLL_INTERVAL=3600 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower
```

### Schedule Updates (Cron)

```bash
# Update at 4 AM every day
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --schedule "0 0 4 * * *"
```

Cron format: `second minute hour day-of-month month day-of-week`

### Clean Up Old Images

```bash
docker run -d \
  --name watchtower \
  -e WATCHTOWER_CLEANUP=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower
```

## Selective Container Updates

### Monitor Specific Containers Only

```bash
# Only update containers named "web" and "api"
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower web api
```

### Exclude Containers with Labels

Add labels to containers you don't want updated:

```bash
docker run -d \
  --name database \
  --label com.centurylinklabs.watchtower.enable=false \
  postgres:15
```

```yaml
# docker-compose.yml
services:
  database:
    image: postgres:15
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

### Include Only Labeled Containers

```bash
# Only update containers with enable=true label
docker run -d \
  --name watchtower \
  -e WATCHTOWER_LABEL_ENABLE=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower
```

Then label containers to include:
```bash
docker run -d \
  --label com.centurylinklabs.watchtower.enable=true \
  my-app
```

## Notifications

### Slack Notifications

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_NOTIFICATION_URL=slack://token-a/token-b/token-c
      - WATCHTOWER_NOTIFICATIONS_LEVEL=info
```

### Email Notifications

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_NOTIFICATIONS=email
      - WATCHTOWER_NOTIFICATION_EMAIL_FROM=watchtower@example.com
      - WATCHTOWER_NOTIFICATION_EMAIL_TO=admin@example.com
      - WATCHTOWER_NOTIFICATION_EMAIL_SERVER=smtp.example.com
      - WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PORT=587
      - WATCHTOWER_NOTIFICATION_EMAIL_SERVER_USER=user
      - WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PASSWORD=password
```

### Shoutrrr (Multiple Services)

Watchtower uses Shoutrrr for notifications, supporting many services:

```yaml
environment:
  # Discord
  - WATCHTOWER_NOTIFICATION_URL=discord://token@channel

  # Telegram
  - WATCHTOWER_NOTIFICATION_URL=telegram://token@telegram?chats=chat-id

  # Microsoft Teams
  - WATCHTOWER_NOTIFICATION_URL=teams://group@tenant/altId/groupOwner?host=example.webhook.office.com

  # Gotify
  - WATCHTOWER_NOTIFICATION_URL=gotify://gotify.example.com/token
```

## Private Registry Authentication

### Docker Config

```bash
# Login to registry first
docker login registry.example.com

# Mount Docker config
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $HOME/.docker/config.json:/config.json:ro \
  containrrr/watchtower
```

### Environment Variables

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - REPO_USER=username
      - REPO_PASS=password
```

### Multiple Registries

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./config.json:/config.json:ro
```

Create `config.json`:
```json
{
  "auths": {
    "registry.example.com": {
      "auth": "base64encodedcredentials"
    },
    "ghcr.io": {
      "auth": "base64encodedcredentials"
    }
  }
}
```

## Run Once Mode

Manually trigger updates without keeping Watchtower running:

```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --run-once
```

Useful for:
- CI/CD pipelines
- Scheduled tasks (cron on host)
- Manual deployment triggers

## Rolling Restarts

### Per-Container Stop Signal

Some containers need specific signals for graceful shutdown:

```bash
docker run -d \
  --label com.centurylinklabs.watchtower.stop-signal=SIGTERM \
  my-app
```

### Lifecycle Hooks

Run commands before and after updates:

```yaml
services:
  app:
    image: my-app
    labels:
      - "com.centurylinklabs.watchtower.lifecycle.pre-update=/scripts/pre-update.sh"
      - "com.centurylinklabs.watchtower.lifecycle.post-update=/scripts/post-update.sh"
```

## Complete Production Example

```yaml
version: '3.8'

services:
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - $HOME/.docker/config.json:/config.json:ro
    environment:
      # Update schedule - 4 AM daily
      - WATCHTOWER_SCHEDULE=0 0 4 * * *
      # Clean up old images
      - WATCHTOWER_CLEANUP=true
      # Only update labeled containers
      - WATCHTOWER_LABEL_ENABLE=true
      # Notifications
      - WATCHTOWER_NOTIFICATION_URL=slack://xoxb-xxx/xxx/xxx
      - WATCHTOWER_NOTIFICATIONS_LEVEL=info
      # Rolling updates
      - WATCHTOWER_ROLLING_RESTART=true
      # Timeout for stopping containers
      - WATCHTOWER_TIMEOUT=60s
    labels:
      # Don't let watchtower update itself automatically
      - "com.centurylinklabs.watchtower.enable=false"

  web:
    image: my-app:latest
    restart: unless-stopped
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.stop-signal=SIGTERM"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  database:
    image: postgres:15
    restart: unless-stopped
    labels:
      # Don't auto-update database
      - "com.centurylinklabs.watchtower.enable=false"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## Monitoring Watchtower

### Check Logs

```bash
docker logs watchtower

# Follow logs
docker logs -f watchtower
```

### HTTP API

Enable the API for monitoring:

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    ports:
      - "8080:8080"
    environment:
      - WATCHTOWER_HTTP_API_UPDATE=true
      - WATCHTOWER_HTTP_API_TOKEN=your-secret-token
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

Trigger update via API:
```bash
curl -H "Authorization: Bearer your-secret-token" localhost:8080/v1/update
```

## Best Practices

### 1. Don't Auto-Update Everything

```yaml
# Critical services - exclude from auto-update
database:
  labels:
    - "com.centurylinklabs.watchtower.enable=false"

# Stateless services - safe to auto-update
api:
  labels:
    - "com.centurylinklabs.watchtower.enable=true"
```

### 2. Use Specific Tags for Critical Services

```yaml
# Don't use 'latest' for databases
database:
  image: postgres:15.4  # Specific version

# 'latest' is OK for services you want auto-updated
web:
  image: my-app:latest
```

### 3. Schedule Updates During Low Traffic

```yaml
environment:
  # Update at 4 AM on Sundays
  - WATCHTOWER_SCHEDULE=0 0 4 * * SUN
```

### 4. Enable Notifications

Always know when updates happen:

```yaml
environment:
  - WATCHTOWER_NOTIFICATION_URL=slack://...
  - WATCHTOWER_NOTIFICATIONS_LEVEL=info
```

### 5. Test in Staging First

Run Watchtower in staging environment before production to catch issues with new images.

## When NOT to Use Watchtower

- **Production databases**: Always update manually with proper backup/migration
- **Stateful applications**: May need data migration between versions
- **Regulated environments**: Changes need audit trail
- **Complex orchestration**: Use Kubernetes, Docker Swarm, or CI/CD instead

## Alternatives

| Tool | Best For |
|------|----------|
| Watchtower | Simple Docker deployments |
| Docker Swarm | Built-in rolling updates |
| Kubernetes | Complex orchestration |
| CI/CD pipelines | Controlled deployments |
| Diun | Notification-only (no auto-update) |

## Summary

| Configuration | Environment Variable | Command Flag |
|--------------|---------------------|--------------|
| Poll interval | `WATCHTOWER_POLL_INTERVAL=3600` | `--interval 3600` |
| Schedule | `WATCHTOWER_SCHEDULE=0 0 4 * * *` | `--schedule "..."` |
| Cleanup images | `WATCHTOWER_CLEANUP=true` | `--cleanup` |
| Label filter | `WATCHTOWER_LABEL_ENABLE=true` | `--label-enable` |
| Run once | - | `--run-once` |
| Notifications | `WATCHTOWER_NOTIFICATION_URL=...` | - |

Watchtower simplifies container updates for development and simple production environments. For complex deployments, combine it with proper CI/CD pipelines, health checks, and selective container targeting to maintain reliability while staying current.
