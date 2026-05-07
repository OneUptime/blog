# How to Use the --userns Flag with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, User Namespaces, userns

Description: Learn how to use the --userns flag in Podman to control user namespace behavior for fine-grained UID/GID mapping.

---

> The `--userns` flag gives you fine-grained control over how Podman sets up user namespace mappings, from using the host namespace to automatic allocation.

Podman's `--userns` flag controls how user namespaces are configured for a container. Different modes suit different use cases, from maximum isolation with automatic mapping to shared namespaces for host integration.

---

## Available --userns Modes

```bash
# host: Use the host's user namespace (no remapping)

podman run --rm --userns=host alpine:latest id
# Container UID 0 = Host UID 0 (if running as root)
# Container UID 0 maps to your host UID (if rootless)

# keep-id: Map your host UID to the same UID inside the container
podman run --rm --userns=keep-id alpine:latest id
# Your host UID (e.g., 1000) appears as UID 1000 inside

# auto: Automatically allocate a unique UID mapping
podman run --rm --userns=auto alpine:latest id
# Uses a unique range from configured subordinate UID/GID allocations

# nomap: Do not map the current rootless user's UID/GID (Podman 4.1+)
podman run --rm --userns=nomap alpine:latest id
```

## Using host Mode

```bash
# Host mode disables user namespace remapping
# Useful when you need the caller's user namespace rather than a private mapping
podman run --rm \
  --userns=host \
  -v /var/log:/host-logs:ro \
  alpine:latest ls -la /host-logs

# WARNING: In rootful Podman, host mode means container root = real root
# In rootless Podman, container root maps to the invoking user on the host
```

## Using keep-id Mode

```bash
# keep-id maps your host UID into the container
podman run --rm --userns=keep-id alpine:latest id
# Output: uid=1000(username) gid=1000(username)

# This is useful for volume mounts where files should match your host UID
podman run --rm \
  --userns=keep-id \
  -v ./project:/app \
  node:18-alpine sh -c "ls -la /app"
# Files show your actual UID, not root
```

## Using auto Mode

```bash
# Auto mode assigns a unique UID range per container
podman run --rm --userns=auto alpine:latest cat /proc/self/uid_map

# Specify the size of the automatic allocation
podman run --rm --userns=auto:size=10000 alpine:latest cat /proc/self/uid_map

# Each container gets a different range for isolation
podman run -d --name auto1 --userns=auto alpine:latest sleep 60
podman run -d --name auto2 --userns=auto alpine:latest sleep 60

podman exec auto1 cat /proc/self/uid_map
podman exec auto2 cat /proc/self/uid_map
# Different ranges for each container

podman rm -f auto1 auto2
```

## Practical Use Cases

```bash
# Development: use keep-id to avoid permission issues with bind mounts
podman run -it --rm \
  --userns=keep-id \
  -v ./src:/app/src \
  -w /app \
  node:18-alpine npm run dev

# CI/CD: use auto for maximum isolation between build containers
podman run --rm \
  --userns=auto \
  builder:latest make test

# System tools: use host when interacting with host system files
podman run --rm \
  --userns=host \
  -v /etc:/host-etc:ro \
  alpine:latest cat /host-etc/hostname
```

## Checking the Active Mode

```bash
# Inspect the user namespace mode of a running container
podman inspect --format='{{.HostConfig.UsernsMode}}' my-container
```

## Summary

The `--userns` flag in Podman controls user namespace behavior. Use `host` to run in the caller's user namespace, `keep-id` for development with bind mounts where your host UID should be preserved, and `auto` for maximum isolation with unique UID ranges per container. Each mode serves different use cases, from development convenience to production security. Understanding when to use each mode helps you balance security isolation with operational requirements.
