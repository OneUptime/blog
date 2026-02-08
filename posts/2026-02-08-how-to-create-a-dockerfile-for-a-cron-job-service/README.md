# How to Create a Dockerfile for a Cron Job Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Cron, Scheduling, DevOps, Automation, Containers

Description: Learn how to build Docker containers that run cron jobs reliably, with logging, environment variables, and health checks.

---

Running scheduled tasks inside Docker containers is a common need. Database backups, log rotation, report generation, data synchronization - these all require reliable scheduling. While Kubernetes has CronJobs and cloud providers have their own schedulers, sometimes you just need a simple container that runs cron and does its job.

Getting cron to work properly inside a Docker container has a few gotchas that trip people up. Environment variables disappear, logs vanish into the void, and the cron daemon silently fails. This guide shows you how to avoid all of those problems.

## The Basic Cron Container

Let's start with the simplest possible cron container and build from there.

A minimal cron Dockerfile:

```dockerfile
# Basic cron job container
FROM debian:bookworm-slim

# Install cron
RUN apt-get update && \
    apt-get install -y --no-install-recommends cron && \
    rm -rf /var/lib/apt/lists/*

# Copy the crontab file
COPY crontab /etc/cron.d/my-cron

# Set permissions (cron requires specific permissions)
RUN chmod 0644 /etc/cron.d/my-cron && \
    crontab /etc/cron.d/my-cron

# Create a log file for cron output
RUN touch /var/log/cron.log

# Run cron in the foreground and tail the log file
CMD cron && tail -f /var/log/cron.log
```

Create the crontab file that defines your schedule:

```
# crontab - Run the backup script every hour
# Format: minute hour day month weekday command
0 * * * * /usr/local/bin/backup.sh >> /var/log/cron.log 2>&1

# Empty line required at end of crontab
```

That empty line at the end is not optional. Cron will silently ignore the last entry if there is no trailing newline.

## Handling Environment Variables

This is the number one problem people hit with cron in Docker. Environment variables set with `ENV` in a Dockerfile or passed via `docker run -e` are not available inside cron jobs. Cron starts each job with a minimal environment that does not inherit the container's environment.

Here is how to fix it. Dump the environment to a file at container startup, then source it in your cron jobs:

```dockerfile
# Cron container with environment variable support
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends cron && \
    rm -rf /var/lib/apt/lists/*

# Copy scripts and crontab
COPY crontab /etc/cron.d/my-cron
COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /entrypoint.sh

# Set permissions
RUN chmod 0644 /etc/cron.d/my-cron && \
    chmod +x /usr/local/bin/backup.sh && \
    chmod +x /entrypoint.sh && \
    crontab /etc/cron.d/my-cron && \
    touch /var/log/cron.log

ENTRYPOINT ["/entrypoint.sh"]
```

The entrypoint script captures the environment before starting cron:

```bash
#!/bin/bash
# entrypoint.sh - Capture environment and start cron

# Dump all current environment variables to a file
# This makes them available to cron jobs
printenv | grep -v "no_proxy" >> /etc/environment

# Start cron in the foreground
cron && tail -f /var/log/cron.log
```

Update your crontab to source the environment file:

```
# crontab - Source environment variables before running the job
0 * * * * . /etc/environment; /usr/local/bin/backup.sh >> /var/log/cron.log 2>&1

```

Now your cron jobs have access to `DATABASE_URL`, `API_KEY`, and any other environment variables passed to the container.

## A Complete Backup Example

Let's put together a realistic example: a container that backs up a PostgreSQL database on a schedule.

The backup script:

```bash
#!/bin/bash
# backup.sh - PostgreSQL backup script

set -euo pipefail

# These variables come from the container environment
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/db_backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting database backup..."

# Run pg_dump and compress the output
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-privileges | gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup complete: ${BACKUP_FILE}"

# Clean up backups older than 7 days
find /backups -name "*.sql.gz" -mtime +7 -delete
echo "[$(date)] Old backups cleaned up"
```

The Dockerfile:

```dockerfile
# PostgreSQL backup cron container
FROM debian:bookworm-slim

# Install cron and PostgreSQL client
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        cron \
        postgresql-client \
        gzip && \
    rm -rf /var/lib/apt/lists/*

# Create backups directory
RUN mkdir -p /backups

# Copy all scripts
COPY crontab /etc/cron.d/backup-cron
COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /entrypoint.sh

# Set permissions
RUN chmod 0644 /etc/cron.d/backup-cron && \
    chmod +x /usr/local/bin/backup.sh && \
    chmod +x /entrypoint.sh && \
    crontab /etc/cron.d/backup-cron && \
    touch /var/log/cron.log

# Mount point for backups
VOLUME ["/backups"]

ENTRYPOINT ["/entrypoint.sh"]
```

Run it with the necessary environment variables:

```bash
# Run the backup cron container
docker run -d \
    --name db-backup \
    -e DB_HOST=postgres.example.com \
    -e DB_USER=backup_user \
    -e DB_PASSWORD=secret123 \
    -e DB_NAME=myapp_production \
    -v /host/backups:/backups \
    my-backup-cron
```

## Alpine-Based Cron Container

Alpine Linux uses BusyBox's crond, which is slightly different from standard cron. It is lighter but has some behavioral differences.

A cron setup on Alpine:

```dockerfile
# Alpine-based cron container
FROM alpine:3.19

# Install any additional tools your scripts need
RUN apk add --no-cache bash curl

# Copy scripts
COPY scripts/ /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh

# Copy crontab
COPY crontab /etc/crontabs/root

# Alpine's crond runs in foreground with -f flag
# -l 2 sets log level (0=most verbose, 8=least)
CMD ["crond", "-f", "-l", "2"]
```

The crontab file for Alpine goes in `/etc/crontabs/root`:

```
# Alpine crontab format is the same
*/5 * * * * /usr/local/bin/health-check.sh
0 2 * * * /usr/local/bin/cleanup.sh
```

Alpine's crond sends output to the container's stderr by default, so you can view it with `docker logs` without needing to tail a log file. This is actually a better approach for container environments.

## Logging Best Practices

In containers, logs should go to stdout/stderr so Docker's logging driver can capture them. Tailing a log file works but is not ideal.

A better logging approach using named pipes:

```dockerfile
# Cron with proper stdout logging
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends cron && \
    rm -rf /var/lib/apt/lists/*

COPY crontab /etc/cron.d/my-cron
COPY entrypoint.sh /entrypoint.sh

RUN chmod 0644 /etc/cron.d/my-cron && \
    chmod +x /entrypoint.sh && \
    crontab /etc/cron.d/my-cron

ENTRYPOINT ["/entrypoint.sh"]
```

The improved entrypoint:

```bash
#!/bin/bash
# entrypoint.sh - Cron with stdout logging

# Capture environment for cron jobs
printenv | grep -v "no_proxy" >> /etc/environment

# Start cron
cron

# Follow the syslog for cron entries (shows job execution)
tail -f /var/log/syslog 2>/dev/null || tail -f /var/log/cron.log 2>/dev/null || \
    echo "No log file found, waiting..." && sleep infinity
```

## Adding Health Checks

A health check verifies that crond is still running inside the container.

Add a health check that verifies the cron daemon is alive:

```dockerfile
# Health check to verify cron daemon is running
HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
    CMD pgrep cron > /dev/null || exit 1
```

For more thorough health checking, create a script that also verifies recent job execution:

```bash
#!/bin/bash
# healthcheck.sh - Verify cron is running and jobs are executing

# Check if cron daemon is running
if ! pgrep cron > /dev/null; then
    echo "Cron daemon is not running"
    exit 1
fi

# Check if the last job ran within the expected interval
# Adjust the time threshold based on your schedule
LAST_RUN_FILE="/tmp/last_cron_run"
if [ -f "$LAST_RUN_FILE" ]; then
    LAST_RUN=$(cat "$LAST_RUN_FILE")
    NOW=$(date +%s)
    DIFF=$((NOW - LAST_RUN))
    # Alert if no job has run in the last 2 hours
    if [ "$DIFF" -gt 7200 ]; then
        echo "No cron job has run in over 2 hours"
        exit 1
    fi
fi

exit 0
```

Your cron jobs should update the timestamp file when they run:

```bash
# Add this line at the end of each cron job script
date +%s > /tmp/last_cron_run
```

## Docker Compose with Cron

A Docker Compose setup for running a cron service alongside your application:

```yaml
# docker-compose.yml - Application with cron worker
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/myapp

  cron:
    build:
      context: .
      dockerfile: Dockerfile.cron
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
      - SMTP_HOST=smtp.example.com
    volumes:
      - backup-data:/backups
    depends_on:
      - db

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
  backup-data:
```

## Supercronic as an Alternative

Supercronic is a cron replacement designed specifically for containers. It handles environment variables natively, logs to stdout, and does not require root.

Using Supercronic instead of system cron:

```dockerfile
# Using Supercronic for container-friendly cron
FROM debian:bookworm-slim

# Install supercronic
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-amd64 \
        -o /usr/local/bin/supercronic && \
    chmod +x /usr/local/bin/supercronic && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copy crontab and scripts
COPY crontab /app/crontab
COPY scripts/ /usr/local/bin/

# Supercronic inherits environment variables automatically
# Logs go to stdout by default
CMD ["supercronic", "/app/crontab"]
```

Supercronic solves most of the pain points with cron in containers. It passes environment variables to jobs, sends output to stdout/stderr, and does not need an entrypoint wrapper script.

## Summary

Running cron in Docker requires handling a few quirks: environment variable propagation, proper logging, and keeping the container alive. For simple setups, use system cron with an entrypoint that dumps the environment. For anything more sophisticated, consider Supercronic, which was built for containers. Always include health checks, redirect logs to stdout when possible, and keep your cron scripts idempotent so they recover gracefully from failures.
