# How to Configure Sysctls for Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Linux, Networking

Description: Learn how to configure Linux kernel parameters (sysctls) for Docker containers in Portainer to tune network, memory, and IPC settings.

## Introduction

Sysctls are Linux kernel parameters that can be tuned at runtime via the `/proc/sys` filesystem. Docker allows setting container-namespaced sysctls to tune behavior for specific workloads - particularly useful for high-performance networking, database tuning, and real-time applications. Portainer exposes this configuration through its web interface.

## Prerequisites

- Portainer installed with a connected Docker environment running Linux
- Understanding of which sysctls are safe to modify in containers

## What Sysctls Can Be Set?

Docker only allows setting sysctls that are namespaced per-container:

**Safe (namespaced) sysctls Docker supports:**
- `net.*` - Network namespace parameters
- `kernel.msgmax`, `kernel.msgmnb`, `kernel.msgmni` - IPC message queues
- `kernel.sem` - Semaphores
- `kernel.shmall`, `kernel.shmmax`, `kernel.shmmni`, `kernel.shm_rmid_forced` - Shared memory
- `fs.mqueue.*` - POSIX message queues

**Not supported as per-container sysctls:**
- `vm.*` - Memory management parameters such as `vm.overcommit_memory`
- Most `fs.*` values except `fs.mqueue.*`
- `kernel.sysrq` - System request key
- Most other non-namespaced sysctls

## Step 1: Configure Sysctls in Portainer

1. Navigate to **Containers > Add container**.
2. Scroll to the **Runtime & Resources** section.
3. Look for the **Sysctls** section.
4. Click **+ add sysctl** for each parameter.
5. Enter the **Name** and **Value**.

## Step 2: Common Sysctl Use Cases

### High-Performance Web Server (Nginx, HAProxy)

```yaml
# docker-compose.yml

services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    sysctls:
      # Allow more simultaneous connections
      net.core.somaxconn: 65535
      # Enable TCP Fast Open support in the namespace
      # The application may also need to enable it per listener
      net.ipv4.tcp_fastopen: 3
      # Allow reuse of TIME_WAIT sockets (useful for high connection rate)
      net.ipv4.tcp_tw_reuse: 1
      # Shorten the orphaned FIN_WAIT_2 timeout
      net.ipv4.tcp_fin_timeout: 15
```

### Database Server (PostgreSQL, MySQL)

```yaml
services:
  postgres:
    image: postgres:15-alpine
    sysctls:
      # Increase System V shared memory limits
      kernel.shmmax: 268435456    # 256 MB
      kernel.shmall: 65536
      # IPC semaphores for database workloads
      kernel.sem: "250 32000 100 128"
```

### Message Queue / Event Streaming (Redis, Kafka)

```yaml
services:
  redis:
    image: redis:7-alpine
    sysctls:
      # Raise socket buffer ceilings for high-throughput messaging
      net.core.rmem_max: 134217728
      net.core.wmem_max: 134217728
```

### UDP-Intensive Applications (DNS, Game Servers)

```yaml
services:
  dns-server:
    image: coredns/coredns:latest
    sysctls:
      # Increase UDP receive buffer
      net.core.rmem_default: 16777216
      net.core.rmem_max: 134217728
      net.core.wmem_default: 16777216
      net.core.wmem_max: 134217728
```

### Real-Time / Low-Latency Applications

```yaml
services:
  realtime-app:
    image: myorg/realtime:latest
    sysctls:
      # Keep the congestion window after idle periods for bursty traffic
      net.ipv4.tcp_slow_start_after_idle: 0
      # Limit queued bytes per TCP socket to help reduce bufferbloat
      net.ipv4.tcp_limit_output_bytes: 262144
```

## Step 3: Configure Host-Wide Sysctls (Alternative)

For sysctls that are not namespaced and must be applied host-wide, configure them on the Linux host instead of inside Portainer or Docker. Docker does not provide a daemon-wide `default-sysctls` setting in `daemon.json`.

```conf
# /etc/sysctl.d/99-container-host.conf
vm.overcommit_memory = 1
fs.file-max = 200000
```

Then reload the host sysctls:

```bash
sudo sysctl --system
```

## Step 4: Verify Sysctls Inside the Container

After container creation:

```bash
# In the container console (via Portainer Exec):
sysctl net.core.somaxconn
# net.core.somaxconn = 65535

# List all current sysctls:
sysctl -a 2>/dev/null | grep net.core

# Compare with host (run on host):
sysctl net.core.somaxconn
# net.core.somaxconn = 4096 (example host value, unchanged)
```

For namespaced sysctls, the container value is isolated from the host value.

## Important Restrictions

Some sysctls fail because they are not namespaced, or because the container is sharing the host namespace.

- `vm.*` sysctls cannot be set per-container.
- `net.*` sysctls are not allowed with `--network=host`.
- IPC sysctls and `fs.mqueue.*` are not allowed with `--ipc=host`.

## Security Considerations

- **Only set sysctls you understand** - incorrect values can degrade performance or cause instability.
- **Avoid host-wide sysctl changes** unless absolutely necessary, as they affect the host kernel.
- **Test sysctl changes** in a development environment before applying to production.
- **Document sysctl rationale** in your docker-compose.yml comments.

## Conclusion

Sysctls in Portainer provide a way to tune namespaced Linux kernel parameters for individual containers without changing the host's value. This is particularly valuable for high-performance applications like web servers, databases, and message queues that benefit from fine-tuned network or IPC settings. By using namespaced sysctls, you achieve per-container kernel tuning within Docker's isolation boundaries.
