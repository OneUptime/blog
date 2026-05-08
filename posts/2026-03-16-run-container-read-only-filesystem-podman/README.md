# How to Run a Container with Read-Only Filesystem in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Filesystem

Description: Learn how to run Podman containers with a read-only root filesystem to harden security and prevent unauthorized modifications.

---

> A read-only filesystem is one of the simplest and most effective ways to harden a container against tampering and malware.

Running containers with a read-only root filesystem prevents any process inside the container from modifying the image-backed root filesystem. Writable tmpfs mounts and volumes can still be used for paths that need writes. This is a powerful security measure that blocks attackers from installing backdoors, modifying binaries, or altering configuration files in the image-backed filesystem. Many applications work perfectly fine with a read-only root filesystem when you provide writable tmpfs mounts for the directories that genuinely need writes.

---

## Basic Read-Only Container

Use the `--read-only` flag to mount the container's root filesystem as read-only:

```bash
# Run a container with a read-only filesystem

podman run --read-only --rm alpine sh -c "
  echo 'Testing read-only filesystem...'
  touch /test-file 2>&1 || echo 'Cannot write to root filesystem (expected)'
  echo 'Read-only is working'
"
```

The container can still read files, but write operations to the image-backed root filesystem, such as creating `/test-file`, will fail with a "Read-only file system" error.

## Allowing Writes to Specific Directories with tmpfs

Most applications need to write to certain directories like `/tmp`, `/var/run`, or `/var/log`. Use `--tmpfs` to mount writable in-memory filesystems:

```bash
# Read-only root with writable /tmp and /var/run
podman run --read-only \
  --tmpfs /tmp \
  --tmpfs /var/run \
  --rm alpine sh -c "
    echo 'hello' > /tmp/test-file && echo '/tmp is writable'
    echo 'pid' > /var/run/app.pid && echo '/var/run is writable'
    touch /etc/test 2>&1 || echo '/etc is read-only (expected)'
  "
```

## Running Nginx with Read-Only Filesystem

Nginx needs a few writable directories. Here is a working configuration:

```bash
# Run nginx with read-only root filesystem
podman run -d --read-only \
  --name secure-nginx \
  --tmpfs /tmp \
  --tmpfs /var/cache/nginx \
  --tmpfs /var/run \
  -p 8080:80 \
  nginx:latest

# Verify it is running
podman ps --filter name=secure-nginx

# Test it
curl -s http://localhost:8080 | head -5

# Clean up
podman stop secure-nginx && podman rm secure-nginx
```

## Running PostgreSQL with Read-Only Filesystem

Databases need writable data directories, but the rest can be read-only:

```bash
# Run PostgreSQL with read-only root and writable data volume
podman run -d --read-only \
  --name secure-postgres \
  --tmpfs /tmp \
  --tmpfs /var/run/postgresql \
  -v pgdata:/var/lib/postgresql/data:Z \
  -e POSTGRES_PASSWORD=secretpass \
  postgres:16

# Verify it starts correctly
podman logs secure-postgres 2>&1 | tail -5
```

## Controlling tmpfs Options

You can set size limits and other options on tmpfs mounts:

```bash
# Limit tmpfs to 64MB with noexec
podman run --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --rm alpine sh -c "
    # Can write to /tmp
    dd if=/dev/zero of=/tmp/testfile bs=1M count=10 2>&1
    echo 'Wrote 10MB to /tmp'

    # Cannot exceed the 64MB limit
    dd if=/dev/zero of=/tmp/bigfile bs=1M count=100 2>&1 || echo 'Hit tmpfs size limit'
  "
```

Available tmpfs options include:
- `rw` / `ro`: Read-write or read-only
- `noexec`: Prevent execution of binaries
- `nosuid`: Ignore setuid bits
- `size=N`: Limit the tmpfs size (e.g., `64m`, `1g`)

## Using Named Volumes for Writable Data

For persistent writable data, use volumes instead of tmpfs:

```bash
# Read-only root with a persistent volume for application data
podman run --read-only \
  --tmpfs /tmp \
  -v app-data:/data:Z \
  --rm alpine sh -c "
    echo 'Writing to persistent volume...'
    echo 'important data' > /data/config.txt
    cat /data/config.txt
  "

# Data persists across container restarts
podman run --read-only \
  -v app-data:/data:Z \
  --rm alpine sh -c "
    echo 'Reading persisted data:'
    cat /data/config.txt
  "
```

## Verifying Read-Only Status

Check whether a container has a read-only filesystem:

```bash
# Start a container
podman run -d --read-only --name ro-test --tmpfs /tmp alpine sleep 3600

# Inspect the read-only setting
podman inspect ro-test --format '{{.HostConfig.ReadonlyRootfs}}'
# Output: true

# List the tmpfs mounts
podman inspect ro-test --format '{{json .HostConfig.Tmpfs}}' | python3 -m json.tool

# Clean up
podman stop ro-test && podman rm ro-test
```

## Debugging Read-Only Container Issues

When an application fails with a read-only filesystem, find out which paths it needs to write to:

```bash
# Step 1: Run without read-only to see what gets written
podman run --name debug-app -d nginx:latest
sleep 3

# Step 2: Check which files changed (compared to the image)
podman diff debug-app

# Step 3: Each line starting with C (changed) or A (added) shows a write
# Use this to determine which paths need tmpfs mounts

# Clean up
podman stop debug-app && podman rm debug-app
```

## Read-Only with --read-only-tmpfs

When `--read-only` is set, Podman automatically adds tmpfs mounts to common writable locations (`/tmp`, `/run`, `/var/tmp`, `/dev`, `/dev/shm`) because `--read-only-tmpfs` defaults to `true`. You can disable this behavior:

```bash
# Default behavior: --read-only-tmpfs is true when --read-only is set
# Tmpfs is automatically added to /tmp, /run, /var/tmp, /dev, /dev/shm
podman run --read-only \
  --rm alpine sh -c "
    echo 'test' > /run/test.txt && echo '/run is writable'
    echo 'test' > /dev/shm/test.txt && echo '/dev/shm is writable'
    echo 'test' > /tmp/test.txt && echo '/tmp is writable'
  "

# Disable automatic tmpfs mounts with --read-only-tmpfs=false
podman run --read-only --read-only-tmpfs=false \
  --rm alpine sh -c "
    echo 'test' > /tmp/test.txt 2>&1 || echo '/tmp is read-only'
  "
```

## Practical Security Hardening Example

Combine read-only filesystem with other security options:

```bash
# Fully hardened container
podman run -d \
  --name hardened-app \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --tmpfs /var/run:rw,noexec,nosuid,size=1m \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  --user 1000:1000 \
  -p 8080:80 \
  nginx:latest

# Verify the hardening
podman inspect hardened-app --format '
  ReadOnly: {{.HostConfig.ReadonlyRootfs}}
  Privileged: {{.HostConfig.Privileged}}
  User: {{.Config.User}}
'
```

## Summary

Running containers with a read-only filesystem significantly improves security:

- Use `--read-only` to make the root filesystem read-only
- Use `--tmpfs /path` for directories that need temporary writes
- Use `-v volume:/path` for persistent writable data
- Use `podman diff` to discover which paths an application writes to
- Combine with `--cap-drop ALL`, `--security-opt no-new-privileges`, and `--user` for defense in depth
- Set tmpfs size limits with `--tmpfs /tmp:size=64m` to prevent abuse

Read-only filesystems should be the default for production containers unless there is a specific reason to allow writes.
