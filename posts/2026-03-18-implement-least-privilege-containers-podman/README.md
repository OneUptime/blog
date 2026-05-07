# How to Implement Least Privilege Containers with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Security, Least Privilege, Rootless, Container

Description: Learn how to implement the principle of least privilege in Podman containers by restricting capabilities, using rootless mode, read-only filesystems, and security profiles.

---

> The principle of least privilege means giving containers only the permissions they need to function, reducing the impact of any container compromise to the absolute minimum.

Container security starts with limiting what containers can do. By default, containers inherit more capabilities than most applications need. Podman's rootless architecture provides a strong foundation, but you can go further by dropping capabilities, restricting filesystem access, and applying security profiles.

This guide covers practical techniques for implementing least privilege containers with Podman.

---

## Podman's Rootless Foundation

Podman runs containers without root by default. This means container processes map to unprivileged user IDs on the host:

```bash
# Run a container as your regular user

podman run -d --name web nginx

# Check the host-level process
ps aux | grep nginx
# youruser  12345  ... nginx

# The container's root (UID 0) maps to your UID
podman unshare cat /proc/self/uid_map
# 0  1000  1
# 1  100000  65536
```

Even if a process runs as root inside the container, it has no root privileges on the host.

## Running as a Non-Root User Inside the Container

Go beyond rootless Podman by running the application as a non-root user inside the container:

```dockerfile
FROM docker.io/library/node:20-alpine

# Create a non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .
RUN npm ci --production

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

Or specify the user at runtime:

```bash
podman run -d \
  --name api \
  --user 1000:1000 \
  my-api:latest
```

## Dropping Linux Capabilities

Linux capabilities divide root privileges into granular permissions. Drop all and add only what is needed:

```bash
# Drop ALL capabilities
podman run -d \
  --name api \
  --cap-drop=ALL \
  my-api:latest

# Drop all, then add specific ones
podman run -d \
  --name web \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  nginx:stable
```

Common capabilities and when they are needed:

```bash
# NET_BIND_SERVICE - Bind to ports below 1024
podman run --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx

# CHOWN - Change file ownership (needed by some init scripts)
podman run --cap-drop=ALL --cap-add=CHOWN postgres

# SETUID/SETGID - Change process UID/GID
podman run --cap-drop=ALL --cap-add=SETUID --cap-add=SETGID app

# DAC_OVERRIDE - Bypass file permission checks
# FOWNER - Bypass ownership checks
# Usually NOT needed - indicates a permissions issue to fix
```

Check what capabilities a container has:

```bash
podman exec web cat /proc/1/status | grep Cap
# CapBnd: minimal set
```

## Read-Only Root Filesystem

Prevent containers from writing to their filesystem:

```bash
podman run -d \
  --name web \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /run \
  --tmpfs /var/cache/nginx \
  -v web-logs:/var/log/nginx:Z \
  nginx:stable
```

For applications that need specific writable paths:

```bash
podman run -d \
  --name api \
  --read-only \
  --tmpfs /tmp:size=50m \
  -v uploads:/app/uploads:Z \
  -v logs:/app/logs:Z \
  my-api:latest
```

## Preventing Privilege Escalation

Block containers from gaining additional privileges:

```bash
podman run -d \
  --name api \
  --security-opt=no-new-privileges \
  my-api:latest
```

This prevents setuid binaries from escalating privileges and blocks processes from gaining capabilities they did not start with.

## Restricting System Calls with seccomp

Apply a seccomp profile to limit which system calls a container can make:

```bash
# Use the default seccomp profile (blocks ~44 dangerous syscalls)
podman run -d --name api \
  --security-opt seccomp=/usr/share/containers/seccomp.json \
  my-api:latest
```

Create a custom restrictive profile:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept", "access", "bind", "brk", "close",
        "connect", "dup", "dup2", "epoll_create",
        "epoll_ctl", "epoll_wait", "exit", "exit_group",
        "fstat", "futex", "getpid", "getsockopt",
        "listen", "lseek", "mmap", "mprotect",
        "munmap", "open", "openat", "poll", "read",
        "recvfrom", "rt_sigaction", "rt_sigprocmask",
        "sendto", "setsockopt", "socket", "stat",
        "write", "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

```bash
podman run -d \
  --security-opt seccomp=custom-seccomp.json \
  my-api:latest
```

## Network Restrictions

Limit container network access:

```bash
# No network access at all
podman run -d --network none --name isolated-worker my-worker

# Restrict to specific networks only
podman network create internal --internal
podman run -d --network internal --name db postgres:16
# db can communicate with other containers on 'internal'
# but cannot reach the internet

# Limit published ports
podman run -d -p 127.0.0.1:8080:80 --name web nginx
# Only accessible from localhost, not from other machines
```

Resource Limits

Prevent containers from consuming excessive resources:

```bash
podman run -d \
  --name api \
  --memory=512m \
  --memory-swap=1g \
  --cpus=1.0 \
  --pids-limit=100 \
  --ulimit nofile=1024:2048 \
  my-api:latest
```

In Quadlet:

```ini
[Container]
Image=my-api:latest
PodmanArgs=--memory=512m --cpus=1.0 --pids-limit=100
```

## Restricting Volume Access

Mount volumes with the least permissions needed:

```bash
# Read-only mount for configuration
podman run -d \
  -v ./config:/etc/app/config:ro,Z \
  my-api

# Read-only mount for static content
podman run -d \
  -v ./html:/usr/share/nginx/html:ro,Z \
  nginx

# Writable only where needed
podman run -d \
  -v ./config:/etc/app/config:ro,Z \
  -v uploads:/app/uploads:Z \
  -v /dev/null:/app/debug.log \
  my-api
```

## Complete Hardened Container Example

Combine all techniques for a fully hardened container:

```bash
podman run -d \
  --name hardened-api \
  --user 1000:1000 \
  --cap-drop=ALL \
  --read-only \
  --security-opt=no-new-privileges \
  --security-opt seccomp=/usr/share/containers/seccomp.json \
  --memory=256m \
  --memory-swap=512m \
  --cpus=0.5 \
  --pids-limit=50 \
  --tmpfs /tmp:size=10m \
  -v ./config:/etc/app/config:ro,Z \
  -v app-data:/app/data:Z \
  --network app-internal \
  --health-cmd="curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  my-api:1.2.3
```

As a Quadlet file:

```ini
# ~/.config/containers/systemd/hardened-api.container
[Container]
Image=my-api:1.2.3
ContainerName=hardened-api
User=1000:1000
DropCapability=ALL
ReadOnly=true
SeccompProfile=/usr/share/containers/seccomp.json
SecurityLabelType=container_t
Volume=./config:/etc/app/config:ro,Z
Volume=app-data:/app/data:Z
Network=app-internal.network
PodmanArgs=--security-opt=no-new-privileges --memory=256m --memory-swap=512m --cpus=0.5 --pids-limit=50
HealthCmd=curl -f http://localhost:3000/health || exit 1
HealthInterval=30s

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Security Audit Script

Audit your running containers for privilege issues:

```bash
#!/bin/bash
# audit-containers.sh

echo "=== Container Security Audit ==="

for container in $(podman ps --format '{{.Names}}'); do
  echo ""
  echo "--- ${container} ---"

  # Check if running as root
  USER=$(podman inspect "$container" --format '{{.Config.User}}')
  [ -z "$USER" ] || [ "$USER" = "0" ] || [ "$USER" = "root" ] && \
    echo "WARNING: Running as root inside container"

  # Check capabilities
  CAPS=$(podman inspect "$container" --format '{{.HostConfig.CapAdd}}')
  [ "$CAPS" != "[]" ] && echo "Added capabilities: $CAPS"

  # Check read-only
  RO=$(podman inspect "$container" --format '{{.HostConfig.ReadonlyRootfs}}')
  [ "$RO" != "true" ] && echo "WARNING: Root filesystem is writable"

  # Check no-new-privileges
  SEC=$(podman inspect "$container" --format '{{.HostConfig.SecurityOpt}}')
  echo "$SEC" | grep -q "no-new-privileges" || \
    echo "WARNING: no-new-privileges not set"

  # Check resource limits
  MEM=$(podman inspect "$container" --format '{{.HostConfig.Memory}}')
  [ "$MEM" = "0" ] && echo "WARNING: No memory limit set"
done
```

## Conclusion

Implementing least privilege containers with Podman involves layering multiple security controls: rootless execution, non-root users inside containers, dropped capabilities, read-only filesystems, seccomp profiles, network restrictions, and resource limits. Start with Podman's rootless foundation and progressively add restrictions based on your application's actual needs. Audit your containers regularly to catch privilege creep and ensure your security posture remains strong.
