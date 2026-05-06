# How to Configure Container Ulimits in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Ulimit, Resource Limit, Security, Linux, System Tuning

Description: Configure Linux ulimits for Docker containers in Portainer to control resource limits like open file descriptors, max processes, and stack sizes for production workloads.

---

Ulimits (user limits) are kernel-level constraints on resources a process can use. Configuring appropriate ulimits for containers in Portainer prevents resource exhaustion and enables workloads that require high file descriptor counts.

## Common Ulimit Types

| Type | Description | Common Uses |
|------|-------------|-------------|
| `nofile` | Open file descriptors | Databases, web servers, Elasticsearch |
| `nproc` | Number of processes available to a user | Process/thread ceilings (per-user, not per-container) |
| `stack` | Stack size | JVM, ML workloads |
| `memlock` | Locked memory | Elasticsearch, GPU workloads |
| `core` | Core dump size | Debugging |
| `fsize` | Max file size | Storage safety |

## Configuring Ulimits in Portainer Stacks

```yaml
services:
  elasticsearch:
    image: elasticsearch:8.12.0
    ulimits:
      # Elasticsearch requires high file descriptor limits
      nofile:
        soft: 65535
        hard: 65535
      # Elasticsearch with memory mapping requires locked memory
      memlock:
        soft: -1    # -1 means unlimited
        hard: -1
    environment:
      - bootstrap.memory_lock=true
      - ES_JAVA_OPTS=-Xms2g -Xmx2g

  mongodb:
    image: mongo:7
    ulimits:
      nofile:
        soft: 64000
        hard: 64000
```

## High-Performance Web Server Configuration

Nginx and high-concurrency services need large `nofile` limits:

```yaml
services:
  nginx:
    image: nginx:1.25
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
```

## GPU and ML Workload Configuration

Many NVIDIA deep learning containers use locked memory and larger stacks:

```yaml
services:
  ml-trainer:
    image: nvcr.io/nvidia/pytorch:24.01-py3
    ulimits:
      memlock:
        soft: -1
        hard: -1
      stack:
        soft: 67108864    # 64MB stack for deep learning operations
        hard: 67108864
```

## Setting Default Ulimits for All Containers

Configure Docker daemon defaults to apply to all new containers in `/etc/docker/daemon.json`:

```json
{
  "default-ulimits": {
    "nofile": {
      "name": "nofile",
      "hard": 64000,
      "soft": 64000
    }
  }
}
```

Reload or restart the Docker daemon after updating the file.

This sets the baseline - individual containers can override these defaults as needed.

## Checking Current Ulimits

Verify ulimits inside a running container:

```bash
# From the Portainer container console

ulimit -a

# Or check specific limits
ulimit -n    # nofile (open file descriptors)
ulimit -u    # nproc (number of processes)
ulimit -l    # memlock (locked memory)

# Check system-level limits
cat /proc/1/limits    # PID 1 (container init process) limits
```

## Troubleshooting Ulimit Issues

Common errors from insufficient ulimits:

```text
# "Too many open files" - increase nofile limit
java.io.IOException: Too many open files

# Fix: increase nofile ulimit
ulimits:
  nofile:
    soft: 65535
    hard: 65535

# "Resource temporarily unavailable" during fork - increase nproc
bash: fork: Resource temporarily unavailable

# Fix: increase nproc if the per-user limit is too low.
# For per-container process caps, use pids_limit instead.
ulimits:
  nproc:
    soft: 65535
    hard: 65535

pids_limit: 65535
```

## Summary

Ulimits are an important tuning mechanism for containerized workloads in Portainer. Databases, search engines, and ML workloads often need higher file descriptor limits than Docker defaults. Configure ulimits in your stack definitions, set sensible daemon-level defaults, and monitor for ulimit-related errors in container logs.
