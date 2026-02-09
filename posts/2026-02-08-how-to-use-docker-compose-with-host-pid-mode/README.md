# How to Use Docker Compose with Host PID Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, PID Namespace, Debugging, Security, DevOps, Docker

Description: Learn when and how to use Docker Compose host PID mode for debugging, monitoring, and process inspection use cases.

---

Docker containers run in their own PID namespace by default. This means a container's processes are isolated, and the first process in the container gets PID 1. The container cannot see host processes or processes in other containers. This isolation is good for security, but sometimes you need to break it.

Host PID mode shares the host's PID namespace with a container. The container can see every process running on the host, including processes from other containers. This is useful for debugging tools, monitoring agents, process managers, and security scanners. But it comes with significant security implications that you need to understand.

## Enabling Host PID Mode

In Docker Compose, set `pid: "host"` on a service:

```yaml
# docker-compose.yml - basic host PID mode
version: "3.8"

services:
  debug-tools:
    image: alpine
    pid: "host"
    command: ps aux
```

Run it and you will see all host processes:

```bash
# Start the container and see all host processes
docker compose run --rm debug-tools
```

The output includes processes from the host, other containers, and the Docker daemon itself.

## Use Case 1: Process Monitoring

A monitoring container that watches all processes on the host:

```yaml
version: "3.8"

services:
  process-monitor:
    image: alpine
    pid: "host"
    read_only: true
    volumes:
      - /proc:/host/proc:ro
    # Monitor for processes using too much CPU
    command: >
      sh -c "
        while true; do
          echo '--- Process Check $(date) ---'
          ps aux --sort=-%cpu | head -20
          sleep 60
        done
      "
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.1'
          memory: 64M
```

## Use Case 2: Debugging Another Container

When a container is misbehaving, you can use host PID mode to inspect its processes with tools the application container does not have installed:

```yaml
version: "3.8"

services:
  app:
    image: myapp:latest
    ports:
      - "3000:3000"

  # Debug sidecar - use this to inspect the app container's processes
  debug:
    image: nicolaka/netshoot
    pid: "host"
    profiles:
      - debug       # Only start when explicitly requested
    command: sleep infinity
```

Start the debug container only when needed:

```bash
# Start the debug sidecar
docker compose --profile debug up -d debug

# Attach to it and inspect processes
docker compose exec debug bash
```

Inside the debug container, you can now use tools like `strace`, `htop`, and `nsenter`:

```bash
# Find the PID of the app process on the host
ps aux | grep myapp

# Trace system calls of the app process (replace 12345 with actual PID)
strace -p 12345

# View open files of the app process
ls -la /proc/12345/fd

# Read the app's environment variables
cat /proc/12345/environ | tr '\0' '\n'
```

## Use Case 3: nsenter for Container Access

With host PID mode, you can use `nsenter` to enter another container's namespaces. This is powerful for debugging containers that lack a shell:

```yaml
version: "3.8"

services:
  toolbox:
    image: nicolaka/netshoot
    pid: "host"
    privileged: true    # Required for nsenter
    profiles:
      - debug
    command: sleep infinity
```

```bash
# Start the toolbox
docker compose --profile debug up -d toolbox

# Find the PID of the target container's main process
TARGET_PID=$(docker inspect --format '{{.State.Pid}}' myapp-web-1)

# Enter the target container's network namespace
docker compose exec toolbox nsenter -t $TARGET_PID -n ifconfig

# Enter the target container's mount namespace
docker compose exec toolbox nsenter -t $TARGET_PID -m ls /app

# Enter all namespaces of the target container
docker compose exec toolbox nsenter -t $TARGET_PID -a sh
```

## Use Case 4: Prometheus Node Exporter

The Prometheus node exporter needs host PID access to collect accurate process metrics:

```yaml
version: "3.8"

services:
  node-exporter:
    image: prom/node-exporter:latest
    pid: "host"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
      - '--collector.processes'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

volumes:
  prometheus_data:
```

## Use Case 5: Signal Forwarding to Host Processes

With host PID mode, a container can send signals to host processes. This is useful for management containers that need to trigger log rotation or config reloads:

```yaml
version: "3.8"

services:
  nginx-reloader:
    image: alpine
    pid: "host"
    # Send SIGHUP to nginx to reload configuration
    command: >
      sh -c "
        NGINX_PID=$$(pgrep -f 'nginx: master')
        if [ -n \"$$NGINX_PID\" ]; then
          kill -HUP $$NGINX_PID
          echo 'Sent reload signal to nginx (PID $$NGINX_PID)'
        else
          echo 'nginx master process not found'
          exit 1
        fi
      "
```

## Security Implications

Host PID mode significantly reduces container isolation. A container with host PID access can:

- See all processes running on the host
- Read environment variables of any process (which may contain secrets)
- Send signals to any process (kill, stop, etc.)
- Inspect memory and file descriptors of host processes

### Mitigating the Risks

Limit what the container can do even with host PID access:

```yaml
services:
  monitor:
    image: monitoring-agent:latest
    pid: "host"
    # Run as non-root inside the container
    user: "65534:65534"
    # Make the filesystem read-only
    read_only: true
    # Drop all capabilities except what is needed
    cap_drop:
      - ALL
    cap_add:
      - SYS_PTRACE    # Only if strace/debugging is needed
    # Set resource limits
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    # Use a security profile
    security_opt:
      - no-new-privileges:true
```

### Minimum Privileges Approach

If you only need to see the process list but do not need to interact with processes, mount `/proc` read-only instead of using host PID mode:

```yaml
services:
  # This is safer than pid: "host" when you only need process info
  process-viewer:
    image: alpine
    volumes:
      - /proc:/host/proc:ro
    command: >
      sh -c "
        while true; do
          ls /host/proc | grep -E '^[0-9]+$' | wc -l
          sleep 30
        done
      "
```

This gives you access to process information through `/proc` without full PID namespace sharing.

## Sharing PID Namespace Between Containers

Instead of sharing with the host, you can share PID namespace between specific containers:

```yaml
version: "3.8"

services:
  app:
    image: myapp:latest
    ports:
      - "3000:3000"

  # Share PID namespace with the app container specifically
  sidecar:
    image: alpine
    pid: "service:app"    # Share PID namespace with app service only
    command: >
      sh -c "
        while true; do
          echo 'Processes in app container:'
          ps aux
          sleep 30
        done
      "
```

The `pid: "service:app"` syntax shares PID namespace with only the app container, not the entire host. This is more secure when you need to debug a specific container.

## Troubleshooting

**Container cannot see host processes:** Make sure `pid: "host"` is set at the service level, not inside `deploy:` or other nested keys.

**Permission denied when accessing /proc/PID:** You may need `cap_add: [SYS_PTRACE]` or `privileged: true` depending on what you are trying to access.

**strace does not work:** The default Docker seccomp profile blocks some system calls needed by strace. Either add `SYS_PTRACE` capability or disable seccomp for the debug container:

```yaml
services:
  debug:
    pid: "host"
    cap_add:
      - SYS_PTRACE
    security_opt:
      - seccomp:unconfined    # Only for debugging, not production
```

## Summary

Host PID mode in Docker Compose is a powerful tool for debugging, monitoring, and system management. Use it when you need visibility into host or cross-container processes. Always apply the principle of least privilege: prefer `pid: "service:name"` over `pid: "host"` when possible, drop unnecessary capabilities, run as non-root, and only enable host PID mode on containers that genuinely need it. For production monitoring agents, combine host PID with read-only filesystems and resource limits to minimize the security surface.
