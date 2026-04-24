# How to Follow Container Logs in Real Time in Portainer - Realtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Logging, DevOps

Description: Learn how to enable real-time log following (tail -f) for Docker containers in Portainer to monitor live application output.

## Introduction

Following logs in real time is essential when monitoring a deployment, debugging a live issue, or watching a container start up. Portainer's log viewer supports automatic refresh, letting you watch new log lines appear as the view updates - similar in practice to `tail -f` or `docker logs -f`.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container whose logs are readable through Docker (for example, `json-file`, `local`, or `journald`)

## Step 1: Enable Real-Time Log Following

1. Navigate to **Containers** in Portainer.
2. Select the container, then click **Logs**.
3. In the log viewer, enable **Auto refresh**.

New log lines will appear as Portainer refreshes the view.

## Step 2: Keep the Latest Output in View

With **Auto refresh** enabled, keep the log view scrolled to the bottom to watch the newest lines as Portainer refreshes the output.

```bash
# Equivalent Docker CLI (runs in your terminal):

docker logs -f my-container

# Follow from last 50 lines:
docker logs -f --tail 50 my-container

# Follow with timestamps:
docker logs -f -t my-container
```

## Step 3: Use Cases for Real-Time Log Following

### Watching a Deployment

When deploying a new container version, follow logs to confirm successful startup:

```text
2026-03-20T10:00:00Z  INFO: Starting application v2.1.0
2026-03-20T10:00:01Z  INFO: Loading configuration
2026-03-20T10:00:02Z  INFO: Connecting to database...
2026-03-20T10:00:03Z  INFO: Database connection established
2026-03-20T10:00:03Z  INFO: Migrating database schema
2026-03-20T10:00:05Z  INFO: Migration complete (3 migrations applied)
2026-03-20T10:00:05Z  INFO: Starting HTTP server on :8080
2026-03-20T10:00:05Z  INFO: Application ready to serve requests
```

### Debugging a Live Issue

When users report errors in production:
1. Enable log following.
2. Ask the user to reproduce the issue.
3. Watch for error messages in real time.

```text
2026-03-20T10:15:23Z  ERROR: Failed to process request
  path: /api/checkout
  user_id: 12345
  error: "payment gateway timeout after 30s"
  trace_id: abc-123-def
```

### Monitoring a Database Backup

Watch a long-running backup job:

```text
2026-03-20T02:00:00Z  Starting backup...
2026-03-20T02:00:01Z  Connecting to database
2026-03-20T02:00:02Z  Dumping table: users (250,000 rows)
2026-03-20T02:03:15Z  Dumping table: orders (1,500,000 rows)
2026-03-20T02:08:45Z  Compression complete (1.2GB → 340MB)
2026-03-20T02:09:00Z  Uploading to S3...
2026-03-20T02:09:45Z  Backup complete. Elapsed: 9m45s
```

## Step 4: Follow Logs from Multiple Services

For multi-service debugging in Portainer, open separate browser tabs - one for each container's log viewer.

Or via Docker Compose CLI:

```bash
# Follow all services in a compose stack:
docker compose logs -f

# Follow specific services:
docker compose logs -f api database nginx

# Follow with timestamps:
docker compose logs -f --timestamps

# Since a specific time:
docker compose logs --since="10m" -f   # Last 10 minutes
docker compose logs --since="2026-03-20T10:00:00Z" -f
```

## Step 5: Log Following Best Practices

### Log Output to stdout

Applications must log to stdout/stderr for Portainer to display them:

```python
# Python: log to stdout
import logging
import sys

logging.basicConfig(
    stream=sys.stdout,   # Not a file - stdout goes to Docker logs
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)

logger = logging.getLogger(__name__)
logger.info("Application started")
```

```javascript
// Node.js: console.log goes to stdout
console.log('Server started on port', process.env.PORT);
const err = new Error('Database connection failed');
console.error('Error:', err.message);  // Goes to stderr
```

### Disable Buffering

Some runtimes buffer output, which delays log appearance:

```yaml
# Python: disable output buffering
services:
  app:
    image: python:3.12-slim
    environment:
      - PYTHONUNBUFFERED=1   # Forces Python to flush output immediately
    command: python app.py
```

### Include Context in Log Messages

Make real-time log following useful by including enough context:

```text
# Hard to follow:
ERROR: connection failed
INFO: retry 1
ERROR: connection failed

# Easy to follow:
2026-03-20T10:00:00Z ERROR: database connection failed | host=db:5432 error="connection refused" attempt=1/5
2026-03-20T10:00:03Z INFO: retrying database connection | attempt=2/5 wait_seconds=3
2026-03-20T10:00:06Z INFO: database connection established | host=db:5432 latency_ms=45
```

## Step 6: Handling High-Volume Logs

If a container produces very high-volume logs, real-time following in the browser can be slow:

```bash
# Filter the log stream in your shell:
docker logs -f my-container 2>&1 | grep -E "(ERROR|CRITICAL)"

# Or filter structured JSON logs in your shell:
docker logs -f my-container 2>&1 | jq 'select(.level == "error")'
```

For persistently high-volume logs, configure log rotation and consider using a centralized logging system.

## Conclusion

Real-time log following in Portainer brings the power of `docker logs -f` to the browser. Enable it during deployments to watch startup sequences, during debugging to catch errors as they happen, and during long-running jobs to monitor progress. Ensure your applications log to stdout without buffering and include sufficient context in log messages to make real-time debugging effective.
