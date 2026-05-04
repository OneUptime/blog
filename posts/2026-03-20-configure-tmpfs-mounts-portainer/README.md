# How to Configure tmpfs Mounts for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, tmpfs, Memory, Security, Performance, Storage

Description: Configure tmpfs in-memory filesystem mounts for Docker containers in Portainer to provide fast, secure temporary storage that is automatically wiped when containers stop.

---

tmpfs mounts create in-memory filesystems for containers. They're faster than disk, automatically cleared on container stop, and ideal for sensitive data or performance-critical temporary files.

## When to Use tmpfs

- **Sensitive data** - session tokens, temporary credentials that shouldn't touch disk
- **High-performance temp** - scratch space for computationally intensive tasks
- **Read-only containers** - provide writable directories alongside `read_only: true`
- **Ramdisk workloads** - applications that benefit from memory-speed storage

## Configuring tmpfs in Portainer Stacks

```yaml
version: "3.8"
services:
  webapp:
    image: myapp:1.2.3
    # Short form - multiple paths
    tmpfs:
      - /tmp
      - /run
      - /app/cache
```

For size limits (recommended to prevent memory exhaustion):

```yaml
services:
  webapp:
    image: myapp:1.2.3
    # Long form with options
    tmpfs:
      - /tmp:size=100m,mode=1777        # 100MB, sticky bit (like real /tmp)
      - /run:size=50m,mode=755          # 50MB, normal permissions
      - /app/cache:size=500m,mode=700   # 500MB, owner-only access
```

## tmpfs Options

| Option | Description | Example |
|--------|-------------|---------|
| `size` | Maximum size | `size=256m` (MB), `size=1g` (GB) |
| `mode` | Octal permissions | `mode=1777` (sticky), `mode=700` |
| `uid` | Owner UID | `uid=1000` |
| `gid` | Owner GID | `gid=1000` |

## tmpfs for Sensitive Data

Store session tokens and temporary credentials in tmpfs so they're never written to disk:

```yaml
services:
  auth-service:
    image: auth-service:1.2.3
    tmpfs:
      # Session tokens stored here - wiped on restart
      - /run/secrets:size=10m,mode=700
    environment:
      - SESSION_STORAGE_PATH=/run/secrets
```

## Security Scanning Workloads

Use tmpfs for malware scanning to avoid storing potentially malicious files on disk:

```yaml
services:
  antivirus-scanner:
    image: clamav/clamav:latest
    tmpfs:
      # Files to scan go here - never touches the disk
      - /scan-input:size=2g
      - /tmp:size=500m
    volumes:
      - clamav-db:/var/lib/clamav  # Virus definitions on disk
```

## Performance Benchmarks

```bash
# Compare tmpfs vs. disk write performance

# tmpfs write speed (tmpfs does not support O_DIRECT, use conv=fdatasync)
docker run --rm -it \
  --tmpfs /test:size=1g \
  alpine dd if=/dev/zero of=/test/testfile bs=1M count=512 conv=fdatasync

# Disk write speed
docker run --rm -it \
  -v /tmp/disk-test:/test \
  alpine dd if=/dev/zero of=/test/testfile bs=1M count=512 conv=fdatasync

# tmpfs is typically 3-10x faster than SSD for small file I/O
```

## Combined with Read-Only Root Filesystem

The most common production use of tmpfs is providing writable space in read-only containers:

```yaml
services:
  nginx:
    image: nginx:1.25-alpine
    read_only: true
    tmpfs:
      - /var/run:size=10m     # Nginx PID files
      - /var/cache/nginx:size=200m  # nginx proxy cache (ephemeral)
    volumes:
      - nginx-logs:/var/log/nginx   # Persist logs

  app:
    image: myapp:1.2.3
    read_only: true
    tmpfs:
      - /tmp:size=100m        # General temp files
      - /app/tmp:size=200m    # App-specific temp directory
    volumes:
      - app-data:/app/data    # Persistent application data
```

## Monitoring tmpfs Usage

Monitor tmpfs memory consumption to prevent filling host RAM:

```bash
# Check tmpfs usage inside a container
docker exec webapp df -h /tmp

# Check total memory usage from tmpfs mounts across all containers
docker stats --no-stream --format "{{.Name}}\t{{.MemUsage}}"
```

## Summary

tmpfs mounts provide high-performance, automatically-cleared temporary storage for containers. Use them for sensitive data that shouldn't persist, high-performance scratch space, and writable directories in read-only containers. Always set size limits to prevent individual containers from consuming excessive host memory.
