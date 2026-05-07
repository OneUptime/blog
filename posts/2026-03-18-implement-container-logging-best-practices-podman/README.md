# How to Implement Container Logging Best Practices with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Logging, Best Practice, Container, Observability

Description: Learn container logging best practices with Podman including structured logging, log rotation, centralized aggregation, and efficient log management strategies.

---

> Effective container logging gives you visibility into application behavior, simplifies debugging, and provides the audit trail needed for security and compliance.

Logging in containerized environments requires a different approach than traditional server logging. Containers are ephemeral, so logs must be captured and forwarded before containers are recreated. Podman provides multiple logging drivers and integrates with systemd's journal, giving you flexible options for log management.

This guide covers logging best practices from application-level structured logging to centralized log aggregation.

---

## Log to stdout and stderr

The most important logging practice is to write all logs to stdout and stderr, not to files inside the container:

```dockerfile
# Good: application logs to stdout

CMD ["node", "server.js"]

# Bad: application logs to a file inside the container
CMD ["node", "server.js", "--log-file=/var/log/app.log"]
```

Podman captures stdout and stderr automatically and makes them available through `podman logs`. File-based logs are lost when containers are recreated.

For applications that only support file-based logging, symlink the log file to stdout:

```dockerfile
# Redirect application log files to stdout/stderr
RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log
```

## Choose the Right Log Driver

Podman supports several log drivers:

```bash
# journald: integrates with systemd journal
podman run -d --log-driver=journald --name api my-api

# k8s-file: Kubernetes CRI-compatible file format
podman run -d --log-driver=k8s-file --name api my-api

# json-file: alias for k8s-file in Podman
podman run -d --log-driver=json-file --name api my-api

# none: disable logging
podman run -d --log-driver=none --name batch-job my-job
```

Set the default driver for your user:

```ini
# ~/.config/containers/containers.conf
[containers]
log_driver = "journald"
```

For a system-wide default, use `/etc/containers/containers.conf` instead.

## Structured Logging

Emit logs as JSON for easy parsing and querying:

```javascript
// Node.js with pino
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Structured log entries
logger.info({ event: 'request', method: 'GET', path: '/api/users', duration: 45 });
logger.error({ event: 'db_error', query: 'SELECT', error: 'connection refused' });
logger.warn({ event: 'rate_limit', ip: '192.168.1.1', remaining: 0 });
```

```python
# Python with structlog
import structlog

logger = structlog.get_logger()

logger.info("request_received", method="GET", path="/api/users", duration=45)
logger.error("database_error", query="SELECT", error="connection refused")
```

```go
// Go with zerolog
package main

import (
    "os"
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func main() {
    zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
    log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()

    log.Info().
        Str("event", "request").
        Str("method", "GET").
        Str("path", "/api/users").
        Int("duration", 45).
        Msg("request received")
}
```

## Log Levels

Use consistent log levels across all services:

```text
FATAL  - Application cannot continue, immediate shutdown
ERROR  - Operation failed, requires attention
WARN   - Unexpected condition, but operation continues
INFO   - Normal operational events
DEBUG  - Detailed diagnostic information (disabled in production)
TRACE  - Very detailed diagnostic information
```

Control log levels through environment variables:

```bash
podman run -d --name api \
  -e LOG_LEVEL=info \
  my-api:latest

# Temporarily increase verbosity for debugging
podman run -d --name api-debug \
  -e LOG_LEVEL=debug \
  my-api:latest
```

## Log Rotation

Prevent logs from filling up disk space:

```bash
# Set log size limits per container
podman run -d \
  --name api \
  --log-opt max-size=50m \
  my-api:latest
```

User-level defaults:

```ini
# ~/.config/containers/containers.conf
[containers]
log_size_max = 52428800  # 50MB per container
```

When using journald, configure journal size limits:

```ini
# /etc/systemd/journald.conf
[Journal]
SystemMaxUse=2G
SystemMaxFileSize=100M
MaxRetentionSec=30day
```

## Querying Logs

Use Podman's log commands effectively:

```bash
# Follow logs in real time
podman logs -f api

# Show last 100 lines
podman logs --tail 100 api

# Show logs from the last hour
podman logs --since 1h api

# Show logs with timestamps
podman logs -t api

# Show logs between specific times
podman logs --since 2024-01-15T10:00:00 --until 2024-01-15T11:00:00 api
```

With journald:

```bash
# Query by container name
journalctl CONTAINER_NAME=api

# Filter by priority
journalctl CONTAINER_NAME=api -p err

# JSON output for parsing
journalctl CONTAINER_NAME=api -o json

# Follow with filtering
journalctl CONTAINER_NAME=api -f | grep "error"

# Query by container ID
journalctl CONTAINER_ID=<container-id>
```

## Contextual Log Fields

Include context in every log entry to make debugging easier:

```javascript
const os = require('os');

const logger = pino({
  level: 'info',
  base: {
    service: process.env.SERVICE_NAME || 'api',
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    hostname: os.hostname(),
  },
});

// Every log entry includes service, version, environment, hostname
logger.info({ requestId: 'abc123', userId: 42 }, 'Order created');
// Output:
// {"level":"info","service":"api","version":"1.2.3","environment":"production",
//  "hostname":"api-01","requestId":"abc123","userId":42,"msg":"Order created"}
```

Pass context through environment variables:

```bash
podman run -d --name api \
  -e SERVICE_NAME=api \
  -e APP_VERSION=1.2.3 \
  -e NODE_ENV=production \
  my-api:latest
```

## Log Aggregation

Forward container logs to a centralized system:

```bash
# Grafana Alloy for Loki
podman run -d --name alloy \
  -v /run/log/journal:/run/log/journal:ro \
  -v ~/config.alloy:/etc/alloy/config.alloy:ro,Z \
  docker.io/grafana/alloy:latest \
  run --server.http.listen-addr=0.0.0.0:12345 /etc/alloy/config.alloy

# Fluentd for Elasticsearch
podman run -d --name fluentd \
  -v ~/fluent.conf:/fluentd/etc/fluent.conf:ro,Z \
  -v /run/log/journal:/run/log/journal:ro \
  docker.io/fluent/fluentd:latest
```

## Log-Based Alerting

Set up alerts based on log patterns:

```bash
#!/bin/bash
# log-alert.sh - Monitor logs for critical patterns

CONTAINERS="api worker web"
ALERT_PATTERNS="FATAL|panic|OutOfMemory|connection refused"

for container in $CONTAINERS; do
  ERRORS=$(podman logs --since 5m "$container" 2>&1 | \
    grep -cE "$ALERT_PATTERNS")

  if [ "$ERRORS" -gt 0 ]; then
    echo "ALERT: $container has $ERRORS critical log entries in the last 5 minutes"
    podman logs --since 5m "$container" 2>&1 | grep -E "$ALERT_PATTERNS"
  fi
done
```

## Sensitive Data in Logs

Never log sensitive information:

```javascript
// Bad: logging passwords and tokens
logger.info({ password: user.password, token: session.token }, 'Login');

// Good: redact sensitive fields
logger.info({ userId: user.id, email: user.email }, 'Login successful');

// Use a redaction list
const logger = pino({
  redact: ['password', 'token', 'authorization', 'cookie', 'creditCard'],
});
```

## Conclusion

Container logging best practices with Podman start with writing to stdout/stderr, using structured JSON format, and choosing the right log driver for your environment. Implement consistent log levels, set rotation limits to prevent disk exhaustion, and forward logs to a centralized system for long-term storage and analysis. Always include contextual fields in log entries and never log sensitive data. These practices give you the observability needed to operate containerized applications reliably.
