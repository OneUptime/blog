# How to Debug Docker Container Startup Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Troubleshooting, Debugging, DevOps, Containers

Description: Learn systematic approaches to diagnose and fix Docker container startup failures, including exit codes, log analysis, entrypoint issues, and common configuration problems.

---

When a Docker container fails to start or exits immediately, finding the root cause can be challenging. This guide provides a systematic approach to diagnosing and fixing container startup failures.

## Initial Diagnosis

### Check Container Status

```bash
# List all containers including stopped ones
docker ps -a

# Example output:
# CONTAINER ID   IMAGE    STATUS                     NAMES
# abc123         myapp    Exited (1) 5 seconds ago   myapp
# def456         nginx    Exited (137) 2 hours ago   web
```

### Understanding Exit Codes

| Exit Code | Meaning | Common Cause |
|-----------|---------|--------------|
| 0 | Success | Command completed normally |
| 1 | General error | Application error, bad configuration |
| 2 | Shell error | Invalid command syntax |
| 126 | Command not executable | Permission issue |
| 127 | Command not found | Binary missing, wrong PATH |
| 128 | Invalid exit argument | Exit called with non-number |
| 137 | SIGKILL (128+9) | Out of memory, docker kill |
| 139 | SIGSEGV (128+11) | Segmentation fault |
| 143 | SIGTERM (128+15) | Graceful shutdown |
| 255 | Exit status out of range | Fatal error |

### Get Container Logs

```bash
# View logs
docker logs myapp

# Follow logs in real-time
docker logs -f myapp

# Show last N lines
docker logs --tail 50 myapp

# Show timestamps
docker logs -t myapp

# Show logs since time
docker logs --since 5m myapp
```

## Common Startup Issues

### Issue: Command Not Found (Exit Code 127)

```bash
docker logs myapp
# exec /app/start.sh: no such file or directory
```

#### Diagnose

```bash
# Check if file exists
docker run --rm --entrypoint ls myimage -la /app/

# Check file permissions
docker run --rm --entrypoint stat myimage /app/start.sh
```

#### Solutions

```bash
# File doesn't exist - check COPY in Dockerfile
# File exists but wrong line endings (Windows)
docker run --rm --entrypoint cat myimage /app/start.sh | head -1 | od -c
# Should not show \r\n

# Fix in Dockerfile
RUN sed -i 's/\r$//' /app/start.sh
# Or use dos2unix
RUN apt-get update && apt-get install -y dos2unix && dos2unix /app/start.sh
```

### Issue: Permission Denied (Exit Code 126)

```bash
docker logs myapp
# exec /app/start.sh: permission denied
```

#### Solution

```dockerfile
# Add execute permission in Dockerfile
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
```

### Issue: Missing Dependencies

```bash
docker logs myapp
# Error: Cannot find module 'express'
# ImportError: No module named 'flask'
```

#### Diagnose

```bash
# Check if node_modules exists
docker run --rm myimage ls -la /app/node_modules

# Check Python packages
docker run --rm myimage pip list
```

#### Solution

```dockerfile
# Ensure dependencies are installed
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
```

### Issue: Configuration Errors

```bash
docker logs myapp
# Error: Configuration file not found: /app/config.yaml
# FATAL: password authentication failed for user "admin"
```

#### Diagnose

```bash
# Check environment variables
docker inspect myapp --format='{{json .Config.Env}}' | jq

# Check mounted volumes
docker inspect myapp --format='{{json .Mounts}}' | jq

# Check if config file exists
docker run --rm -v $(pwd)/config:/app/config myimage ls -la /app/config/
```

### Issue: Port Already Bound

```bash
docker logs myapp
# Error: listen EADDRINUSE: address already in use :::3000
```

This means another process inside the container is using the port, or the application is starting twice.

#### Solution

Check entrypoint script isn't starting the app multiple times.

### Issue: Out of Memory (Exit Code 137)

```bash
docker inspect myapp --format='{{.State.OOMKilled}}'
# true
```

#### Solutions

```bash
# Increase memory limit
docker run -m 1g myimage

# Or in docker-compose
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
```

## Interactive Debugging

### Override Entrypoint for Debugging

```bash
# Start shell instead of normal command
docker run -it --entrypoint /bin/sh myimage

# Or bash if available
docker run -it --entrypoint /bin/bash myimage

# Now investigate inside container
ls -la /app
cat /app/config.yaml
env
which python
```

### Run Failing Command Manually

```bash
# Start container with shell
docker run -it --entrypoint sh myimage

# Manually run the command that's failing
./start.sh

# Or run with more verbosity
bash -x ./start.sh
```

### Debug Startup Script

```bash
#!/bin/bash
# Add debugging to entrypoint.sh
set -x  # Print commands as they execute
set -e  # Exit on error

echo "Starting application..."
echo "Environment: $NODE_ENV"
echo "Working directory: $(pwd)"
echo "Files: $(ls -la)"

exec node server.js
```

## Check Image Configuration

### Inspect Image

```bash
# View image configuration
docker inspect myimage

# See ENTRYPOINT and CMD
docker inspect myimage --format='ENTRYPOINT: {{json .Config.Entrypoint}}'
docker inspect myimage --format='CMD: {{json .Config.Cmd}}'

# View environment variables
docker inspect myimage --format='{{json .Config.Env}}' | jq

# View working directory
docker inspect myimage --format='{{.Config.WorkingDir}}'
```

### Compare with Working Container

```bash
# If you have a working version, compare configurations
docker inspect working-app > working.json
docker inspect failing-app > failing.json
diff working.json failing.json
```

## Health Check Debugging

### Container Unhealthy

```bash
docker ps
# STATUS: unhealthy

# View health check logs
docker inspect myapp --format='{{json .State.Health}}' | jq

# Example output shows last health check results
```

### Debug Health Check

```bash
# Run health check command manually
docker exec myapp curl -f http://localhost:3000/health

# Or
docker exec myapp /app/healthcheck.sh
```

## Layer-by-Layer Debugging

Find which Dockerfile instruction caused the issue.

```bash
# View image history
docker history myimage

# Build with progress output
DOCKER_BUILDKIT=1 docker build --progress=plain -t myimage .

# Build up to specific stage
docker build --target build-stage -t debug-image .
docker run -it debug-image sh
```

## Docker Compose Debugging

### View Combined Logs

```bash
# Logs from all services
docker compose logs

# Follow logs
docker compose logs -f

# Specific service
docker compose logs myservice
```

### Check Service Status

```bash
# View service status
docker compose ps

# See why service failed
docker compose ps --format json | jq
```

### Debug Dependency Order

```bash
# Start dependencies first
docker compose up db redis

# Then start app separately
docker compose up app
```

## Debugging Checklist

```bash
#!/bin/bash
# debug-container.sh

CONTAINER=$1

echo "=== Container Status ==="
docker ps -a | grep $CONTAINER

echo -e "\n=== Exit Code ==="
docker inspect $CONTAINER --format='{{.State.ExitCode}}'

echo -e "\n=== OOM Killed ==="
docker inspect $CONTAINER --format='{{.State.OOMKilled}}'

echo -e "\n=== Last Logs ==="
docker logs --tail 50 $CONTAINER

echo -e "\n=== Container Config ==="
docker inspect $CONTAINER --format='
ENTRYPOINT: {{json .Config.Entrypoint}}
CMD: {{json .Config.Cmd}}
WORKDIR: {{.Config.WorkingDir}}
USER: {{.Config.User}}
'

echo -e "\n=== Health Status ==="
docker inspect $CONTAINER --format='{{json .State.Health}}' 2>/dev/null | jq || echo "No health check"

echo -e "\n=== Mounts ==="
docker inspect $CONTAINER --format='{{json .Mounts}}' | jq
```

## Quick Fixes

| Symptom | Check | Fix |
|---------|-------|-----|
| Exits immediately | `docker logs` | Check command/entrypoint |
| Exit code 127 | File exists? | Check COPY, file path |
| Exit code 126 | Permissions? | `chmod +x` script |
| Exit code 137 | OOM killed? | Increase memory limit |
| Exit code 1 | Application logs | Fix application error |
| No logs | Write to stdout? | Ensure app logs to stdout |
| Unhealthy | Health check cmd | Fix health check or remove |

## Summary

| Step | Command |
|------|---------|
| Check status | `docker ps -a` |
| View exit code | `docker inspect --format='{{.State.ExitCode}}'` |
| Check logs | `docker logs container` |
| Check OOM | `docker inspect --format='{{.State.OOMKilled}}'` |
| Debug interactively | `docker run -it --entrypoint sh image` |
| Check config | `docker inspect image` |
| Check health | `docker inspect --format='{{json .State.Health}}'` |

Container startup failures are usually caused by missing files, permission issues, missing dependencies, or configuration errors. Start with logs and exit codes, then interactively debug by overriding the entrypoint to investigate the container environment.

