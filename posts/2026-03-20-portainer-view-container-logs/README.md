# How to View Container Logs in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Logging, DevOps

Description: Learn how to view, filter, and navigate Docker container logs in Portainer's built-in log viewer.

## Introduction

Container logs are your primary debugging tool for containerized applications. Portainer's log viewer gives you access to container stdout/stderr output directly in the browser, with filtering and search capabilities. This guide covers everything you need to know about using Portainer's log viewer effectively.

## Prerequisites

- Portainer installed with a connected Docker environment
- A container with logs available through Docker (for example `local`, `json-file`, or `journald`; remote logging drivers depend on Docker's dual logging/cache settings)

## Step 1: Access Container Logs

### From the Container List

1. Navigate to **Containers** in Portainer.
2. Click the **Logs** icon (document icon) next to any container.

### From the Container Details Page

1. Click on a container name.
2. Click the **Logs** button.

### Keyboard Shortcut

In the container list, you can also click directly on the container name and then switch to the **Logs** tab.

## Step 2: Understanding the Log Viewer

The log viewer shows:

- **Log lines**: Each line of stdout/stderr output from the container.
- **Timestamps**: When each log line was emitted (if enabled).
- **Log level**: Not automatically highlighted - depends on the app's format.

## Step 3: Log Viewer Options

### Show Timestamps

Toggle to show/hide the timestamp for each log line:

```text
With timestamps:
2026-03-20T10:00:00Z  INFO: Server started on port 8080
2026-03-20T10:00:01Z  INFO: Database connected

Without timestamps:
INFO: Server started on port 8080
INFO: Database connected
```

### Number of Lines

Control how many lines of log history to display:

- Portainer lets you limit how many lines are shown. The default is **1000**.
- For troubleshooting, start with the last 100 lines.
- Large log windows may be slower to load and navigate.

### Auto Refresh

Enable auto refresh to keep the log view updated with new output. If it's disabled, you can refresh manually.

### Search/Filter

Use the search box to find matching log lines. If you want to show only matching lines, enable the filter option.

## Step 4: Reading Structured Logs

Modern applications often output structured JSON logs:

```json
{"timestamp":"2026-03-20T10:00:00Z","level":"INFO","message":"Request received","path":"/api/users","method":"GET","latency_ms":45}
{"timestamp":"2026-03-20T10:00:01Z","level":"ERROR","message":"Database timeout","query":"SELECT * FROM users","duration_ms":5000}
```

In Portainer's log viewer, these appear as raw JSON lines. On the host, you can pretty-print or filter them with `jq`:

```bash
# On the host, view logs with jq parsing:

docker logs my-app --since 1h | jq .

# Filter only ERROR logs:
docker logs my-app 2>&1 | jq 'select(.level=="ERROR")'
```

## Step 5: Viewing Logs from Multiple Containers

Portainer views one container's logs at a time. For multi-container log viewing:

```bash
# Docker Compose: follow all service logs
docker compose logs -f

# Follow specific services:
docker compose logs -f web api

# Since a specific time:
docker compose logs --since="2026-03-20T09:00:00Z"
```

Or use a centralized logging stack (Loki + Grafana) to aggregate logs from all containers.

## Step 6: Log Timestamps and Timezones

By default, Docker log timestamps are in UTC. If your application outputs local time logs and your image honors `TZ`:

```yaml
# Set the container timezone:
environment:
  - TZ=America/New_York

# Your application logs may show local time, but Docker's timestamp is still UTC
```

When comparing logs across containers, always use UTC timestamps.

## Log Format Best Practices

Design your application to output logs in a format that's easy to view in Portainer:

```python
# Python: structured logging to stdout
import logging
import json
import sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

# Configure logging to stdout (Docker captures stdout)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
logging.basicConfig(handlers=[handler], level=logging.INFO)
```

```javascript
// Node.js: simple structured logging
const log = (level, message, extra = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra
  }));
};

const error = new Error('Database connection failed');

log('INFO', 'Server started', { port: 8080 });
log('ERROR', 'Database error', { error: error.message });
```

## Step 7: Log Retention and Rotation

Configure log rotation to prevent disk exhaustion:

```yaml
# docker-compose.yml with log rotation
services:
  app:
    image: myorg/app:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"   # Rotate at 10 MB per file
        max-file: "5"     # Keep 5 rotated files = max 50 MB total
        compress: "true"  # Compress rotated files
```

## Troubleshooting: Logs Not Showing

1. **Logging driver/configuration**: Portainer shows the logs Docker can read. Drivers such as `local`, `json-file`, and `journald` support local log reading directly; remote drivers may require Docker's dual logging cache.
2. **Application not writing to stdout/stderr**: Ensure logs go to stdout, not to a file inside the container.
3. **Container just started**: Give the container a few seconds to produce output.
4. **Log limit**: Portainer limits the amount of logs shown; increase the line count setting.

```bash
# Verify the logging driver:
docker inspect my-container | jq '.[].HostConfig.LogConfig'
# Check the "Type" field; remote drivers may rely on Docker's dual logging cache

# Check if the container is producing output:
docker logs my-container --tail 5
```

## Conclusion

Portainer's log viewer provides convenient access to container output without leaving the browser. For simple debugging and monitoring, it's excellent. For production environments with high log volume, centralize logs with a proper logging stack (Loki, Elasticsearch, CloudWatch) and use Portainer for quick spot-checks. Always ensure your applications write to stdout/stderr and configure log rotation to prevent disk exhaustion.
