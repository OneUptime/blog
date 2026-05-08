# How to Run a Container with Tmpfs Mounts in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, tmpfs, Filesystem, Performance

Description: Learn how to use tmpfs mounts in Podman containers for fast in-memory storage of temporary files, caches, and ephemeral data.

---

> Tmpfs mounts give your containers blazing-fast temporary storage that disappears when the container stops, perfect for temp files and high-speed caches.

Tmpfs is a temporary filesystem that stores data in virtual memory rather than in the container's writable layer. In containers, tmpfs mounts are useful for temporary files, caches, session data, and any workload where speed matters and persistence does not. Since tmpfs data is not persisted with the container filesystem, it can be useful for sensitive data that should not remain after the container stops. On Linux, tmpfs pages can still be swapped unless swap is disabled or the mount is created with a supported no-swap option.

---

## Basic Tmpfs Mount

Use the `--tmpfs` flag to create an in-memory mount point:

```bash
# Mount tmpfs at /tmp

podman run --rm --tmpfs /tmp alpine sh -c "
  echo 'Writing to tmpfs...'
  echo 'hello world' > /tmp/test.txt
  cat /tmp/test.txt
  echo ''
  echo 'Mount info:'
  mount | grep /tmp
"
```

## Tmpfs with Size Limits

By default, tmpfs can grow up to half the host's RAM. Set explicit size limits:

```bash
# Limit tmpfs to 64 megabytes
podman run --rm --tmpfs /tmp:size=64m alpine sh -c "
  echo 'Tmpfs with 64MB limit:'
  df -h /tmp
  echo ''
  # Write 50MB - should succeed
  dd if=/dev/zero of=/tmp/file1 bs=1M count=50 2>&1
  echo 'Wrote 50MB successfully'
  echo ''
  # Try to write another 50MB - should fail
  dd if=/dev/zero of=/tmp/file2 bs=1M count=50 2>&1 || echo 'Hit tmpfs size limit (expected)'
"

# Limit tmpfs to 1 gigabyte
podman run --rm --tmpfs /cache:size=1g alpine sh -c "
  df -h /cache
"
```

## Tmpfs Mount Options

Control permissions and behavior with mount options:

```bash
# Read-write with noexec and nosuid (security hardened)
podman run --rm --tmpfs /tmp:rw,noexec,nosuid,size=100m alpine sh -c "
  echo 'test' > /tmp/test.txt && echo 'Write: OK'
  cat /tmp/test.txt

  # noexec prevents running binaries from tmpfs
  cp /bin/ls /tmp/ls
  /tmp/ls / 2>&1 || echo 'Cannot execute from tmpfs (noexec enabled)'
"

# Set specific file mode permissions
podman run --rm --tmpfs /tmp:mode=1777,size=64m alpine sh -c "
  ls -ld /tmp
"

# Read-only tmpfs (unusual but possible)
podman run --rm --tmpfs /readonly-tmp:ro,size=10m alpine sh -c "
  echo 'test' > /readonly-tmp/file 2>&1 || echo 'Cannot write to read-only tmpfs'
"
```

Available mount options:
- `rw` / `ro`: Read-write or read-only
- `noexec`: Prevent execution of binaries
- `nosuid`: Ignore setuid/setgid bits
- `nodev`: Prevent device file creation
- `size=N`: Maximum size (e.g., `64m`, `1g`)
- `mode=N`: File permission mode (e.g., `1777`)

## Multiple Tmpfs Mounts

You can create multiple tmpfs mounts on a single container:

```bash
# Multiple tmpfs mounts with different configurations
podman run --rm \
  --tmpfs /tmp:rw,size=64m \
  --tmpfs /var/cache:rw,size=128m \
  --tmpfs /run:rw,noexec,size=8m \
  alpine sh -c "
    echo '=== Mount points ==='
    df -h /tmp /var/cache /run
    echo ''
    echo '=== Mount details ==='
    mount | grep tmpfs
  "
```

## Tmpfs with the --mount Flag

The `--mount` flag provides an alternative syntax:

```bash
# Using --mount syntax for tmpfs
podman run --rm \
  --mount type=tmpfs,destination=/tmp,tmpfs-size=67108864,tmpfs-mode=1777 \
  alpine sh -c "
    df -h /tmp
    ls -ld /tmp
  "

# The tmpfs-size is in bytes (67108864 = 64MB)
```

## Practical Use Cases

### Application Cache

```bash
# Run a web application with a tmpfs cache directory
podman run -d --name cached-app \
  --tmpfs /var/cache/app:rw,size=256m \
  -p 8080:80 \
  nginx:latest

# The cache is fast (in-memory) and ephemeral
podman exec cached-app sh -c "
  dd if=/dev/zero of=/var/cache/app/test bs=1M count=10 2>&1
  echo 'Cache write speed is memory-speed'
"

podman stop cached-app && podman rm cached-app
```

### Sensitive Temporary Data

```bash
# Store temporary secrets in tmpfs so they are not persisted in the container filesystem
podman run --rm \
  --tmpfs /secrets:rw,noexec,nosuid,size=1m \
  alpine sh -c "
    echo 'my-secret-token-12345' > /secrets/token
    cat /secrets/token
    # When the container stops, this data is removed with the tmpfs mount
  "
```

### High-Performance Workloads

```bash
# Database temp space in memory for faster query processing
podman run -d --name fast-db \
  --tmpfs /tmp:rw,size=512m \
  --tmpfs /var/run/postgresql:rw,size=8m \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

podman stop fast-db && podman rm fast-db
```

### Read-Only Container with Tmpfs

```bash
# Combine read-only filesystem with tmpfs for writable directories
podman run --rm --read-only \
  --tmpfs /tmp:rw,noexec,size=64m \
  --tmpfs /var/run:rw,size=8m \
  --tmpfs /var/cache/nginx:rw,size=32m \
  -p 8080:80 \
  -d --name secure-nginx \
  nginx:latest

podman stop secure-nginx && podman rm secure-nginx
```

## Verifying Tmpfs Mounts

```bash
# Check tmpfs mounts on a running container
podman run -d --name tmpfs-test \
  --tmpfs /tmp:rw,size=64m \
  --tmpfs /cache:rw,size=128m \
  alpine sleep infinity

# Inspect the mount configuration
podman inspect tmpfs-test --format '{{json .HostConfig.Tmpfs}}' | python3 -m json.tool

# Check from inside the container
podman exec tmpfs-test df -h | grep tmpfs
podman exec tmpfs-test mount | grep tmpfs

podman stop tmpfs-test && podman rm tmpfs-test
```

## Tmpfs vs Volumes vs Bind Mounts

```bash
# Tmpfs: In-memory, ephemeral, fast
podman run --rm --tmpfs /data:size=64m alpine sh -c "echo 'fast, ephemeral' > /data/test"

# Volume: On-disk, persistent, managed by Podman
podman run --rm -v mydata:/data alpine sh -c "echo 'persistent, managed' > /data/test"

# Bind mount: On-disk, persistent, host path
podman run --rm -v /tmp/hostdir:/data:Z alpine sh -c "echo 'persistent, host path' > /data/test"
```

Use tmpfs when you need speed and do not need persistence. Use volumes when data must survive container restarts. Use bind mounts when you need to share specific host directories.

## Summary

Tmpfs mounts in Podman provide fast, ephemeral in-memory storage:

- Use `--tmpfs /path` for basic in-memory mounts
- Use `--tmpfs /path:size=N` to limit memory consumption
- Add `noexec,nosuid` for security hardening
- Combine with `--read-only` for hardened containers
- Use for caches, temporary files, and sensitive data
- Data is lost when the container stops (by design)
- Multiple tmpfs mounts can have different sizes and options

Tmpfs is the right choice whenever you need temporary storage that is fast and automatically cleaned up.
