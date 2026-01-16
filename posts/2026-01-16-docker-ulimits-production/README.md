# How to Configure Docker Ulimits for Production Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Ulimits, Production, Performance, Linux

Description: Learn how to configure Docker ulimits for production workloads, including file descriptors, process limits, memory locks, and core dumps for optimal container performance.

---

Ulimits (user limits) control resource allocation for processes in Linux. In Docker, improper ulimit configuration can cause applications to fail under load, especially for databases, web servers, and high-concurrency applications that need many file descriptors or processes.

## Understanding Ulimits

Ulimits are per-process resource limits inherited from the parent process. In Docker, containers inherit ulimits from the Docker daemon unless explicitly configured.

```bash
# View current ulimits on host
ulimit -a

# View specific limit
ulimit -n  # Open files (nofile)
ulimit -u  # Max processes (nproc)
```

## Common Ulimits

| Name | Flag | Description | Default |
|------|------|-------------|---------|
| nofile | `-n` | Open file descriptors | 1024 (soft) |
| nproc | `-u` | Max user processes | varies |
| memlock | `-l` | Locked memory (KB) | 64 |
| stack | `-s` | Stack size (KB) | 8192 |
| core | `-c` | Core file size | 0 |
| fsize | `-f` | Max file size | unlimited |

## Setting Ulimits in Docker

### Docker Run

```bash
# Set single ulimit
docker run --ulimit nofile=65535:65535 nginx

# Set multiple ulimits
docker run \
  --ulimit nofile=65535:65535 \
  --ulimit nproc=4096:4096 \
  --ulimit memlock=-1:-1 \
  myapp
```

Format: `--ulimit <type>=<soft>:<hard>`
- Soft limit: Can be changed by process up to hard limit
- Hard limit: Maximum value, requires root to increase

### Docker Compose

```yaml
services:
  app:
    image: myapp
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
      nproc:
        soft: 4096
        hard: 4096
      memlock:
        soft: -1
        hard: -1
```

### Docker Daemon Defaults

```json
// /etc/docker/daemon.json
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 4096
    }
  }
}
```

```bash
# Restart Docker
sudo systemctl restart docker
```

## Service-Specific Configurations

### Nginx / Web Servers

Web servers need many file descriptors for connections.

```yaml
services:
  nginx:
    image: nginx
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
```

Also configure nginx.conf:
```nginx
worker_rlimit_nofile 65535;

events {
    worker_connections 65535;
}
```

### PostgreSQL

```yaml
services:
  postgres:
    image: postgres:15
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
      memlock:
        soft: -1
        hard: -1
    sysctls:
      - net.core.somaxconn=65535
```

### Elasticsearch

Elasticsearch requires high limits and memory locking.

```yaml
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - "ES_JAVA_OPTS=-Xms4g -Xmx4g"
      - bootstrap.memory_lock=true
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
      memlock:
        soft: -1
        hard: -1
      nproc:
        soft: 4096
        hard: 4096
```

### Redis

```yaml
services:
  redis:
    image: redis:7
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
    sysctls:
      - net.core.somaxconn=65535
```

### MongoDB

```yaml
services:
  mongodb:
    image: mongo:7
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
      nproc:
        soft: 65535
        hard: 65535
```

### Java Applications

```yaml
services:
  java-app:
    image: openjdk:21
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
      nproc:
        soft: 4096
        hard: 4096
    environment:
      - JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0
```

### Node.js Applications

```yaml
services:
  node-app:
    image: node:20
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
```

## Verifying Ulimits in Containers

### Check Running Container

```bash
# View ulimits inside container
docker exec mycontainer cat /proc/1/limits

# Or using ulimit command
docker exec mycontainer sh -c 'ulimit -a'

# Specific limit
docker exec mycontainer sh -c 'ulimit -n'
```

### Inspect Container Config

```bash
docker inspect --format='{{.HostConfig.Ulimits}}' mycontainer
```

## Memory Locking (memlock)

Memory locking prevents memory from being swapped to disk, important for:
- Databases (Elasticsearch, PostgreSQL)
- Real-time applications
- Security-sensitive applications

```yaml
services:
  database:
    ulimits:
      memlock:
        soft: -1  # Unlimited
        hard: -1
```

**Note**: Container must have `IPC_LOCK` capability:
```yaml
services:
  database:
    cap_add:
      - IPC_LOCK
    ulimits:
      memlock:
        soft: -1
        hard: -1
```

## Process Limits (nproc)

Limits the number of processes a user can create.

```yaml
services:
  worker:
    ulimits:
      nproc:
        soft: 4096
        hard: 8192
```

**Warning**: Setting this too low can prevent applications from spawning threads or child processes.

## Core Dumps

Enable core dumps for debugging crashed containers.

```yaml
services:
  app:
    ulimits:
      core:
        soft: -1  # Unlimited
        hard: -1
    volumes:
      - ./coredumps:/tmp/cores
    environment:
      - GOTRACEBACK=crash  # For Go applications
```

On host, configure core dump pattern:
```bash
echo "/tmp/cores/core.%e.%p" | sudo tee /proc/sys/kernel/core_pattern
```

## Host System Configuration

### Increase Host Limits

```bash
# /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
root soft nofile 65535
root hard nofile 65535
```

### Systemd Service Limits

```ini
# /etc/systemd/system/docker.service.d/limits.conf
[Service]
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
LimitMEMLOCK=infinity
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### Check Docker Daemon Limits

```bash
# Find Docker daemon PID
pidof dockerd

# Check its limits
cat /proc/$(pidof dockerd)/limits
```

## Common Issues and Solutions

### "Too many open files"

```bash
# Error
[error] socket() failed (24: Too many open files)

# Solution: Increase nofile limit
docker run --ulimit nofile=65535:65535 myapp
```

### "Resource temporarily unavailable"

```bash
# Error
fork: Resource temporarily unavailable

# Solution: Increase nproc limit
docker run --ulimit nproc=4096:4096 myapp
```

### "Cannot allocate memory" with mlock

```bash
# Error
mlockall failed: Cannot allocate memory

# Solution: Increase memlock and add capability
docker run \
  --cap-add IPC_LOCK \
  --ulimit memlock=-1:-1 \
  elasticsearch
```

## Monitoring Ulimit Usage

### Check File Descriptor Usage

```bash
# Count open files in container
docker exec mycontainer ls /proc/1/fd | wc -l

# Detailed view
docker exec mycontainer ls -la /proc/1/fd

# System-wide
docker exec mycontainer cat /proc/sys/fs/file-nr
# Output: <allocated> <free> <max>
```

### Monitor with Script

```bash
#!/bin/bash
# monitor-fd.sh

CONTAINER=$1
while true; do
  FD_COUNT=$(docker exec $CONTAINER ls /proc/1/fd 2>/dev/null | wc -l)
  FD_LIMIT=$(docker exec $CONTAINER sh -c 'ulimit -n' 2>/dev/null)
  PERCENT=$((FD_COUNT * 100 / FD_LIMIT))
  echo "$(date): $FD_COUNT / $FD_LIMIT ($PERCENT%)"

  if [ $PERCENT -gt 80 ]; then
    echo "WARNING: High file descriptor usage!"
  fi

  sleep 10
done
```

## Complete Production Example

```yaml
version: '3.8'

x-ulimits: &default-ulimits
  nofile:
    soft: 65535
    hard: 65535
  nproc:
    soft: 4096
    hard: 4096

services:
  api:
    image: myapi
    ulimits:
      <<: *default-ulimits
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2'

  nginx:
    image: nginx:alpine
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
    sysctls:
      - net.core.somaxconn=65535

  postgres:
    image: postgres:15
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
      memlock:
        soft: -1
        hard: -1
    cap_add:
      - IPC_LOCK

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
      memlock:
        soft: -1
        hard: -1
    cap_add:
      - IPC_LOCK

  redis:
    image: redis:7-alpine
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
    sysctls:
      - net.core.somaxconn=65535
```

## Summary

| Service Type | nofile | nproc | memlock | Notes |
|-------------|--------|-------|---------|-------|
| Web servers | 65535 | 4096 | default | High connections |
| Databases | 65535 | 4096 | -1 | Memory locking |
| Elasticsearch | 65535 | 4096 | -1 | Requires IPC_LOCK |
| Message queues | 65535 | 4096 | default | High connections |
| Java apps | 65535 | 4096 | default | Thread pools |

Configure ulimits based on your application's requirements. Start with higher limits in development to avoid hitting them unexpectedly, then tune for production based on actual usage patterns. Always verify limits are applied using `docker exec` to check `/proc/1/limits`.

