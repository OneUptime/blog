# How to Set Up Docker Container Auto-Healing Without Orchestration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Auto-Healing, Health Checks, Production, Reliability, DevOps

Description: Implement automatic container recovery and self-healing for Docker without Kubernetes using health checks and custom watchdog scripts.

---

Kubernetes restarts unhealthy pods automatically. Docker Swarm does the same for its services. But if you run plain Docker, containers that become unhealthy just sit there doing nothing useful. Docker will restart containers that crash (with the right restart policy), but it will not restart a container that is running but unhealthy - stuck in a deadlock, out of memory at the application level, or unable to connect to its database.

This guide builds an auto-healing system for standalone Docker using health checks and a watchdog process.

## Docker Health Checks

The foundation of auto-healing is health checks. Docker supports built-in health checks that periodically test whether a container is working correctly.

Run a container with a health check:

```bash
# Start an Nginx container with an HTTP health check
docker run -d \
  --name web \
  --restart unless-stopped \
  -p 8080:80 \
  --health-cmd="curl -f http://localhost:80/ || exit 1" \
  --health-interval=15s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=30s \
  nginx:alpine
```

The health check parameters explained:

- `--health-cmd` - The command to run inside the container to check health
- `--health-interval` - How often to run the check (15 seconds)
- `--health-timeout` - How long to wait for the check to complete (5 seconds)
- `--health-retries` - How many consecutive failures before marking unhealthy (3)
- `--health-start-period` - Grace period after start before checks count (30 seconds)

Check the health status:

```bash
# View the container's health status
docker inspect --format='{{.State.Health.Status}}' web
```

Possible values are `starting`, `healthy`, and `unhealthy`.

## Health Checks in Dockerfiles

Define health checks directly in your Dockerfiles for consistent behavior:

```dockerfile
# Dockerfile with a built-in health check
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Health check that tests the application's /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

For different types of applications, use different health check commands:

```dockerfile
# Health check for a PostgreSQL container
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres || exit 1

# Health check for a Redis container
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD redis-cli ping | grep -q PONG || exit 1

# Health check for a container that writes to a file
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD test $(find /app/heartbeat -mmin -1 | wc -l) -gt 0 || exit 1
```

## The Problem: Docker Does Not Auto-Heal

Here is the gap. Docker marks a container as unhealthy, but it does not do anything about it. The container keeps running in its broken state. The `--restart` policy only kicks in when the container process exits, not when health checks fail.

Try it yourself:

```bash
# Start a container with a health check that will fail
docker run -d \
  --name broken-app \
  --restart unless-stopped \
  --health-cmd="curl -f http://localhost:8080/health || exit 1" \
  --health-interval=5s \
  --health-timeout=3s \
  --health-retries=2 \
  alpine:latest \
  sleep infinity
```

This container runs `sleep infinity`, which keeps it alive, but the health check fails because nothing listens on port 8080. After a few seconds, Docker marks it unhealthy, but the container stays running.

```bash
# Check the status - it will show "unhealthy" but container keeps running
docker inspect --format='{{.State.Health.Status}}' broken-app
```

## Building a Watchdog Script

The solution is a watchdog process that monitors container health and restarts unhealthy containers.

```bash
#!/bin/bash
# docker-autoheal.sh - Watchdog that restarts unhealthy Docker containers
# Run this as a systemd service or via cron

LOG_FILE="/var/log/docker-autoheal.log"
CHECK_INTERVAL=30  # seconds between checks
RESTART_TIMEOUT=60  # seconds to wait after restarting before checking again

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Docker auto-heal watchdog started"

while true; do
    # Find all containers with health checks that are currently unhealthy
    UNHEALTHY=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")

    if [ -n "$UNHEALTHY" ]; then
        for CONTAINER in $UNHEALTHY; do
            log "UNHEALTHY: $CONTAINER - restarting"

            # Get container info for logging
            IMAGE=$(docker inspect --format='{{.Config.Image}}' "$CONTAINER")
            log "  Image: $IMAGE"

            # Restart the container
            docker restart "$CONTAINER" --time 10

            # Log the restart event
            log "  Restarted $CONTAINER successfully"

            # Wait a bit before checking the next container
            sleep 5

            # Check if it came back healthy
            NEW_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null)
            log "  New status: $NEW_STATUS"
        done

        # Wait longer after restarts to let containers stabilize
        sleep "$RESTART_TIMEOUT"
    else
        sleep "$CHECK_INTERVAL"
    fi
done
```

Save and run the watchdog:

```bash
# Make the watchdog executable
chmod +x /usr/local/bin/docker-autoheal.sh
```

## Running the Watchdog as a Systemd Service

Create a systemd service file so the watchdog runs automatically and survives reboots:

```ini
# /etc/systemd/system/docker-autoheal.service
[Unit]
Description=Docker Container Auto-Heal Watchdog
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/docker-autoheal.sh
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=docker-autoheal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Enable the auto-heal service to start on boot
sudo systemctl daemon-reload
sudo systemctl enable docker-autoheal.service
sudo systemctl start docker-autoheal.service

# Check it is running
sudo systemctl status docker-autoheal.service
```

## Using Docker Autoheal Container

Instead of a bash script, you can use the `willfarrell/autoheal` container, which does the same thing but runs as a Docker container itself:

```bash
# Run the autoheal container - it monitors and restarts unhealthy containers
docker run -d \
  --name autoheal \
  --restart always \
  -e AUTOHEAL_CONTAINER_LABEL=all \
  -e AUTOHEAL_INTERVAL=30 \
  -e AUTOHEAL_START_PERIOD=60 \
  -e AUTOHEAL_DEFAULT_STOP_TIMEOUT=10 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  willfarrell/autoheal:latest
```

The environment variables control behavior:

- `AUTOHEAL_CONTAINER_LABEL=all` - Monitor all containers with health checks
- `AUTOHEAL_INTERVAL=30` - Check every 30 seconds
- `AUTOHEAL_START_PERIOD=60` - Wait 60 seconds after container start before healing
- `AUTOHEAL_DEFAULT_STOP_TIMEOUT=10` - Wait 10 seconds for graceful shutdown during restart

To only auto-heal specific containers, change the label setting:

```bash
# Only auto-heal containers with a specific label
docker run -d \
  --name autoheal \
  --restart always \
  -e AUTOHEAL_CONTAINER_LABEL=autoheal \
  -v /var/run/docker.sock:/var/run/docker.sock \
  willfarrell/autoheal:latest
```

Then label the containers you want to protect:

```bash
# Run a container with the autoheal label
docker run -d \
  --name my-app \
  --restart unless-stopped \
  --label autoheal=true \
  --health-cmd="curl -f http://localhost:8080/health || exit 1" \
  --health-interval=15s \
  --health-retries=3 \
  myapp:latest
```

## Advanced Health Checks

Simple HTTP checks are a good start, but deeper health checks catch more problems.

Check database connectivity from your application container:

```bash
# Health check that verifies both the app and its database connection
docker run -d \
  --name api \
  --health-cmd='curl -sf http://localhost:8080/health/deep || exit 1' \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  myapi:latest
```

Your `/health/deep` endpoint should verify:
- The application process is responsive
- Database connections are working
- Required external services are reachable
- Disk space is adequate
- Memory usage is within acceptable bounds

Example health check endpoint in a Node.js application:

```javascript
// health.js - Deep health check endpoint
app.get('/health/deep', async (req, res) => {
  const checks = {};

  // Check database connectivity
  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'failed';
  }

  // Check Redis connectivity
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch (err) {
    checks.redis = 'failed';
  }

  // Check disk space
  const diskUsage = getDiskUsagePercent();
  checks.disk = diskUsage < 90 ? 'ok' : 'failed';

  // Determine overall health
  const healthy = Object.values(checks).every(v => v === 'ok');
  res.status(healthy ? 200 : 503).json(checks);
});
```

## Docker Compose with Auto-Healing

Here is a complete Compose setup with health checks and the autoheal container:

```yaml
# docker-compose.yml - Application stack with auto-healing
version: "3.9"

services:
  app:
    image: myapp:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    labels:
      - "autoheal=true"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    labels:
      - "autoheal=true"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # The auto-healer watches other containers and restarts unhealthy ones
  autoheal:
    image: willfarrell/autoheal:latest
    restart: always
    environment:
      AUTOHEAL_CONTAINER_LABEL: "autoheal"
      AUTOHEAL_INTERVAL: 30
      AUTOHEAL_START_PERIOD: 60
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

Start the stack:

```bash
# Start the application with auto-healing
docker compose up -d

# Watch the autoheal logs
docker logs -f autoheal
```

## Monitoring Auto-Heal Events

Track how often containers are being restarted. Frequent restarts indicate an underlying problem that needs fixing, not just healing.

```bash
# Check recent restart events from the autoheal log
docker logs autoheal --since 24h 2>&1 | grep -i restart

# Check a specific container's restart count
docker inspect --format='{{.RestartCount}}' my-app
```

Auto-healing is a safety net, not a solution. If a container keeps getting restarted, investigate the root cause. But having that safety net means your services recover from transient failures automatically, and you get to sleep through the night instead of responding to pages.
