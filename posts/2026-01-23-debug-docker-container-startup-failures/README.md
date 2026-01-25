# How to Debug Docker Container Startup Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Debugging, Troubleshooting, DevOps, Containers

Description: Systematically diagnose why Docker containers fail to start, covering exit codes, log analysis, entrypoint issues, dependency problems, and resource constraints.

---

When a Docker container refuses to start or immediately exits, finding the root cause can be frustrating. Containers fail for many reasons: missing files, permission issues, misconfigured entrypoints, or dependency failures. A systematic debugging approach helps you identify and fix problems quickly.

## Step 1: Check Container Status and Exit Code

Start by examining what Docker knows about the failed container:

```bash
# List all containers including stopped ones
docker ps -a

# Output shows exit code
CONTAINER ID   IMAGE          STATUS                     NAMES
a1b2c3d4e5f6   myapp:latest   Exited (1) 2 minutes ago   myapp
```

Get detailed state information:

```bash
docker inspect myapp --format='{{json .State}}' | jq
```

Output:

```json
{
  "Status": "exited",
  "Running": false,
  "ExitCode": 1,
  "Error": "",
  "StartedAt": "2026-01-23T10:00:00.000000000Z",
  "FinishedAt": "2026-01-23T10:00:05.000000000Z",
  "OOMKilled": false
}
```

### Common Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success (container completed normally) |
| 1 | General application error |
| 126 | Command cannot execute (permission issue) |
| 127 | Command not found |
| 137 | SIGKILL (often OOM killer) |
| 139 | Segmentation fault |
| 143 | SIGTERM (graceful shutdown) |

## Step 2: Check Container Logs

View the last output from the container:

```bash
# View all logs from the container
docker logs myapp

# View last 100 lines
docker logs --tail 100 myapp

# Follow logs (for containers that restart)
docker logs -f myapp
```

If the container starts and immediately exits, logs often reveal the cause:

```bash
# Example output showing missing environment variable
Error: DATABASE_URL environment variable is required
```

## Step 3: Examine the Entrypoint and CMD

Entrypoint or CMD issues are common causes of startup failures:

```bash
# Check what command the container is configured to run
docker inspect myapp --format='{{json .Config.Entrypoint}}'
docker inspect myapp --format='{{json .Config.Cmd}}'
```

### Common Entrypoint Problems

**Command not found (exit code 127):**

```dockerfile
# Wrong: File not marked executable or wrong path
ENTRYPOINT ["/app/start.sh"]

# Fix: Ensure script exists and is executable
COPY --chmod=755 start.sh /app/start.sh
```

**Permission denied (exit code 126):**

```dockerfile
# Script lacks execute permission
# Fix in Dockerfile:
RUN chmod +x /app/start.sh
```

**Shell form vs exec form:**

```dockerfile
# Shell form - runs through /bin/sh -c
ENTRYPOINT npm start

# Exec form - runs directly (preferred)
ENTRYPOINT ["npm", "start"]

# Exec form with shell features needs explicit shell
ENTRYPOINT ["/bin/sh", "-c", "echo $HOME && npm start"]
```

## Step 4: Run Container Interactively

Override the entrypoint to get a shell:

```bash
# Override entrypoint to get shell access
docker run -it --entrypoint /bin/sh myapp:latest

# Or use bash if available
docker run -it --entrypoint /bin/bash myapp:latest

# Once inside, manually run the command
/app/start.sh
```

This lets you see errors in real time and inspect the filesystem.

## Step 5: Check for Missing Dependencies

Applications fail when runtime dependencies are missing:

```bash
# Inside the container, check for missing libraries
docker run --entrypoint /bin/sh myapp -c "ldd /app/myapp"

# Output shows missing libraries
libpq.so.5 => not found
```

Fix by installing dependencies:

```dockerfile
# Alpine
RUN apk add --no-cache libpq

# Debian/Ubuntu
RUN apt-get update && apt-get install -y libpq5
```

## Step 6: Verify Environment Variables

Missing or incorrect environment variables cause many startup failures:

```bash
# Check what environment variables are set
docker inspect myapp --format='{{range .Config.Env}}{{println .}}{{end}}'

# Run with required variables
docker run -e DATABASE_URL=postgres://... myapp:latest
```

Test with a minimal environment:

```bash
# Start with shell, check variables
docker run -it --entrypoint /bin/sh \
  -e DATABASE_URL=postgres://localhost/db \
  myapp:latest

# Verify variables are set
env | grep DATABASE
```

## Step 7: Check Resource Constraints

Resource limits can cause immediate failures:

```bash
# Check if OOM killed
docker inspect myapp --format='{{.State.OOMKilled}}'

# Check memory limit
docker inspect myapp --format='{{.HostConfig.Memory}}'
```

Try running without limits:

```bash
# Remove memory limit temporarily for testing
docker run --memory=0 myapp:latest
```

## Step 8: Inspect File System Issues

Mount issues or missing files cause startup failures:

```bash
# Check configured mounts
docker inspect myapp --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'

# Run with shell to check files exist
docker run --entrypoint /bin/sh myapp:latest -c "ls -la /app"
```

Volume permission issues:

```bash
# Check ownership inside container
docker run --entrypoint /bin/sh myapp:latest -c "ls -la /app/data"

# Compare with user running the process
docker run --entrypoint /bin/sh myapp:latest -c "id"
```

## Step 9: Debug Network Dependencies

Containers depending on other services fail if those services are not ready:

```bash
# Check if database is reachable
docker run --network mynetwork --entrypoint /bin/sh myapp:latest -c "nc -zv database 5432"

# DNS resolution test
docker run --network mynetwork --entrypoint /bin/sh myapp:latest -c "nslookup database"
```

Add retry logic or use depends_on with health checks:

```yaml
services:
  app:
    depends_on:
      database:
        condition: service_healthy

  database:
    healthcheck:
      test: ["CMD", "pg_isready"]
```

## Step 10: Compare Working vs Failing

If a container works somewhere but not elsewhere:

```bash
# Export working container as image
docker commit working-container debug/myapp:working

# Compare configurations
diff <(docker inspect working-container) <(docker inspect failing-container)

# Check for environment differences
docker inspect working-container --format='{{range .Config.Env}}{{println .}}{{end}}' > working-env.txt
docker inspect failing-container --format='{{range .Config.Env}}{{println .}}{{end}}' > failing-env.txt
diff working-env.txt failing-env.txt
```

## Common Patterns and Solutions

### Pattern: Immediate Exit with No Logs

The process might be backgrounding itself:

```dockerfile
# Wrong: Process backgrounds and container exits
CMD ["nginx"]

# Correct: Run in foreground
CMD ["nginx", "-g", "daemon off;"]
```

### Pattern: Exit Code 1 with "exec format error"

Architecture mismatch or missing shebang:

```bash
# Check image architecture
docker inspect myapp --format='{{.Architecture}}'

# If running on Apple Silicon
docker run --platform linux/amd64 myapp:latest
```

### Pattern: Works Locally, Fails in Production

Environment differences:

```bash
# Compare environments
docker run --rm myapp:latest env | sort > prod-env.txt
# Compare with local

# Check for hardcoded paths
grep -r "/Users/" .
grep -r "/home/developer/" .
```

### Pattern: Fails Only with Volumes

Permission or ownership issues:

```bash
# Run as root temporarily
docker run --user root -v ./data:/app/data myapp:latest

# If that works, fix permissions
sudo chown -R 1000:1000 ./data
```

## Creating a Debug Image

Build an image variant for debugging:

```dockerfile
# Dockerfile.debug
FROM myapp:latest

# Install debugging tools
USER root
RUN apt-get update && apt-get install -y \
    curl \
    netcat-openbsd \
    dnsutils \
    procps \
    strace \
    && rm -rf /var/lib/apt/lists/*

# Keep container running for inspection
CMD ["sleep", "infinity"]
```

```bash
docker build -f Dockerfile.debug -t myapp:debug .
docker run -d --name debug-container myapp:debug
docker exec -it debug-container bash
```

---

Debugging Docker startup failures requires systematic investigation: check exit codes, read logs, verify entrypoints, confirm dependencies, and test interactively. Most failures fall into predictable categories like missing files, permission issues, or misconfigured commands. Building a mental checklist and knowing how to override container defaults for debugging makes troubleshooting faster and more effective.
