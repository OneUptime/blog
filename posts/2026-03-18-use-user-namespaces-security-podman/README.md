# How to Use User Namespaces for Security in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, User Namespaces, Rootless

Description: Learn how to leverage user namespaces in Podman to map container root to unprivileged host users and prevent privilege escalation.

---

> User namespaces are the reason Podman can run containers as root inside while being completely unprivileged on the host.

User namespaces remap user and group IDs between the container and the host. Root (UID 0) inside the container maps to an unprivileged user on the host, which reduces the impact of a container breakout because container root is not host root. Podman's rootless mode relies on this mechanism for UID/GID isolation, and even rootful Podman can use it for additional security.

---

## Understanding User Namespaces

A user namespace creates a mapping between UIDs/GIDs inside the container and UIDs/GIDs on the host. The key security benefit is that UID 0 (root) inside the container can map to a high, unprivileged UID on the host.

```bash
# Show the current user's subordinate UID/GID ranges

cat /etc/subuid
cat /etc/subgid
```

```bash
# These ranges define which host UIDs/GIDs can be mapped into containers
# Format: username:start_uid:count
# Example: user1:100000:65536
```

## Rootless Podman and User Namespaces

Rootless Podman automatically uses user namespaces, but the user still needs subordinate UID/GID ranges configured in `/etc/subuid` and `/etc/subgid`.

```bash
# Run a rootless container and check the UID mapping
podman run --rm docker.io/library/alpine:latest \
  sh -c "echo 'Inside container:' && id && echo 'UID map:' && cat /proc/self/uid_map"
```

```bash
# Show how root inside maps to your user outside
podman run --rm -d --name userns-test docker.io/library/alpine:latest sleep 3600

# Check the container's PID on the host
CPID=$(podman inspect userns-test --format '{{.State.Pid}}')
echo "Container PID on host: $CPID"

# Check what user that PID runs as on the host
ps -o user,pid,comm -p "$CPID" 2>/dev/null || echo "PID may not be visible in rootless mode"

# Stop the container so later --userns=auto examples can allocate a fresh range
podman stop userns-test
```

## Configuring User Namespace Mappings

```bash
# Run with automatic user namespace allocation
podman run --rm \
  --userns=auto \
  docker.io/library/alpine:latest \
  sh -c "id && cat /proc/self/uid_map"
```

```bash
# Run with a specific UID mapping size
podman run --rm \
  --userns=auto:size=4096 \
  docker.io/library/alpine:latest \
  sh -c "cat /proc/self/uid_map"
```

```bash
# Map the current rootless user's UID/GID to the same values inside the container
podman run --rm \
  --userns=keep-id \
  docker.io/library/alpine:latest \
  sh -c "id && cat /proc/self/uid_map"
```

## Using keep-id for Development

The `keep-id` option maps your host UID/GID to the same UID/GID inside the container, which is useful for volume mounts during development.

```bash
# Create a directory with files owned by your user
mkdir -p /tmp/userns-dev
echo "hello" > /tmp/userns-dev/test.txt

# Run with keep-id so the container can read/write files as your user
podman run --rm \
  --userns=keep-id \
  -v /tmp/userns-dev:/data:Z \
  docker.io/library/alpine:latest \
  sh -c "id && ls -la /data/ && echo 'written from container' >> /data/test.txt"

# Verify the file was written by your user
ls -la /tmp/userns-dev/test.txt
cat /tmp/userns-dev/test.txt
```

## Rootful Podman with User Namespaces

Even when running Podman as root, you can add user namespace isolation.

```bash
# Run a rootful container with user namespace remapping
# Requires a `containers` entry in /etc/subuid and /etc/subgid for --userns=auto
sudo podman run --rm \
  --userns=auto \
  docker.io/library/alpine:latest \
  sh -c "id && cat /proc/self/uid_map"
```

```bash
# Configure automatic user namespace as a default in containers.conf
# This is system-wide unless overridden by a user-specific containers.conf
# Edit /etc/containers/containers.conf
# [containers]
# userns = "auto"
```

## Verifying User Namespace Isolation

```bash
# Demonstrate that root in the container is not root on the host
podman run --rm -d --name userns-verify docker.io/library/alpine:latest sleep 3600

# Inside the container, we are root
podman exec userns-verify id
# Expected output: uid=0(root) gid=0(root)

# But on the host, the process runs as an unprivileged user
podman inspect userns-verify --format '{{.State.Pid}}' | xargs -I{} ps -o uid,pid,comm -p {} 2>/dev/null
```

## User Namespace and File Ownership

```bash
# Show how file ownership changes across the namespace boundary
podman run --rm \
  docker.io/library/alpine:latest \
  sh -c "
    # Create files as different users inside the container
    touch /tmp/root-file
    ls -ln /tmp/root-file
  "
```

```bash
# Check the mapping in detail
podman run --rm docker.io/library/alpine:latest \
  sh -c "
    echo '=== UID Map ==='
    cat /proc/self/uid_map
    echo '=== GID Map ==='
    cat /proc/self/gid_map
    echo '=== Status ==='
    grep -E 'Uid|Gid' /proc/self/status
  "
```

## Configuring Subordinate ID Ranges

If you need to add or modify subordinate ID ranges for a user.

```bash
# Check current allocations
cat /etc/subuid
cat /etc/subgid

# Add a subordinate range for a user (requires root)
# sudo usermod --add-subuids 200000-265535 username
# sudo usermod --add-subgids 200000-265535 username

# After modifying ranges, apply them
# podman system migrate
```

## User Namespaces in Podman Compose

```yaml
# compose.yaml
# Support for userns_mode values depends on the compose provider used by `podman compose`
services:
  app:
    image: docker.io/library/python:3.12-slim
    userns_mode: "keep-id"
    volumes:
      - ./app:/app:Z
    working_dir: /app
    command: python -m http.server 8000
    ports:
      - "8000:8000"
```

## Cleanup

```bash
podman stop userns-test userns-verify 2>/dev/null
podman rm userns-test userns-verify 2>/dev/null
rm -rf /tmp/userns-dev
```

## Summary

User namespaces are a cornerstone of Podman's security model. They ensure that even root inside a container does not automatically become root on the host. Rootless Podman uses user namespaces by default, making it a strong default for running containers without host root privileges. For rootful Podman, enable user namespace remapping with `--userns=auto` to add this critical isolation layer. Use `--userns=keep-id` during development to maintain file ownership consistency between the host and container.
