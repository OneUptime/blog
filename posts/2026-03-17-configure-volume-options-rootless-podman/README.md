# How to Configure Volume Options for Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Volumes, Security, Configuration

Description: Learn how to configure volume options specifically for rootless Podman to handle UID mapping and permission challenges.

---

> Rootless Podman runs containers without root privileges, which introduces unique volume permission challenges that require specific configuration options.

Running Podman as a non-root user provides better security but changes how file ownership and permissions work for mounted volumes. User namespace mapping shifts UIDs, causing apparent ownership mismatches. This guide covers the volume options needed to make rootless Podman work seamlessly.

---

## Understanding Rootless UID Mapping

```bash
# Check your user namespace mapping

podman unshare cat /proc/self/uid_map
# Output: 0 1000 1        (container root maps to host UID 1000)
#         1 100000 65536   (container UIDs 1-65536 map to host 100000+)

# Check subordinate UID ranges
cat /etc/subuid
cat /etc/subgid
```

## The :U Option for Rootless Volumes

The `:U` flag is useful for rootless Podman when a volume needs to be owned by the container user. It recursively changes the host directory's ownership to match the container's user namespace, so use it carefully on directories you are willing to modify:

```bash
# Without :U - files may show wrong ownership inside container
podman run --rm -v /home/user/data:/data \
  docker.io/library/alpine:latest ls -la /data

# With :U - ownership is recursively adjusted for the container
podman run --rm -v /home/user/data:/data:U \
  docker.io/library/alpine:latest ls -la /data
```

## Configuring Bind Mounts for Rootless

```bash
# Pre-set ownership using podman unshare
podman unshare chown -R 0:0 /home/user/app-data

# Or set to a specific container UID
podman unshare chown -R 1000:1000 /home/user/app-data

# Mount the properly-owned directory
podman run -d --name app \
  -v /home/user/app-data:/data \
  docker.io/library/node:20
```

## Named Volumes in Rootless Mode

Named volumes in rootless mode are stored in the user's home directory:

```bash
# Create a named volume (stored in ~/.local/share/containers/storage/volumes/)
podman volume create appdata

# Check the volume location
podman volume inspect appdata --format '{{ .Mountpoint }}'

# Named volumes handle permissions automatically
podman run -d --name app \
  -v appdata:/app/data \
  docker.io/library/node:20
```

## Combining Rootless Options

```bash
# Use :U with SELinux labels on Fedora/RHEL
podman run -d --name secure-app \
  -v /home/user/data:/app/data:Z,U \
  docker.io/library/nginx:latest

# Read-only with user namespace mapping
podman run -d --name config-reader \
  -v /home/user/config:/app/config:ro,U \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Handling Root-Owned Files

When a container creates files as root (UID 0), they appear as your host UID:

```bash
# Container root creates a file
podman run --rm -v /home/user/data:/data:U \
  docker.io/library/alpine:latest touch /data/root-file

# On the host, the file is owned by your user
ls -la /home/user/data/root-file
# -rw-r--r-- 1 user user 0 root-file
```

## Fixing Permission Issues

```bash
# Use podman unshare to enter the user namespace and fix permissions
podman unshare ls -la /home/user/data

# Change ownership for a specific container UID
podman unshare chown -R 1000:1000 /home/user/data

# Reset permissions back to the host user
podman unshare chown -R 0:0 /home/user/data
```

## Volume Options Reference for Rootless

| Option | Purpose | Example |
|--------|---------|---------|
| `:U` | Auto-chown for user namespace | `-v /data:/data:U` |
| `:Z` | Private SELinux label | `-v /data:/data:Z` |
| `:z` | Shared SELinux label | `-v /data:/data:z` |
| `:ro` | Read-only mount | `-v /data:/data:ro` |

```bash
# Full rootless configuration with all relevant options
podman run -d --name production-app \
  -v appdata:/app/data:U \
  -v /home/user/config:/app/config:ro,U \
  --tmpfs /tmp:rw,size=100m \
  docker.io/library/node:20
```

## Summary

Rootless Podman requires special attention to volume permissions due to user namespace UID mapping. Use the `:U` flag to automatically adjust ownership, `podman unshare` to manage permissions within the user namespace, and named volumes for automatic permission handling. Combine `:U` with SELinux options on RHEL-based systems for comprehensive rootless volume access.
