# How to Fix 'Container Exits Immediately' Issues in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Troubleshooting, DevOps, Debugging, Containers

Description: Diagnose and fix Docker containers that start and immediately exit, covering common causes from missing foreground processes to entrypoint errors.

---

You run `docker run` or `docker compose up`, the container starts briefly, then immediately exits. You check `docker ps` and see nothing running. This is one of the most frustrating Docker issues because there is often no obvious error message. This guide walks through the common causes and how to fix them.

## Quick Diagnosis Steps

First, gather information about what happened:

```bash
# See all containers including stopped ones
docker ps -a

# Check the exit code
docker inspect container_name --format='{{.State.ExitCode}}'

# View logs from the stopped container
docker logs container_name

# Get detailed state information
docker inspect container_name --format='{{json .State}}' | jq
```

Exit codes give you a clue:
- **0**: Process completed successfully (but Docker expects it to keep running)
- **1**: Application error
- **137**: Container was killed (OOM or docker stop)
- **139**: Segmentation fault
- **143**: Graceful termination (SIGTERM)

## Cause 1: No Foreground Process

Docker containers run as long as their main process (PID 1) runs. If that process exits or runs in the background, the container stops.

### The Problem

```dockerfile
# Bad: This starts nginx and returns immediately
FROM nginx:alpine
CMD ["nginx"]
```

Nginx by default daemonizes (runs in background), so the CMD finishes and the container exits.

### The Fix

```dockerfile
# Good: Run nginx in foreground mode
FROM nginx:alpine
CMD ["nginx", "-g", "daemon off;"]
```

### Common Daemon Services

| Service | Background (Wrong) | Foreground (Correct) |
|---------|-------------------|---------------------|
| Nginx | `nginx` | `nginx -g 'daemon off;'` |
| Apache | `apachectl start` | `apachectl -DFOREGROUND` |
| MySQL | `mysqld_safe &` | `mysqld` |
| Redis | `redis-server --daemonize yes` | `redis-server` |

## Cause 2: Command Completes Successfully

If your command is meant to run once and exit, Docker considers its job done.

```dockerfile
# This runs once and exits - container stops
FROM python:3.11
CMD ["python", "-c", "print('Hello')"]
```

### Keep Container Running for Debugging

```bash
# Override CMD to keep container running
docker run -d myimage tail -f /dev/null

# Or use sleep infinity
docker run -d myimage sleep infinity

# Or start an interactive shell
docker run -it myimage /bin/bash
```

### For Long-Running Services

Ensure your application runs in the foreground:

```python
# app.py
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello!'

if __name__ == '__main__':
    # This blocks and keeps running
    app.run(host='0.0.0.0', port=5000)
```

## Cause 3: Entrypoint or CMD Error

Syntax errors or wrong paths cause immediate exits.

### Shell Form vs Exec Form

```dockerfile
# Shell form - runs through /bin/sh -c
CMD python app.py

# Exec form (preferred) - runs directly
CMD ["python", "app.py"]
```

If your base image does not have `/bin/sh`, shell form fails silently.

### Check for Typos and Paths

```dockerfile
# Wrong: File doesn't exist at this path
CMD ["python", "/app/main.py"]

# Verify the path is correct
# Build and check interactively:
docker run -it myimage /bin/sh
ls -la /app/
```

### Debug Entrypoint Issues

```bash
# Override entrypoint to get a shell
docker run -it --entrypoint /bin/sh myimage

# Run your command manually to see errors
/entrypoint.sh
```

## Cause 4: Missing Dependencies

The application crashes on startup because a dependency is missing.

```bash
# Check logs for import errors or missing libraries
docker logs container_name

# Common Python error
ModuleNotFoundError: No module named 'flask'

# Common Node.js error
Error: Cannot find module 'express'
```

### The Fix

```dockerfile
# Ensure dependencies are installed
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

### System Dependencies

Some Python packages need system libraries:

```dockerfile
FROM python:3.11-slim

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

## Cause 5: Environment Variables Missing

Application expects environment variables that are not set.

```python
# app.py
import os

# Crashes if DATABASE_URL is not set
database_url = os.environ['DATABASE_URL']
```

### The Fix

```bash
# Pass required environment variables
docker run -e DATABASE_URL=postgres://localhost/db myimage
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    environment:
      DATABASE_URL: postgres://db:5432/myapp
      SECRET_KEY: your-secret-key
```

Or use defaults in your code:

```python
import os

database_url = os.environ.get('DATABASE_URL', 'sqlite:///default.db')
```

## Cause 6: File Permissions

Scripts are not executable or files are owned by wrong user.

```bash
# Error: permission denied
/entrypoint.sh: Permission denied
```

### The Fix

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

# Make scripts executable
RUN chmod +x /app/entrypoint.sh

# If running as non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

CMD ["/app/entrypoint.sh"]
```

## Cause 7: Health Check Failures

Containers can be killed if health checks fail repeatedly.

```bash
# Check health status
docker inspect container_name --format='{{.State.Health.Status}}'

# View health check logs
docker inspect container_name --format='{{json .State.Health}}' | jq
```

### Debug Health Checks

```yaml
# docker-compose.yml
services:
  app:
    build: .
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s  # Give app time to start
```

## Cause 8: Out of Memory (OOM)

The container was killed because it exceeded memory limits.

```bash
# Check if OOM killed
docker inspect container_name --format='{{.State.OOMKilled}}'
# Returns: true

# Check memory limits
docker inspect container_name --format='{{.HostConfig.Memory}}'
```

### The Fix

```bash
# Increase memory limit
docker run -m 1g myimage

# Or remove the limit for testing
docker run --memory-swap -1 myimage
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    deploy:
      resources:
        limits:
          memory: 1G
```

## Debugging Workflow

Here is a systematic approach to debug container exit issues:

```bash
#!/bin/bash
# debug-container.sh

CONTAINER=$1

if [ -z "$CONTAINER" ]; then
    echo "Usage: $0 <container_name_or_id>"
    exit 1
fi

echo "=== Container State ==="
docker inspect $CONTAINER --format='
Exit Code: {{.State.ExitCode}}
OOM Killed: {{.State.OOMKilled}}
Error: {{.State.Error}}
Started: {{.State.StartedAt}}
Finished: {{.State.FinishedAt}}
'

echo "=== Last 50 Log Lines ==="
docker logs --tail 50 $CONTAINER 2>&1

echo "=== Container Config ==="
docker inspect $CONTAINER --format='
Entrypoint: {{.Config.Entrypoint}}
Cmd: {{.Config.Cmd}}
WorkingDir: {{.Config.WorkingDir}}
'
```

## Interactive Debugging

When logs are not helpful, debug interactively:

```bash
# Method 1: Override command to keep container running
docker run -it myimage /bin/bash
# Then manually run your startup commands

# Method 2: Override entrypoint
docker run -it --entrypoint /bin/bash myimage
# Now test the original entrypoint manually
./entrypoint.sh

# Method 3: Exec into a running container (if it stays up briefly)
docker run -d myimage sleep 30
docker exec -it <container_id> /bin/bash

# Method 4: Check filesystem of stopped container
docker cp <stopped_container>:/app/logs ./logs
```

## Common Quick Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Exit code 0 | Process completed | Make process run in foreground |
| Exit code 1 | Application error | Check logs for error message |
| Exit code 127 | Command not found | Verify CMD/ENTRYPOINT paths |
| Exit code 137 | OOM or killed | Increase memory or check docker stop |
| No logs at all | Crashes before logging | Check entrypoint, run interactively |
| "Permission denied" | File not executable | chmod +x on scripts |

## Summary

When a Docker container exits immediately, start by checking the exit code and logs with `docker inspect` and `docker logs`. The most common causes are: processes running in background mode instead of foreground, missing dependencies or environment variables, permission issues with entrypoint scripts, and commands that complete successfully but are expected to keep running. Debug interactively by overriding the entrypoint or command to get a shell, then manually run your startup commands to see the actual error. Once you identify the issue, fix it in your Dockerfile and test again.
