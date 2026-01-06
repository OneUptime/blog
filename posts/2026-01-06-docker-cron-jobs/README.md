# How to Run Cron Jobs Inside Docker Containers (The Right Way)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Automation, Cron, Scheduling

Description: Implement reliable scheduled tasks using Supercronic, Ofelia, or host cron with docker exec, and understand why traditional cron fails in containers.

Running scheduled tasks in Docker seems straightforward until you realize traditional cron doesn't work the way you expect in containers. Environment variables disappear, logs vanish into the void, and zombie processes accumulate. This guide covers the patterns that actually work.

---

## Why Traditional Cron Fails in Containers

### Problem 1: Environment Variables

Cron runs with a minimal environment. Your carefully configured `DATABASE_URL` won't be there:

```dockerfile
# This DOESN'T work as expected
FROM ubuntu
RUN apt-get update && apt-get install -y cron
COPY crontab /etc/cron.d/myapp
CMD ["cron", "-f"]
```

```bash
# crontab
* * * * * echo $DATABASE_URL >> /var/log/test.log
# Output: (empty)
```

### Problem 2: PID 1 Issues

Cron as PID 1 doesn't handle signals properly. `docker stop` hangs or kills processes abruptly.

### Problem 3: Logging

Cron logs to syslog by default, which isn't running in most containers. Your job output disappears.

### Problem 4: Single Process Philosophy

Containers should run one process. Running cron alongside your app violates this principle and complicates health checks.

---

## Solution 1: Supercronic (Recommended)

Supercronic is a cron replacement designed for containers. It solves all the problems above.

### Basic Setup

```dockerfile
FROM alpine:3.19

# Install supercronic
ARG SUPERCRONIC_VERSION=0.2.29
ARG TARGETARCH
RUN wget -q "https://github.com/aptible/supercronic/releases/download/v${SUPERCRONIC_VERSION}/supercronic-linux-${TARGETARCH}" \
    -O /usr/local/bin/supercronic && \
    chmod +x /usr/local/bin/supercronic

# Add crontab
COPY crontab /etc/crontab

CMD ["supercronic", "/etc/crontab"]
```

```bash
# crontab
# Run every minute
* * * * * echo "Environment: $DATABASE_URL"

# Run daily at 2 AM
0 2 * * * /app/scripts/backup.sh

# Run every 5 minutes
*/5 * * * * /app/scripts/healthcheck.sh
```

### Why Supercronic Works

- Inherits all environment variables from the container
- Logs to stdout/stderr (visible in `docker logs`)
- Handles signals properly (graceful shutdown)
- Supports standard crontab syntax
- Lightweight (~5MB binary)

### Docker Compose Example

```yaml
services:
  app:
    image: myapp:latest
    environment:
      - DATABASE_URL=postgres://db:5432/app

  cron:
    build:
      context: .
      dockerfile: Dockerfile.cron
    environment:
      - DATABASE_URL=postgres://db:5432/app
    depends_on:
      - db

  db:
    image: postgres:16
```

```dockerfile
# Dockerfile.cron
FROM myapp:latest

# Install supercronic
COPY --from=aptible/supercronic:latest /usr/local/bin/supercronic /usr/local/bin/supercronic

COPY crontab /etc/crontab

CMD ["supercronic", "/etc/crontab"]
```

---

## Solution 2: Ofelia (Docker-Native Scheduler)

Ofelia runs as a separate container and executes jobs in other containers via `docker exec`.

### Basic Setup

```yaml
# docker-compose.yml
services:
  ofelia:
    image: mcuadros/ofelia:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: daemon --docker
    depends_on:
      - app

  app:
    image: myapp:latest
    labels:
      # Every minute
      ofelia.enabled: "true"
      ofelia.job-exec.cleanup.schedule: "*/5 * * * *"
      ofelia.job-exec.cleanup.command: "node /app/scripts/cleanup.js"

      # Daily backup at 2 AM
      ofelia.job-exec.backup.schedule: "0 2 * * *"
      ofelia.job-exec.backup.command: "/app/scripts/backup.sh"
```

### Configuration File Alternative

```yaml
services:
  ofelia:
    image: mcuadros/ofelia:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./ofelia.ini:/etc/ofelia/config.ini:ro
    command: daemon --config=/etc/ofelia/config.ini
```

```ini
# ofelia.ini
[job-exec "cleanup"]
schedule = */5 * * * *
container = myapp_app_1
command = node /app/scripts/cleanup.js

[job-exec "backup"]
schedule = 0 2 * * *
container = myapp_app_1
command = /app/scripts/backup.sh

[job-run "report"]
schedule = 0 8 * * 1
image = myapp:latest
command = node /app/scripts/weekly-report.js
```

### Job Types

- `job-exec`: Run command in existing container
- `job-run`: Create new container for the job
- `job-local`: Run on Ofelia container itself
- `job-service-run`: Run in Swarm service

---

## Solution 3: Host Cron with Docker Exec

Keep cron on the host, execute commands in containers:

```bash
# /etc/cron.d/docker-jobs
* * * * * root docker exec myapp_app_1 node /app/scripts/task.js >> /var/log/docker-cron.log 2>&1
0 2 * * * root docker exec myapp_app_1 /app/scripts/backup.sh >> /var/log/docker-cron.log 2>&1
```

### Wrapper Script

```bash
#!/bin/bash
# /usr/local/bin/docker-cron.sh

CONTAINER=$1
shift
COMMAND=$@

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  docker exec "$CONTAINER" $COMMAND
else
  echo "Container $CONTAINER not running"
  exit 1
fi
```

```bash
# crontab
*/5 * * * * root /usr/local/bin/docker-cron.sh myapp_app_1 node /app/scripts/cleanup.js
```

### Pros and Cons

**Pros:**
- Simple, familiar
- Works with existing monitoring
- No additional containers

**Cons:**
- Jobs fail if container is restarting
- Container name changes break jobs
- Hard to maintain across multiple hosts

---

## Solution 4: Application-Level Scheduling

Build scheduling into your application:

### Node.js with node-cron

```javascript
// scheduler.js
const cron = require('node-cron');
const { runBackup } = require('./tasks/backup');
const { cleanupOldData } = require('./tasks/cleanup');

// Every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running cleanup task');
  await cleanupOldData();
});

// Daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running backup task');
  await runBackup();
});

console.log('Scheduler started');
```

### Python with APScheduler

```python
# scheduler.py
from apscheduler.schedulers.blocking import BlockingScheduler
from tasks import cleanup, backup

scheduler = BlockingScheduler()

@scheduler.scheduled_job('interval', minutes=5)
def cleanup_job():
    print('Running cleanup')
    cleanup()

@scheduler.scheduled_job('cron', hour=2, minute=0)
def backup_job():
    print('Running backup')
    backup()

if __name__ == '__main__':
    scheduler.start()
```

### Separate Scheduler Container

```yaml
services:
  app:
    image: myapp:latest

  scheduler:
    image: myapp:latest
    command: node scheduler.js
    environment:
      - DATABASE_URL=postgres://db:5432/app
```

---

## Handling Job Failures

### Supercronic with Healthcheck

```dockerfile
FROM alpine:3.19

COPY --from=aptible/supercronic:latest /usr/local/bin/supercronic /usr/local/bin/supercronic
COPY crontab /etc/crontab
COPY healthcheck.sh /healthcheck.sh

HEALTHCHECK --interval=1m --timeout=10s \
  CMD /healthcheck.sh

CMD ["supercronic", "/etc/crontab"]
```

```bash
#!/bin/bash
# healthcheck.sh

# Check if last job succeeded (customize for your needs)
if [ -f /tmp/last-job-failed ]; then
  exit 1
fi
exit 0
```

### Alerting on Failure

```bash
# crontab
*/5 * * * * /app/scripts/important-job.sh || curl -X POST https://alerts.example.com/webhook -d '{"message": "Job failed"}'
```

### Dead Man's Switch

For critical jobs, ping a monitoring service on success:

```bash
# crontab
0 2 * * * /app/scripts/backup.sh && curl -s https://healthchecks.io/ping/xxx-yyy-zzz
```

---

## Logging Best Practices

### Supercronic Logging

```bash
# Logs go to stdout/stderr automatically
docker logs -f cron_container

# Save to file
CMD ["supercronic", "-json", "/etc/crontab"]
```

### Structured Job Output

```bash
#!/bin/bash
# job-wrapper.sh

JOB_NAME=$1
shift

echo "{\"timestamp\": \"$(date -Iseconds)\", \"job\": \"$JOB_NAME\", \"status\": \"started\"}"

if "$@"; then
  echo "{\"timestamp\": \"$(date -Iseconds)\", \"job\": \"$JOB_NAME\", \"status\": \"success\"}"
else
  echo "{\"timestamp\": \"$(date -Iseconds)\", \"job\": \"$JOB_NAME\", \"status\": \"failed\", \"exit_code\": $?}"
  exit 1
fi
```

```bash
# crontab
*/5 * * * * /app/job-wrapper.sh cleanup /app/scripts/cleanup.sh
```

---

## Complete Example

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  cron:
    image: myapp:latest
    entrypoint: ["supercronic", "/etc/crontab"]
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/app
    volumes:
      - ./crontab:/etc/crontab:ro
    depends_on:
      db:
        condition: service_healthy
      app:
        condition: service_started

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

```bash
# crontab

# Cleanup expired sessions every 5 minutes
*/5 * * * * node /app/scripts/cleanup-sessions.js

# Generate reports every hour
0 * * * * node /app/scripts/generate-reports.js

# Backup database daily at 2 AM
0 2 * * * /app/scripts/backup-db.sh

# Send weekly digest on Mondays at 8 AM
0 8 * * 1 node /app/scripts/weekly-digest.js

# Health ping every minute
* * * * * curl -fsS --retry 3 https://healthchecks.io/ping/xxx || true
```

---

## Quick Reference

```bash
# Supercronic installation (in Dockerfile)
COPY --from=aptible/supercronic:latest /usr/local/bin/supercronic /usr/local/bin/

# Run supercronic
supercronic /etc/crontab

# With JSON logging
supercronic -json /etc/crontab

# Test crontab syntax
supercronic -test /etc/crontab

# Ofelia (docker-compose labels)
ofelia.job-exec.name.schedule: "*/5 * * * *"
ofelia.job-exec.name.command: "/app/task.sh"

# Host cron with docker exec
* * * * * docker exec container_name /app/task.sh
```

---

## Summary

- Traditional cron doesn't work well in containers (environment, logging, signals)
- **Supercronic** is the best in-container solution - simple and reliable
- **Ofelia** is ideal when you need to run jobs across multiple containers
- Host cron + docker exec works but is fragile
- Application-level scheduling is good for tightly coupled jobs
- Always log job output to stdout/stderr
- Use dead man's switches for critical jobs
- Run scheduler as a separate container from your main app

Pick the approach that fits your infrastructure. For most cases, Supercronic in a dedicated container is the sweet spot of simplicity and reliability.
