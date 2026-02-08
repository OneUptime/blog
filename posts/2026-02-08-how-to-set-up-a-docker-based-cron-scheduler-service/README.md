# How to Set Up a Docker-Based Cron Scheduler Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Cron, Scheduling, Automation, Docker Compose, DevOps, Task Scheduling

Description: Build a reliable cron-based task scheduling service in Docker that runs recurring jobs with logging, error handling, and monitoring.

---

Every application needs scheduled tasks: database cleanups, report generation, cache warming, email digests, backup rotations. Running cron jobs inside Docker containers keeps these tasks isolated, versioned, and portable. This guide covers building a production-grade cron scheduler that handles logging, error notifications, and concurrent job management.

## The Problem with Traditional Cron

System-level cron on a host machine has several drawbacks. Jobs run with the host's environment, which drifts over time. Logs scatter across syslog files. There is no built-in error notification. And when you migrate to a new server, recreating the crontab is a manual, error-prone step.

Docker-based cron solves all of these. The schedule, scripts, dependencies, and environment are all defined in version-controlled files.

## Basic Cron in Docker

The simplest approach installs cron inside a Docker container and loads a crontab file:

```dockerfile
# Dockerfile - Basic cron scheduler container
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    curl \
    jq \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the crontab file into the container
COPY crontab /etc/cron.d/app-cron

# Set proper permissions (cron requires specific file permissions)
RUN chmod 0644 /etc/cron.d/app-cron && \
    crontab /etc/cron.d/app-cron

# Copy job scripts
COPY scripts/ /scripts/
RUN chmod +x /scripts/*.sh

# Create log file that cron will write to
RUN touch /var/log/cron.log

# Start cron in the foreground and tail the log file
CMD cron && tail -f /var/log/cron.log
```

The crontab file defines the schedule:

```
# crontab - Job schedule definitions
# Format: minute hour day-of-month month day-of-week command

# Run database cleanup every day at 2 AM
0 2 * * * /scripts/db-cleanup.sh >> /var/log/cron.log 2>&1

# Generate daily report at 6 AM
0 6 * * * /scripts/generate-report.sh >> /var/log/cron.log 2>&1

# Health check every 5 minutes
*/5 * * * * /scripts/health-check.sh >> /var/log/cron.log 2>&1

# Weekly backup on Sundays at midnight
0 0 * * 0 /scripts/weekly-backup.sh >> /var/log/cron.log 2>&1

# Required: empty line at the end of the crontab file
```

## Environment Variables in Cron

Cron jobs do not inherit the container's environment variables by default. This catches people off guard. Here is how to pass environment variables through:

```dockerfile
# Dockerfile - Cron with environment variable passthrough
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY crontab /etc/cron.d/app-cron
RUN chmod 0644 /etc/cron.d/app-cron

COPY scripts/ /scripts/
RUN chmod +x /scripts/*.sh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
```

The entrypoint script captures environment variables and makes them available to cron jobs:

```bash
#!/bin/bash
# entrypoint.sh - Dump environment variables for cron, then start cron

# Export all current environment variables to a file that cron jobs can source
printenv | grep -v "no_proxy" > /etc/environment

# Alternative: write env vars directly into the crontab
env >> /etc/environment

# Install the crontab
crontab /etc/cron.d/app-cron

echo "Starting cron scheduler..."
echo "Loaded environment variables:"
cat /etc/environment

# Start cron in the foreground
cron -f
```

Now your scripts can access environment variables:

```bash
#!/bin/bash
# scripts/health-check.sh - Check service health using env vars

# Source environment variables that cron cannot access natively
source /etc/environment

echo "[$(date)] Running health check..."

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL:-http://localhost:3000}/health")

if [ "$RESPONSE" != "200" ]; then
  echo "[$(date)] ALERT: Health check failed with status $RESPONSE"

  # Send alert via webhook
  curl -X POST "${ALERT_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Health check failed: ${APP_URL} returned ${RESPONSE}\"}"
else
  echo "[$(date)] OK: Health check passed"
fi
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Cron scheduler with application services
version: "3.8"

services:
  app:
    image: myapp:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/myapp
    depends_on:
      - db
    networks:
      - appnet

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - appnet

  scheduler:
    build:
      context: ./scheduler
    environment:
      APP_URL: http://app:3000
      DATABASE_URL: postgres://user:pass@db:5432/myapp
      ALERT_WEBHOOK_URL: https://hooks.slack.com/services/xxx/yyy/zzz
    depends_on:
      - app
      - db
    volumes:
      # Persist logs on the host for debugging
      - ./logs:/var/log
    networks:
      - appnet
    restart: unless-stopped

volumes:
  pgdata:

networks:
  appnet:
    driver: bridge
```

## Structured Logging

Replace plain text logs with structured JSON for easier parsing:

```bash
#!/bin/bash
# scripts/lib/log.sh - Structured logging helper functions

log_json() {
  local level="$1"
  local job="$2"
  local message="$3"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  echo "{\"timestamp\": \"${timestamp}\", \"level\": \"${level}\", \"job\": \"${job}\", \"message\": \"${message}\"}"
}

log_info() {
  log_json "INFO" "$1" "$2"
}

log_error() {
  log_json "ERROR" "$1" "$2"
}

log_success() {
  log_json "SUCCESS" "$1" "$2"
}
```

Use these helpers in your job scripts:

```bash
#!/bin/bash
# scripts/db-cleanup.sh - Database cleanup with structured logging

source /scripts/lib/log.sh
source /etc/environment

JOB_NAME="db-cleanup"

log_info "$JOB_NAME" "Starting database cleanup"

# Run the cleanup query via psql
RESULT=$(psql "$DATABASE_URL" -c "DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days';" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  log_success "$JOB_NAME" "Cleanup completed: $RESULT"
else
  log_error "$JOB_NAME" "Cleanup failed: $RESULT"

  # Send failure alert
  curl -s -X POST "${ALERT_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Cron job ${JOB_NAME} failed: ${RESULT}\"}"
fi
```

## Job Locking

Prevent jobs from running concurrently if a previous execution is still in progress:

```bash
#!/bin/bash
# scripts/lib/lock.sh - File-based job locking to prevent overlap

acquire_lock() {
  local lock_file="/tmp/cron_${1}.lock"

  if [ -f "$lock_file" ]; then
    local pid=$(cat "$lock_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Job $1 is already running (PID $pid). Skipping."
      return 1
    else
      # Stale lock file from a crashed process - remove it
      rm -f "$lock_file"
    fi
  fi

  echo $$ > "$lock_file"
  return 0
}

release_lock() {
  local lock_file="/tmp/cron_${1}.lock"
  rm -f "$lock_file"
}
```

Use locks in your scripts:

```bash
#!/bin/bash
# scripts/generate-report.sh - Report generation with locking

source /scripts/lib/lock.sh
source /scripts/lib/log.sh

JOB_NAME="generate-report"

# Acquire lock or exit if job is already running
acquire_lock "$JOB_NAME" || exit 0

# Ensure lock is released even if the script crashes
trap "release_lock '$JOB_NAME'" EXIT

log_info "$JOB_NAME" "Generating daily report..."

# Your report generation logic here
sleep 60  # Simulating a long-running job

log_success "$JOB_NAME" "Report generation complete"
```

## Monitoring Cron Health

Add a heartbeat mechanism to detect when cron stops running:

```bash
#!/bin/bash
# scripts/heartbeat.sh - Emit a heartbeat signal for monitoring

# Write a timestamp file that monitoring can check
date +%s > /tmp/cron-heartbeat

# Optionally ping an external monitoring service
curl -s "${HEARTBEAT_URL:-http://localhost:3000/cron-heartbeat}" > /dev/null 2>&1
```

Add it to your crontab:

```
# Heartbeat every minute to verify cron is alive
* * * * * /scripts/heartbeat.sh >> /var/log/cron.log 2>&1
```

Check the heartbeat in a Docker health check:

```dockerfile
# Health check that verifies cron is still running and executing jobs
HEALTHCHECK --interval=120s --timeout=5s --retries=3 \
  CMD test $(( $(date +%s) - $(cat /tmp/cron-heartbeat 2>/dev/null || echo 0) )) -lt 180 || exit 1
```

## Wrapping Up

A Docker-based cron scheduler turns flaky, undocumented system cron jobs into version-controlled, portable, and observable scheduled tasks. The key ingredients are proper environment variable passthrough, structured logging, job locking, and health monitoring. With Docker Compose, your scheduler lives alongside the services it supports, sharing the same network and environment configuration. This makes the entire system reproducible and easy to reason about.
