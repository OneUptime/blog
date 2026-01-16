# How to Access a Running Docker Container Shell (exec, attach, and logs)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Debugging, DevOps, Containers, Troubleshooting

Description: Learn how to access running Docker containers using exec, attach, and logs commands for debugging, troubleshooting, and inspection of containerized applications.

---

When something goes wrong in a container, you need to get inside and investigate. Docker provides several ways to interact with running containers: `exec` for running commands, `attach` for connecting to the main process, and `logs` for viewing output. Each serves a different purpose, and knowing when to use which saves debugging time.

## docker exec: Run Commands in Containers

The `exec` command runs a new process inside a running container. It's the most common way to interact with containers.

### Start an Interactive Shell

```bash
# Bash shell (most Linux containers)
docker exec -it my-container bash

# Sh shell (Alpine, minimal containers)
docker exec -it my-container sh

# If neither bash nor sh work
docker exec -it my-container /bin/ash    # Alpine
docker exec -it my-container /bin/busybox sh
```

The flags:
- `-i` (interactive): Keep STDIN open
- `-t` (tty): Allocate a pseudo-terminal

### Run Single Commands

```bash
# Check environment variables
docker exec my-container env

# List files
docker exec my-container ls -la /app

# Check processes
docker exec my-container ps aux

# Check network
docker exec my-container cat /etc/hosts
docker exec my-container netstat -tlnp

# Read a file
docker exec my-container cat /app/config.json
```

### Useful Debugging Commands

```bash
# Check running processes
docker exec my-container ps aux

# Check memory usage
docker exec my-container free -m

# Check disk usage
docker exec my-container df -h

# Check open files
docker exec my-container lsof

# Check network connections
docker exec my-container ss -tlnp

# DNS resolution test
docker exec my-container nslookup google.com

# HTTP test
docker exec my-container curl -v http://localhost:8080/health
```

### Run as Different User

```bash
# Run as root (even if container runs as non-root)
docker exec -u root my-container whoami

# Run as specific user
docker exec -u www-data my-container id

# Run as specific UID
docker exec -u 1000 my-container id
```

### Set Working Directory

```bash
docker exec -w /app/logs my-container ls -la
```

### Set Environment Variables

```bash
docker exec -e DEBUG=true my-container npm run diagnose
```

## docker attach: Connect to Main Process

The `attach` command connects your terminal to the container's main process (PID 1). Unlike `exec`, it doesn't start a new process.

```bash
docker attach my-container
```

### Key Differences from exec

| Aspect | exec | attach |
|--------|------|--------|
| Creates new process | Yes | No |
| Connects to | New shell/command | Main process (PID 1) |
| Multiple simultaneous | Yes | Share same stream |
| Detach without stopping | Easy (Ctrl+D or exit) | Ctrl+P, Ctrl+Q |
| Useful for | Debugging, running commands | Viewing main process output |

### Detaching Without Stopping

With `attach`, pressing Ctrl+C sends SIGINT to the main process, potentially stopping the container. To detach safely:

```bash
# Attach with custom detach sequence
docker attach --detach-keys="ctrl-x" my-container

# Then press Ctrl+X to detach

# Or use default: Ctrl+P, Ctrl+Q (press in sequence)
```

### When to Use attach

- Viewing real-time output from the main process
- Interacting with applications that expect terminal input on PID 1
- Debugging startup issues

```bash
# Start container in foreground, then attach from another terminal
# Terminal 1:
docker run --name web nginx

# Terminal 2:
docker attach web  # See nginx access logs
```

## docker logs: View Container Output

The `logs` command shows stdout and stderr from the container's main process.

### Basic Usage

```bash
# View all logs
docker logs my-container

# Follow logs (like tail -f)
docker logs -f my-container

# Last N lines
docker logs --tail 100 my-container

# With timestamps
docker logs -t my-container

# Since specific time
docker logs --since 1h my-container
docker logs --since 2024-01-15T10:00:00 my-container

# Until specific time
docker logs --until 30m my-container
```

### Combining Options

```bash
# Last 50 lines, with timestamps, follow new logs
docker logs -f --tail 50 -t my-container

# Logs from the last hour
docker logs --since 1h my-container

# Logs between two times
docker logs --since 2024-01-15T10:00:00 --until 2024-01-15T11:00:00 my-container
```

### Searching Logs

```bash
# Grep for errors
docker logs my-container 2>&1 | grep -i error

# Count occurrences
docker logs my-container 2>&1 | grep -c "404"

# Last error with context
docker logs my-container 2>&1 | grep -B5 -A5 "Exception"
```

### Save Logs to File

```bash
# All logs
docker logs my-container > container.log 2>&1

# Stream to file while viewing
docker logs -f my-container 2>&1 | tee container.log
```

## Debugging Strategies

### Strategy 1: Quick Health Check

```bash
#!/bin/bash
CONTAINER=$1

echo "=== Container Info ==="
docker inspect --format='Status: {{.State.Status}}' $CONTAINER
docker inspect --format='Started: {{.State.StartedAt}}' $CONTAINER

echo -e "\n=== Recent Logs ==="
docker logs --tail 20 $CONTAINER

echo -e "\n=== Resource Usage ==="
docker stats --no-stream $CONTAINER

echo -e "\n=== Processes ==="
docker exec $CONTAINER ps aux 2>/dev/null || echo "Cannot exec into container"
```

### Strategy 2: Network Debugging

```bash
# Check container's network settings
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-container

# Check connectivity from inside container
docker exec my-container ping -c 3 google.com
docker exec my-container curl -v http://api:8080/health

# Check DNS resolution
docker exec my-container nslookup database
docker exec my-container cat /etc/resolv.conf
```

### Strategy 3: File System Investigation

```bash
# Check recent file modifications
docker exec my-container find /app -mmin -10 -type f

# Check disk space
docker exec my-container df -h

# Look for large files
docker exec my-container du -sh /* 2>/dev/null | sort -h

# Check file permissions
docker exec my-container ls -la /app/data
```

### Strategy 4: Application-Specific Debugging

```bash
# Node.js: Check for unhandled rejections
docker logs my-container 2>&1 | grep -i "unhandled"

# Python: Check for tracebacks
docker logs my-container 2>&1 | grep -A 10 "Traceback"

# Java: Check for stack traces
docker logs my-container 2>&1 | grep -A 20 "Exception"

# Check application config
docker exec my-container cat /app/.env
docker exec my-container printenv | grep -i database
```

## Containers Without Shell

Some minimal containers (distroless, scratch) don't have a shell. Here's how to debug them.

### Copy Debug Tools Into Container

```bash
# Copy a static binary
docker cp /path/to/static-busybox my-container:/tmp/busybox
docker exec my-container /tmp/busybox sh
```

### Use nsenter (Linux)

```bash
# Get container PID
PID=$(docker inspect --format '{{.State.Pid}}' my-container)

# Enter the container's namespaces
sudo nsenter -t $PID -n -m -u -i -p bash
```

### Attach Debug Container (Kubernetes style)

```bash
# Create a debug container sharing the network namespace
docker run -it --rm \
  --network container:my-container \
  --pid container:my-container \
  nicolaka/netshoot

# Now you can debug networking, processes, etc.
```

### Check Logs (Always Works)

```bash
# Logs work even without shell
docker logs my-container

# Copy files out for inspection
docker cp my-container:/app/data ./local-copy
```

## Docker Compose Integration

```bash
# Exec into compose service
docker-compose exec api bash

# Run one-off command
docker-compose exec api npm run migrate

# View logs
docker-compose logs api
docker-compose logs -f api worker

# View all service logs
docker-compose logs -f
```

## Summary

| Command | Purpose | Use When |
|---------|---------|----------|
| `docker exec -it container bash` | Interactive shell | Exploring, manual debugging |
| `docker exec container cmd` | Run command | Quick checks, automation |
| `docker attach container` | Connect to PID 1 | Viewing main process output |
| `docker logs container` | View stdout/stderr | Checking application output |
| `docker logs -f container` | Stream logs | Real-time monitoring |

For most debugging scenarios:
1. Start with `docker logs` to understand what's happening
2. Use `docker exec` to run diagnostic commands
3. Use `docker exec -it` for interactive investigation
4. Use `docker attach` only when you need to interact with the main process

Remember: `exec` creates a new process, `attach` connects to the existing one. When in doubt, use `exec`.
