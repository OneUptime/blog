# How to Run Cron Jobs Inside Docker Containers (The Right Way)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Automation, Cron, Scheduling

Description: Implement reliable scheduled tasks using Supercronic, Ofelia, or host cron with docker exec, and understand why traditional cron fails in containers.

Running scheduled tasks in Docker seems straightforward until you realize traditional cron doesn't work the way you expect in containers. Environment variables disappear, logs vanish into the void, and zombie processes accumulate. This guide covers the patterns that actually work.

---

## Why Traditional Cron Fails in Containers

### Problem 1: Environment Variables

Cron runs with a minimal environment. Your carefully configured `DATABASE_URL` won't be there:

This Dockerfile demonstrates a common mistake: installing cron in a container expecting it to work like on a traditional server. The cron daemon starts, but environment variables set via Docker won't be available to cron jobs.

```dockerfile
# This DOESN'T work as expected
FROM ubuntu
# Install cron package - this is fine, but cron behavior in containers is problematic
RUN apt-get update && apt-get install -y cron
# Copy crontab file to the cron.d directory
COPY crontab /etc/cron.d/myapp
# Run cron in foreground mode - seems correct but has issues
CMD ["cron", "-f"]
```

The following crontab entry attempts to log an environment variable, but because cron runs with a minimal environment, the DATABASE_URL variable will be empty:

```bash
# crontab
# This job runs every minute but DATABASE_URL will be empty because cron
# doesn't inherit environment variables from the Docker container
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

This Dockerfile installs Supercronic, a container-friendly cron replacement that inherits environment variables, logs to stdout, and handles signals properly:

```dockerfile
FROM alpine:3.19

# Install supercronic - a cron replacement designed for containers
# Using build arguments allows easy version updates and multi-architecture support
ARG SUPERCRONIC_VERSION=0.2.29
ARG TARGETARCH
# Download the supercronic binary for the target architecture and make it executable
RUN wget -q "https://github.com/aptible/supercronic/releases/download/v${SUPERCRONIC_VERSION}/supercronic-linux-${TARGETARCH}" \
    -O /usr/local/bin/supercronic && \
    chmod +x /usr/local/bin/supercronic

# Add crontab - supercronic uses standard crontab syntax
COPY crontab /etc/crontab

# Run supercronic as the main process - it properly handles signals and environment
CMD ["supercronic", "/etc/crontab"]
```

The crontab file uses standard cron syntax. Unlike traditional cron, Supercronic will have access to all container environment variables:

```bash
# crontab
# Run every minute - $DATABASE_URL will be properly resolved because
# supercronic inherits the container's environment variables
* * * * * echo "Environment: $DATABASE_URL"

# Run daily at 2 AM - ideal for backup operations during low-traffic periods
0 2 * * * /app/scripts/backup.sh

# Run every 5 minutes - useful for periodic health checks or cleanup tasks
*/5 * * * * /app/scripts/healthcheck.sh
```

### Why Supercronic Works

- Inherits all environment variables from the container
- Logs to stdout/stderr (visible in `docker logs`)
- Handles signals properly (graceful shutdown)
- Supports standard crontab syntax
- Lightweight (~5MB binary)

### Docker Compose Example

This Docker Compose configuration demonstrates the recommended pattern of running the cron scheduler as a separate service, sharing the same environment as your application:

```yaml
services:
  # Main application service
  app:
    image: myapp:latest
    environment:
      - DATABASE_URL=postgres://db:5432/app

  # Dedicated cron service - runs scheduled tasks in isolation
  cron:
    build:
      context: .
      dockerfile: Dockerfile.cron
    # Share the same environment variables as the app
    environment:
      - DATABASE_URL=postgres://db:5432/app
    # Ensure database is available before running scheduled jobs
    depends_on:
      - db

  db:
    image: postgres:16
```

The cron Dockerfile extends your application image to include Supercronic, ensuring your cron jobs have access to the same code and dependencies:

```dockerfile
# Dockerfile.cron
# Start from the same image as the app to ensure consistent environment
FROM myapp:latest

# Install supercronic using multi-stage copy for smaller image
COPY --from=aptible/supercronic:latest /usr/local/bin/supercronic /usr/local/bin/supercronic

# Add the crontab configuration
COPY crontab /etc/crontab

# Run supercronic as the container's main process
CMD ["supercronic", "/etc/crontab"]
```

---

## Solution 2: Ofelia (Docker-Native Scheduler)

Ofelia runs as a separate container and executes jobs in other containers via `docker exec`.

### Basic Setup

This configuration shows Ofelia managing cron jobs through Docker labels, enabling you to define schedules alongside your container definitions:

```yaml
# docker-compose.yml
services:
  # Ofelia scheduler container - manages cron jobs for other containers
  ofelia:
    image: mcuadros/ofelia:latest
    volumes:
      # Mount Docker socket to allow Ofelia to execute commands in other containers
      - /var/run/docker.sock:/var/run/docker.sock:ro
    # Run in daemon mode, discovering jobs from Docker labels
    command: daemon --docker
    depends_on:
      - app

  app:
    image: myapp:latest
    labels:
      # Enable Ofelia for this container
      ofelia.enabled: "true"
      # Define a cleanup job that runs every 5 minutes
      ofelia.job-exec.cleanup.schedule: "*/5 * * * *"
      ofelia.job-exec.cleanup.command: "node /app/scripts/cleanup.js"

      # Define a backup job that runs daily at 2 AM
      ofelia.job-exec.backup.schedule: "0 2 * * *"
      ofelia.job-exec.backup.command: "/app/scripts/backup.sh"
```

### Configuration File Alternative

For complex setups with many jobs, you can use a configuration file instead of Docker labels:

```yaml
services:
  ofelia:
    image: mcuadros/ofelia:latest
    volumes:
      # Mount Docker socket for container access
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Mount configuration file for job definitions
      - ./ofelia.ini:/etc/ofelia/config.ini:ro
    command: daemon --config=/etc/ofelia/config.ini
```

The Ofelia configuration file provides more options and is easier to maintain for complex scheduling requirements:

```ini
# ofelia.ini
# Job that executes a command inside an existing container
[job-exec "cleanup"]
schedule = */5 * * * *
container = myapp_app_1
command = node /app/scripts/cleanup.js

# Another exec job for database backups
[job-exec "backup"]
schedule = 0 2 * * *
container = myapp_app_1
command = /app/scripts/backup.sh

# Job that spins up a new container to run a one-off task
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

This approach uses the host machine's cron daemon and executes commands inside containers using docker exec. It's simple but has reliability concerns:

```bash
# /etc/cron.d/docker-jobs
# Run a Node.js task every minute inside the container, logging output to a file
* * * * * root docker exec myapp_app_1 node /app/scripts/task.js >> /var/log/docker-cron.log 2>&1
# Run backup script daily at 2 AM, capturing both stdout and stderr
0 2 * * * root docker exec myapp_app_1 /app/scripts/backup.sh >> /var/log/docker-cron.log 2>&1
```

### Wrapper Script

This wrapper script adds safety checks before executing commands, preventing errors when containers are not running:

```bash
#!/bin/bash
# /usr/local/bin/docker-cron.sh
# Wrapper script for running cron jobs in Docker containers with safety checks

# First argument is the container name
CONTAINER=$1
# Shift removes the first argument, leaving only the command to execute
shift
COMMAND=$@

# Check if the container is running before attempting to execute the command
# This prevents errors and confusing log output when containers are stopped
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  # Container is running, execute the command
  docker exec "$CONTAINER" $COMMAND
else
  # Container not running - log the error and exit with failure status
  echo "Container $CONTAINER not running"
  exit 1
fi
```

Use the wrapper script in your crontab to safely execute containerized jobs:

```bash
# crontab
# Use the wrapper script to ensure container is running before executing
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

This approach embeds the scheduler directly in your Node.js application, ensuring jobs have full access to your application context and dependencies:

```javascript
// scheduler.js
// Import the node-cron library for cron-like scheduling in Node.js
const cron = require('node-cron');
// Import task functions from your application modules
const { runBackup } = require('./tasks/backup');
const { cleanupOldData } = require('./tasks/cleanup');

// Schedule cleanup to run every 5 minutes
// The cron pattern '*/5 * * * *' means "at every 5th minute"
cron.schedule('*/5 * * * *', async () => {
  console.log('Running cleanup task');
  // Await ensures the task completes before the next scheduled run
  await cleanupOldData();
});

// Schedule backup to run daily at 2 AM
// The pattern '0 2 * * *' means "at 02:00 every day"
cron.schedule('0 2 * * *', async () => {
  console.log('Running backup task');
  await runBackup();
});

// Log that the scheduler has started successfully
console.log('Scheduler started');
```

### Python with APScheduler

APScheduler provides flexible job scheduling for Python applications with support for both interval and cron-style scheduling:

```python
# scheduler.py
# Import the blocking scheduler - runs in the foreground and blocks the main thread
from apscheduler.schedulers.blocking import BlockingScheduler
# Import task functions from your application
from tasks import cleanup, backup

# Create a scheduler instance
scheduler = BlockingScheduler()

# Decorator-based job definition: runs cleanup every 5 minutes
@scheduler.scheduled_job('interval', minutes=5)
def cleanup_job():
    print('Running cleanup')
    cleanup()

# Cron-style scheduling: runs backup at 2:00 AM every day
@scheduler.scheduled_job('cron', hour=2, minute=0)
def backup_job():
    print('Running backup')
    backup()

# Entry point: start the scheduler when script is run directly
if __name__ == '__main__':
    # start() blocks forever, processing scheduled jobs
    scheduler.start()
```

### Separate Scheduler Container

Run the scheduler as a dedicated container using the same application image to ensure consistency:

```yaml
services:
  # Main application container
  app:
    image: myapp:latest

  # Dedicated scheduler container - same image, different entrypoint
  scheduler:
    image: myapp:latest
    # Override the default command to run the scheduler instead of the app
    command: node scheduler.js
    # Share the same database connection as the main app
    environment:
      - DATABASE_URL=postgres://db:5432/app
```

---

## Handling Job Failures

### Supercronic with Healthcheck

This configuration adds a health check to your cron container, allowing Docker to detect when jobs are failing:

```dockerfile
FROM alpine:3.19

# Copy supercronic binary from the official image
COPY --from=aptible/supercronic:latest /usr/local/bin/supercronic /usr/local/bin/supercronic
COPY crontab /etc/crontab
COPY healthcheck.sh /healthcheck.sh

# Configure Docker health check to run every minute
# If the healthcheck script exits with non-zero, container is marked unhealthy
HEALTHCHECK --interval=1m --timeout=10s \
  CMD /healthcheck.sh

CMD ["supercronic", "/etc/crontab"]
```

The health check script can implement custom logic to verify job success:

```bash
#!/bin/bash
# healthcheck.sh
# Custom health check script to verify cron jobs are succeeding

# Check if a failure marker file exists (created by failed jobs)
# This is a simple pattern - customize based on your needs
if [ -f /tmp/last-job-failed ]; then
  # Return non-zero to indicate unhealthy state
  exit 1
fi
# Return zero to indicate healthy state
exit 0
```

### Alerting on Failure

This crontab entry demonstrates inline failure notification using a webhook:

```bash
# crontab
# Run the job and send an alert if it fails (non-zero exit code)
# The || operator runs the curl command only if the script fails
*/5 * * * * /app/scripts/important-job.sh || curl -X POST https://alerts.example.com/webhook -d '{"message": "Job failed"}'
```

### Dead Man's Switch

For critical jobs, ping a monitoring service on success:

This pattern uses a monitoring service like Healthchecks.io to detect when scheduled jobs stop running:

```bash
# crontab
# Run backup and ping monitoring service on success
# The && operator ensures the ping only happens if the backup succeeds
0 2 * * * /app/scripts/backup.sh && curl -s https://healthchecks.io/ping/xxx-yyy-zzz
```

---

## Logging Best Practices

### Supercronic Logging

Supercronic automatically outputs job logs to stdout/stderr, making them accessible via Docker's logging infrastructure:

```bash
# View cron container logs in real-time
docker logs -f cron_container

# Enable JSON-formatted logging for better parsing and log aggregation
CMD ["supercronic", "-json", "/etc/crontab"]
```

### Structured Job Output

This wrapper script adds structured JSON logging to your cron jobs, making it easier to parse and analyze job execution:

```bash
#!/bin/bash
# job-wrapper.sh
# Wrapper script that adds structured JSON logging to cron jobs

# First argument is the job name for logging purposes
JOB_NAME=$1
shift  # Remove job name from arguments

# Log job start with ISO 8601 timestamp
echo "{\"timestamp\": \"$(date -Iseconds)\", \"job\": \"$JOB_NAME\", \"status\": \"started\"}"

# Execute the actual job command and capture its exit status
if "$@"; then
  # Job succeeded - log success status
  echo "{\"timestamp\": \"$(date -Iseconds)\", \"job\": \"$JOB_NAME\", \"status\": \"success\"}"
else
  # Job failed - log failure with exit code and propagate the error
  echo "{\"timestamp\": \"$(date -Iseconds)\", \"job\": \"$JOB_NAME\", \"status\": \"failed\", \"exit_code\": $?}"
  exit 1
fi
```

Use the wrapper script in your crontab to get structured logging for all jobs:

```bash
# crontab
# Wrap each job with the logging script for consistent structured output
*/5 * * * * /app/job-wrapper.sh cleanup /app/scripts/cleanup.sh
```

---

## Complete Example

This complete example demonstrates a production-ready cron setup with proper service dependencies and health checks:

```yaml
# docker-compose.yml
services:
  # Main application service
  app:
    image: myapp:latest
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/app
    depends_on:
      db:
        # Wait for database to be healthy before starting
        condition: service_healthy

  # Dedicated cron service using supercronic
  cron:
    image: myapp:latest
    # Override entrypoint to run supercronic instead of the app
    entrypoint: ["supercronic", "/etc/crontab"]
    environment:
      # Share database connection with main app
      - DATABASE_URL=postgres://postgres:password@db:5432/app
    volumes:
      # Mount crontab as read-only for security
      - ./crontab:/etc/crontab:ro
    depends_on:
      db:
        condition: service_healthy
      app:
        # Ensure app is started (but not necessarily healthy) before cron
        condition: service_started

  # PostgreSQL database with health check
  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
    # Health check ensures database is ready before dependents start
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      # Persist database data across container restarts
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

A comprehensive crontab demonstrating various scheduling patterns:

```bash
# crontab

# Cleanup expired sessions every 5 minutes
# Frequent cleanup prevents session table bloat
*/5 * * * * node /app/scripts/cleanup-sessions.js

# Generate reports every hour
# Provides up-to-date analytics data throughout the day
0 * * * * node /app/scripts/generate-reports.js

# Backup database daily at 2 AM
# Low-traffic window minimizes backup impact on performance
0 2 * * * /app/scripts/backup-db.sh

# Send weekly digest on Mondays at 8 AM
# Cron pattern: minute hour day-of-month month day-of-week
0 8 * * 1 node /app/scripts/weekly-digest.js

# Health ping every minute
# Dead man's switch - monitoring service alerts if pings stop
# The || true ensures the cron job itself doesn't fail if curl fails
* * * * * curl -fsS --retry 3 https://healthchecks.io/ping/xxx || true
```

---

## Quick Reference

Common commands and patterns for working with cron in Docker:

```bash
# Supercronic installation (in Dockerfile)
# Use multi-stage copy for the smallest possible image
COPY --from=aptible/supercronic:latest /usr/local/bin/supercronic /usr/local/bin/

# Run supercronic with default logging
supercronic /etc/crontab

# Run with JSON logging for log aggregation systems
supercronic -json /etc/crontab

# Validate crontab syntax before deployment
supercronic -test /etc/crontab

# Ofelia (docker-compose labels)
# Schedule format follows standard cron syntax
ofelia.job-exec.name.schedule: "*/5 * * * *"
ofelia.job-exec.name.command: "/app/task.sh"

# Host cron with docker exec
# Simple approach but less reliable than dedicated solutions
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
