# How to Debug Why Docker Compose Services Won't Start

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, Debugging, Troubleshooting, Logs, DevOps, Docker

Description: A systematic troubleshooting guide for diagnosing and fixing Docker Compose services that fail to start or keep restarting.

---

Few things are more frustrating than running `docker compose up` and watching a service fail silently, restart in a loop, or exit immediately with no useful output. The good news is that Docker Compose failures follow predictable patterns. Once you know where to look and what to check, you can diagnose most issues in minutes.

This guide walks through a systematic debugging approach, from the most common causes to the more obscure ones.

## Step 1: Check Container Status

Start by seeing what state your containers are in:

```bash
# Show all containers including stopped ones with exit codes
docker compose ps -a
```

The output tells you whether containers are running, restarting, or exited. Pay attention to the exit code:

- Exit 0: Container finished successfully (normal for one-shot tasks)
- Exit 1: Application error
- Exit 137: Container was killed (OOM or `docker stop`)
- Exit 139: Segmentation fault
- Exit 143: Container received SIGTERM

## Step 2: Read the Logs

Logs are your primary debugging tool:

```bash
# View logs for all services
docker compose logs

# View logs for a specific service
docker compose logs api

# Follow logs in real time
docker compose logs -f api

# Show only the last 100 lines
docker compose logs --tail=100 api

# Show logs with timestamps
docker compose logs -t api
```

If a container exited before producing logs, try running the service in the foreground:

```bash
# Run the service in foreground (not detached)
docker compose up api
```

## Step 3: Inspect Container Details

If logs are empty or unhelpful, inspect the container for more details:

```bash
# Get the full container state including error messages
docker inspect $(docker compose ps -q api) --format '{{json .State}}' | python3 -m json.tool
```

This shows the exact exit code, whether the container was OOM-killed, and the error message if any.

## Common Cause 1: Image Pull Failures

The service cannot start because the image does not exist or cannot be pulled:

```bash
# Check if the image exists locally
docker compose images

# Try pulling images explicitly
docker compose pull
```

Fix: Verify the image name and tag in your compose file. Check registry authentication:

```bash
# Log in to your registry
docker login registry.example.com

# Then try pulling again
docker compose pull api
```

## Common Cause 2: Port Conflicts

Another process is already using the port:

```bash
# Check what is using the port
lsof -i :3000

# Or use ss
ss -tlnp | grep 3000
```

The error looks like: `Bind for 0.0.0.0:3000 failed: port is already allocated`

Fix: Change the host port in your compose file or stop the conflicting process:

```yaml
services:
  api:
    ports:
      - "3001:3000"    # Changed host port to 3001
```

## Common Cause 3: Volume Mount Errors

A bind mount references a directory that does not exist on the host:

```bash
# The error looks like:
# Error response from daemon: invalid mount config for type "bind": bind source path does not exist

# Check if the directory exists
ls -la ./data
```

Fix: Create the directory before starting:

```bash
# Create missing directories
mkdir -p ./data ./config ./logs
docker compose up -d
```

## Common Cause 4: Dependency Failures

A service depends on another service that is not healthy or has not started:

```yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Debug:

```bash
# Check health status of dependencies
docker compose ps

# Check health check logs
docker inspect $(docker compose ps -q db) --format '{{json .State.Health}}' | python3 -m json.tool
```

Fix: Increase health check retries and start_period, or fix the underlying service:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 10s
  retries: 10
  start_period: 30s    # Give the service time to initialize
```

## Common Cause 5: OOM Killed

The container ran out of memory and was killed by the kernel:

```bash
# Check if a container was OOM killed
docker inspect $(docker compose ps -q api) --format '{{.State.OOMKilled}}'
```

You can also check the kernel log:

```bash
# Check kernel OOM events
dmesg | grep -i "killed process"
```

Fix: Increase the memory limit:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G    # Increase from default
```

## Common Cause 6: Entrypoint or Command Errors

The container's entrypoint or command is wrong:

```bash
# Override the command to get a shell and test manually
docker compose run --rm --entrypoint sh api
```

Inside the container, try running the command manually:

```bash
# Test the actual command
node server.js
# Or
python manage.py runserver
```

Common issues include:
- The binary does not exist in the image
- A shell script is missing executable permissions
- Windows-style line endings (CRLF) in shell scripts

Fix the line endings issue:

```bash
# Convert CRLF to LF in entrypoint scripts
sed -i 's/\r$//' entrypoint.sh
```

## Common Cause 7: Environment Variable Issues

Missing or incorrect environment variables cause crashes at startup:

```bash
# Check what environment variables are set in the container
docker compose config | grep -A 50 "api:"
```

Debug by listing all environment variables inside the container:

```bash
# Run the container with a shell to check environment
docker compose run --rm api env | sort
```

Fix: Make sure all required variables are defined:

```yaml
services:
  api:
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL must be set}
      SECRET_KEY: ${SECRET_KEY:?SECRET_KEY must be set}
```

## Common Cause 8: Network Issues

The container cannot reach a service it needs:

```bash
# Check network connectivity from inside a container
docker compose exec api ping db

# Check DNS resolution
docker compose exec api nslookup db

# Check if the target port is open
docker compose exec api nc -zv db 5432
```

If DNS resolution fails, the services might be on different networks:

```bash
# List networks
docker network ls

# Inspect a network to see connected containers
docker network inspect $(docker compose ps -q api | head -1)
```

Fix: Make sure all services that need to communicate are on the same network:

```yaml
services:
  api:
    networks:
      - backend

  db:
    networks:
      - backend

networks:
  backend:
```

## Common Cause 9: File Permission Issues

The container process cannot read or write to mounted volumes:

```bash
# Check what user the container runs as
docker compose exec api id

# Check permissions on the mounted directory
docker compose exec api ls -la /app/data
```

Fix: Set correct ownership or run the container as the right user:

```yaml
services:
  api:
    user: "1000:1000"
    volumes:
      - ./data:/app/data
```

Or fix permissions on the host:

```bash
# Set ownership to match the container user
sudo chown -R 1000:1000 ./data
```

## Common Cause 10: Compose File Syntax Errors

A typo or indentation error in the compose file:

```bash
# Validate the compose file syntax
docker compose config -q

# If there are errors, show the full output
docker compose config
```

Common syntax problems:
- Incorrect indentation (YAML is sensitive to spaces)
- Using tabs instead of spaces
- Missing quotes around values with special characters
- Incorrect variable interpolation syntax

## The Nuclear Debugging Option

When nothing else works, start from scratch:

```bash
# Stop everything and remove all resources
docker compose down -v --remove-orphans

# Remove all cached images for this project
docker compose down --rmi all

# Clean up Docker system
docker system prune -f

# Start fresh
docker compose up --build
```

## Systematic Debug Checklist

When a service will not start, go through this checklist:

```bash
# 1. Check compose file syntax
docker compose config -q

# 2. Check service status and exit codes
docker compose ps -a

# 3. Read service logs
docker compose logs --tail=50 <service>

# 4. Check container state details
docker inspect $(docker compose ps -q <service>) --format '{{json .State}}'

# 5. Check if image exists
docker compose images

# 6. Check port conflicts
docker compose ps --format "table {{.Name}}\t{{.Ports}}"

# 7. Check volume mounts exist
docker compose config --volumes

# 8. Check environment variables
docker compose run --rm <service> env

# 9. Get a shell in the container
docker compose run --rm --entrypoint sh <service>

# 10. Check Docker daemon logs
sudo journalctl -u docker --since "10 minutes ago"
```

## Summary

Debugging Docker Compose startup failures comes down to a systematic approach: check the status, read the logs, inspect the container, and work through common causes. Most failures fall into a handful of categories, from port conflicts and missing volumes to OOM kills and wrong commands. Start with `docker compose ps -a` and `docker compose logs`, then drill deeper based on what you find. When all else fails, start from a clean state with `docker compose down -v` and build back up.
