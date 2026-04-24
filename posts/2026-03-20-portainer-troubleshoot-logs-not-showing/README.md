# How to Troubleshoot Container Logs Not Showing in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Logging, Troubleshooting

Description: Learn how to diagnose and fix issues where Docker container logs are not appearing or showing empty in Portainer's log viewer.

## Introduction

One of the most frustrating Portainer issues is opening the log viewer and seeing nothing - blank logs for a running container. This can be caused by a logging setup Docker can't read locally, application writing to files instead of stdout, output buffering, or Portainer's log viewer limitations. This guide walks through each cause systematically.

## Prerequisites

- Portainer installed with a connected Docker environment
- A container with empty or missing logs

## Step 1: Check the Logging Driver

Portainer shows the Docker logs for your container, so what you see depends on whether `docker logs` can read them. Drivers such as `json-file`, `local`, and `journald` work directly, while remote drivers depend on Docker's dual logging cache.

```bash
# Check which logging driver the container uses:
docker inspect --format '{{json .HostConfig.LogConfig}}' my-container

# Output if directly readable by Docker:
{"Type":"json-file","Config":{}}

# Output if the container uses a remote driver:
{"Type":"fluentd","Config":{"fluentd-address":"localhost:24224"}}
```

**Fix:** If you're using a remote driver and `docker logs` can't read the container logs, switch to a locally readable driver such as `local`, `json-file`, or `journald`, or enable Docker's local cache:

```yaml
# docker-compose.yml: force json-file logging
services:
  app:
    image: myorg/app:latest
    logging:
      driver: json-file    # Portainer can show these logs
      options:
        max-size: "10m"
        max-file: "5"
```

Or set system-wide default in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
```

## Step 2: Verify the Application Logs to stdout

Docker captures stdout and stderr. If your application writes to a file, Portainer won't see it.

```bash
# Check if the container has any output at all:
docker logs my-container

# If empty and Step 1 looks good, the app isn't writing to stdout/stderr

# Check if the app is writing to files:
docker exec my-container find /var/log -name "*.log" -size +0c 2>/dev/null
docker exec my-container ls -la /app/logs/ 2>/dev/null
```

**Fix:** Redirect log files to stdout/stderr in your Dockerfile or entrypoint:

```dockerfile
# Dockerfile: symlink log files to stdout
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
```

Or in your application:

```python
# Python: ensure logging goes to stdout, not a file
import logging
import sys

logging.basicConfig(
    stream=sys.stdout,    # stdout - not a file
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    force=True  # Override any existing handlers
)
```

```nginx
# Nginx: configure logging to stdout/stderr
# nginx.conf
http {
    # Log to stdout (captured by Docker)
    access_log /dev/stdout main;
    error_log /dev/stderr warn;
}
```

## Step 3: Disable Output Buffering

Some runtimes buffer output, which delays log appearance in Portainer.

### Python

```yaml
services:
  app:
    image: python:3.12-slim
    environment:
      # Disable Python output buffering
      - PYTHONUNBUFFERED=1
```

Or in code:

```python
import sys
# Flush after every write:
sys.stdout.reconfigure(line_buffering=True)
# Or:
import functools
print = functools.partial(print, flush=True)
```

### Node.js

Node.js generally writes to stdout and stderr without extra buffering, so focus on writing there:

```javascript
console.log('message');
process.stdout.write('message\n');
```

### PHP

PHP buffering is configured in `php.ini` or in code, not via a Docker environment variable:

```ini
output_buffering = Off
implicit_flush = On
```

Or in code:

```php
ob_implicit_flush(true);
```

### Ruby

Ruby doesn't provide a standard `RUBY_STDOUT_SYNC` environment variable, so set sync mode in code:

```ruby
$stdout.sync = true
$stderr.sync = true
```

## Step 4: Check Log Rotation (Old Logs Deleted)

If you're using the `json-file` driver, log rotation may have deleted older logs. This isn't a Portainer issue but can seem like logs are missing.

```bash
# Check the host path Docker uses for this container's log file:
LOGPATH=$(docker inspect my-container --format '{{.LogPath}}')
echo "${LOGPATH}"

# Check the current log file size:
sudo du -sh "${LOGPATH}"
```

If the file is empty or tiny, older logs may have been rotated away or the app never wrote any logs.

## Step 5: Verify Container Is Actually Running

```bash
# Check container is running:
docker ps | grep my-container

# Check exit code (if container keeps restarting):
docker inspect --format '{{.State.ExitCode}}' my-container

# Check restart count:
docker inspect --format '{{.RestartCount}}' my-container
```

If the container is restarting rapidly, check its logs immediately after start.

## Step 6: Check Portainer Viewer Limits

Sometimes the logs exist, but Portainer is only showing a limited number of lines or a narrow time range:

```bash
# Check what Docker can currently return:
docker logs --tail 2000 my-container

# In Portainer log viewer:
# Increase the "Lines" setting (default: 1000)
# and widen the date range if needed
```

## Step 7: Portainer Agent Issues (Remote Hosts)

For remote environments, the Portainer Agent may have connection issues.

```bash
# Check agent status on the remote host:
docker ps | grep portainer_agent
docker logs portainer_agent --tail 20

# Verify the agent has the Docker socket mounted:
docker inspect --format '{{json .Mounts}}' portainer_agent
```

## Step 8: Test Logging with a Known-Good Container

Rule out Portainer issues by testing with a simple container:

```bash
# Deploy a test container that definitely logs:
docker run -d \
  --name log-test \
  --restart no \
  alpine:latest \
  sh -c 'while true; do echo "Test log line: $(date)"; sleep 5; done'

# Check if Portainer shows logs for this container
# If yes: the issue is with your application's logging configuration
# If no: the issue is with Portainer or Docker logging infrastructure
```

## Summary Diagnostic Flow

```text
Logs empty in Portainer?
    │
    ├─ Check docker logs <container>: returns a driver error?
    │   └─ Yes → Enable Docker's local log cache or switch to local/json-file/journald
    │
    ├─ Check docker logs <container>: empty? ─ Yes → App not writing to stdout
    │   └─ Fix: redirect app logs to stdout; disable buffering where relevant
    │
    ├─ Check docker logs <container>: has output? ─ Yes
    │   └─ Check Portainer line limit (default 1000), date range, and refresh
    │
    └─ Container kept restarting?
        └─ Logs from previous runs may have rotated out; increase retention
```

## Conclusion

Container logs not showing in Portainer is usually caused by one of three things: Docker can't read the container logs locally, the application is writing to files instead of stdout/stderr, or output buffering is delaying them. Check the logging setup first, then verify stdout logging in your application, and disable buffering where it applies. Once `docker logs` shows the container output, Portainer should display the same logs reliably.
