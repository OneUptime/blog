# How to Exclude Containers from Watchtower in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Docker, Container, DevOps, Auto-Update

Description: Learn how to exclude specific containers from Watchtower auto-updates using Docker labels, environment variables, and Portainer's interface.

---

Watchtower automatically updates running Docker containers to the latest image versions. However, some containers - like databases, stateful services, or pinned-version dependencies - should never be auto-updated. This guide covers how to exclude containers from Watchtower updates using Docker labels in Portainer.

---

## How Watchtower Exclusion Works

Watchtower checks container labels to determine whether to include or exclude a container from automatic updates:

| Label | Effect |
|-------|--------|
| `com.centurylinklabs.watchtower.enable=false` | Exclude from updates |
| `com.centurylinklabs.watchtower.enable=true` | Explicitly include (when running in opt-in mode) |

---

## Excluding a Container via Docker Labels

### In Docker Compose

```yaml
# docker-compose.yml

services:
  # This container will be auto-updated
  nginx:
    image: nginx:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  # This container will be excluded from Watchtower
  postgres:
    image: postgres:15.3
    environment:
      POSTGRES_PASSWORD: secret
    labels:
      - "com.centurylinklabs.watchtower.enable=false"

  # This container will also be excluded
  redis:
    image: redis:7.0.5
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

### Using docker run

```bash
# Exclude a container by adding the label at run time
docker run -d \
  --name postgres \
  --label "com.centurylinklabs.watchtower.enable=false" \
  -e POSTGRES_PASSWORD=secret \
  postgres:15.3
```

---

## Excluding Containers in Portainer

### Method 1: Edit Stack Labels in Portainer

1. Open Portainer → **Stacks**
2. Select your stack → **Editor** (for stacks deployed with the Web Editor or uploaded; Git-backed stacks must be updated in Git or detached first)
3. Add the label to the service:
   ```yaml
   labels:
     - "com.centurylinklabs.watchtower.enable=false"
   ```
4. Click **Update the stack**

### Method 2: Container Labels via Portainer UI

1. Go to **Containers** → select the container
2. Click **Duplicate/Edit**
3. Under **Labels**, add:
   - Name: `com.centurylinklabs.watchtower.enable`
   - Value: `false`
4. Deploy the updated container

---

## Running Watchtower in Opt-In Mode

By default, Watchtower updates all containers. In opt-in mode, only containers with `enable=true` are updated:

```yaml
# docker-compose.yml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Only update containers with enable=true label
      - WATCHTOWER_LABEL_ENABLE=true
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=300
    restart: always
```

Now only explicitly labeled containers will be updated:

```yaml
  my-app:
    image: myapp:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"  # Will update
```

---

## Scope-Based Exclusion

Use Watchtower scopes to manage multiple Watchtower instances:

```yaml
services:
  watchtower-prod:
    image: containrrr/watchtower
    command: --scope prod
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
    labels:
      - "com.centurylinklabs.watchtower.scope=prod"

  app-prod:
    image: myapp:latest
    labels:
      - "com.centurylinklabs.watchtower.scope=prod"

  app-dev:
    image: myapp:dev-latest
    labels:
      - "com.centurylinklabs.watchtower.scope=dev"
      # Not in prod scope - will not be touched by watchtower-prod
```

---

## Monitoring Watchtower Updates

```bash
# View Watchtower logs to see update activity
docker logs watchtower

# Run Watchtower with notification (e.g., Slack)
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WATCHTOWER_NOTIFICATIONS=slack \
  -e WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=https://hooks.slack.com/... \
  containrrr/watchtower
```

---

## Common Containers to Exclude

| Container | Reason to Exclude |
|-----------|-------------------|
| Databases (PostgreSQL, MySQL) | Data migration required between versions |
| Message brokers (Kafka, RabbitMQ) | Version pinning for compatibility |
| Production stateful services | Controlled upgrades needed |
| Infrastructure tools (Prometheus, Grafana) | Config compatibility testing required |

---

## Best Practices

1. **Use opt-in mode in production** - only explicitly labeled containers get updated
2. **Exclude all stateful services** - databases, volumes, message queues
3. **Pin versions** rather than using `latest` for production containers
4. **Monitor Watchtower logs** - integrate with your alerting system
5. **Test updates in staging** before allowing them in production

---

## Conclusion

Watchtower's label-based exclusion system gives fine-grained control over which containers auto-update. In Portainer, add the `com.centurylinklabs.watchtower.enable=false` label through the stack editor or container configuration to protect critical containers from unplanned updates.

---

*Monitor your Docker containers with [OneUptime](https://oneuptime.com) - uptime monitoring with container health checks.*
