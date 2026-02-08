# How to Fix Docker Container Immediately Exiting with Code 137

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, exit code 137, OOM killer, memory, troubleshooting, containers, SIGKILL

Description: Diagnose and fix Docker containers exiting with code 137, typically caused by the OOM killer, manual kills, or insufficient memory limits.

---

Your container starts up, runs for a while (or sometimes just seconds), then dies with exit code 137. No graceful shutdown, no error message from the application, just a sudden stop. Exit code 137 is one of the most common container failures, and it almost always means one thing: something killed the process with SIGKILL (signal 9). The math is simple: 128 + 9 = 137.

The question is not what killed it, but who sent the kill signal and why.

## What Exit Code 137 Means

In Linux, when a process is killed by a signal, its exit code is 128 plus the signal number. Signal 9 (SIGKILL) cannot be caught or handled by the process. It is an immediate, unconditional termination.

The three most common sources of SIGKILL for Docker containers:

1. The Linux OOM (Out of Memory) killer
2. Docker's memory limit enforcement
3. A manual `docker kill` or `docker stop` that timed out

Check the container's exit status:

```bash
# View the container's exit code and details
docker inspect my-container --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.FinishedAt}}'

# Check if the container was OOM killed
docker inspect my-container --format '{{.State.OOMKilled}}'
```

If `OOMKilled` is `true`, you have your answer. If it is `false`, keep investigating.

## Cause 1: Docker Memory Limit Exceeded (OOM Kill)

When you set a memory limit on a container and the process exceeds it, Docker's OOM killer terminates the container with SIGKILL.

Check the container's memory limit and usage:

```bash
# Check the memory limit set on the container
docker inspect my-container --format '{{.HostConfig.Memory}}'

# Check memory stats for running containers
docker stats --no-stream

# Check Docker events for OOM kills
docker events --filter event=oom --since 1h
```

Fix by increasing the memory limit:

```yaml
# docker-compose.yml with increased memory limits
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          memory: 1G     # Increase from default or previous value
        reservations:
          memory: 512M   # Minimum guaranteed memory
```

Or set it at the command line:

```bash
# Run with a specific memory limit
docker run -d --memory=1g --memory-swap=2g --name my-container myimage
```

The `--memory-swap` flag sets the total memory + swap. Setting it to twice the memory limit gives the container some breathing room.

## Cause 2: Host OOM Killer (No Docker Memory Limit)

Even without a Docker memory limit, the Linux kernel's OOM killer can kill the container process if the host runs out of memory. In this case, `docker inspect` will show `OOMKilled: false` because Docker's OOM killer was not involved. The host kernel killed it directly.

Check the kernel logs:

```bash
# Search for OOM killer activity in kernel logs
dmesg | grep -i "oom\|out of memory\|killed process"

# Check system journal for OOM events
sudo journalctl -k | grep -i "oom\|killed process"
```

You will see messages like:

```
Out of memory: Killed process 12345 (node) total-vm:2048000kB, anon-rss:1024000kB
```

Fix by adding more RAM to the host or limiting the container to prevent it from consuming all host memory:

```bash
# Set a memory limit to protect the host
docker run -d --memory=512m --name my-container myimage
```

Monitor host memory to catch issues before they cause OOM kills:

```bash
# Check current host memory usage
free -h

# Watch memory usage in real time
watch -n 2 free -h
```

## Cause 3: docker stop Timeout Exceeded

When you run `docker stop`, Docker sends SIGTERM first and waits for the container to shut down gracefully. If the container does not stop within the timeout period (10 seconds by default), Docker sends SIGKILL. The container exits with code 137.

Check if your application handles SIGTERM properly:

```bash
# Stop with a longer timeout to give the app time to shut down
docker stop --time=60 my-container

# Check if the container exits cleanly with a longer timeout
echo $?
```

If the container exits cleanly with a longer timeout, the problem is that your application needs more time to shut down. Fix by increasing the stop timeout:

```yaml
# docker-compose.yml with extended stop timeout
services:
  app:
    image: myapp:latest
    stop_grace_period: 60s  # Give the app 60 seconds to shut down
```

Or fix the application to handle SIGTERM faster. Here is an example for a Node.js application:

```javascript
// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    // Close database connections, finish in-flight requests, etc.
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });

    // Force exit if cleanup takes too long
    setTimeout(() => {
        console.log('Forced shutdown after timeout');
        process.exit(1);
    }, 25000);
});
```

## Cause 4: Memory Leak in the Application

If the container runs fine for hours or days before getting killed with 137, the application likely has a memory leak.

Track memory usage over time:

```bash
# Monitor container memory usage continuously
docker stats my-container

# Log memory usage periodically
while true; do
    docker stats --no-stream --format "{{.MemUsage}}" my-container
    sleep 60
done >> /var/log/container-memory.log
```

For Java applications, check heap settings:

```yaml
# docker-compose.yml with Java memory configuration
services:
  app:
    image: myapp:latest
    environment:
      # Set JVM heap to 75% of the container memory limit
      - JAVA_OPTS=-Xmx768m -Xms256m -XX:+UseContainerSupport
    deploy:
      resources:
        limits:
          memory: 1G
```

For Node.js, set the heap limit:

```yaml
# docker-compose.yml with Node.js memory configuration
services:
  app:
    image: myapp:latest
    environment:
      - NODE_OPTIONS=--max-old-space-size=768
    deploy:
      resources:
        limits:
          memory: 1G
```

## Cause 5: Container Orchestrator Killing the Container

If you run containers through Kubernetes or Docker Swarm, the orchestrator itself can kill containers that exceed resource limits.

For Kubernetes:

```bash
# Check if the pod was OOM killed
kubectl describe pod my-pod | grep -A 5 "Last State"

# Check events for OOM
kubectl get events --field-selector reason=OOMKilling
```

## Debugging with Container Memory Profiling

Add memory monitoring inside the container:

```dockerfile
# Dockerfile with memory monitoring tools
FROM node:18-alpine

# Install memory monitoring tools
RUN apk add --no-cache procps

WORKDIR /app
COPY . .

# Create a memory monitoring script
RUN printf '#!/bin/sh\nwhile true; do\n  echo "$(date): $(cat /sys/fs/cgroup/memory.current 2>/dev/null || cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null) bytes"\n  sleep 10\ndone &\nexec "$@"\n' > /monitor.sh && chmod +x /monitor.sh

ENTRYPOINT ["/monitor.sh"]
CMD ["node", "app.js"]
```

## Prevention Checklist

Set up your containers to avoid 137 exits:

```yaml
# docker-compose.yml with comprehensive memory configuration
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    stop_grace_period: 30s
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## Summary

Exit code 137 means your container process received SIGKILL (signal 9). The most common cause is the OOM killer, either Docker's (when a memory limit is set) or the host kernel's (when the host runs out of memory). Check `docker inspect` for the `OOMKilled` flag first. If that is false, check `dmesg` for host-level OOM events. If the 137 only happens during `docker stop`, your application is not handling SIGTERM fast enough, so increase the stop timeout or fix the shutdown handler. For memory leaks, monitor `docker stats` over time and set appropriate memory limits with matching application-level heap configuration.
