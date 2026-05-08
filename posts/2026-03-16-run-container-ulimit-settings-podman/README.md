# How to Run a Container with Ulimit Settings in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Resource Management, Ulimit

Description: Learn how to configure ulimit settings for Podman containers to control resource limits like open files, processes, and memory locks.

---

> Ulimit settings let you fine-tune resource boundaries for each container, preventing runaway processes and ensuring system stability.

Ulimits (user limits) control the resources available to processes running inside a container. Configuring them correctly is critical for production workloads, especially databases, web servers, and applications that handle many concurrent connections. This guide shows you how to set and manage ulimits in Podman containers.

---

## Understanding Ulimits

Ulimits define soft and hard resource limits. The soft limit is the effective limit that the process starts with, and the hard limit is the maximum value the soft limit can be raised to. Common ulimit types include:

- `nofile` - Maximum number of open file descriptors
- `nproc` - Maximum number of processes available to a user, not a container-wide process limit
- `memlock` - Maximum locked memory size
- `stack` - Maximum stack size
- `core` - Maximum core file size

For a container-wide process limit in Podman, use `--pids-limit` instead of the `nproc` ulimit.

## Setting Ulimits with --ulimit

Use the `--ulimit` flag to set limits when running a container.

```bash
# Set the maximum number of open files to 65536

podman run --rm \
  --ulimit nofile=65536:65536 \
  docker.io/library/alpine:latest \
  sh -c 'ulimit -n'
```

The format is `--ulimit <type>=<soft>:<hard>`. If you provide a single value, it sets both soft and hard limits.

```bash
# Set both soft and hard limits for open files
# Soft limit: 1024, Hard limit: 65536
podman run --rm \
  --ulimit nofile=1024:65536 \
  docker.io/library/alpine:latest \
  sh -c 'echo "Soft: $(ulimit -Sn)"; echo "Hard: $(ulimit -Hn)"'
```

## Setting Multiple Ulimits

You can specify multiple `--ulimit` flags in a single run command.

```bash
# Set multiple ulimits for a production-like container
podman run --rm \
  --ulimit nofile=65536:65536 \
  --ulimit memlock=-1:-1 \
  --ulimit stack=8388608:8388608 \
  --pids-limit 4096 \
  docker.io/library/alpine:latest \
  sh -c 'echo "Open files: $(ulimit -n)"; echo "Memlock: $(ulimit -l)"; echo "Stack: $(ulimit -s)"'
```

## Common Ulimit Configurations

### Database Containers

Databases like PostgreSQL and Elasticsearch require high file descriptor limits.

```bash
# Run PostgreSQL with appropriate ulimits
podman run --rm -d \
  --name postgres-db \
  --ulimit nofile=65536:65536 \
  --ulimit memlock=-1:-1 \
  --pids-limit 4096 \
  -e POSTGRES_PASSWORD=mysecret \
  docker.io/library/postgres:16

# Verify the limits inside the running container
podman exec postgres-db sh -c 'cat /proc/1/limits'
```

### Web Server Containers

Web servers need high file descriptor limits for concurrent connections.

```bash
# Run Nginx with high open file limits
podman run --rm -d \
  --name web-server \
  --ulimit nofile=65536:65536 \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Check the limits
podman exec web-server sh -c 'ulimit -n'
```

### Memlock for Elasticsearch

Elasticsearch can use memory locking when `bootstrap.memory_lock` is enabled.

```bash
# Run with the maximum memlock allowed by the current Podman process
podman run --rm \
  --ulimit memlock=-1:-1 \
  --ulimit nofile=65536:65536 \
  docker.io/library/alpine:latest \
  sh -c 'ulimit -l'
```

## Setting Default Ulimits in containers.conf

Configure default ulimits for all containers in your Podman configuration.

```bash
# Edit the user-level containers.conf
mkdir -p ~/.config/containers
cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
default_ulimits = [
  "nofile=65536:65536",
  "memlock=-1:-1"
]
pids_limit = 4096
EOF

# Verify defaults are applied
podman run --rm docker.io/library/alpine:latest \
  sh -c 'echo "Files: $(ulimit -n)"; echo "Memlock: $(ulimit -l)"'
```

## Checking Current Ulimits

Inspect all limits for a running container by reading the proc filesystem.

```bash
# Start a container
podman run -d --name test-ulimits \
  --ulimit nofile=32768:65536 \
  --ulimit nproc=2048:4096 \
  docker.io/library/alpine:latest sleep 3600

# Read the full limits table
podman exec test-ulimits cat /proc/1/limits

# Clean up
podman rm -f test-ulimits
```

## Disabling Core Dumps

Prevent containers from generating core dump files by setting the core ulimit to zero.

```bash
# Disable core dumps inside the container
podman run --rm \
  --ulimit core=0:0 \
  docker.io/library/alpine:latest \
  sh -c 'ulimit -c'
```

## Ulimits in Podman Compose

When using Podman Compose, define ulimits in your YAML file:

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/nginx:latest
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      memlock:
        soft: -1
        hard: -1
    pids_limit: 4096
```

## Summary

Ulimits are essential for controlling container resource usage. Use `--ulimit` to set per-container limits, configure defaults in `containers.conf` for consistency, and always verify limits with `ulimit` or `/proc/1/limits` inside the container. For production workloads, pay special attention to `nofile`, `memlock`, and container process limits such as `--pids-limit`.
