# How to Use Docker Compose ulimits Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Ulimits, Resource Limits, Performance Tuning, Linux, DevOps

Description: Configure Docker Compose ulimits to control file descriptors, process counts, and memory locks for containerized applications.

---

Linux ulimits set upper bounds on the resources a process can consume. File descriptors, process counts, stack sizes, memory locks - these all have limits that can make or break your containerized applications. Docker applies its own default ulimits to containers, and they are not always appropriate for your workload. The `ulimits` configuration in Docker Compose lets you tune these limits per service.

## What Are Ulimits?

Ulimits (user limits) are per-process resource constraints enforced by the Linux kernel. They come in two flavors:

- **Soft limit** - The currently enforced limit. Processes can raise this up to the hard limit.
- **Hard limit** - The absolute maximum. Only root (or a process with CAP_SYS_RESOURCE) can raise the hard limit.

You can see the default ulimits on any Linux system.

```bash
# View current ulimits in a shell
ulimit -a

# View ulimits inside a Docker container
docker run --rm alpine sh -c "ulimit -a"
```

## Setting Ulimits in Docker Compose

Docker Compose supports two formats for ulimits: a simple single-value format and an expanded format with separate soft and hard limits.

### Single Value Format

When you specify a single number, it sets both the soft and hard limit to the same value.

```yaml
# Set both soft and hard limits to the same value
version: "3.8"

services:
  app:
    image: my-app:latest
    ulimits:
      nofile: 65536
      nproc: 4096
```

### Expanded Format

When you need different soft and hard limits, use the expanded format.

```yaml
# Set different soft and hard limits
services:
  app:
    image: my-app:latest
    ulimits:
      nofile:
        soft: 32768
        hard: 65536
      nproc:
        soft: 2048
        hard: 4096
```

## Common Ulimits You Should Configure

### nofile - Maximum Open Files

This is the most frequently adjusted ulimit. It controls how many file descriptors a process can have open simultaneously. File descriptors are used for more than just files: every network socket, pipe, and open file consumes one.

```yaml
# High-connection web server needs many file descriptors
services:
  nginx:
    image: nginx:alpine
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    ports:
      - "80:80"
```

Applications that handle many concurrent connections need high `nofile` limits. Each TCP connection consumes one file descriptor. A web server handling 10,000 concurrent connections needs at least 10,000 file descriptors, plus additional ones for log files, config files, and internal pipes.

Common symptoms of a too-low `nofile` limit:
- "Too many open files" errors
- Connection refused errors under load
- Application crashes at high concurrency

### nproc - Maximum Processes

Controls how many processes (and threads) a user can create. This is important for applications that spawn many worker processes or threads.

```yaml
# Application with many worker threads
services:
  java-app:
    image: my-java-app:latest
    ulimits:
      nproc:
        soft: 4096
        hard: 8192
```

Java applications are particularly sensitive to this limit because the JVM creates many threads. A typical Java application might need hundreds of threads for HTTP handling, garbage collection, JIT compilation, and internal housekeeping.

### memlock - Maximum Locked Memory

Some applications lock memory pages to prevent them from being swapped to disk. This is common in databases and applications that need predictable latency.

```yaml
# Elasticsearch needs unlimited memlock for performance
services:
  elasticsearch:
    image: elasticsearch:8.12.0
    ulimits:
      memlock:
        soft: -1
        hard: -1
    environment:
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - "bootstrap.memory_lock=true"
```

The value `-1` means unlimited. Elasticsearch documentation specifically recommends setting memlock to unlimited for production deployments.

### stack - Stack Size

Controls the maximum stack size for each thread. Most applications do fine with the default, but deeply recursive algorithms or applications with large stack-allocated data structures might need more.

```yaml
# Application with deep recursion
services:
  solver:
    image: my-solver:latest
    ulimits:
      stack:
        soft: 16777216    # 16MB
        hard: 67108864    # 64MB
```

### core - Core Dump Size

Controls the maximum size of core dump files. Set to 0 to disable core dumps, or set a limit for debugging.

```yaml
# Enable core dumps for debugging
services:
  debug-app:
    image: my-app:debug
    ulimits:
      core:
        soft: -1
        hard: -1
    volumes:
      - ./coredumps:/tmp/coredumps
```

```yaml
# Disable core dumps in production (security best practice)
services:
  prod-app:
    image: my-app:latest
    ulimits:
      core: 0
```

## Service-Specific Recommendations

### Nginx / Web Servers

```yaml
# Nginx optimized for high concurrency
services:
  nginx:
    image: nginx:alpine
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    # Nginx worker_connections should be less than nofile
    # worker_connections * worker_processes < nofile
```

### PostgreSQL

```yaml
# PostgreSQL with appropriate ulimits
services:
  postgres:
    image: postgres:16
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      memlock:
        soft: -1
        hard: -1
    shm_size: "256m"
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
```

### Elasticsearch

```yaml
# Elasticsearch production ulimits
services:
  elasticsearch:
    image: elasticsearch:8.12.0
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
      nproc:
        soft: 4096
        hard: 4096
    environment:
      - "bootstrap.memory_lock=true"
      - "ES_JAVA_OPTS=-Xms4g -Xmx4g"
```

### Redis

```yaml
# Redis with elevated file descriptor limit
services:
  redis:
    image: redis:7-alpine
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    # Redis maxclients should be below nofile - 32
    command: redis-server --maxclients 10000
```

## Full Stack Example

Here is a complete Compose file with tuned ulimits for every service.

```yaml
# Production stack with tuned ulimits
version: "3.8"

services:
  proxy:
    image: nginx:alpine
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    ports:
      - "80:80"
      - "443:443"

  api:
    build: ./api
    ulimits:
      nofile:
        soft: 32768
        hard: 65536
      nproc:
        soft: 2048
        hard: 4096

  worker:
    build: ./worker
    ulimits:
      nofile:
        soft: 8192
        hard: 16384
      nproc:
        soft: 1024
        hard: 2048

  postgres:
    image: postgres:16
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - pgdata:/var/lib/postgresql/data

  elasticsearch:
    image: elasticsearch:8.12.0
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    environment:
      - "bootstrap.memory_lock=true"
      - "discovery.type=single-node"
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"

  redis:
    image: redis:7-alpine
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

volumes:
  pgdata:
```

## Verifying Ulimit Settings

After starting your services, verify that ulimits are applied correctly.

```bash
# Check ulimits inside a running container
docker exec my-container sh -c "ulimit -a"

# Check a specific limit (open files)
docker exec my-container sh -c "ulimit -n"

# Check via /proc for the main process
docker exec my-container cat /proc/1/limits

# Verify through Docker inspect
docker inspect --format='{{.HostConfig.Ulimits}}' my-container
```

The `/proc/1/limits` file gives you the most accurate picture of what limits are actually applied to PID 1 in the container.

```bash
# Detailed view of process limits
docker exec my-container cat /proc/1/limits
# Output format:
# Limit                     Soft Limit     Hard Limit     Units
# Max open files            65536          65536          files
# Max processes             4096           8192           processes
```

## Global Ulimit Defaults

If you want the same ulimits for all containers, set them in the Docker daemon configuration instead of repeating them in every Compose file.

```json
// /etc/docker/daemon.json - Global ulimit defaults
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 32768
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 2048
    }
  }
}
```

After changing daemon.json, restart Docker.

```bash
sudo systemctl restart docker
```

Per-service ulimits in Compose files override these daemon defaults.

## Troubleshooting Ulimit Issues

When you suspect ulimit problems, look for these symptoms and solutions.

**"Too many open files"** - Increase the `nofile` limit. Also check if your application has its own file descriptor limit setting that needs to be adjusted.

**"Resource temporarily unavailable" when forking** - The `nproc` limit is too low. Increase it, keeping in mind that threads count as processes.

**Elasticsearch refuses to start** - Almost always a `memlock` or `nofile` issue. Elasticsearch requires unlimited memlock and at least 65536 file descriptors.

**Application runs fine under low load but crashes under high load** - Profile the application's resource usage at peak load. The limit that gets hit first is your bottleneck.

Ulimits are easy to overlook but critical for production workloads. Set them deliberately for each service based on its actual requirements, verify they are applied, and monitor for limit-related errors. A few lines of configuration can prevent mysterious crashes under load.
