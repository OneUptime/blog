# How to Set Ulimits for a Docker Container at Runtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Linux, Resource Management, Security

Description: Learn how to configure ulimits for Docker containers at runtime to control file descriptors, process counts, and other resource limits.

---

Ulimits control how much of a system's resources a process can consume. They set ceilings on things like the number of open files, the maximum number of processes, the size of core dumps, and more. In Docker, containers inherit the default ulimits from the Docker daemon, but you can override them per container at runtime. Getting these limits right is critical for production workloads, especially databases, web servers, and queue systems that handle thousands of concurrent connections.

## Understanding Ulimits

On a Linux system, ulimits come in two flavors: soft and hard. The soft limit is the effective limit that the kernel enforces. A process can raise its own soft limit up to the hard limit. Only root can raise the hard limit.

Check the ulimits on your host system:

```bash
# Display all current ulimits for your shell session
ulimit -a
```

Common ulimits you will deal with in Docker:

| Name | Flag | What It Controls |
|------|------|-----------------|
| nofile | -n | Maximum open file descriptors |
| nproc | -u | Maximum number of processes |
| memlock | -l | Maximum locked memory (bytes) |
| core | -c | Maximum core file size |
| stack | -s | Maximum stack size |
| fsize | -f | Maximum file size a process can create |

## Setting Ulimits with docker run

Use the `--ulimit` flag to set ulimits when starting a container. The format is `--ulimit type=soft:hard`.

Set the maximum number of open files to 65536:

```bash
# Run a container with a higher file descriptor limit
docker run --rm --ulimit nofile=65536:65536 nginx:latest
```

Set both the soft and hard limits differently:

```bash
# Soft limit of 4096, hard limit of 8192 for open files
docker run --rm --ulimit nofile=4096:8192 ubuntu bash -c "ulimit -Sn && ulimit -Hn"
```

This prints `4096` and `8192`, confirming both limits are set correctly.

You can specify multiple ulimits in a single command:

```bash
# Set multiple ulimits: open files, max processes, and locked memory
docker run --rm \
  --ulimit nofile=65536:65536 \
  --ulimit nproc=4096:4096 \
  --ulimit memlock=-1:-1 \
  ubuntu bash -c "ulimit -a"
```

The value `-1` means unlimited. For `memlock`, this is often required by Elasticsearch and other applications that use memory-mapped files.

## Why Ulimits Matter for Docker Containers

The default ulimits in Docker are often too low for production workloads. Here are some common scenarios where you need to increase them.

### Database Servers

Databases like PostgreSQL, MySQL, and MongoDB open many file descriptors simultaneously - one for each client connection, plus files for data, WAL logs, and indexes. The default `nofile` limit of 1024 will cause connection failures under moderate load.

```bash
# Run PostgreSQL with enough file descriptors for production use
docker run -d \
  --name postgres-prod \
  --ulimit nofile=65536:65536 \
  -e POSTGRES_PASSWORD=secret \
  postgres:16
```

### Elasticsearch

Elasticsearch requires unlimited memory locking and a high file descriptor count. Without these settings, Elasticsearch logs warnings and may refuse to start in production mode.

```bash
# Run Elasticsearch with required ulimits
docker run -d \
  --name elasticsearch \
  --ulimit memlock=-1:-1 \
  --ulimit nofile=65536:65536 \
  -e "discovery.type=single-node" \
  -e "bootstrap.memory_lock=true" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  elasticsearch:8.12.0
```

### High-Traffic Web Servers

Nginx and other web servers handling thousands of concurrent connections need more file descriptors than the default:

```bash
# Run Nginx configured for high concurrency
docker run -d \
  --name nginx-high-traffic \
  --ulimit nofile=131072:131072 \
  -p 80:80 \
  nginx:latest
```

## Setting Default Ulimits in the Docker Daemon

Instead of specifying ulimits on every `docker run` command, you can set default values for the Docker daemon. Edit the daemon configuration file:

```bash
# Edit the Docker daemon configuration
sudo nano /etc/docker/daemon.json
```

Add the default ulimits:

```json
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 4096
    }
  }
}
```

Restart the Docker daemon to apply the changes:

```bash
# Restart Docker to pick up the new default ulimits
sudo systemctl restart docker
```

Now every container launched on this host gets these ulimits unless explicitly overridden. Container-level `--ulimit` flags always take precedence over daemon defaults.

## Ulimits in Docker Compose

Docker Compose supports ulimits in the service definition:

```yaml
# docker-compose.yml with ulimits configured for each service
services:
  database:
    image: postgres:16
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      nproc:
        soft: 4096
        hard: 4096
    environment:
      POSTGRES_PASSWORD: secret

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
      - discovery.type=single-node
      - bootstrap.memory_lock=true
```

## Verifying Ulimits Inside a Running Container

After starting a container with custom ulimits, verify they took effect:

```bash
# Check the effective ulimits inside a running container
docker exec postgres-prod bash -c "cat /proc/1/limits"
```

This reads the kernel-level limits for PID 1 (the main container process). The output shows every limit with its soft and hard values.

You can also check specific limits:

```bash
# Check just the open file limit
docker exec postgres-prod bash -c "ulimit -n"

# Check the max processes limit
docker exec postgres-prod bash -c "ulimit -u"
```

## Troubleshooting Ulimit Issues

### Container Ignores Your Ulimit Settings

If a container does not respect the ulimits you set, check whether the host kernel imposes a lower hard limit. A container cannot exceed the host's limits.

```bash
# Check the host's hard limit for open files
ulimit -Hn

# Check the Docker daemon's effective limits
cat /proc/$(pidof dockerd)/limits
```

### "Too Many Open Files" Errors

This error almost always means the `nofile` ulimit is too low. Increase it:

```bash
# Restart the container with a higher file descriptor limit
docker run --rm --ulimit nofile=131072:131072 my-app
```

### Processes Getting Killed

If processes inside your container die unexpectedly, the `nproc` limit might be too restrictive. Check and increase it:

```bash
# Run with a higher process limit
docker run --rm --ulimit nproc=8192:8192 my-worker-app
```

## Core Dump Configuration

For debugging, you might want to enable or disable core dumps inside containers:

```bash
# Disable core dumps entirely (useful in production)
docker run --rm --ulimit core=0:0 my-app

# Enable core dumps with unlimited size (useful for debugging)
docker run --rm --ulimit core=-1:-1 -v /tmp/cores:/cores my-app
```

## Security Considerations

Ulimits serve as a resource isolation mechanism. Setting them too high can let a single container consume enough resources to impact other containers or the host itself. Setting them too low causes application failures.

A balanced approach for production:

```bash
# Production-ready ulimits that balance performance and safety
docker run -d \
  --name production-app \
  --ulimit nofile=65536:65536 \
  --ulimit nproc=4096:4096 \
  --ulimit core=0:0 \
  --ulimit memlock=82000000:82000000 \
  my-production-image
```

This gives the application enough room to handle high concurrency while preventing unlimited resource consumption. Core dumps are disabled to avoid filling disk space in production.

## Summary

Ulimits are a fundamental part of running Docker containers in production. The defaults are designed for safety, not performance. For databases, search engines, and high-traffic web servers, you will almost always need to increase `nofile` and sometimes `nproc` and `memlock`. Set them per-container with `--ulimit`, in Docker Compose with the `ulimits` key, or globally via the Docker daemon configuration. Always verify your settings with `ulimit -a` inside the container or by reading `/proc/1/limits`.
