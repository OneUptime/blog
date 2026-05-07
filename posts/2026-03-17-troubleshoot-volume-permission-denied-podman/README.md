# How to Troubleshoot Volume Permission Denied Errors in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Permission, Troubleshooting

Description: Learn how to diagnose and fix volume permission denied errors in Podman containers.

---

> Permission denied errors on volumes are the most common issue when running Podman containers. Understanding UID mapping, SELinux, and filesystem permissions is key to resolving them.

When a container cannot read or write to a mounted volume, the error message is typically a generic "Permission denied." The root cause can be UID mismatches, SELinux labels, or filesystem permissions. This guide walks through systematic troubleshooting steps.

---

## Step 1: Identify the Error

```bash
# Check container logs for permission errors

podman logs myapp 2>&1 | grep -i "permission denied"

# Try writing to the volume interactively
podman exec myapp touch /data/testfile
# Output: touch: cannot touch '/data/testfile': Permission denied
```

## Step 2: Check Container User and Host Ownership

```bash
# Check what user the container process runs as
podman exec myapp id
# Output: uid=1000(node) gid=1000(node) groups=1000(node)

# Check ownership on the host
podman volume inspect mydata --format '{{ .Mountpoint }}'
ls -la $(podman volume inspect mydata --format '{{ .Mountpoint }}')

# For bind mounts, check the host directory
ls -la /home/user/data
```

## Step 3: Fix UID/GID Mismatches

```bash
# Option 1: Change host directory ownership to match the container user
sudo chown -R 1000:1000 /home/user/data

# Option 2: Use the :U flag to recursively adjust source ownership
podman run -d --name myapp \
  -v /home/user/data:/data:U \
  docker.io/library/node:20

# Option 3: In rootless mode, map your host user to the container user
podman run -d --name myapp \
  --user 1000:1000 \
  --userns=keep-id:uid=1000,gid=1000 \
  -v /home/user/data:/data \
  docker.io/library/node:20
```

## Step 4: Check SELinux (RHEL/Fedora/CentOS)

```bash
# Check if SELinux is enforcing
getenforce

# Check SELinux denials in the audit log
sudo ausearch -m avc -ts recent | grep container

# Fix by adding :z or :Z to the volume mount
podman run -d --name myapp \
  -v /home/user/data:/data:Z \
  docker.io/library/node:20

# Verify the SELinux label
ls -laZ /home/user/data
```

## Step 5: Check Rootless UID Mapping

```bash
# View your user namespace mapping
podman unshare cat /proc/self/uid_map

# Check ownership as it appears inside the container namespace
podman run --rm -v /home/user/data:/data \
  docker.io/library/alpine:latest stat -c '%u:%g' /data

# Fix with podman unshare using the UID/GID that should own the path inside the container
podman unshare chown -R 1000:1000 /home/user/data
```

## Step 6: Verify Mount Options

```bash
# Check if the volume is mounted read-only
podman inspect myapp --format '{{ range .Mounts }}{{ .Destination }}: RW={{ .RW }}{{ printf "\n" }}{{ end }}'

# Check the underlying filesystem mount options
podman exec myapp mount | grep /data
```

## Step 7: Check Filesystem Permissions

```bash
# Verify the directory has correct permissions
podman exec myapp ls -la /data

# Check if the parent directory is accessible
podman exec myapp ls -la /

# Fix permissions inside the volume
podman run --rm --user root \
  -v mydata:/data \
  docker.io/library/alpine:latest chmod -R 755 /data
```

## Quick Reference: Common Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Permission denied on write | UID mismatch | Use `:U` flag or `chown` |
| Permission denied (SELinux) | Missing label | Use `:Z` or `:z` flag |
| Permission denied (rootless) | Namespace mapping | `podman unshare chown` |
| Read-only filesystem | `:ro` flag set | Remove `ro` from mount |

## Summary

Troubleshoot volume permission denied errors in Podman by checking the container user, host file ownership, SELinux labels, and mount options. Use `:U` for recursive ownership adjustment, `:Z` or `:z` for SELinux relabeling, and `podman unshare chown` for rootless namespace corrections. Systematic diagnosis of these three common causes resolves most volume permission issues.
